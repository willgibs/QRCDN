import { describe, expect, it, vi } from "vitest";
import { purgePlanScanEvents } from "./purge";

// Hand-rolled chain-mock admin object — mirrors the style
// apps/web/lib/kv-sync.test.ts uses for `fetch` (vi.fn()s returning
// chainable stubs), adapted to Supabase's fluent query-builder chains:
//   admin.from("profiles").select(...).eq(...).range(...)      -> {data, error}
//   admin.from("scan_events").delete(...).lt(...).in(...)      -> {count, error}
// Each stage is a vi.fn() so calls/args are individually assertable.

interface ProfilesPage {
  data: { qr_codes: { id: string }[] | null }[];
  error: { message: string } | null;
}

function createAdminMock(opts: {
  profilePages: ProfilesPage[];
  deleteResults?: { count: number; error: { message: string } | null }[];
}) {
  const { profilePages, deleteResults = [] } = opts;

  const rangeCalls: [number, number][] = [];
  const eqCalls: [string, string][] = [];
  const selectCalls: string[] = [];
  let pageIndex = 0;

  const profilesBuilder = {
    select: vi.fn((cols: string) => {
      selectCalls.push(cols);
      return profilesBuilder;
    }),
    eq: vi.fn((col: string, value: string) => {
      eqCalls.push([col, value]);
      return profilesBuilder;
    }),
    range: vi.fn((start: number, end: number) => {
      rangeCalls.push([start, end]);
      const page = profilePages[pageIndex] ?? { data: [], error: null };
      pageIndex++;
      return Promise.resolve(page);
    }),
  };

  const ltCalls: [string, string][] = [];
  const inCalls: [string, string[]][] = [];
  const deleteCalls: unknown[] = [];
  let deleteIndex = 0;

  const scanEventsBuilder = {
    delete: vi.fn((options: unknown) => {
      deleteCalls.push(options);
      return scanEventsBuilder;
    }),
    lt: vi.fn((col: string, value: string) => {
      ltCalls.push([col, value]);
      return scanEventsBuilder;
    }),
    in: vi.fn((col: string, values: string[]) => {
      inCalls.push([col, values]);
      const result = deleteResults[deleteIndex] ?? { count: 0, error: null };
      deleteIndex++;
      return Promise.resolve(result);
    }),
  };

  const from = vi.fn((table: string) => {
    if (table === "profiles") return profilesBuilder;
    if (table === "scan_events") return scanEventsBuilder;
    throw new Error(`unexpected table in mock: ${table}`);
  });

  return {
    admin: { from } as unknown as Parameters<typeof purgePlanScanEvents>[0],
    from,
    rangeCalls,
    eqCalls,
    selectCalls,
    ltCalls,
    inCalls,
    deleteCalls,
  };
}

const CUTOFF = "2026-06-22T00:00:00.000Z";

describe("purgePlanScanEvents — pagination", () => {
  it("loops until a short page and flattens every page's ids", async () => {
    const fullPage = {
      data: Array.from({ length: 1000 }, (_, i) => ({ qr_codes: [{ id: `id-${i}` }] })),
      error: null,
    };
    const shortPage = {
      data: [{ qr_codes: [{ id: "id-1000" }] }, { qr_codes: [{ id: "id-1001" }] }],
      error: null,
    };
    const { admin, rangeCalls, inCalls } = createAdminMock({
      profilePages: [fullPage, shortPage],
      deleteResults: [
        { count: 500, error: null },
        { count: 500, error: null },
        { count: 2, error: null },
      ],
    });

    await purgePlanScanEvents(admin, "free", CUTOFF);

    expect(rangeCalls).toEqual([
      [0, 999],
      [1000, 1999],
    ]);
    // 1002 total ids, chunked at 500 -> 500 + 500 + 2, three delete calls
    expect(inCalls).toHaveLength(3);
    expect(inCalls[0]![1]).toHaveLength(500);
    expect(inCalls[1]![1]).toHaveLength(500);
    expect(inCalls[2]![1]).toHaveLength(2);
  });

  it("stops after a single short page (no second range call)", async () => {
    const { admin, rangeCalls } = createAdminMock({
      profilePages: [{ data: [{ qr_codes: [{ id: "only-one" }] }], error: null }],
      deleteResults: [{ count: 1, error: null }],
    });

    await purgePlanScanEvents(admin, "pro", CUTOFF);

    expect(rangeCalls).toEqual([[0, 999]]);
  });

  it("treats a null qr_codes embed (profile with zero codes) as empty", async () => {
    const { admin, inCalls } = createAdminMock({
      profilePages: [{ data: [{ qr_codes: null }], error: null }],
    });

    const total = await purgePlanScanEvents(admin, "free", CUTOFF);

    expect(total).toBe(0);
    expect(inCalls).toHaveLength(0);
  });
});

describe("purgePlanScanEvents — chunking never exceeds 500", () => {
  it("splits 1200 ids into chunks of at most 500", async () => {
    const page = {
      data: Array.from({ length: 1000 }, (_, i) => ({ qr_codes: [{ id: `a-${i}` }] })),
      error: null,
    };
    const shortPage = {
      data: Array.from({ length: 200 }, (_, i) => ({ qr_codes: [{ id: `b-${i}` }] })),
      error: null,
    };
    const { admin, inCalls } = createAdminMock({
      profilePages: [page, shortPage],
      deleteResults: [
        { count: 500, error: null },
        { count: 500, error: null },
        { count: 200, error: null },
      ],
    });

    await purgePlanScanEvents(admin, "pro", CUTOFF);

    for (const [, values] of inCalls) {
      expect(values.length).toBeLessThanOrEqual(500);
    }
    expect(inCalls.map(([, v]) => v.length)).toEqual([500, 500, 200]);
  });
});

describe("purgePlanScanEvents — cutoff and plan passthrough", () => {
  it("filters profiles by the given plan and scan_events by the given cutoff", async () => {
    const { admin, eqCalls, ltCalls, selectCalls } = createAdminMock({
      profilePages: [{ data: [{ qr_codes: [{ id: "id-1" }] }], error: null }],
      deleteResults: [{ count: 1, error: null }],
    });

    await purgePlanScanEvents(admin, "pro", CUTOFF);

    expect(selectCalls).toEqual(["qr_codes(id)"]);
    expect(eqCalls).toEqual([["plan", "pro"]]);
    expect(ltCalls).toEqual([["ts", CUTOFF]]);
  });
});

describe("purgePlanScanEvents — zero codes", () => {
  it("returns 0 and never calls scan_events.delete when the plan owns no codes", async () => {
    const { admin, from } = createAdminMock({
      profilePages: [{ data: [], error: null }],
    });

    const total = await purgePlanScanEvents(admin, "free", CUTOFF);

    expect(total).toBe(0);
    expect(from).toHaveBeenCalledWith("profiles");
    expect(from).not.toHaveBeenCalledWith("scan_events");
  });
});

describe("purgePlanScanEvents — delete count summing", () => {
  it("sums counts across every chunk", async () => {
    const page = {
      data: Array.from({ length: 1000 }, (_, i) => ({ qr_codes: [{ id: `id-${i}` }] })),
      error: null,
    };
    const shortPage = {
      data: [{ qr_codes: [{ id: "id-1000" }] }],
      error: null,
    };
    const { admin } = createAdminMock({
      profilePages: [page, shortPage],
      deleteResults: [
        { count: 300, error: null },
        { count: 450, error: null },
        { count: 1, error: null },
      ],
    });

    const total = await purgePlanScanEvents(admin, "free", CUTOFF);

    expect(total).toBe(751);
  });
});

describe("purgePlanScanEvents — error propagation", () => {
  it("throws when the profiles page returns an error", async () => {
    const { admin } = createAdminMock({
      profilePages: [{ data: [], error: { message: "profiles boom" } }],
    });

    await expect(purgePlanScanEvents(admin, "free", CUTOFF)).rejects.toEqual({
      message: "profiles boom",
    });
  });

  it("throws when a delete chunk returns an error", async () => {
    const { admin } = createAdminMock({
      profilePages: [{ data: [{ qr_codes: [{ id: "id-1" }] }], error: null }],
      deleteResults: [{ count: 0, error: { message: "delete boom" } }],
    });

    await expect(purgePlanScanEvents(admin, "free", CUTOFF)).rejects.toEqual({
      message: "delete boom",
    });
  });
});
