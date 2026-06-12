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
