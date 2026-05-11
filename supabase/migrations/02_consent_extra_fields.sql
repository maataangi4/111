-- ============================================================
-- Migración 02: Más datos del paciente en consent_requests
-- para personalizar el documento Anexo III antes de mostrarlo.
-- Idempotente.
-- ============================================================

alter table public.consent_requests
  add column if not exists socio_phone            text,
  add column if not exists socio_reprocann_code   text,
  add column if not exists socio_reprocann_expires text,
  add column if not exists socio_domicilio        text,
  add column if not exists socio_historia_clinica text,
  add column if not exists profesional_nombre     text,
  add column if not exists profesional_dni        text,
  add column if not exists profesional_matricula  text;

-- ─── Reescribir get_consent_request para devolver nuevos campos ──
create or replace function public.get_consent_request(p_token text)
returns json language plpgsql security definer as $$
declare
  _r record;
  _ip text;
  _ua text;
begin
  select id, socio_nombre, socio_dni, socio_phone, socio_reprocann_code,
         socio_reprocann_expires, socio_domicilio, socio_historia_clinica,
         profesional_nombre, profesional_dni, profesional_matricula,
         doc_version, doc_hash, status, accepted_at
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
    'phone', _r.socio_phone,
    'reprocann_code', _r.socio_reprocann_code,
    'reprocann_expires', _r.socio_reprocann_expires,
    'domicilio', _r.socio_domicilio,
    'historia_clinica', _r.socio_historia_clinica,
    'profesional_nombre', _r.profesional_nombre,
    'profesional_dni', _r.profesional_dni,
    'profesional_matricula', _r.profesional_matricula,
    'doc_version', _r.doc_version,
    'doc_hash', _r.doc_hash,
    'status', _r.status,
    'accepted_at', _r.accepted_at
  );
end;
$$;

grant execute on function public.get_consent_request(text) to anon, authenticated;
