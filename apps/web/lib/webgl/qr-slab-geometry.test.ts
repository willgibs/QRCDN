import { describe, expect, it } from "vitest";
import { buildQrSlab, type SlabGeometry } from "./qr-slab-geometry";

function vec(arr: Float32Array, i: number): [number, number, number] {
  return [arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2]];
}

function cross(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function sub(
  a: [number, number, number],
  b: [number, number, number],
): [number, number, number] {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

describe("buildQrSlab", () => {
  const geo = buildQrSlab();

  it("matches the closed-form counts for several tessellations", () => {
    for (const segments of [1, 4, 8, 12]) {
      const g = buildQrSlab({ cornerSegments: segments });
      const n = 4 * (segments + 1);
      expect(g.positions.length / 3).toBe(6 * n + 2);
      expect(g.indices.length / 3).toBe(6 * n);
      expect(g.normals.length).toBe(g.positions.length);
      expect(g.uvs.length / 2).toBe(g.positions.length / 3);
      expect(g.face.length).toBe(g.positions.length / 3);
    }
  });

  it("keeps every index in range and every value finite", () => {
    const vertexCount = geo.positions.length / 3;
    for (const i of geo.indices) expect(i).toBeLessThan(vertexCount);
    for (const arr of [geo.positions, geo.normals, geo.uvs]) {
      for (const value of arr) expect(Number.isFinite(value)).toBe(true);
    }
  });

  it("marks exactly the front fan as textured, with UVs inside [0,1]", () => {
    const { front } = geo.ranges;
    let textured = 0;
    for (let i = 0; i < geo.face.length; i++) {
      if (geo.face[i] === 1) {
        textured++;
        expect(i).toBeGreaterThanOrEqual(front.start);
        expect(i).toBeLessThan(front.start + front.count);
        expect(geo.uvs[i * 2]).toBeGreaterThanOrEqual(0);
        expect(geo.uvs[i * 2]).toBeLessThanOrEqual(1);
        expect(geo.uvs[i * 2 + 1]).toBeGreaterThanOrEqual(0);
        expect(geo.uvs[i * 2 + 1]).toBeLessThanOrEqual(1);
      }
    }
    expect(textured).toBe(front.count);
  });

  it("emits unit-length normals everywhere", () => {
    for (let i = 0; i < geo.normals.length / 3; i++) {
      const [x, y, z] = vec(geo.normals, i);
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
    }
  });

  it("chamfers the bevel ring at 45°", () => {
    const { bevel } = geo.ranges;
    for (let i = bevel.start; i < bevel.start + bevel.count; i++) {
      const nz = geo.normals[i * 3 + 2];
      expect(nz).toBeCloseTo(Math.SQRT1_2, 4);
    }
  });

  it("winds every triangle outward (geometric normal agrees with vertex normals)", () => {
    const check = (g: SlabGeometry): void => {
      for (let ti = 0; ti < g.indices.length / 3; ti++) {
        const [ia, ib, ic] = [
          g.indices[ti * 3],
          g.indices[ti * 3 + 1],
          g.indices[ti * 3 + 2],
        ];
        const a = vec(g.positions, ia);
        const geometric = cross(sub(vec(g.positions, ib), a), sub(vec(g.positions, ic), a));
        const avg: [number, number, number] = [0, 1, 2].map(
          (ch) =>
            (g.normals[ia * 3 + ch] + g.normals[ib * 3 + ch] + g.normals[ic * 3 + ch]) / 3,
        ) as [number, number, number];
        expect(dot(geometric, avg), `triangle ${ti}`).toBeGreaterThan(0);
      }
    };
    check(geo);
    check(buildQrSlab({ width: 3, height: 1.4, depth: 0.3, cornerSegments: 4 }));
  });

  it("stays inside the declared bounds", () => {
    const g = buildQrSlab({ width: 2, height: 2, depth: 0.12 });
    for (let i = 0; i < g.positions.length / 3; i++) {
      const [x, y, z] = vec(g.positions, i);
      expect(Math.abs(x)).toBeLessThanOrEqual(1 + 1e-6);
      expect(Math.abs(y)).toBeLessThanOrEqual(1 + 1e-6);
      expect(Math.abs(z)).toBeLessThanOrEqual(0.06 + 1e-6);
    }
  });

  it("clamps degenerate options instead of emitting NaN", () => {
    const g = buildQrSlab({
      width: 0,
      height: -1,
      depth: 0,
      radius: 99,
      bevel: 99,
      cornerSegments: 0,
    });
    for (const arr of [g.positions, g.normals, g.uvs]) {
      for (const value of arr) expect(Number.isFinite(value)).toBe(true);
    }
    expect(g.indices.length).toBeGreaterThan(0);
  });
});
