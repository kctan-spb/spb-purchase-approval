-- Categories
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists categories_name_key on categories (name);

-- Purchase requests
create table if not exists purchase_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  title text not null,
  description text not null,
  amount numeric not null,
  currency text not null default 'USD',
  category text,
  routine boolean not null default false,
  status text not null default 'pending',
  vendor text,
  ai_category text,
  ai_category_source text,
  ai_category_confidence numeric,
  ai_category_review_status text default 'unreviewed',
  created_at timestamptz not null default now()
);
create unique index if not exists purchase_requests_title_key on purchase_requests (title);

-- Approvals (one decision per request in v1)
create table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  request_id uuid not null,
  decision text not null,
  comment text,
  created_at timestamptz not null default now()
);
create unique index if not exists approvals_request_id_key on approvals (request_id);

-- Audit logs
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_entity_idx on audit_logs (entity_type, entity_id, action);

-- RLS (v1 demo-first: permissive; replaced in Sprint 4)
alter table categories enable row level security;
alter table purchase_requests enable row level security;
alter table approvals enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "categories_v1_read" on categories;
create policy "categories_v1_read" on categories for select using (true);
drop policy if exists "categories_v1_write" on categories;
create policy "categories_v1_write" on categories for all using (true) with check (true);

drop policy if exists "purchase_requests_v1_read" on purchase_requests;
create policy "purchase_requests_v1_read" on purchase_requests for select using (true);
drop policy if exists "purchase_requests_v1_write" on purchase_requests;
create policy "purchase_requests_v1_write" on purchase_requests for all using (true) with check (true);

drop policy if exists "approvals_v1_read" on approvals;
create policy "approvals_v1_read" on approvals for select using (true);
drop policy if exists "approvals_v1_write" on approvals;
create policy "approvals_v1_write" on approvals for all using (true) with check (true);

drop policy if exists "audit_logs_v1_read" on audit_logs;
create policy "audit_logs_v1_read" on audit_logs for select using (true);
drop policy if exists "audit_logs_v1_write" on audit_logs;
create policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);

-- Seed: categories
insert into categories (name) values
  ('Office Supplies'),
  ('Software & SaaS'),
  ('Travel & Expenses'),
  ('Equipment'),
  ('Professional Services'),
  ('Marketing & Advertising')
on conflict do nothing;

-- Seed: demo requests
insert into purchase_requests (title, description, amount, currency, category, routine, status, vendor, ai_category, ai_category_source, ai_category_confidence, ai_category_review_status) values
  ('Adobe Creative Cloud Licenses', 'Annual subscription for 5 design team members', 2399.40, 'USD', 'Software & SaaS', true, 'pending', 'Adobe Inc.', 'Software & SaaS', 'openai:gpt-4o', 0.95, 'unreviewed'),
  ('Office Chairs - 10 units', 'Ergonomic chairs for new hires in engineering', 3200.00, 'USD', 'Equipment', false, 'pending', 'IKEA Business', 'Equipment', 'openai:gpt-4o', 0.88, 'unreviewed'),
  ('Client dinner - Q3 review', 'Dinner with Acme Corp team for quarterly review meeting', 340.50, 'USD', 'Travel & Expenses', false, 'approved', 'The Capital Grille', 'Travel & Expenses', 'openai:gpt-4o', 0.72, 'unreviewed'),
  ('Google Workspace - Monthly', 'Monthly billing for 45 users', 337.50, 'USD', 'Software & SaaS', true, 'approved', 'Google LLC', 'Software & SaaS', 'openai:gpt-4o', 0.97, 'unreviewed'),
  ('Conference tickets - AWS re:Invent', '2 tickets for DevOps team to attend AWS re:Invent 2024', 3400.00, 'USD', 'Travel & Expenses', false, 'rejected', 'Amazon Web Services', 'Travel & Expenses', 'openai:gpt-4o', 0.91, 'unreviewed')
on conflict do nothing;

-- Seed: approvals
insert into approvals (request_id, decision, comment)
select id, 'approved', 'Approved - within entertainment budget' from purchase_requests where title = 'Client dinner - Q3 review'
on conflict do nothing;
insert into approvals (request_id, decision, comment)
select id, 'approved', 'Routine expense, approved' from purchase_requests where title = 'Google Workspace - Monthly'
on conflict do nothing;
insert into approvals (request_id, decision, comment)
select id, 'rejected', 'Over budget for Q3 - defer to next quarter' from purchase_requests where title = 'Conference tickets - AWS re:Invent'
on conflict do nothing;

-- Seed: audit logs (idempotent: only if none exist for the entity+action)
insert into audit_logs (action, entity_type, entity_id, details)
select v.action, 'purchase_request', r.id, v.details::jsonb
from (values
  ('create', 'Adobe Creative Cloud Licenses', '{"amount": 2399.40, "category": "Software & SaaS"}'),
  ('create', 'Office Chairs - 10 units', '{"amount": 3200.00, "category": "Equipment"}'),
  ('create', 'Client dinner - Q3 review', '{"amount": 340.50, "category": "Travel & Expenses"}'),
  ('create', 'Google Workspace - Monthly', '{"amount": 337.50, "category": "Software & SaaS"}'),
  ('create', 'Conference tickets - AWS re:Invent', '{"amount": 3400.00, "category": "Travel & Expenses"}'),
  ('approve', 'Client dinner - Q3 review', '{"decision": "approved", "comment": "Approved - within entertainment budget"}'),
  ('approve', 'Google Workspace - Monthly', '{"decision": "approved", "comment": "Routine expense, approved"}'),
  ('reject', 'Conference tickets - AWS re:Invent', '{"decision": "rejected", "comment": "Over budget for Q3 - defer to next quarter"}')
) as v(action, title, details)
join purchase_requests r on r.title = v.title
where not exists (
  select 1 from audit_logs a
  where a.entity_id = r.id and a.action = v.action and a.entity_type = 'purchase_request'
);
