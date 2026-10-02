export type RequestStatus = "pending" | "approved" | "rejected";

export type PurchaseRequest = {
  id: string;
  org_id: string;
  user_id: string | null;
  title: string;
  description: string;
  amount: number;
  currency: string;
  category: string | null;
  routine: boolean;
  status: RequestStatus;
  vendor: string | null;
  ai_category: string | null;
  ai_category_source: string | null;
  ai_category_confidence: number | null;
  ai_category_review_status: string | null;
  created_at: string;
};

export type Approval = {
  id: string;
  org_id: string;
  user_id: string | null;
  request_id: string;
  decision: "approved" | "rejected";
  comment: string | null;
  created_at: string;
};

export type Category = {
  id: string;
  org_id: string;
  user_id: string | null;
  name: string;
  created_at: string;
};

export type AuditLog = {
  id: string;
  org_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export type FormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
};
