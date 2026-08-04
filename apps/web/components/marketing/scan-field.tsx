import { PLAN_LIMITS } from "@/lib/entitlements";

/**
 * The analytics body (P9.7-V5), replacing `DashboardWindow` on the landing.
 *
 * WHY. The window was a competent fake screenshot, and that was the problem:
 * browser chrome with traffic lights and a URL pill, a header bar, range
 * pills, an area chart, three stat tiles and two bar lists, all at uniform
 * weight. Swap the labels and it is an email tool. Nothing about it was
 * QR-native, and the one fact only QR analytics can claim, that a scan is a
 * discrete physical event with a place and a moment, appeared nowhere.
 *
 * WHAT REPLACES IT. Each mark is one scan. Not an area chart of a rolled-up
 * number, the events themselves stacked by day, so density carries the story
 * and a poster weekend is visible without a label explaining it. That is the
 * one analytics visual a link shortener cannot copy, because their events are
 * not physical.
 *
 * `DashboardWindow` stays exactly as it is for /features/analytics, where a
 * product shot is the right thing to show. This is a landing-only component,
 * so that page is untouched.
 *
 * Every figure is authored and fixed. Never `Math.random()` or `new Date()` in
 * a server component: the first bakes one roll into the HTML forever, the
 * second bakes a build timestamp. The shape of this campaign is a design
 * decision, so it is written down. Retention is the one number read from
 * `entitlements.ts`, because it is a real entitlement and must never be
 * retyped (CLAUDE.md hard rule).
 */

/** 30 days of a plausible campaign: a quiet start, the weekend a poster went
 *  up, then a decaying tail. Authored, not generated. */
const DAYS: readonly number[] = [
  34, 41, 38, 47, 44, 61, 55, 52, 58, 63, 71, 96, 148, 231, 198, 142, 112, 94, 88, 79, 74, 68, 71,
  64, 59, 62, 55, 51, 48, 46,
];

const TOTAL = DAYS.reduce((a, b) => a + b, 0);
const PEAK = DAYS.indexOf(Math.max(...DAYS));
const MAX = Math.max(...DAYS);
/** Uniques derive from the same series so the two figures can never
 *  contradict each other, which is a thing real dashboards get wrong. */
const UNIQUES = Math.round(TOTAL * 0.71);

const COUNTRIES = [
  { label: "United States", pct: 67 },
  { label: "United Kingdom", pct: 19 },
  { label: "Germany", pct: 9 },
] as const;

const DEVICES = [
  { label: "Mobile", pct: 81 },
  { label: "Desktop", pct: 12 },
  { label: "Tablet", pct: 7 },
] as const;

/**
 * Each mark is one scan, drawn as two SVG paths rather than 2,350 DOM nodes:
 * one path for the field, one for the days around the peak. An earlier draft
 * stacked full-width rows per day, which looked like a bar chart and made
 * "each mark is one scan" a claim rather than something you can see.
 */
const PER_ROW = 9;
const VB_W = 1000;
const VB_H = 168;
/** Headroom the peak flag lives in, so a label can never sit on a column. */
const TOP_PAD = 26;

function buildField() {
  const colW = VB_W / DAYS.length;
  const markW = colW * 0.46;
  const maxRows = Math.ceil(MAX / PER_ROW);
  const rowH = (VB_H - TOP_PAD) / maxRows;
  const w = (markW / PER_ROW) * 0.92;
  const h = Math.max(1.2, rowH * 0.5);

  let field = "";
  let hot = "";
  DAYS.forEach((count, day) => {
    const cx = day * colW + colW / 2;
    const near = Math.abs(day - PEAK) <= 2;
    for (let n = 0; n < count; n++) {
      const row = Math.floor(n / PER_ROW);
      const col = n % PER_ROW;
      const x = cx - markW / 2 + (col - (PER_ROW - 1) / 2) * (markW / PER_ROW) * 1.15;
      const y = VB_H - 2 - row * rowH - rowH * 0.35;
      const seg = `M${x.toFixed(1)} ${y.toFixed(1)}h${w.toFixed(2)}v${h.toFixed(2)}h-${w.toFixed(2)}z`;
      if (near) hot += seg;
      else field += seg;
    }
  });
  return { field, hot, peakX: PEAK * colW + colW / 2 };
}

const FIELD = buildField();

function Field() {
  // The peak flag is real HTML in the TOP_PAD headroom, not SVG <text>: the
  // field below stretches horizontally (`preserveAspectRatio="none"`), and
  // type inside a non-uniformly scaled viewBox distorts at every width except
  // exactly 1000px — crushed to ~1/3 width at 390. Rects survive stretching;
  // words do not. Same lesson as dashboard-window's own preserveAspectRatio
  // fix (P9.7-V5b), applied to the half of this figure that carries text.
  const peakLeft = `${((FIELD.peakX / VB_W) * 100).toFixed(2)}%`;
  return (
    <div className="border-y border-border py-5">
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute top-0 z-10 -translate-x-1/2 text-center"
          style={{ left: peakLeft }}
        >
          <span className="block font-mono text-[12px] leading-none whitespace-nowrap text-foreground">
            {MAX} scans
          </span>
          <span className="mt-[3px] block font-mono text-[10px] leading-none whitespace-nowrap text-muted-foreground">
            posters went up
          </span>
        </div>
        <svg
          viewBox={`0 0 ${VB_W} ${VB_H}`}
          preserveAspectRatio="none"
          className="block h-[168px] w-full"
          role="img"
          aria-label={`Thirty days of scans, each mark one scan, peaking at ${MAX} on the day a poster campaign went up.`}
        >
          <path d={FIELD.field} className="fill-foreground" opacity={0.32} />
          <path d={FIELD.hot} className="fill-primary" opacity={0.95} />
        </svg>
      </div>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: readonly { label: string; pct: number }[];
}) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.16em] text-muted-foreground uppercase">
        {title}
      </p>
      <div className="mt-3 flex flex-col gap-2.5">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center gap-3 text-sm">
            <span className="w-[7.5rem] shrink-0 whitespace-nowrap text-muted-foreground">
              {r.label}
            </span>
            <span className="h-[3px] min-w-0 flex-1 rounded-sm bg-border">
              <span
                className="block h-full rounded-sm bg-primary"
                style={{ width: `${r.pct}%` }}
              />
            </span>
            <span className="w-9 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground">
              {r.pct}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ScanField() {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-display text-h2 font-semibold tabular-nums text-foreground">
          {TOTAL.toLocaleString("en-US")}
        </span>
        <span className="font-mono text-[12px] text-muted-foreground">
          scans · 30 days · {UNIQUES.toLocaleString("en-US")} unique devices
        </span>
      </div>

      <div className="mt-6">
        <Field />
      </div>

      <div className="mt-8 grid gap-8 sm:grid-cols-2 sm:gap-12">
        <Breakdown title="Top countries" rows={COUNTRIES} />
        <Breakdown title="Devices" rows={DEVICES} />
      </div>

      <p className="mt-8 font-mono text-[11px] text-muted-foreground">
        {PLAN_LIMITS.free.analyticsRetentionDays}-day history free ·{" "}
        {PLAN_LIMITS.pro.analyticsRetentionDays}-day + city-level on Pro
      </p>
    </div>
  );
}
