"use client";

import { useState } from "react";
import { RANGES, type Range } from "@/lib/timeframe";

const field = "field min-w-0 sm:w-auto";

// Form fields (range select + custom dates) for a GET filter form.
export function TimeFrameFields({
  range,
  from,
  to,
}: {
  range: Range;
  from: string;
  to: string;
}) {
  const [value, setValue] = useState<Range>(range);
  return (
    <>
      <select
        name="range"
        value={value}
        onChange={(e) => setValue(e.target.value as Range)}
        className={`${field} sm:max-w-56`}
        aria-label="Time frame"
      >
        {RANGES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      {value === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-muted">
            From
            <input type="date" name="from" defaultValue={from} className={field} />
          </label>
          <label className="flex items-center gap-2 text-sm text-muted">
            To
            <input type="date" name="to" defaultValue={to} className={field} />
          </label>
        </div>
      )}
    </>
  );
}
