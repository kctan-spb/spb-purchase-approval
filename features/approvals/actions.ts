"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { decisionErrorMessage } from "@/lib/decision";
import type { FormState } from "@/lib/db/types";

// All decision logic (approval row, status change, audit entry, limits, self-approval) runs atomically
// inside the database function decide_request. This action only validates the form and relays errors.
export async function decideRequest(
  requestId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const decision = String(fd.get("decision")) === "rejected" ? "rejected" : "approved";
  const comment = String(fd.get("comment") ?? "").trim();
  const values = { comment };

  if (decision === "rejected" && !comment)
    return { fieldErrors: { comment: "A reason is required when rejecting." }, values };
  if (comment.length > 2000)
    return { fieldErrors: { comment: "Your comment is too long. Keep it under 2,000 characters." }, values };

  const db = await getDb();
  const { error } = await db.rpc("decide_request", {
    p_request: requestId,
    p_decision: decision,
    p_comment: comment || null,
  });
  if (error) {
    const m = decisionErrorMessage(error.message ?? "");
    if (m.field) return { fieldErrors: { [m.field]: m.message }, code: m.code, values };
    return { error: m.message, code: m.code, values };
  }

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/audit");
  revalidatePath(`/requests/${requestId}`);
  return { values: {} };
}
