-- ============================================================================
-- FLOWI — Migraciones post-MVP (Sprints 7-10)
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de setup.sql.
-- Es idempotente (usa IF NOT EXISTS / ON CONFLICT). Puedes correrlo varias veces.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Sprint 7 — Tarjetas inteligentes: guardar el CAT encontrado.
-- ----------------------------------------------------------------------------
alter table public.credit_cards
  add column if not exists cat numeric(6,2);

-- ----------------------------------------------------------------------------
-- Sprint 8 — Presupuestos por categoría.
-- ----------------------------------------------------------------------------
create table if not exists public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  category text not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz default now(),
  unique (user_id, category)
);

alter table public.budgets enable row level security;
drop policy if exists "users_own_data" on public.budgets;
create policy "users_own_data" on public.budgets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.budgets to authenticated;

-- ----------------------------------------------------------------------------
-- Sprint C2 — Subcuentas / apartados.
-- (Nota: Postgres NO soporta CREATE POLICY IF NOT EXISTS → usamos drop+create.)
-- ----------------------------------------------------------------------------
create table if not exists public.subaccounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  account_id uuid references public.accounts not null,
  name text not null,
  balance numeric(12,2) default 0,
  yield_rate numeric(5,4) default 0,
  effective_yield numeric(6,4) default 0,
  goal_amount numeric(12,2),
  goal_name text,
  color text default '#6366F1',
  icon text default '🎯',
  is_active boolean default true,
  created_at timestamptz default now()
);

alter table public.subaccounts enable row level security;
drop policy if exists "own_subaccounts" on public.subaccounts;
create policy "own_subaccounts" on public.subaccounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.subaccounts to authenticated;

alter table public.accounts
  add column if not exists supports_subaccounts boolean default false;

-- Habilitar apartados en cuentas de ahorro/inversión existentes.
update public.accounts set supports_subaccounts = true
  where type in ('savings', 'investment') and supports_subaccounts is distinct from true;

-- ----------------------------------------------------------------------------
-- Sprint C5 — Categorías editables (campos extra).
-- ----------------------------------------------------------------------------
alter table public.categories
  add column if not exists is_hidden boolean default false,
  add column if not exists sort_order int default 0;

-- Sembrar las categorías globales (user_id null) si no existen.
insert into public.categories (user_id, name, icon, color, is_essential, sort_order)
select null, v.name, v.icon, v.color, v.essential, v.ord
from (values
  ('Alimentación', '🍽️', '#F59E0B', true, 1),
  ('Transporte', '🚗', '#6366F1', true, 2),
  ('Hogar', '🏠', '#10B981', true, 3),
  ('Salud', '💊', '#EF4444', true, 4),
  ('Entretenimiento', '🎬', '#EC4899', false, 5),
  ('Ropa', '👕', '#8B5CF6', false, 6),
  ('Educación', '🎓', '#14B8A6', true, 7),
  ('Nómina', '💼', '#00b1ea', false, 8),
  ('Servicios', '💡', '#64748B', true, 9),
  ('General', '📦', '#64748B', false, 10)
) as v(name, icon, color, essential, ord)
where not exists (
  select 1 from public.categories c where c.user_id is null and c.name = v.name
);

-- ----------------------------------------------------------------------------
-- Sprint C6 — Gastos e ingresos recurrentes.
-- ----------------------------------------------------------------------------
create table if not exists public.recurring_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles not null,
  name text not null,
  amount numeric(12,2) not null,
  type text check (type in ('expense', 'income')) not null,
  category_id uuid references public.categories,
  account_id uuid references public.accounts,
  card_id uuid references public.credit_cards,
  frequency text check (frequency in ('monthly', 'biweekly', 'weekly', 'custom')) default 'monthly',
  day_of_month int[],
  day_of_week int,
  is_active boolean default true,
  next_date date,
  last_triggered date,
  notes text,
  created_at timestamptz default now()
);

alter table public.recurring_items enable row level security;
drop policy if exists "own_recurring" on public.recurring_items;
create policy "own_recurring" on public.recurring_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select, insert, update, delete on public.recurring_items to authenticated;

-- ----------------------------------------------------------------------------
-- Sprint D1 — Tesorería en la Home: saldo del ciclo anterior (2do corte) y
-- fecha real del último corte por tarjeta.
-- ----------------------------------------------------------------------------
alter table public.credit_cards
  add column if not exists previous_balance numeric(12,2) default 0;
alter table public.credit_cards
  add column if not exists last_cut_date date;
