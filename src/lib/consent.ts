import { CONSENTIMIENTO_ANEXO_III_TEMPLATE } from '../data/consentimientoAnexoIII'
import { supabase } from './supabase'

export const CONSENT_DOC_VERSION = 'anexo-iii-v1.2-datos'

export type ConsentStatus = 'pendiente' | 'aceptado' | 'revocado'

export type ConsentRequest = {
  ok: true
  nombre: string
  dni: string
  phone?: string | null
  reprocann_code?: string | null
  reprocann_expires?: string | null
  domicilio?: string | null
  historia_clinica?: string | null
  profesional_nombre?: string | null
  profesional_dni?: string | null
  profesional_matricula?: string | null
  doc_version: string
  doc_hash: string
  status: ConsentStatus
  accepted_at: string | null
}

export type ConsentRequestError = { ok: false; error: string }

let _cachedHash: string | null = null

export async function getConsentDocHash(): Promise<string> {
  if (_cachedHash) return _cachedHash
  const enc = new TextEncoder().encode(CONSENTIMIENTO_ANEXO_III_TEMPLATE)
  const buf = await crypto.subtle.digest('SHA-256', enc)
  const hex = Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  _cachedHash = hex
  return hex
}

export function generateConsentToken(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export function buildConsentUrl(token: string): string {
  // Prioridad: VITE_PUBLIC_URL (deploy/ngrok) → origin actual → vacío.
  const envBase = (import.meta.env.VITE_PUBLIC_URL as string | undefined)?.trim().replace(/\/$/, '')
  if (envBase) return `${envBase}/#consent=${token}`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const path = typeof window !== 'undefined' ? window.location.pathname.replace(/\/$/, '') : ''
  return `${origin}${path}/#consent=${token}`
}

export async function createConsentRequest(args: {
  tenantId: string
  socioLocalId: string
  nombre: string
  dni: string
  phone?: string
  reprocannCode?: string
  reprocannExpires?: string | null
  domicilio?: string
  historiaClinica?: string
  profesionalNombre?: string
  profesionalDni?: string
  profesionalMatricula?: string
  token: string
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const docHash = await getConsentDocHash()
  const payload = {
    tenant_id: args.tenantId,
    socio_local_id: args.socioLocalId,
    socio_nombre: args.nombre,
    socio_dni: args.dni,
    socio_phone: args.phone ?? null,
    socio_reprocann_code: args.reprocannCode ?? null,
    socio_reprocann_expires: args.reprocannExpires ?? null,
    socio_domicilio: args.domicilio ?? null,
    socio_historia_clinica: args.historiaClinica ?? null,
    profesional_nombre: args.profesionalNombre ?? null,
    profesional_dni: args.profesionalDni ?? null,
    profesional_matricula: args.profesionalMatricula ?? null,
    doc_version: CONSENT_DOC_VERSION,
    doc_hash: docHash,
    token: args.token,
    status: 'pendiente' as const,
    accepted_at: null,
    accepted_ip: null,
    accepted_user_agent: null,
  }
  // Upsert: si existe (tenant_id, socio_local_id), actualiza con nuevo token y resetea estado.
  // Permite regenerar links sin chocar con unique constraint.
  const { error } = await supabase
    .from('consent_requests')
    .upsert(payload as never, { onConflict: 'tenant_id,socio_local_id' })
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

async function callRpc(fn: string, args: Record<string, string>): Promise<{ data: unknown; error: { message: string } | null }> {
  // Bind to client para no perder `this` cuando usamos types laxos.
  const rpc = (supabase.rpc as unknown as (this: typeof supabase, f: string, a: Record<string, string>) => Promise<{ data: unknown; error: { message: string } | null }>).bind(supabase)
  return rpc(fn, args)
}

export async function fetchConsentByToken(
  token: string,
): Promise<ConsentRequest | ConsentRequestError> {
  try {
    const { data, error } = await callRpc('get_consent_request', { p_token: token })
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: 'empty_response' }
    return data as ConsentRequest | ConsentRequestError
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'rpc_failed' }
  }
}

export async function acceptConsent(
  token: string,
): Promise<{ ok: true; already?: boolean } | { ok: false; error: string }> {
  try {
    const { data, error } = await callRpc('accept_consent', { p_token: token })
    if (error) return { ok: false, error: error.message }
    if (!data) return { ok: false, error: 'empty_response' }
    return data as { ok: true; already?: boolean } | { ok: false; error: string }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'rpc_failed' }
  }
}

export async function getConsentStatus(token: string): Promise<ConsentStatus | null> {
  const res = await fetchConsentByToken(token)
  if (!res.ok) return null
  return res.status
}
