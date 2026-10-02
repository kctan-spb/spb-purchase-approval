# Multi-tenancy

Several companies/teams share one deployment and one Supabase database, fully isolated.
Migration: `supabase/migrations/0003_multitenant.sql` (idempotent, single transaction).

## Model
- `organizations` (id, name, slug unique, invite_code unique, created_at)
- `memberships` (id, org_id, user_id, role `requester|approver|admin`, created_at, unique(org_id, user_id))
- `org_id uuid NOT NULL` (FK organizations) on `categories`, `purchase_requests`, `approvals`, `audit_logs`.
- Uniqueness is per org: `unique(org_id, name)` on categories, `unique(org_id, title)` on requests.
- `approvals (request_id, org_id)` has a composite FK to `purchase_requests (id, org_id)` (added
  NOT VALID: enforced for new rows) so an approval can never point at another org's request.
- A trigger makes `org_id` immutable on all four data tables.

## Roles
Roles are per organization, stored in `memberships`. JWT `app_metadata.role` is no longer read by
the app or by RLS (`app_role()`, `is_approver()`, `is_admin()` are dropped). A role change takes
effect immediately (no re-login needed).

## RLS
Helpers (SECURITY DEFINER, `search_path = public`, use `(select auth.uid())`):
`is_org_member(org)`, `is_org_approver(org)` (approver or admin), `is_org_admin(org)`.

Inside an org the rules are the same as 0002:
- categories: members read; admins insert/update/delete.
- purchase_requests: requesters see/insert their own (status `pending`); approvers/admins see all in the org and update.
- approvals: approvers/admins insert as themselves (request must be in the same org); requesters read decisions on their own requests; immutable.
- audit_logs: members read; members insert as themselves; append-only.
- organizations / memberships: select only. `invite_code` is not selectable (column-level grant);
  admins read it with `get_invite_code`. All writes go through the RPCs below.

## RPCs (authenticated only)
| RPC | Effect |
|---|---|
| `create_organization(p_name)` | creates org, caller becomes admin, seeds 6 default categories, returns org id |
| `join_organization(p_code)` | joins by invite code as `requester`; error `invalid_invite_code` |
| `get_invite_code(p_org)` | admin only (null otherwise) |
| `rotate_invite_code(p_org)` | admin only; invalidates the old code |
| `set_member_role(p_org, p_user, p_role)` | admin only; refuses to demote the last admin |

There is no member-management UI yet. Promote someone to approver via SQL or the RPC, e.g.
`select set_member_role('<org>', '<user>', 'approver');` (as that admin), or as owner:
`update memberships set role='approver' where org_id='<org>' and user_id='<user>';`

## App behaviour
- `lib/auth.ts`: `getCurrentUser()` returns `orgId`, `orgName`, `role` (membership role in the active org),
  `orgs` (all memberships). `getOrgUser()` returns null without an org (actions); `requireOrgUser()` redirects
  to `/login` or `/onboarding` (pages/data).
- Active org = `active_org` cookie (httpOnly), validated against the user's memberships, else the first membership.
- 0 memberships -> `/onboarding` (create org / join with code). >1 -> org switcher in the sidebar.
  Admins see the invite code in the sidebar.
- Every query filters by `org_id` explicitly (needed because a user in several orgs would otherwise
  see all of them through RLS) and every insert sets `org_id`. RLS remains the real security boundary.
- Middleware: `/onboarding` requires sign-in but no org.

## Existing data
All existing rows go to the default org "Selangor Properties" (slug `selangor-properties`). On the first run,
every existing `auth.users` row becomes a member of it, with the role from `app_metadata.role`
(`admin`/`approver`, else `requester`). Users who sign up afterwards start with no org.

## Testing
A commented-out RLS test script is at the bottom of the migration (rolls back via a final exception).
