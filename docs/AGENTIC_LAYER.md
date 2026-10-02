# Agentic Layer

## Risk Levels & Actions

### Low Risk — Auto
- **Auto-categorize** — suggest category from description text → populate `ai_category` fields. No user action needed.
- **Auto-tag routine** — detect recurring purchase keywords → suggest `routine = true`.
- **Draft approval comment** — generate a summary of request for approver review.

### Medium Risk — Light Approval
- **Auto-assign approver** — route request to approver based on category/amount thresholds. Requires approver confirmation.
- **Update status to "under review"** — mark request as seen by an approver.

### High Risk — Approval Required
- **Send notification to approver** — email or push when new high-value request submitted.
- **Escalate stale request** — flag requests pending > 5 days to finance lead.

### Critical — Human Only
- **Delete request** — never automated; requires manual action.
- **Reverse / override approval** — human-only; logged with reason.
- **Refund / financial reconciliation** — never automated.

## Named Tools
- `categorize_request(description) → category` — text classification
- `detect_duplicate(request) → similarity_score` — similarity check
- `rank_pending_requests() → sorted_list` — priority ordering

## Audit Log Fields (every agentic action)
- `action` — what the agent did (e.g. 'ai.categorize')
- `entity_type` — 'purchase_request'
- `entity_id` — request ID
- `details` — `{ tool, input_summary, output, confidence, approved_by }`

## v1 vs Later
- **v1:** No agentic actions. All decisions are manual human actions.
- **Later:** Auto-categorization on submit, duplicate warnings, priority ranking of pending queue, stale-request escalation.
