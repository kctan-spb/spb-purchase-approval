import { formatMoney } from "@/lib/format";

export const MSG_SELF = "You raised this request, so another approver must decide it.";
export const MSG_OVER_LIMIT = "This is above your approval limit. A higher approver must decide it.";

/**
 * Why the signed-in person cannot decide a pending request, or null if they can.
 * This only explains things in the UI; the database (decide_request) is the real enforcement.
 * `limitMyr` null = unlimited.
 */
export function whyCannotDecide(args: {
  canApprove: boolean;
  isOwn: boolean;
  allowSelfApproval: boolean;
  amountMyr: number | null;
  limitMyr: number | null;
}): string | null {
  if (!args.canApprove) return "Only approvers can approve or reject requests. An approver will review this one.";
  if (args.isOwn && !args.allowSelfApproval) return MSG_SELF;
  if (args.limitMyr !== null) {
    if (args.amountMyr === null)
      return "This request has no MYR value recorded, so a higher approver must decide it.";
    if (args.amountMyr > args.limitMyr)
      return `This is above your approval limit of ${formatMoney(args.limitMyr, "MYR")}. A higher approver must decide it.`;
  }
  return null;
}

/** Plain-English text for an error raised by the decide_request database function. */
export function decisionErrorMessage(raw: string): { message: string; code: string; field?: "comment" } {
  const has = (c: string) => raw.includes(c);
  if (has("not_authenticated")) return { code: "not_authenticated", message: "Your session has expired. Please sign in again." };
  if (has("self_approval")) return { code: "self_approval", message: MSG_SELF };
  if (has("over_limit")) return { code: "over_limit", message: MSG_OVER_LIMIT };
  if (has("comment_required"))
    return { code: "comment_required", field: "comment", message: "A comment is required. Rejections always need a reason, and approvals of large amounts need a comment." };
  if (has("comment_too_long")) return { code: "comment_too_long", field: "comment", message: "Your comment is too long. Keep it under 2,000 characters." };
  if (has("already_decided"))
    return { code: "already_decided", message: "Someone has already decided this request. Refresh the page to see the decision." };
  if (has("not_found")) return { code: "not_found", message: "This request could not be found. It may have been removed." };
  if (has("invalid_decision")) return { code: "invalid_decision", message: "Choose Approve or Reject." };
  if (has("forbidden")) return { code: "forbidden", message: "Only approvers can approve or reject requests." };
  return { code: "unknown", message: "Could not save your decision. Please try again." };
}
