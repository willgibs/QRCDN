// Framework-free WebGL1 renderer for the studio object: one extruded
// rounded-rect slab (lib/webgl/qr-slab-geometry.ts), one program
// (lib/webgl/qr-slab-shaders.ts), two texture slots for the sweep-swap.
// The React island (components/marketing/studio-object.tsx) owns the rAF
// loop, springs, and the swap state machine; this class owns nothing but
// GL objects and a frame. Browser-only and manually exercised, same
// posture as lib/export.ts's rasterizer (no jsdom/canvas polyfill in this
// repo, and adding one to pretend-test GL calls proves nothing).
//
// Context loss: `init()` creates every GL object, so the island's
// `webglcontextrestored` handler is simply init() again on the same
// instance. All state that survives a re-init (which texture is current)
// is re-established by the island re-staging the current config's raster.

import { buildQrSlab } from "./qr-slab-geometry";
import { AURORA_LINEAR } from "./aurora";
import { FRAG_SRC, VERT_SRC } from "./qr-slab-shaders";

export interface FrameState {
  /** Tilt around the X axis (pitch), radians. */
  rotX: number;
  /** Tilt around the Y axis (yaw), radians. */
  rotY: number;
  /** Light orbit azimuth, radians (0 = dead ahead, orbits in idle). */
  lightAzimuth: number;
  /** Light elevation, radians above the camera axis. */
  lightElevation: number;
  /** Aurora ramp clock, wraps at 1. */
  hueT: number;
  /** Sweep progress 0..1 (1 when idle). */
  swap: number;
  /** Sweep intensity bell 0..1 (0 when idle). */
  sweepBoost: number;
}

// Camera: distance 4 slab-widths with the slab spanning 2 units gives the
// same size-to-perspective ratio as TiltStage's 750px camera over a
// ~370px card — the foreshortening that separates "3D object" from
// "skewed rectangle" (its round-5 note). fov derives from framing, never
// tuned directly.
const CAM_Z = 4;
const FRAME_HALF_HEIGHT = 1.42; // slab half-height 1 + light headroom
const NEAR = 1;
const FAR = 10;

// Linear paper tone. The tone map caps un-lit paper around sRGB ~0.87 —
// bright enough to read WHITE against the oklch(0.12) section floor,
// while a glint (2.0+ pre-map) still tone-maps visibly brighter, to 1.0.
// That gap IS the sheen's headroom; raising this toward 1.0 erases it.
const PAPER_LINEAR = 0.8;
// Broader lobe than a mirror: the object is near-flat, so a tight
// highlight is a pinprick — 44 spreads the glint into a readable pool.
const SHININESS = 44;
const EMBOSS = 0.9;
// Emboss tap distance is a LOOK constant, not a texel-exactness constant:
// at display scale the GPU samples a coarser mip, so a fixed ~1.4/1024
// offset keeps the module relief visible at both texture sizes.
const EMBOSS_TAP = 1.4 / 1024;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("createShader failed");
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    throw new Error(`shader compile: ${gl.getShaderInfoLog(shader) ?? "unknown"}`);
  }
  return shader;
}

/** Column-major perspective * translate(0, 0, -CAM_Z). */
function viewProj(aspect: number): Float32Array {
  const f = CAM_Z / FRAME_HALF_HEIGHT; // cot(fovY / 2) from the framing
  const nf = 1 / (NEAR - FAR);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[10] = (FAR + NEAR) * nf;
  out[11] = -1;
  out[14] = (2 * FAR * NEAR) * nf - CAM_Z * ((FAR + NEAR) * nf);
  // ^ translate by -CAM_Z folded in: out[14] = proj[10] * -CAM_Z + proj[14]
  out[15] = CAM_Z; // proj[11] * -CAM_Z
  return out;
}

/** Column-major rotY(ry) * rotX(rx) — pitch first, then yaw. */
function modelMatrix(rx: number, ry: number): Float32Array {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  // prettier-ignore
  return new Float32Array([
    cy,       0,   -sy,      0,
    sx * sy,  cx,  sx * cy,  0,
    cx * sy, -sx,  cx * cy,  0,
    0,        0,   0,        1,
  ]);
}

export class QrSlabRenderer {
  private gl: WebGLRenderingContext | null = null;
  private program: WebGLProgram | null = null;
  private indexCount = 0;
  private uniforms: Record<string, WebGLUniformLocation | null> = {};
  private texCurrent: WebGLTexture | null = null;
  private texIncoming: WebGLTexture | null = null;
  private sweeping = false;
  private aspect = 1;

  constructor(private canvas: HTMLCanvasElement) {}

  /** Creates the context and every GL object. Returns false when WebGL is
   *  unavailable (the island then stays on the static mat). Safe to call
   *  again after context restore. */
  init(): boolean {
    const gl = this.canvas.getContext("webgl", {
      antialias: true,
      alpha: true,
      premultipliedAlpha: true,
      depth: true,
      powerPreference: "low-power",
    });
    if (!gl) return false;
    this.gl = gl;
    this.sweeping = false;

    const program = gl.createProgram();
    if (!program) return false;
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT_SRC));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS) && !gl.isContextLost()) {
      throw new Error(`program link: ${gl.getProgramInfoLog(program) ?? "unknown"}`);
    }
    gl.useProgram(program);
    this.program = program;

    const geo = buildQrSlab();
    this.indexCount = geo.indices.length;
    const attr = (name: string, data: Float32Array, size: number): void => {
      const loc = gl.getAttribLocation(program, name);
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    };
    attr("aPosition", geo.positions, 3);
    attr("aNormal", geo.normals, 3);
    attr("aUv", geo.uvs, 2);
    attr("aFace", geo.face, 1);
    const indexBuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, geo.indices, gl.STATIC_DRAW);

    for (const name of [
      "uModel", "uViewProj", "uTexPrev", "uTexNext", "uSwap", "uSweepBoost",
      "uTexel", "uPaper", "uLightDir", "uCamPos", "uShininess", "uEmboss",
      "uHueT", "uTangent", "uBitangent", "uAu0", "uAu1", "uAu2", "uAu3", "uAu4",
    ]) {
      this.uniforms[name] = gl.getUniformLocation(program, name);
    }

    gl.uniform1i(this.uniforms.uTexPrev, 0);
    gl.uniform1i(this.uniforms.uTexNext, 1);
    gl.uniform3f(this.uniforms.uPaper, PAPER_LINEAR, PAPER_LINEAR, PAPER_LINEAR);
    gl.uniform1f(this.uniforms.uShininess, SHININESS);
    gl.uniform1f(this.uniforms.uEmboss, EMBOSS);
    gl.uniform3f(this.uniforms.uCamPos, 0, 0, CAM_Z);
    AURORA_LINEAR.forEach(([r, g, b], i) => {
      gl.uniform3f(this.uniforms[`uAu${i}`], r, g, b);
    });

    // 1x1 white placeholders until the first raster lands — never drawn
    // visibly (the island only fades the canvas in after a real texture's
    // first frame), but frame() must always have something bound.
    const makeTex = (): WebGLTexture | null => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return tex;
    };
    this.texCurrent = makeTex();
    this.texIncoming = makeTex();
    gl.uniform2f(this.uniforms.uTexel, EMBOSS_TAP, EMBOSS_TAP);

    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    return true;
  }

  isContextLost(): boolean {
    return this.gl?.isContextLost() ?? true;
  }

  resize(cssWidth: number, cssHeight: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssWidth * dpr));
    const h = Math.max(1, Math.round(cssHeight * dpr));
    if (this.canvas.width !== w) this.canvas.width = w;
    if (this.canvas.height !== h) this.canvas.height = h;
    this.aspect = w / h;
    this.gl?.viewport(0, 0, w, h);
  }

  /** Uploads a raster into the INCOMING slot (POT source -> mipmapped). */
  stageTexture(source: TexImageSource): void {
    const gl = this.gl;
    if (!gl || !this.texIncoming) return;
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.texIncoming);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.generateMipmap(gl.TEXTURE_2D);
  }

  /** The staged texture starts sweeping in over the current one. */
  beginSweep(): void {
    this.sweeping = true;
  }

  /** Sweep finished (or never ran): the staged texture becomes current. */
  commit(): void {
    const staged = this.texIncoming;
    this.texIncoming = this.texCurrent;
    this.texCurrent = staged;
    this.sweeping = false;
  }

  /** Reduced-motion/fallback path: promote with no sweep. */
  swapInstant(): void {
    this.commit();
  }

  frame(state: FrameState): void {
    const gl = this.gl;
    if (!gl || gl.isContextLost()) return;
    const u = this.uniforms;

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const model = modelMatrix(state.rotX, state.rotY);
    gl.uniformMatrix4fv(u.uModel, false, model);
    gl.uniformMatrix4fv(u.uViewProj, false, viewProj(this.aspect));
    // Surface axes for the emboss: +u is the model X column, +v is -Y
    // (UV v grows downward while model Y grows upward).
    gl.uniform3f(u.uTangent, model[0], model[1], model[2]);
    gl.uniform3f(u.uBitangent, -model[4], -model[5], -model[6]);

    const ce = Math.cos(state.lightElevation);
    gl.uniform3f(
      u.uLightDir,
      ce * Math.sin(state.lightAzimuth),
      Math.sin(state.lightElevation),
      ce * Math.cos(state.lightAzimuth),
    );
    gl.uniform1f(u.uHueT, state.hueT);
    gl.uniform1f(u.uSwap, this.sweeping ? state.swap : 1);
    gl.uniform1f(u.uSweepBoost, state.sweepBoost);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texCurrent);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.sweeping ? this.texIncoming : this.texCurrent);

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
  }

  dispose(): void {
    const gl = this.gl;
    if (gl) {
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    }
    this.gl = null;
    this.program = null;
    this.texCurrent = null;
    this.texIncoming = null;
  }
}
