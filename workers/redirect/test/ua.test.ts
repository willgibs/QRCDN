import { describe, expect, it } from "vitest";
import { classifyDevice, isBotUserAgent } from "../src/ua";

const IPHONE_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const IPAD_UA =
  "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE_UA =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET_UA =
  "Mozilla/5.0 (Linux; Android 10; SM-T510) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const DESKTOP_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

describe("isBotUserAgent", () => {
  it("flags common crawler/monitor/tooling UAs", () => {
    expect(isBotUserAgent(GOOGLEBOT_UA)).toBe(true);
    expect(isBotUserAgent("curl/8.4.0")).toBe(true);
    expect(isBotUserAgent("facebookexternalhit/1.1")).toBe(true);
    expect(isBotUserAgent("Slackbot-LinkExpanding 1.0")).toBe(true);
    expect(isBotUserAgent("UptimeRobot/2.0")).toBe(true);
  });

  it("does not flag real browser UAs", () => {
    expect(isBotUserAgent(IPHONE_UA)).toBe(false);
    expect(isBotUserAgent(DESKTOP_UA)).toBe(false);
    expect(isBotUserAgent(ANDROID_PHONE_UA)).toBe(false);
  });

  it("treats a missing UA as bot-like (conservative default)", () => {
    expect(isBotUserAgent(null)).toBe(true);
    expect(isBotUserAgent(undefined)).toBe(true);
    expect(isBotUserAgent("")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isBotUserAgent("MOZILLA/5.0 GOOGLEBOT/2.1")).toBe(true);
  });
});

describe("classifyDevice", () => {
  it("classifies bot UAs as bot", () => {
    expect(classifyDevice(GOOGLEBOT_UA)).toBe("bot");
  });

  it("classifies an iPhone UA as mobile", () => {
    expect(classifyDevice(IPHONE_UA)).toBe("mobile");
  });

  it("classifies an iPad UA as tablet", () => {
    expect(classifyDevice(IPAD_UA)).toBe("tablet");
  });

  it("classifies an Android phone UA (has 'Mobile') as mobile", () => {
    expect(classifyDevice(ANDROID_PHONE_UA)).toBe("mobile");
  });

  it("classifies an Android tablet UA (no 'Mobile' token) as tablet", () => {
    expect(classifyDevice(ANDROID_TABLET_UA)).toBe("tablet");
  });

  it("classifies a plain desktop UA as desktop", () => {
    expect(classifyDevice(DESKTOP_UA)).toBe("desktop");
  });

  it("classifies a missing UA as bot (isBotUserAgent's conservative default wins)", () => {
    expect(classifyDevice(null)).toBe("bot");
  });
});
