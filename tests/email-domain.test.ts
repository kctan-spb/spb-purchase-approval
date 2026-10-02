import test from "node:test";
import assert from "node:assert/strict";
import { isAllowedEmail } from "../lib/email-domain.ts";

test("accepts company addresses (case and spaces ignored)", () => {
  assert.ok(isAllowedEmail("a.b@selangorproperties.com.my"));
  assert.ok(isAllowedEmail("  A@SelangorProperties.com.my "));
});

test("rejects other domains and malformed addresses", () => {
  for (const e of ["a@gmail.com", "a@selangorproperties.com", "@selangorproperties.com.my", "a@sub.selangorproperties.com.my",
    "a@selangorproperties.com.my.evil.com", "a@b@selangorproperties.com.my", "selangorproperties.com.my", ""])
    assert.equal(isAllowedEmail(e), false, e);
});
