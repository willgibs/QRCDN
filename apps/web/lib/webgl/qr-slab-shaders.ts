// GLSL ES 1.00 sources for the studio object (lib/webgl/qr-slab-renderer.ts).
// WebGL1 on purpose: nothing here needs MRT, derivatives, or sRGB internal
// formats, and WebGL1 is the maximum-reach floor (SwiftShader included, so
// e2e can assert the canvas goes live). Template strings, no loader.
//
// Gamma: textures arrive sRGB-encoded from the 2D rasterization canvas.
// The fragment shader decodes to linear with the pow(2.2) approximation,
// lights and tone-maps in linear, and re-encodes at the end. Lighting in
// sRGB space was rejected because the whole trick that makes a WHITE
// object's sheen visible — resting paper below 1.0, specular energy above
// 1.0 compressed by a tone map — is only coherent in linear space. The
// piecewise-exact sRGB curve buys nothing visible here and costs ALU.

export const VERT_SRC = /* glsl */ `
attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aUv;
attribute float aFace;

uniform mat4 uModel;     // rotation-only (normals ride mat3(uModel))
uniform mat4 uViewProj;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vFace;

void main() {
  vec4 world = uModel * vec4(aPosition, 1.0);
  vWorldPos = world.xyz;
  vNormal = mat3(uModel) * aNormal;
  vUv = aUv;
  vFace = aFace;
  gl_Position = uViewProj * world;
}
`;

export const FRAG_SRC = /* glsl */ `
precision mediump float;

uniform sampler2D uTexPrev;  // outgoing styled QR raster
uniform sampler2D uTexNext;  // incoming (same texture as prev when idle)
uniform float uSwap;         // sweep progress: 0 = all prev, 1 = all next
uniform float uSweepBoost;   // 0 idle; bell over a config sweep
uniform vec2 uTexel;         // emboss tap offset in UV units
uniform vec3 uPaper;         // linear paper tone, < 1.0: the specular headroom
uniform vec3 uLightDir;
uniform vec3 uCamPos;
uniform float uShininess;
uniform float uEmboss;       // module-emboss strength (0 disables)
uniform float uHueT;         // aurora ramp clock, wraps at 1
uniform vec3 uTangent;       // world-space surface +u axis (model X column)
uniform vec3 uBitangent;     // world-space surface +v axis (model -Y column)
uniform vec3 uAu0;
uniform vec3 uAu1;
uniform vec3 uAu2;
uniform vec3 uAu3;
uniform vec3 uAu4;

varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec2 vUv;
varying float vFace;

vec3 srgb2lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 lin2srgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

// Five aurora stops as scalar uniforms, not an array: GLSL ES 1.00 only
// guarantees constant-index array access in fragment shaders, so the ramp
// unrolls as a mix cascade (linear between consecutive stops, wrapping).
vec3 auroraRamp(float t) {
  float u = fract(t) * 5.0;
  vec3 c = mix(uAu0, uAu1, clamp(u, 0.0, 1.0));
  c = mix(c, uAu2, clamp(u - 1.0, 0.0, 1.0));
  c = mix(c, uAu3, clamp(u - 2.0, 0.0, 1.0));
  c = mix(c, uAu4, clamp(u - 3.0, 0.0, 1.0));
  return mix(c, uAu0, clamp(u - 4.0, 0.0, 1.0));
}

// Ink is always darker than paper here — only the four certified dark inks
// are reachable from the panel — so sRGB luminance IS the inverse height
// map. If a light-on-dark kit ever becomes reachable this inverts; see
// components/marketing/studio-kit.ts.
float inkHeight(sampler2D t, vec2 uv) {
  return 1.0 - dot(texture2D(t, uv).rgb, vec3(0.2126, 0.7152, 0.0722));
}

void main() {
  // Diagonal sweep coordinate, top-left -> bottom-right in UV space — the
  // retired sdx front's 135deg direction reborn on the object. The edge
  // over-travels [-0.15, 1.15] so the feather fully clears both corners.
  float s = (vUv.x + vUv.y) * 0.5;
  float edge = mix(-0.15, 1.15, uSwap);
  float m = 1.0 - smoothstep(edge - 0.10, edge, s); // 1 = show NEXT
  float band = smoothstep(edge - 0.18, edge, s) * (1.0 - smoothstep(edge, edge + 0.05, s));

  // Blended height + 4-tap finite-difference emboss normal. m is reused
  // for the neighbor taps (it varies sub-texel across them).
  float hpx = mix(inkHeight(uTexPrev, vUv + vec2(uTexel.x, 0.0)), inkHeight(uTexNext, vUv + vec2(uTexel.x, 0.0)), m);
  float hmx = mix(inkHeight(uTexPrev, vUv - vec2(uTexel.x, 0.0)), inkHeight(uTexNext, vUv - vec2(uTexel.x, 0.0)), m);
  float hpy = mix(inkHeight(uTexPrev, vUv + vec2(0.0, uTexel.y)), inkHeight(uTexNext, vUv + vec2(0.0, uTexel.y)), m);
  float hmy = mix(inkHeight(uTexPrev, vUv - vec2(0.0, uTexel.y)), inkHeight(uTexNext, vUv - vec2(0.0, uTexel.y)), m);
  vec3 N = normalize(
    normalize(vNormal)
      - vFace * uEmboss * ((hpx - hmx) * normalize(uTangent) + (hpy - hmy) * normalize(uBitangent))
  );

  vec3 albedo = (vFace > 0.5)
    ? mix(srgb2lin(texture2D(uTexPrev, vUv).rgb), srgb2lin(texture2D(uTexNext, vUv).rgb), m) * uPaper
    : uPaper; // bevel, side wall, back: bare paper

  vec3 V = normalize(uCamPos - vWorldPos);
  vec3 L = normalize(uLightDir);
  vec3 Hv = normalize(L + V);
  float diff = max(dot(N, L), 0.0);
  float spec = pow(max(dot(N, Hv), 0.0), uShininess);
  float fres = pow(1.0 - max(dot(N, V), 0.0), 5.0);

  vec3 sheen = auroraRamp(uHueT);
  float specAmp = 1.35 + 2.2 * uSweepBoost * band;
  vec3 lit = albedo * (0.62 + 0.38 * diff)
    + spec * specAmp * mix(vec3(1.0), sheen, 0.5 + 0.35 * uSweepBoost)
    + fres * sheen * 0.22
    + sheen * band * uSweepBoost * 0.30; // the traveling front glows even
                                         // where the specular lobe misses

  // Reinhard with a white point: resting paper barely moves, specular
  // energy past 1.0 compresses softly instead of clipping — the headroom
  // that makes a white object's glint genuinely brighter than its paper.
  vec3 mapped = lit * (1.0 + lit / (1.35 * 1.35)) / (1.0 + lit);
  gl_FragColor = vec4(lin2srgb(clamp(mapped, 0.0, 1.0)), 1.0);
}
`;
