# Tasks

## Sprint 1 — Core Request Engine
**Goal:** Create and view purchase requests against the database. App is demoable without login.
- [ ] Create Supabase project, run migration SQL, verify tables + seed data
- [ ] Set up Next.js project with Tailwind, sidebar shell (desktop) / hamburger (mobile)
- [ ] Build `lib/db/client.ts` — Supabase browser + server clients
- [ ] Build `features/requests/data.ts` — `listRequests()`, `getRequest(id)`
- [ ] Build `features/requests/actions.ts` — `createRequest(formData)`
- [ ] Build request list page (`/`) — table/cards with status badges, category, amount
- [ ] Build new request form (`/requests/new`) — title, description, amount, currency, category dropdown, routine checkbox, vendor
- [ ] Build request detail page (`/requests/[id]`) — all fields, status badge
- [ ] Verify seeded demo rows render on first load (no login)
- [ ] Handle empty state (no requests), loading state, error state

**Definition of Done:** A visitor opens the app URL, sees 5 seeded purchase requests in a list, taps "New Request", fills the form, submits, and the new request appears in the list with status "pending". No login required.

## Sprint 2 — Approval Workflow ← **v1 FUNCTIONAL MILESTONE**
**Goal:** Approve/reject requests with full audit trail. End-to-end success scenario works.
- [ ] Build `features/approvals/data.ts` — `listApprovalsByRequest(id)`
- [ ] Build `features/approvals/actions.ts` — `approveRequest(id, comment)`, `rejectRequest(id, comment)`
- [ ] Approve/reject updates `purchase_requests.status` and inserts `approvals` row in one server action
- [ ] Build `features/audit/data.ts` — `writeAuditLog()`, `listAuditLogs()`
- [ ] Write audit log on every create, approve, reject
- [ ] Add approve/reject buttons + comment field to request detail page
- [ ] Show approval history (decision, comment, timestamp) on request detail
- [ ] Build approvals page (`/approvals`) — list of all pending requests for approvers
- [ ] Handle: already-approved request shows disabled buttons; rejected request shows rejection reason

**Definition of Done:** A visitor creates a request, then from the approvals page (or request detail) approves it with a comment. The request status changes to "approved", the approval history shows the decision + comment + timestamp, and an audit log entry exists for both the creation and the approval. This is the v1 success scenario.

## Sprint 3 — Categories & Audit View
**Goal:** Manage categories and browse the audit trail.
- [ ] Build `features/categories/data.ts` + `actions.ts` — CRUD
- [ ] Build categories page (`/categories`) — list, add, edit
- [ ] Filter requests by status and category on the request list page
- [ ] Build audit page (`/audit`) — chronological log of all actions with entity links
- [ ] Add spending summary card (total pending, total approved) on dashboard

**Definition of Done:** Admin can add a new category and it appears in the request form dropdown. Audit page shows every create/approve/reject action with timestamp and links to the request.

## Sprint 4 — Lock It Down
**Goal:** Real auth + per-user data isolation. App is safe for real company data.
- [ ] Enable Supabase email auth (sign up / log in)
- [ ] Add login/signup pages, protect routes with middleware redirect
- [ ] Replace permissive RLS policies with owner-scoped: `auth.uid() = user_id` for purchase_requests (requesters see own), approvers see all pending
- [ ] Approvals: only users with approver role can insert
- [ ] Audit logs: read-only for all authenticated; no update/delete
- [ ] Seed data updated to include demo user IDs
- [ ] Test: requester A cannot see requester B's requests

**Definition of Done:** Two different users log in. User A creates a request — User B does not see it in their list (unless B is an approver). All writes require authentication. No anonymous access.

---

## Gantt

| Task | S1 | S2 | S3 | S4 |
|------|----|----|----|----|
| DB + migration | ███ | | | |
| Sidebar shell + layout | ███ | | | |
| Request list + form + detail | ███ | | | |
| Seed data (demo) | ███ | | | |
| Approve/reject actions | | ███ | | |
| Approval history UI | | ███ | | |
| Audit log writes | | ███ | | |
| Approvals queue page | | ███ | | |
| Category CRUD + page | | | ███ | |
| Request filtering | | | ███ | |
| Audit trail page | | | ███ | |
| Spending summary | | | ███ | |
| Auth + login/signup | | | | ███ |
| Owner-scoped RLS | | | | ███ |
| Role-based approvals | | | | ███ |
