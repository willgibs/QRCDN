// The studio object's mesh: an extruded rounded-rect slab with a 45°
// chamfered bevel around the front face — the glint-catcher that gives the
// sheen an edge to break on. Pure math, zero DOM/GL imports, deterministic
// (built once at module scope by the renderer). Colocated-tested
// (qr-slab-geometry.test.ts) — the tests verify counts, winding, and
// normals from the `ranges` layout table below, so if the emission ORDER
// here changes, `ranges` must follow it.
//
// Front face at z = +depth/2, +Y up, outline wound CCW viewed from +Z.
// The QR texture maps onto the front face only (`face` attribute = 1);
// bevel, side wall, and back render as bare paper. UVs are a planar map
// over the FULL width/height — the 8.3% paper margin is painted into the
// texture (the PrintMat convention), not carved into the geometry.

import { clamp } from "../tilt-math";

export interface SlabGeometry {
  positions: Float32Array; // 3 per vertex
  normals: Float32Array; // 3 per vertex, unit length
  uvs: Float32Array; // 2 per vertex (meaningful on the front face only)
  face: Float32Array; // 1 per vertex: 1 = textured front, 0 = paper
  indices: Uint16Array;
  /** Vertex-index ranges per part, in emission order — a test aid. */
  ranges: Record<"front" | "bevel" | "side" | "back", { start: number; count: number }>;
}

export interface SlabOptions {
  width?: number; // 2
  height?: number; // 2
  depth?: number; // 0.12
  radius?: number; // 0.09 corner radius of the outline
  bevel?: number; // 0.02 chamfer inset (horizontal) and drop (vertical)
  cornerSegments?: number; // 8 -> 36 outline points
}

interface OutlinePoint {
  x: number;
  y: number;
  nx: number; // outward 2D normal (radial on arcs; axis-aligned at the
  ny: number; // shared arc endpoints, so straight edges shade flat)
}

/** Closed CCW rounded-rect outline: 4 arcs of `segments + 1` points each;
 *  the straight edges are the implicit chords between consecutive arcs'
 *  shared-angle endpoints. */
function roundedRectOutline(
  hw: number,
  hh: number,
  r: number,
  segments: number,
): OutlinePoint[] {
  const corners = [
    { cx: hw - r, cy: -(hh - r), start: -90 }, // bottom-right
    { cx: hw - r, cy: hh - r, start: 0 }, // top-right
    { cx: -(hw - r), cy: hh - r, start: 90 }, // top-left
    { cx: -(hw - r), cy: -(hh - r), start: 180 }, // bottom-left
  ];
  const points: OutlinePoint[] = [];
  for (const { cx, cy, start } of corners) {
    for (let i = 0; i <= segments; i++) {
      const a = ((start + (i / segments) * 90) * Math.PI) / 180;
      const nx = Math.cos(a);
      const ny = Math.sin(a);
      points.push({ x: cx + r * nx, y: cy + r * ny, nx, ny });
    }
  }
  return points;
}

export function buildQrSlab(opts: SlabOptions = {}): SlabGeometry {
  const width = Math.max(opts.width ?? 2, 0.1);
  const height = Math.max(opts.height ?? 2, 0.1);
  const depth = Math.max(opts.depth ?? 0.12, 0.02);
  const bevel = clamp(opts.bevel ?? 0.02, 0.001, depth / 2);
  const radius = clamp(
    opts.radius ?? 0.09,
    bevel + 0.001,
    (Math.min(width, height) / 2) * 0.999,
  );
  const segments = Math.max(1, Math.round(opts.cornerSegments ?? 8));

  const hw = width / 2;
  const hh = height / 2;
  const zFront = depth / 2;
  const zBevel = zFront - bevel;
  const zBack = -depth / 2;

  const outline = roundedRectOutline(hw, hh, radius, segments);
  const n = outline.length; // 4 * (segments + 1)

  const vertexCount = 6 * n + 2; // (n+1) front fan + 2n bevel + 2n side + (n+1) back fan
  const positions = new Float32Array(vertexCount * 3);
  const normals = new Float32Array(vertexCount * 3);
  const uvs = new Float32Array(vertexCount * 2);
  const face = new Float32Array(vertexCount);
  const indices = new Uint16Array(6 * n * 3);

  let v = 0; // vertex cursor
  let t = 0; // index cursor

  const put = (
    x: number,
    y: number,
    z: number,
    nx: number,
    ny: number,
    nz: number,
    isFront: boolean,
  ): number => {
    positions[v * 3] = x;
    positions[v * 3 + 1] = y;
    positions[v * 3 + 2] = z;
    const len = Math.hypot(nx, ny, nz);
    normals[v * 3] = nx / len;
    normals[v * 3 + 1] = ny / len;
    normals[v * 3 + 2] = nz / len;
    uvs[v * 2] = x / width + 0.5;
    uvs[v * 2 + 1] = 0.5 - y / height;
    face[v] = isFront ? 1 : 0;
    return v++;
  };
  const tri = (a: number, b: number, c: number): void => {
    indices[t++] = a;
    indices[t++] = b;
    indices[t++] = c;
  };

  // Front face: fan around a center vertex over the outline INSET by the
  // bevel (exact for the arcs: radius - bevel along each radial normal).
  const frontStart = v;
  const frontCenter = put(0, 0, zFront, 0, 0, 1, true);
  for (const p of outline) {
    put(p.x - bevel * p.nx, p.y - bevel * p.ny, zFront, 0, 0, 1, true);
  }
  for (let i = 0; i < n; i++) {
    tri(frontCenter, frontStart + 1 + i, frontStart + 1 + ((i + 1) % n));
  }

  // Bevel ring: inset outline at zFront -> full outline at zBevel, 45°
  // chamfer normals. Vertices are duplicated from both neighbors on
  // purpose — the bevel is a hard crease against the front and the side.
  const bevelStart = v;
  for (const p of outline) {
    put(p.x - bevel * p.nx, p.y - bevel * p.ny, zFront, p.nx, p.ny, 1, false);
  }
  for (const p of outline) {
    put(p.x, p.y, zBevel, p.nx, p.ny, 1, false);
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(bevelStart + i, bevelStart + n + i, bevelStart + n + j);
    tri(bevelStart + i, bevelStart + n + j, bevelStart + j);
  }

  // Side wall: full outline extruded zBevel -> zBack, radial normals.
  const sideStart = v;
  for (const p of outline) put(p.x, p.y, zBevel, p.nx, p.ny, 0, false);
  for (const p of outline) put(p.x, p.y, zBack, p.nx, p.ny, 0, false);
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    tri(sideStart + i, sideStart + n + i, sideStart + n + j);
    tri(sideStart + i, sideStart + n + j, sideStart + j);
  }

  // Back face: reversed fan, normal -Z. Never visible at the stage's ~10°
  // tilt, but 36 triangles of insurance against a future camera is free.
  const backStart = v;
  const backCenter = put(0, 0, zBack, 0, 0, -1, false);
  for (const p of outline) put(p.x, p.y, zBack, 0, 0, -1, false);
  for (let i = 0; i < n; i++) {
    tri(backCenter, backStart + 1 + ((i + 1) % n), backStart + 1 + i);
  }

  return {
    positions,
    normals,
    uvs,
    face,
    indices,
    ranges: {
      front: { start: frontStart, count: n + 1 },
      bevel: { start: bevelStart, count: 2 * n },
      side: { start: sideStart, count: 2 * n },
      back: { start: backStart, count: n + 1 },
    },
  };
}
