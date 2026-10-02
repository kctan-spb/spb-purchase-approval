# Data Model

## purchase_requests
| Field | Type | Notes |
|------|------|-------|
| id | uuid PK | `gen_random_uuid()` |
| user_id | uuid nullable | owner-scoping at lock-down |
| title | text not null | short summary |
| description | text not null | full details of purchase |
| amount | numeric not null | decimal amount |
| currency | text not null | default 'USD' |
| category | text | selected category name |
| routine | boolean default false | is this a recurring/routine purchase? |
| status | text not null | 'pending' \| 'approved' \| 'rejected' |
| vendor | text | supplier name |
| ai_category | text | AI-suggested category |
| ai_category_source | text | e.g. 'openai:gpt-4o' |
| ai_category_confidence | numeric | 0–1 |
| ai_category_review_status | text | default 'unreviewed' |
| created_at | timestamptz | default now() |

**Relationships:** Has many `approvals`. Has many `audit_logs` (via entity_id).

## approvals
| Field | Type | Notes |
|------|------|-------|
| id | uuid PK | |
| user_id | uuid nullable | approver identity (later) |
| request_id | uuid not null | references purchase_requests.id |
| decision | text not null | 'approved' \| 'rejected' |
| comment | text | approver note |
| created_at | timestamptz | default now() |

**Relationships:** Belongs to `purchase_requests`. Unique per request in v1 (one approval decision per request).

## categories
| Field | Type | Notes |
|------|------|-------|
| id | uuid PK | |
| user_id | uuid nullable | |
| name | text not null unique | |
| created_at | timestamptz | default now() |

## audit_logs
| Field | Type | Notes |
|------|------|-------|
| id | uuid PK | |
| user_id | uuid nullable | |
| action | text not null | 'create' \| 'approve' \| 'reject' \| 'update' |
| entity_type | text not null | 'purchase_request' |
| entity_id | uuid | references the affected row |
| details | jsonb | snapshot of relevant fields |
| created_at | timestamptz | default now() |

## RLS / Permissions
- **v1 (demo-first):** All tables — permissive read + write for anonymous. App renders with seed data, no login wall.
- **Lock-down sprint:** `purchase_requests` — owner sees own requests; approvers see all pending. `approvals` — only approvers can insert. `audit_logs` — read-only for all authenticated users. `categories` — read for all, write for admins.
