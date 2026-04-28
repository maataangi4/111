-- ============================================================
-- CANSPACE — Schema inicial
-- Correr en Supabase → SQL Editor → New query
-- ============================================================

-- Extensiones
create extension if not exists "pgcrypto";

-- ─── TENANTS (un registro por club/empresa) ─────────────────
create table public.tenants (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text not null unique,
  plan          text not null default 'trial' check (plan in ('trial','basic','pro')),
  max_users     int  not null default 3,
  max_socios    int  not null default 50,
  telegram_bot_token       text,
  telegram_group_chat_id   text,
  created_at    timestamptz not null default now()
);

-- ─── PROFILES (un registro por usuario) ─────────────────────
create table public.profiles (
  id                  uuid primary key references auth.users(id) on delete cascade,
  tenant_id           uuid not null references public.tenants(id) on delete cascade,
  role                text not null default 'operator' check (role in ('owner','manager','operator')),
  full_name           text not null,
  dni                 text,
  photo_url           text,
  telegram_chat_id    text,
  telegram_link_token text unique,
  username            text not null,
  access_code         text not null,
  created_at          timestamptz not null default now()
);

-- ─── ROW LEVEL SECURITY ─────────────────────────────────────

alter table public.tenants  enable row level security;
alter table public.profiles enable row level security;

-- Función helper: devuelve el tenant_id del usuario logueado
create or replace function public.get_my_tenant_id()
returns uuid language sql stable security definer as $$
  select tenant_id from public.profiles where id = auth.uid()
$$;

-- Tenants: cada usuario solo ve su propio tenant
create policy "tenant_select" on public.tenants
  for select using (id = public.get_my_tenant_id());

create policy "tenant_update_owner" on public.tenants
  for update using (
    id = public.get_my_tenant_id()
    and exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'owner'
    )
  );

-- Profiles: cada usuario ve los del mismo tenant
create policy "profiles_select" on public.profiles
  for select using (tenant_id = public.get_my_tenant_id());

create policy "profiles_update_self" on public.profiles
  for update using (id = auth.uid());

create policy "profiles_update_owner_manager" on public.profiles
  for update using (
    tenant_id = public.get_my_tenant_id()
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role in ('owner','manager')
    )
  );

-- ─── TRIGGER: crear profile al registrarse ──────────────────
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  _tenant_id uuid;
  _role      text;
  _name      text;
begin
  _tenant_id := (new.raw_user_meta_data->>'tenant_id')::uuid;
  _role      := coalesce(new.raw_user_meta_data->>'role', 'owner');
  _name      := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  -- Si es owner y no tiene tenant, crear uno nuevo
  if _tenant_id is null and _role = 'owner' then
    insert into public.tenants (name, slug)
    values (_name || '''s Club', lower(regexp_replace(_name, '[^a-z0-9]', '-', 'g')) || '-' || substr(gen_random_uuid()::text, 1, 6))
    returning id into _tenant_id;
  end if;

  insert into public.profiles (id, tenant_id, role, full_name, username, access_code)
  values (
    new.id,
    _tenant_id,
    _role,
    _name,
    lower(regexp_replace(_name, '\s+', '.', 'g')),
    upper(substr(encode(gen_random_bytes(4), 'hex'), 1, 8))
  );

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── FUNCIÓN: vincular Telegram por token (deep link) ───────
create or replace function public.link_telegram_by_token(
  p_token   text,
  p_chat_id text
)
returns boolean language plpgsql security definer as $$
begin
  update public.profiles
  set telegram_chat_id = p_chat_id,
      telegram_link_token = null
  where telegram_link_token = p_token;

  return found;
end;
$$;
