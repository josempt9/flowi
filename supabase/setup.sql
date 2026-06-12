-- ============================================================================
-- FLOWI — Setup de permisos, RLS, perfiles y seed
-- Ejecuta este archivo COMPLETO en el SQL Editor de Supabase.
-- Es idempotente: puedes correrlo varias veces sin romper nada.
--
-- Arregla el error "permission denied for table transactions" y deja la base
-- lista para todo el MVP (Sprints 2-4).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. GRANTS — el rol `authenticated` necesita privilegios de tabla además de RLS.
--    Esto es lo que causa "permission denied for table".
-- ----------------------------------------------------------------------------
grant usage on schema public to authenticated, anon;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Que las tablas/secuencias futuras hereden los mismos grants automáticamente.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY — habilitar en todas las tablas y crear la política
--    "cada quien ve y modifica solo sus propios datos".
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  user_tables text[] := array[
    'profiles', 'accounts', 'credit_cards', 'categories', 'transactions',
    'user_aliases', 'float_analysis', 'cash_projections'
  ];
begin
  foreach t in array user_tables loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "users_own_data" on public.%I;', t);
  end loop;

  -- profiles usa la columna `id` como dueño; el resto usa `user_id`.
  execute 'create policy "users_own_data" on public.profiles
    for all using (auth.uid() = id) with check (auth.uid() = id);';

  foreach t in array array[
    'accounts', 'credit_cards', 'transactions',
    'user_aliases', 'float_analysis', 'cash_projections'
  ] loop
    execute format(
      'create policy "users_own_data" on public.%I
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);', t);
  end loop;
end $$;

-- categories: el usuario ve las suyas y las globales (user_id null),
-- pero solo puede escribir las suyas.
drop policy if exists "categories_read" on public.categories;
drop policy if exists "categories_write" on public.categories;
create policy "categories_read" on public.categories
  for select using (user_id is null or auth.uid() = user_id);
create policy "categories_write" on public.categories
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. PERFIL AUTOMÁTICO + SEED — al registrarse un usuario se crea su perfil,
--    sus cuentas iniciales y sus tarjetas iniciales.
-- ----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', ''))
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, type, balance, yield_rate, institution, color)
  values
    (new.id, 'Mercado Pago', 'savings', 0, 0.15, 'Mercado Pago', '#00b1ea'),
    (new.id, 'Santander débito', 'debit', 0, 0, 'Santander', '#ec0000'),
    (new.id, 'Efectivo', 'cash', 0, 0, null, '#22c55e')
  on conflict do nothing;

  insert into public.credit_cards (user_id, name, credit_limit, cut_day, payment_day, institution)
  values
    (new.id, 'BBVA Azul', 30000, 15, 5, 'BBVA'),
    (new.id, 'Santander Zero', 20000, 22, 12, 'Santander')
  on conflict do nothing;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 4. BACKFILL — crea perfil + seed para los usuarios que YA existen
--    (los que se registraron antes de instalar el trigger).
-- ----------------------------------------------------------------------------
insert into public.profiles (id, name)
select u.id, coalesce(u.raw_user_meta_data->>'name', '')
from auth.users u
on conflict (id) do nothing;

insert into public.accounts (user_id, name, type, balance, yield_rate, institution, color)
select p.id, v.name, v.type, 0, v.yield_rate, v.institution, v.color
from public.profiles p
cross join (values
  ('Mercado Pago', 'savings', 0.15, 'Mercado Pago', '#00b1ea'),
  ('Santander débito', 'debit', 0, 'Santander', '#ec0000'),
  ('Efectivo', 'cash', 0, null, '#22c55e')
) as v(name, type, yield_rate, institution, color)
where not exists (
  select 1 from public.accounts a
  where a.user_id = p.id and a.name = v.name
);

insert into public.credit_cards (user_id, name, credit_limit, cut_day, payment_day, institution)
select p.id, v.name, v.credit_limit, v.cut_day, v.payment_day, v.institution
from public.profiles p
cross join (values
  ('BBVA Azul', 30000, 15, 5, 'BBVA'),
  ('Santander Zero', 20000, 22, 12, 'Santander')
) as v(name, credit_limit, cut_day, payment_day, institution)
where not exists (
  select 1 from public.credit_cards c
  where c.user_id = p.id and c.name = v.name
);
