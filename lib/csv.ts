// Minimal RFC 4180 CSV writer. Cells starting with = + - @ (or tab/CR) are prefixed with an
// apostrophe so spreadsheet apps don't execute them as formulas (CSV injection).
function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(cell).join(","), ...rows.map((r) => r.map(cell).join(","))];
  // BOM so Excel opens UTF-8 correctly; CRLF line endings per the RFC.
  return "﻿" + lines.join("\r\n") + "\r\n";
}
