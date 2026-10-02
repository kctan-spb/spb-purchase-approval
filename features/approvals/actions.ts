"use server";

import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db/client";
import { writeAuditLog } from "@/features/audit/data";
import type { FormState } from "@/lib/db/types";

type Decision = "approved" | "rejected";

async function decide(
  requestId: string,
  decision: Decision,
  comment: string,
  approver: string,
): Promise<FormState> {
  const values = { comment, approver };
  if (!approver) return { fieldErrors: { approver: "Enter your name." }, values };
  if (decision === "rejected" && !comment)
    return { fieldErrors: { comment: "A reason is required when rejecting." }, values };

  try {
    const db = await getDb();

    const { data: current, error: readErr } = await db
      .from("purchase_requests")
      .select("id, status")
      .eq("id", requestId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (!current) return { error: "Request not found.", values };
    if (current.status !== "pending")
      return { error: `This request has already been ${current.status}.`, values };

    // One decision per request: the unique index on approvals.request_id guards races.
    const { error: insErr } = await db
      .from("approvals")
      .insert({ request_id: requestId, decision, comment: comment || null });
    if (insErr) {
      if (insErr.code === "23505")
        return { error: "This request has already been decided.", values };
      throw insErr;
    }

    const { data: updated, error: updErr } = await db
      .from("purchase_requests")
      .update({ status: decision })
      .eq("id", requestId)
      .eq("status", "pending")
      .select("id");
    if (updErr) throw updErr;
    if (!updated || updated.length === 0)
      return { error: "This request is no longer pending.", values };

    await writeAuditLog({
      action: decision === "approved" ? "approve" : "reject",
      entity_id: requestId,
      details: { decision, comment: comment || null, approver },
    });
  } catch {
    return { error: "Could not save your decision. Please try again.", values };
  }

  revalidatePath("/");
  revalidatePath("/approvals");
  revalidatePath("/audit");
  revalidatePath(`/requests/${requestId}`);
  return { values: {}, error: undefined, fieldErrors: undefined };
}

export async function decideRequest(
  requestId: string,
  _prev: FormState,
  fd: FormData,
): Promise<FormState> {
  const decision = String(fd.get("decision")) === "rejected" ? "rejected" : "approved";
  return decide(
    requestId,
    decision,
    String(fd.get("comment") ?? "").trim(),
    String(fd.get("approver") ?? "").trim(),
  );
}

export async function approveRequest(id: string, comment: string, approver: string) {
  return decide(id, "approved", comment.trim(), approver.trim());
}

export async function rejectRequest(id: string, comment: string, approver: string) {
  return decide(id, "rejected", comment.trim(), approver.trim());
}
