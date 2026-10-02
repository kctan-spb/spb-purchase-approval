import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount } from "../lib/money.ts";

const ok = (s: string, v: number) => {
  const r = parseAmount(s);
  assert.ok(r.ok, `${s} should parse`);
  assert.equal(r.ok && r.value, v);
};
const bad = (s: string | null | undefined) => assert.equal(parseAmount(s).ok, false, `${s} should be rejected`);

test("accepts plain and formatted amounts", () => {
  ok("1200", 1200);
  ok("1,200.50", 1200.5);
  ok("1200.5", 1200.5);
  ok("0.01", 0.01);
  ok("  RM 1,200.50 ", 1200.5);
  ok("rm1200", 1200);
  ok("MYR 99", 99);
  ok("USD 2,000", 2000);
  ok("$ 15.25", 15.25);
  ok("999,999,999.99", 999999999.99);
});

test("rejects malformed amounts", () => {
  for (const s of ["", "  ", null, undefined, "1e3", "0x10", "1.234,56", "1,2,3", "12,34", "1,234,56", "1.234", "1.2345",
    "0", "0.00", "-5", "-RM 5", "abc", "RM", "1 000", "999,999,999.995", "1000000000", "1,000,000,000.00", "1..2", "1.", ".5", "NaN", "Infinity"])
    bad(s);
});

test("returns a fixed 2-decimal text", () => {
  const r = parseAmount("1,200.5");
  assert.ok(r.ok && r.text === "1200.50");
});
