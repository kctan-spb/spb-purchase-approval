# Security

This describes the control model after migration `0007_hardening.sql`. The database is the enforcement point; the
app only presents it and explains refusals in plain English.

## Secret handling
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public by design (safe in the browser).
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and is not used by the app code. Every user-facing action runs with the
  signed-in user's own session (cookie client), never as the service role.
- Redirect links in sign-up and password-reset emails are built from `NEXT_PUBLIC_APP_URL` (the request origin is only a
  fallback when it is unset).
- No third-party payment code remains (the Stripe template was removed).

## Who can do what (enforced by row-level security and database functions)
- **Staff (requester):** submit requests, attach files while a request is pending, and see only their own requests,
  attachments and activity.
- **Approver:** sees all requests; decides requests up to their own approval limit (default from `app_settings`
  `default_approver_limit_myr`, optionally set per person). Sees the full audit trail and may export it.
- **Admin:** everything an approver can, with no limit by default, plus categories and users (roles and limits).
- Roles are read from the database by the policies, not trusted from the browser token. A role or limit change applies
  immediately for database access; the person's screen updates on their next page load.

## Approval rules (`decide_request`, one atomic database function)
- **Self-approval is blocked:** you cannot decide a request you raised (`allow_self_approval` setting, default false).
- **Limits:** a request whose MYR amount is above the approver's limit, or has no MYR amount, needs a higher approver.
- **Comments:** rejecting always needs a reason; approving needs a comment at or above `comment_required_over_myr` (or when
  the MYR amount is unknown). Comments are capped at 2,000 characters. The app adds an explicit confirmation step for
  large approvals.
- **One decision per request:** deciding twice returns `already_decided`.
- The function writes the approval row, the status change and the audit entry together or not at all.

## Audit and immutability
- All audit rows are written by database triggers and functions (request created, approved/rejected, category changes,
  role and limit changes, CSV exports). The app has no audit write code and the `authenticated` role cannot insert,
  update or delete `audit_logs`.
- Clients cannot update or delete `purchase_requests`, cannot insert `approvals`, and cannot change decisions. Requester
  name/email and approver name/email are stamped by the database.
- Requesters see only audit rows about their own requests and actions; approvers and admins see everything.
- **Exports are logged before data is returned.** If `log_export` fails the export fails (HTTP 500). Audit exports are
  approvers/admins only (HTTP 403 otherwise). Exports are capped at 20,000 rows (HTTP 413) and the file name carries the row count.

## Attachments
- Private Storage bucket `attachments` (PDF, JPEG, PNG, WebP; 4 MB per file in the bucket, 3 files and 4 MB in total in
  the app because of Vercel's request body limit). Objects live under `<user id>/<request id>/<uuid>-<filename>`.
- Uploads and downloads use the user's own session; downloads are 300-second signed links opened in a new tab.
- Attachments are required at or above `attachment_required_over_myr` (app check; the app validates type, count and size).

## Web hardening
- Response headers on every route: `Strict-Transport-Security` (2 years, subdomains), `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`, `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy` (camera, microphone, geolocation off). `X-Powered-By` is removed.
- A full Content-Security-Policy is intentionally not set: it would block Next.js inline scripts without a nonce setup.
- Sign-up is limited to `@selangorproperties.com.my` (app check plus a database trigger from migration 0006).
- TypeScript errors now fail the build.

## Not covered (known gaps)
- **No multi-factor authentication** for any role, including admins.
- **No email notifications**: approvers are not told when something is waiting, and requesters are not told about a decision.
- **No session revocation tool**: removing a person's access relies on Supabase auth settings; existing sessions stay
  valid until they expire. Role removal does take effect in the database immediately.
- No malware scanning of uploads (type and size are checked only).
- Exchange rates are typed by the requester; the MYR equivalent is not verified.
- No full CSP, no rate limiting beyond Supabase's own, and no backup/restore procedure documented here.
