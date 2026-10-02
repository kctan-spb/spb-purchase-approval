-- Categories
table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  name text not null,
  created_at timestamptz not null default now()
);
ique index if not exists categories_name_key on categories (name);ble if not exists purchase_requests (
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
ique index if not exists purchase_requests_title_key on purchase_requests (title);e table if not exists approvals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  request_id uuid not null,
  decision text not null,
  comment text,
  created_at timestamptz not null default now()
);
ique index if not exists approvals_request_id_key on approvals (request_id);e table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  details jsonb,
  created_at timestamptz not null default now()
);
ique index if not exists audit_logs_entity_key on audit_logs (entity_type, entity_id, action);le table categories enable row level security;le table purchase_requests enable row level security;le table approvals enable row level security;le table audit_logs enable row level security;op policy if exists "categories_v1_read" on categories;
ate policy "categories_v1_read" on categories for select using (true);
policy if exists "categories_v1_write" on categories;
ate policy "categories_v1_write" on categories for all using (true) with check (true);policy if exists "purchase_requests_v1_read" on purchase_requests;ate policy "purchase_requests_v1_read" on purchase_requests for select using (true);policy if exists "purchase_requests_v1_write" on purchase_requests;
ate policy "purchase_requests_v1_write" on purchase_requests for all using (true) with check (true);policy if exists "approvals_v1_read" on approvals;ate policy "approvals_v1_read" on approvals for select using (true);policy if exists "approvals_v1_write" on approvals;
ate policy "approvals_v1_write" on approvals for all using (true) with check (true);policy if exists "audit_logs_v1_read" on audit_logs;ate policy "audit_logs_v1_read" on audit_logs for select using (true);policy if exists "audit_logs_v1_write" on audit_logs;
ate policy "audit_logs_v1_write" on audit_logs for all using (true) with check (true);rt into categories (name) values  ('Office Supplies'),
  ('Software & SaaS'),
  ('Travel & Expenses'),
  ('Equipment'),
  ('Professional Services'),
  ('Marketing & Advertising')
ict do nothing;rt into purchase_requests (title, description, amount, currency, category, routine, status, vendor, ai_category, ai_category_source, ai_category_confidence, ai_category_review_status) values
  ('Adobe Creative Cloud Licenses', 'Annual subscription for 5 design team members', 2399.40, 'USD', 'Software & SaaS', true, 'pending', 'Adobe Inc.', 'Software & SaaS', 'openai:gpt-4o', 0.95, 'unreviewed'),
  ('Office Chairs - 10 units', 'Ergonomic chairs for new hires in engineering', 3200.00, 'USD', 'Equipment', false, 'pending', 'IKEA Business', 'Equipment', 'openai:gpt-4o', 0.88, 'unreviewed'),
  ('Client dinner - Q3 review', 'Dinner with Acme Corp team for quarterly review meeting', 340.50, 'USD', 'Travel & Expenses', false, 'approved', 'The Capital Grille', 'Travel & Expenses', 'openai:gpt-4o', 0.72, 'unreviewed'),
  ('Google Workspace - Monthly', 'Monthly billing for 45 users', 337.50, 'USD', 'Software & SaaS', true, 'approved', 'Google LLC', 'Software & SaaS', 'openai:gpt-4o', 0.97, 'unreviewed'),
  ('Conference tickets - AWS re:Invent', '2 tickets for DevOps team to attend AWS re:Invent 2024', 3400.00, 'USD', 'Travel & Expenses', false, 'rejected', 'Amazon Web Services', 'Travel & Expenses', 'openai:gpt-4o', 0.91, 'unreviewed')
ict do nothing;rt into approvals (request_id, decision, comment) values
  ((select id from purchase_requests where title = 'Client dinner - Q3 review' limit 1), 'approved', 'Approved - within entertainment budget'),
  ((select id from purchase_requests where title = 'Google Workspace - Monthly' limit 1), 'approved', 'Routine expense, approved'),
  ((select id from purchase_requests where title = 'Conference tickets - AWS re:Invent' limit 1), 'rejected', 'Over budget for Q3 - defer to next quarter')
ict do nothing;rt into audit_logs (action, entity_type, entity_id, details) values
  ('create', 'purchase_request', (select id from purchase_requests where title = 'Adobe Creative Cloud Licenses' limit 1), '{"amount": 2399.40, "category": "Software & SaaS"}'),
  ('create', 'purchase_request', (select id from purchase_requests where title = 'Office Chairs - 10 units' limit 1), '{"amount": 3200.00, "category": "Equipment"}'),
  ('create', 'purchase_request', (select id from purchase_requests where title = 'Client dinner - Q3 review' limit 1), '{"amount": 340.50, "category": "Travel & Expenses"}'),
  ('create', 'purchase_request', (select id from purchase_requests where title = 'Google Workspace - Monthly' limit 1), '{"amount": 337.50, "category": "Software & SaaS"}'),
  ('create', 'purchase_request', (select id from purchase_requests where title = 'Conference tickets - AWS re:Invent' limit 1), '{"amount": 3400.00, "category": "Travel & Expenses"}'),
  ('approve', 'purchase_request', (select id from purchase_requests where title = 'Client dinner - Q3 review' limit 1), '{"decision": "approved", "comment": "Approved - within entertainment budget"}'),
  ('approve', 'purchase_request', (select id from purchase_requests where title = 'Google Workspace - Monthly' limit 1), '{"decision": "approved", "comment": "Routine expense, approved"}'),
  ('reject', 'purchase_request', (select id from purchase_requests where title = 'Conference tickets - AWS re:Invent' limit 1), '{"decision": "rejected", "comment": "Over budget for Q3 - defer to next quarter"}')
ict do nothing;