import { describe, expect, it } from "vitest";
import { renderStatusPage } from "../src/render";
import type { ProbeResult } from "../src/evaluate";

const PASS: ProbeResult = { id: "a", label: "Probe A", status: "pass", detail: "all good", latencyMs: 12 };
const FAIL: ProbeResult = { id: "b", label: "Probe B", status: "fail", detail: "went bad", latencyMs: 34 };

describe("renderStatusPage", () => {
  it("renders every probe's label, status, and latency", () => {
    const html = renderStatusPage([PASS, FAIL], "attention", new Date("2026-08-01T00:00:00Z"));
    expect(html).toContain("Probe A");
    expect(html).toContain("Probe B");
    expect(html).toContain("12ms");
    expect(html).toContain("34ms");
  });

  it("reflects overall ok vs attention in the headline", () => {
    expect(renderStatusPage([PASS], "ok", new Date())).toContain("All systems normal");
    expect(renderStatusPage([PASS, FAIL], "attention", new Date())).toContain("Needs attention");
  });

  it("escapes probe detail text rather than interpolating it raw", () => {
    const hostile: ProbeResult = {
      id: "c",
      label: "X",
      status: "fail",
      detail: "<script>alert(1)</script>",
      latencyMs: 1,
    };
    const html = renderStatusPage([hostile], "attention", new Date());
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("states plainly that it carries no history or uptime bars — a live check only, by design", () => {
    const html = renderStatusPage([PASS], "ok", new Date());
    expect(html).toContain("No history. No uptime bars.");
  });

  it("links back to the main site", () => {
    expect(renderStatusPage([PASS], "ok", new Date())).toContain("https://www.qrcdn.com");
  });

  it("is a complete, self-contained HTML document with no external asset references", () => {
    const html = renderStatusPage([PASS, FAIL], "attention", new Date());
    expect(html).toContain("<!doctype html>");
    expect(html).not.toMatch(/<link\s+rel=["']stylesheet["']/);
    expect(html).not.toMatch(/<script\s+src=/);
  });
});
