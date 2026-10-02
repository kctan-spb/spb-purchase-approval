export type RequestStatus = "pending" | "approved" | "rejected";

export type PurchaseRequest = {
  id: string;
  user_id: string | null;
  title: string;
  description: string;
  amount: number;
  currency: string;
  /** MYR equivalent. Equals amount for MYR requests; null only for old rows that never had one. */
  amount_myr: number | null;
  category: string | null;
  routine: boolean;
  status: RequestStatus;
  vendor: string | null;
  requester_name: string | null;
  requester_email: string | null;
  ai_category: string | null;
  ai_category_source: string | null;
  ai_category_confidence: number | null;
  ai_category_review_status: string | null;
  created_at: string;
};

export type Approval = {
  id: string;
  user_id: string | null;
  request_id: string;
  decision: "approved" | "rejected";
  comment: string | null;
  approver_name: string | null;
  approver_email: string | null;
  created_at: string;
};

export type Attachment = {
  id: string;
  request_id: string;
  user_id: string;
  path: string;
  filename: string;
  content_type: string;
  size_bytes: number;
  created_at: string;
};

export type Category = {
  id: string;
  user_id: string | null;
  name: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type FormState = {
  error?: string;
  /** Machine-readable reason for the error, when the UI needs to react (e.g. "already_decided"). */
  code?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};
