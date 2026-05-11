-- ============================================================
-- Migración: Consentimiento informado (Ley 25.326 / 25.506)
-- Idempotente. Correr en Supabase SQL Editor.
-- Requiere que ya existan tenants + profiles + get_my_tenant_id().
-- ============================================================

create extension if not exists "pgcrypto";

-- ─── consent_requests ───────────────────────────────────────
create table if not exists public.consent_requests (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  socio_local_id  text not null,
  socio_nombre    text not null,
  socio_dni       text not null,
  doc_version     text not null,
  doc_hash        text not null,
  token           text not null unique,
  status          text not null default 'pendiente'
                  check (status in ('pendiente','aceptado','revocado')),
  accepted_at     timestamptz,
  accepted_ip     text,
  accepted_user_agent text,
  created_at      timestamptz not null default now(),
  unique (tenant_id, socio_local_id)
);

create index if not exists consent_requests_tenant_idx
  on public.consent_requests (tenant_id);
create index if not exists consent_requests_token_idx
  on public.consent_requests (token);

-- ─── consent_log: audit trail inmutable ─────────────────────
create table if not exists public.consent_log (
  id            uuid primary key default gen_random_uuid(),
  request_id    uuid not null references public.consent_requests(id) on delete cascade,
  event         text not null check (event in ('viewed','accepted','revoked')),
  ip            text,
  user_agent    text,
  doc_version   text not null,
  doc_hash      text not null,
  occurred_at   timestamptz not null default now()
);

create index if not exists consent_log_request_idx
  on public.consent_log (request_id);

alter table public.consent_requests enable row level security;
alter table public.consent_log       enable row level security;

-- Policies (drop+create para que sea reentrante)
drop policy if exists "consent_req_select_tenant" on public.consent_requests;
create policy "consent_req_select_tenant" on public.consent_requests
  for select using (tenant_id = public.get_my_tenant_id());

drop policy if exists "consent_req_insert_tenant" on public.consent_requests;
create policy "consent_req_insert_tenant" on public.consent_requests
  for insert with check (tenant_id = public.get_my_tenant_id());

drop policy if exists "consent_req_update_tenant" on public.consent_requests;
create policy "consent_req_update_tenant" on public.consent_requests
  for update using (tenant_id = public.get_my_tenant_id());

drop policy if exists "consent_log_select_tenant" on public.consent_log;
create policy "consent_log_select_tenant" on public.consent_log
  for select using (
    exists (
      select 1 from public.consent_requests r
      where r.id = consent_log.request_id
        and r.tenant_id = public.get_my_tenant_id()
    )
  );

-- ─── RPC pública: leer datos mínimos para render página ─────
create or replace function public.get_consent_request(p_token text)
returns json language plpgsql security definer as $$
declare
  _r record;
  _ip text;
  _ua text;
begin
  select id, socio_nombre, socio_dni, doc_version, doc_hash, status, accepted_at
    into _r
    from public.consent_requests
   where token = p_token;

  if _r.id is null then
    return json_build_object('ok', false, 'error', 'invalid_token');
  end if;

  _ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
    nullif(inet_client_addr()::text, '')
  );
  _ua := nullif(current_setting('request.headers', true)::json->>'user-agent', '');

  insert into public.consent_log (request_id, event, ip, user_agent, doc_version, doc_hash)
  values (_r.id, 'viewed', _ip, _ua, _r.doc_version, _r.doc_hash);

  return json_build_object(
    'ok', true,
    'nombre', _r.socio_nombre,
    'dni', _r.socio_dni,
    'doc_version', _r.doc_version,
    'doc_hash', _r.doc_hash,
    'status', _r.status,
    'accepted_at', _r.accepted_at
  );
end;
$$;

-- ─── RPC pública: aceptar consentimiento (idempotente) ──────
create or replace function public.accept_consent(p_token text)
returns json language plpgsql security definer as $$
declare
  _id uuid;
  _ver text;
  _hash text;
  _status text;
  _ip text;
  _ua text;
begin
  select id, doc_version, doc_hash, status
    into _id, _ver, _hash, _status
    from public.consent_requests
   where token = p_token;

  if _id is null then
    return json_build_object('ok', false, 'error', 'invalid_token');
  end if;

  if _status = 'aceptado' then
    return json_build_object('ok', true, 'already', true);
  end if;

  _ip := coalesce(
    nullif(split_part(current_setting('request.headers', true)::json->>'x-forwarded-for', ',', 1), ''),
    nullif(current_setting('request.headers', true)::json->>'cf-connecting-ip', ''),
    nullif(inet_client_addr()::text, '')
  );
  _ua := nullif(current_setting('request.headers', true)::json->>'user-agent', '');

  update public.consent_requests
     set status = 'aceptado',
         accepted_at = now(),
         accepted_ip = _ip,
         accepted_user_agent = _ua
   where id = _id;

  insert into public.consent_log (request_id, event, ip, user_agent, doc_version, doc_hash)
  values (_id, 'accepted', _ip, _ua, _ver, _hash);

  return json_build_object('ok', true);
end;
$$;

grant execute on function public.get_consent_request(text) to anon, authenticated;
grant execute on function public.accept_consent(text)      to anon, authenticated;
