import { cache } from "react";
import { getDb } from "@/lib/db/client";

export type AppSettings = {
  defaultApproverLimitMyr: number;
  commentRequiredOverMyr: number;
  attachmentRequiredOverMyr: number;
  allowSelfApproval: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  defaultApproverLimitMyr: 10000,
  commentRequiredOverMyr: 10000,
  attachmentRequiredOverMyr: 5000,
  allowSelfApproval: false,
};

const num = (v: string | undefined, d: number) => {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : d;
};

/** Business rules kept in the app_settings table (readable by every signed-in user). Missing keys use defaults. */
export const getSettings = cache(async (): Promise<AppSettings> => {
  try {
    const db = await getDb();
    const { data, error } = await db.from("app_settings").select("key, value");
    if (error || !data) return DEFAULT_SETTINGS;
    const m = new Map<string, string>(data.map((r: { key: string; value: string }) => [r.key, r.value]));
    return {
      defaultApproverLimitMyr: num(m.get("default_approver_limit_myr"), DEFAULT_SETTINGS.defaultApproverLimitMyr),
      commentRequiredOverMyr: num(m.get("comment_required_over_myr"), DEFAULT_SETTINGS.commentRequiredOverMyr),
      attachmentRequiredOverMyr: num(m.get("attachment_required_over_myr"), DEFAULT_SETTINGS.attachmentRequiredOverMyr),
      allowSelfApproval: (m.get("allow_self_approval") ?? "false").toLowerCase() === "true",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
});
