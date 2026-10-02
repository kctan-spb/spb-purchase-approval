# Test Plan

## v1 Success Scenario (Manual)
1. Open the app URL in a mobile-width browser (375px). Verify the sidebar collapses to a hamburger menu.
2. Verify 5 seeded purchase requests appear in the list with status badges (pending, approved, rejected).
3. Tap "New Request" in the sidebar.
4. Fill form: Title = "Laptop stand for new hire", Description = "Rain laptop stand for engineering onboarding", Amount = "45.00", Category = "Office Supplies", Routine = unchecked, Vendor = "Amazon".
5. Tap Submit. Verify redirect to request detail page showing all entered fields and status "pending".
6. Navigate to Approvals page. Verify the new request appears in the pending list.
7. Tap the request. Verify detail page shows an Approve button and Reject button.
8. Tap Approve. Enter comment "Approved — onboarding expense". Submit.
9. Verify request status changes to "approved". Verify approval history shows decision, comment, and timestamp.
10. Navigate to Audit page. Verify two entries: one for request creation, one for approval. Both link to the request.

## Empty State
- If all requests are deleted (or DB cleared): request list shows "No purchase requests yet. Create one to get started." with a visible "New Request" button.
- Approvals page with no pending requests: "No pending approvals. All caught up!"
- Audit page with no logs: "No activity recorded yet."

## Error State
- Submit form with empty title or amount = 0: form shows inline validation error, no submission.
- Network failure on submit: error toast "Could not submit request. Check your connection and try again." Form retains entered data.
- Approve a request that is already approved: buttons are disabled, message shows "This request has already been approved."

## Loading State
- Request list: skeleton cards while data loads.
- Request detail: spinner with "Loading request..." before data arrives.
- Form submit: button shows "Submitting..." and is disabled until response.

## Responsive Check
- Desktop (1280px): sidebar visible with all nav items.
- Tablet (768px): sidebar visible but narrower.
- Mobile (375px): sidebar hidden, hamburger menu opens overlay with nav items.

## RLS Check (Sprint 4 only)
- Log in as User A, create a request. Log out, log in as User B. User B does NOT see User A's request in the list.
- User B (if approver) sees all pending requests including User A's.
- Anonymous access is blocked — redirects to login.
