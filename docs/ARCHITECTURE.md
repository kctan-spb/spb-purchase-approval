# Architecture

## Stack
- **Next.js 14** (App Router, server components, server actions)
- **Supabase** (Postgres, RLS, optional auth in later sprint)
- **Vercel** (deployment)
- **Tailwind CSS** (mobile-first responsive)

## Build Now vs Later
- **Now:** Request submission → approval flow → audit trail. Mobile-first responsive web app, seeded demo data, no login wall.
- **Later:** Auth + per-user data isolation, approval routing rules, spending dashboard, email notifications, AI auto-categorization, native mobile app.

## Key User Action Flow
1. Staff opens app → sees request list (seeded demo rows visible)
2. Taps "New Request" → fills form (title, description, amount, category, routine, vendor)
3. Submits → row inserted in `purchase_requests`, status = pending, audit log written
4. Approver opens app → sees pending requests → taps one → detail view
5. Approver taps Approve (or Reject) + enters comment → `approvals` row inserted, request status updated, audit log written
6. Request detail now shows approval decision, approver, timestamp, comment

## Responsive Nav Shell
Multi-page app → persistent left sidebar on desktop (Requests, Approvals, Categories, Audit), collapses to hamburger menu on mobile. Current section highlighted. Keyboard-accessible.

## Layer Plan
1. **Data layer** (`lib/db/`) — Supabase client + all queries/mutations. Core works with this alone.
2. **App logic** (server actions in `features/*/actions.ts`) — validation, status transitions, audit writes.
3. **Smart features** (`lib/ai/`) — auto-categorization, duplicate detection. Optional; core runs without it.

## Why Core Works Without AI
Every request is created, submitted, approved, and audited through direct DB writes and server actions. AI categorization is an enhancement — if the AI module is absent, the user manually selects a category. No workflow step depends on AI output.

## Repo Structure
```
src/
  features/
    requests/
      components/    # RequestForm, RequestList, RequestDetail
      actions.ts     # createRequest, updateRequest
      data.ts         # getRequest, listRequests
    approvals/
      components/    # ApprovalButton, ApprovalHistory
      actions.ts     # approveRequest, rejectRequest
      data.ts         # listApprovalsByRequest
    categories/
      components/    # CategorySelect, CategoryManager
      actions.ts     # createCategory, updateCategory
      data.ts         # listCategories
    audit/
      components/    # AuditLogList
      data.ts         # listAuditLogs, writeAuditLog
  lib/
    db/client.ts     # Supabase client
    ai/categorize.ts # Auto-categorization (later)
  components/
    shell/Sidebar.tsx
  app/
    layout.tsx
    page.tsx           # Dashboard / request list
    requests/
      new/page.tsx
      [id]/page.tsx
    approvals/page.tsx
    categories/page.tsx
    audit/page.tsx
```

## Module Map

| Module | Responsibility | Owns | Build Order |
|--------|---------------|------|-------------|
| **requests** | Create, list, view purchase requests | `purchase_requests` table | 1st |
| **approvals** | Approve/reject decisions, approval history | `approvals` table | 2nd |
| **categories** | Category CRUD and selection | `categories` table | 3rd |
| **audit** | Write and display audit trail | `audit_logs` table | alongside all |
| **ai** (later) | Auto-categorize, duplicate detection | AI logic only | last |
