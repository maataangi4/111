import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileText, Loader2, ShieldAlert } from 'lucide-react'
import { renderConsentimientoAnexoIII } from '../data/consentimientoAnexoIII'
import { acceptConsent, fetchConsentByToken, type ConsentRequest } from '../lib/consent'

type View = 'loading' | 'ready' | 'submitting' | 'done' | 'error'

export function ConsentPage({ token }: { token: string }) {
  const [view, setView] = useState<View>('loading')
  const [request, setRequest] = useState<ConsentRequest | null>(null)
  const [errorMsg, setErrorMsg] = useState<string>('')
  const [accepted, setAccepted] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetchConsentByToken(token)
      if (cancelled) return
      if (!res.ok) {
        setErrorMsg(res.error === 'invalid_token' ? 'Enlace inválido o expirado.' : res.error)
        setView('error')
        return
      }
      setRequest(res)
      if (res.status === 'aceptado') {
        setView('done')
      } else {
        setView('ready')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  const acceptedAtFmt = useMemo(() => {
    if (!request?.accepted_at) return null
    try {
      return new Date(request.accepted_at).toLocaleString('es-AR', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    } catch {
      return request.accepted_at
    }
  }, [request])

  const renderedDoc = useMemo(() => {
    if (!request) return ''
    return renderConsentimientoAnexoIII({
      nombrePaciente: request.nombre,
      dniPaciente: request.dni,
      domicilioPaciente: request.domicilio ?? undefined,
      historiaClinica: request.historia_clinica ?? undefined,
      nombreProfesional: request.profesional_nombre ?? undefined,
      dniProfesional: request.profesional_dni ?? undefined,
      matriculaProfesional: request.profesional_matricula ?? undefined,
      reprocannCode: request.reprocann_code ?? undefined,
      reprocannExpires: request.reprocann_expires ?? undefined,
    })
  }, [request])

  const submit = async () => {
    if (!accepted) return
    setView('submitting')
    const res = await acceptConsent(token)
    if (!res.ok) {
      setErrorMsg(res.error)
      setView('error')
      return
    }
    // refetch para traer accepted_at + status actualizados
    const refresh = await fetchConsentByToken(token)
    if (refresh.ok) setRequest(refresh)
    setView('done')
  }

  return (
    <div className="min-h-svh w-full overflow-x-hidden bg-slate-50 dark:bg-[#121212]">
      <div className="mx-auto w-full max-w-2xl px-3 py-6 sm:px-4 sm:py-10 md:py-14">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <FileText className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl dark:text-[#f1f1f1]">
              Consentimiento informado — Anexo III
            </h1>
            <p className="text-[11px] text-slate-500 sm:text-xs dark:text-[#8c8c8c]">
              Ley 26.529 · Ley 27.350 / Dec. 883/2020 · Ley 25.326 · Ley 25.506
            </p>
          </div>
        </div>

        {view === 'loading' ? (
          <div className="flex items-center justify-center py-20 text-slate-500 dark:text-[#8c8c8c]">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="ml-2 text-sm">Cargando…</span>
          </div>
        ) : null}

        {view === 'error' ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-rose-200/80 bg-rose-50 p-6 text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-100"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">No se pudo cargar el consentimiento</p>
                <p className="mt-1 text-sm opacity-90">{errorMsg || 'Pedile al club un nuevo enlace.'}</p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {view === 'done' && request ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-6 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-base font-semibold">Consentimiento aceptado</p>
                <p className="mt-1 text-sm opacity-90">
                  Gracias, {request.nombre}. Tu firma electrónica fue registrada el día {acceptedAtFmt ?? 'hoy'}. El club fue
                  notificado y tu perfil está activo.
                </p>
                <p className="mt-3 text-xs opacity-75">
                  Versión documento: <code className="font-mono">{request.doc_version}</code>
                </p>
                <p className="text-xs opacity-75">
                  Hash SHA-256: <code className="break-all font-mono">{request.doc_hash}</code>
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}

        {(view === 'ready' || view === 'submitting') && request ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm dark:border-[#3d3d3d] dark:bg-[#1c1c1c]"
          >
            <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4 sm:px-6 dark:border-[#2f2f2f] dark:bg-[#161616]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[#8c8c8c]">
                Paciente
              </p>
              <p className="mt-1 break-words text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                {request.nombre}
              </p>
              <p className="break-words text-xs text-slate-500 dark:text-[#8c8c8c]">DNI {request.dni}</p>
            </div>

            <div className="whitespace-pre-wrap break-words px-4 py-5 text-[13px] leading-relaxed text-slate-700 sm:px-6 dark:text-[#d4d4d4]">
              {renderedDoc}
            </div>

            <div className="border-t border-slate-100 bg-slate-50/70 px-4 py-5 sm:px-6 dark:border-[#2f2f2f] dark:bg-[#161616]">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 dark:border-[#555] dark:bg-[#2a2a2a]"
                />
                <span className="text-sm leading-snug text-slate-700 dark:text-[#d4d4d4]">
                  He leído y comprendido el documento. Presto mi consentimiento libre, expreso e informado al tratamiento
                  descripto y al tratamiento de mis datos personales (incluidos datos sensibles de salud) por el club,
                  conforme Ley 25.326 y normativa vigente.
                </span>
              </label>

              <button
                type="button"
                disabled={!accepted || view === 'submitting'}
                onClick={submit}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {view === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Aceptar y activar perfil
              </button>

              <p className="mt-3 text-[11px] leading-snug text-slate-500 dark:text-[#8c8c8c]">
                Al hacer clic se registra firma electrónica (Ley 25.506) con tu IP, dispositivo, fecha y hora,
                y el hash del documento. Esta evidencia queda almacenada de forma inmutable.
              </p>
              <p className="mt-1 text-[10px] text-slate-400 dark:text-[#6b6b6b]">
                Versión: {request.doc_version} · Hash: <span className="break-all font-mono">{request.doc_hash.slice(0, 32)}…</span>
              </p>
            </div>
          </motion.div>
        ) : null}
      </div>
    </div>
  )
}
