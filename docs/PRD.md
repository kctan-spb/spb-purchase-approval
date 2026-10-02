# Purchase & Payment Approval App

## Problem
Company staff submit purchase/payment requests on paper or chat, making approval tracking manual, slow, and unaccountable. No single record of who approved what, when, or why.

## Target User
All company staff (requesters) and finance team / authorised signatories (approvers). Staff need fast mobile submission; finance needs a clear, auditable approval trail.

## Core Objects
- **Purchase Request** — title, description, amount, currency, category, routine flag, vendor, status (pending/approved/rejected), AI-suggested category.
- **Approval** — request reference, approver identity, decision (approved/rejected), comment, timestamp.
- **Category** — name (e.g. Office Supplies, Software & SaaS, Travel).
- **Audit Log** — action, entity type, entity ID, details JSON, timestamp.

## MVP (v1) Checklist
- [ ] Submit a purchase/payment request (description, amount, category, routine, vendor)
- [ ] View list of all requests with status badges
- [ ] View request detail with full history
- [ ] Approver can approve or reject a pending request with comment
- [ ] Every create/approve/reject writes an audit log entry
- [ ] Status updates and approval history visible on request detail
- [ ] Mobile-first responsive UI, viewable without login (seeded demo data)
- [ ] Category list seeded and selectable on the form

## Non-Goals (v1)
- Separate public web portal or marketing site
- Budget limits / spending caps
- Multi-level approval chains
- Email or push notifications
- Vendor management module
- Native mobile app

## Success Criteria
A staff member opens the app, fills out a purchase request for "$3,200 office chairs from IKEA, category Equipment, not routine", submits it, and it appears in the pending list. An approver opens the same app, sees the request, approves it with a comment "within Q3 budget", and the request status changes to approved with the approver's name and timestamp recorded in the audit trail — no paper, no chat, full traceability.
