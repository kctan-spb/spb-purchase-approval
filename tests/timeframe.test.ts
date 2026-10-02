import test from "node:test";
import assert from "node:assert/strict";
import { resolveTimeframe } from "../lib/timeframe.ts";

// 2026-02-15 10:00 MYT
const NOW = Date.parse("2026-02-15T10:00:00+08:00");

test("today / 7d / 30d start at Malaysia midnight", () => {
  assert.equal(resolveTimeframe({ range: "today" }, NOW).from, "2026-02-14T16:00:00.000Z");
  assert.equal(resolveTimeframe({ range: "7d" }, NOW).from, "2026-02-08T16:00:00.000Z");
  assert.equal(resolveTimeframe({ range: "30d" }, NOW).from, "2026-01-16T16:00:00.000Z");
});

test("this month / quarter / year", () => {
  assert.equal(resolveTimeframe({ range: "month" }, NOW).from, "2026-01-31T16:00:00.000Z");
  assert.equal(resolveTimeframe({ range: "quarter" }, NOW).from, "2025-12-31T16:00:00.000Z");
  assert.equal(resolveTimeframe({ range: "year" }, NOW).from, "2025-12-31T16:00:00.000Z");
  const q2 = Date.parse("2026-05-20T09:00:00+08:00");
  assert.equal(resolveTimeframe({ range: "quarter" }, q2).from, "2026-03-31T16:00:00.000Z");
});

test("last month has an exclusive upper bound at the start of this month", () => {
  const t = resolveTimeframe({ range: "lastmonth" }, NOW);
  assert.equal(t.from, "2025-12-31T16:00:00.000Z"); // 1 Jan 2026 00:00 MYT
  assert.equal(t.to, "2026-01-31T16:00:00.000Z"); // 1 Feb 2026 00:00 MYT
});

test("last month in January wraps to December of the previous year", () => {
  const t = resolveTimeframe({ range: "lastmonth" }, Date.parse("2026-01-01T00:30:00+08:00"));
  assert.equal(t.from, "2025-11-30T16:00:00.000Z"); // 1 Dec 2025 00:00 MYT
  assert.equal(t.to, "2025-12-31T16:00:00.000Z"); // 1 Jan 2026 00:00 MYT
});

test("boundary: 00:00 MYT on the 1st belongs to the new month, 23:59 on the last day to the old", () => {
  const justAfter = resolveTimeframe({ range: "month" }, Date.parse("2026-03-01T00:00:00+08:00"));
  assert.equal(justAfter.from, "2026-02-28T16:00:00.000Z");
  const justBefore = resolveTimeframe({ range: "month" }, Date.parse("2026-02-28T23:59:59+08:00"));
  assert.equal(justBefore.from, "2026-01-31T16:00:00.000Z");
});

test("custom range: inclusive from, exclusive next-day to, swapped dates fixed", () => {
  const t = resolveTimeframe({ from: "2026-02-10", to: "2026-02-12" }, NOW);
  assert.equal(t.range, "custom");
  assert.equal(t.from, "2026-02-09T16:00:00.000Z");
  assert.equal(t.to, "2026-02-12T16:00:00.000Z");
  const s = resolveTimeframe({ from: "2026-02-12", to: "2026-02-10" }, NOW);
  assert.equal(s.fromInput, "2026-02-10");
});

test("unknown input falls back to all time", () => {
  const t = resolveTimeframe({ range: "bogus" }, NOW);
  assert.equal(t.range, "all");
  assert.equal(t.from, undefined);
});
