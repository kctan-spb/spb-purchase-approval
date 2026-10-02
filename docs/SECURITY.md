# Security

## Secret Handling
- Supabase URL and anon key in `NEXT_PUBLIC_*` env vars (safe for client).
- Service role key in `SUPABASE_SERVICE_ROLE_KEY` — server-only, never imported in client components, never exposed in frontend bundles.
- No other secrets in v1.

## Permission Model (End State — reached at lock-down sprint)
- **Requesters** can create requests and view only their own requests.
- **Approvers** can view all pending requests and submit approval decisions.
- **Finance/admin** can view all requests, approvals, and audit logs.
- All enforced via Supabase RLS policies keyed on `auth.uid() = user_id`.
- Agent (later) inherits the requesting user's permissions — never runs as service role for user-facing actions.

## Approved Tools Rule
- Agent may only call named, whitelisted tools (`categorize_request`, `detect_duplicate`, `rank_pending_requests`).
- No raw `run_any` or `send_any` capability. No direct SQL execution from AI layer.
- Tool calls are logged to `audit_logs` with input summary, output, and confidence.

## Audit Principle
- Every meaningful action writes to `audit_logs`: request created, approved, rejected, updated, AI suggestion generated.
- Audit entries are append-only — no UPDATE or DELETE on `audit_logs` (enforced by RLS at lock-down).
- Finance team can always read the full audit trail.

## v1 Note
v1 uses permissive open policies for demo purposes. This is explicitly replaced before any real company data is entered. Do not store sensitive purchase data until the lock-down sprint is complete.
