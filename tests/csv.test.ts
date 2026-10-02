import test from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "../lib/csv.ts";

test("writes BOM, CRLF and quotes special cells", () => {
  const out = toCsv(["a", "b"], [["x,y", 'he said "hi"'], ["line\nbreak", 3]]);
  assert.ok(out.startsWith("﻿"));
  assert.equal(out, '﻿a,b\r\n"x,y","he said ""hi"""\r\n"line\nbreak",3\r\n');
});

test("neutralises spreadsheet formulas in strings only", () => {
  const out = toCsv(["v"], [["=1+1"], ["+SUM(A1)"], ["-5x"], ["@cmd"], [-5]]);
  assert.ok(out.includes("'=1+1"));
  assert.ok(out.includes("'+SUM(A1)"));
  assert.ok(out.includes("'-5x"));
  assert.ok(out.includes("'@cmd"));
  assert.ok(out.endsWith("\r\n-5\r\n"));
});

test("null and undefined are empty; objects become JSON", () => {
  assert.equal(toCsv(["a", "b", "c"], [[null, undefined, { k: 1 }]]), '﻿a,b,c\r\n,,"{""k"":1}"\r\n');
});
