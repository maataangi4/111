import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  Check,
  CheckCircle2,
  CircleAlert,
  Copy,
  CreditCard,
  FileText,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { buildConsentUrl } from '../../lib/consent'
import { buildWhatsAppUrl } from '../../lib/whatsapp'
import { PhoneInput } from './PhoneInput'
import {
  CONSENTIMIENTO_ANEXO_III_FILENAME,
  getConsentimientoAnexoIIIPublicUrl,
} from '../../data/consentimientoAnexoIII'
import { formatInClubTimeZone } from '../../lib/clubTime'
import { cn } from '../../lib/cn'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useSociosStore, deriveSocioView, type Socio } from '../../store/useSociosStore'
import { DispensarModal } from './DispensarModal'

type ProfileSection = 'identidad' | 'retiros' | 'pagos'

function navBtn(active: boolean) {
  return cn(
    'flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-sm font-medium transition',
    active
      ? 'bg-white text-slate-900 shadow-sm dark:bg-[#1f1f1f] dark:text-[#f1f1f1]'
      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-[#b8b8b8] dark:hover:bg-white/[0.04] dark:hover:text-[#f1f1f1]',
  )
}

function fmtGrams(n: number) {
  const g = Math.round(n * 10) / 10
  return `${String(g).replace('.', ',')}g`
}

export function SocioProfileModal({
  socio,
  open,
  onOpenChange,
}: {
  socio: Socio | null
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const consentTemplateHref = useMemo(() => getConsentimientoAnexoIIIPublicUrl(), [])
  const [section, setSection] = useState<ProfileSection>('identidad')
  const [dispenseOpen, setDispenseOpen] = useState(false)

  // Teléfono
  const [editingPhone, setEditingPhone] = useState(false)
  const [phoneInput, setPhoneInput] = useState('')

  // Fecha vencimiento REPROCANN
  const [editingExpiry, setEditingExpiry] = useState(false)
  const [expiryInput, setExpiryInput] = useState('')

  // Pagos
  const [payAmount, setPayAmount] = useState('')
  const [payNote, setPayNote] = useState('')
  const [lastPay, setLastPay] = useState<{ amountArs: number; note: string } | null>(null)

  // Consent
  const [consentCopied, setConsentCopied] = useState(false)
  const [consentVerifying, setConsentVerifying] = useState(false)

  const view = useMemo(() => (socio ? deriveSocioView(socio) : null), [socio])
  const upsertSocio = useSociosStore((s) => s.upsertSocio)
  const syncConsentStatus = useSociosStore((s) => s.syncConsentStatus)
  const regenerateConsentRequest = useSociosStore((s) => s.regenerateConsentRequest)
  const deleteSocio = useSociosStore((s) => s.deleteSocio)
  const [deleting, setDeleting] = useState(false)
  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const appLocale = useSettingsStore((s) => s.locale)

  const formatLocalDate = (iso: string) => {
    const d = new Date(iso)
    if (!Number.isFinite(d.getTime())) return iso
    return formatInClubTimeZone(d, clubTimeZone, appLocale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const stockBatches = useMemo(
    () =>
      harvestBatches
        .filter((b) => b.postHarvestStatus === 'STOCK' && !b.archived)
        .map((b) => ({
          id: b.id,
          label: `${b.strain || 'Lote'} · ${b.harvestDate} · ${b.roomLabel || ''}`.trim(),
          availableG:
            (b.stockGradePremiumG ?? 0) + (b.stockGradePopcornG ?? 0) + (b.stockGradeBiomassG ?? 0),
          premiumG: b.stockGradePremiumG ?? 0,
        }))
        .filter((b) => b.availableG > 0),
    [harvestBatches],
  )

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    setSection('identidad')
    setDispenseOpen(false)
    setEditingPhone(false)
    setPhoneInput('')
    setPayAmount('')
    setPayNote('')
    setLastPay(null)
    setEditingExpiry(false)
    setExpiryInput('')
  }, [open, socio?.id])

  // Auto-sync consent al abrir perfil de socio pendiente + polling cada 8s mientras
  // siga pendiente (si paciente acepta en otra pestaña/dispositivo, perfil se actualiza solo).
  useEffect(() => {
    if (!open || !socio?.consentToken || socio.consentStatus === 'aceptado') return
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await syncConsentStatus(socio.id)
    }
    void tick()
    const id = window.setInterval(tick, 8000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [open, socio?.id, socio?.consentToken, socio?.consentStatus, syncConsentStatus])

  const legalBlocked = view?.legalStatus === 'vencido'
  const financialBlocked = socio?.financialStatus === 'deuda'
  const consentBlocked = socio?.consentStatus !== 'aceptado'
  const dispenseBlocked = Boolean(legalBlocked || financialBlocked || consentBlocked)

  const consentUrl = useMemo(() => {
    if (!socio?.consentToken) return ''
    return buildConsentUrl(socio.consentToken)
  }, [socio?.consentToken])

  const consentWaUrl = useMemo(() => {
    if (!socio || !socio.phone || !consentUrl) return ''
    const firstName = socio.nombre.split(' ')[0]
    const msg = `Hola ${firstName}, te enviamos el consentimiento informado del club. Por favor leelo y al final tocá "Aceptar y activar perfil":\n\n${consentUrl}`
    return buildWhatsAppUrl(socio.phone, msg)
  }, [socio, consentUrl])

  const copyConsentLink = async () => {
    if (!consentUrl) return
    try {
      await navigator.clipboard.writeText(consentUrl)
      setConsentCopied(true)
      window.setTimeout(() => setConsentCopied(false), 1800)
    } catch {
      window.prompt('Copiá manualmente el enlace:', consentUrl)
    }
  }

  const verifyConsent = async () => {
    if (!socio) return
    setConsentVerifying(true)
    try {
      await syncConsentStatus(socio.id)
    } finally {
      setConsentVerifying(false)
    }
  }

  const regenerateConsent = async () => {
    if (!socio) return
    if (!window.confirm('Generar un nuevo enlace invalida el anterior. ¿Continuar?')) return
    const res = await regenerateConsentRequest(socio.id)
    if (!res.ok) {
      window.alert(`No se pudo generar el enlace: ${res.error ?? 'error desconocido'}`)
    }
  }

  const handleDelete = async () => {
    if (!socio) return
    const txt = `¿Eliminar a ${socio.nombre} (DNI ${socio.dni})?\n\nEsto borra el paciente, su historial de retiros y su consentimiento.\nNo se puede revertir.`
    if (!window.confirm(txt)) return
    if (!window.confirm('Confirmá una vez más: ¿borrar definitivamente?')) return
    setDeleting(true)
    const res = await deleteSocio(socio.id)
    setDeleting(false)
    if (!res.ok) {
      window.alert(`No se pudo eliminar: ${res.error ?? 'error desconocido'}`)
      return
    }
    onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && socio && view ? (
        <motion.div
          key="socio-modal-root"
          className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px] dark:bg-black/50"
            aria-label="Cerrar"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 flex w-full max-w-[min(980px,95vw)] max-h-[min(92dvh,calc(100vh-2rem))] flex-col overflow-hidden rounded-[2.25rem] border border-slate-200/90 bg-white shadow-[0_26px_90px_-14px_rgba(15,23,42,0.28)]',
              'dark:border-[#3d3d3d] dark:bg-[#1c1c1c] dark:shadow-[0_26px_90px_-14px_rgba(0,0,0,0.55)]',
            )}
            initial={{ opacity: 0, scale: 0.98, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-sm transition hover:bg-slate-100 hover:text-slate-900 dark:bg-[#1c1c1c]/90 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto md:grid-cols-[280px_1fr] md:overflow-hidden">
              <aside className="border-b border-slate-200/80 bg-slate-50/70 p-4 md:border-b-0 md:border-r md:p-5 dark:border-[#2f2f2f] dark:bg-[#161616]">
                <div className="flex items-center gap-3 px-2 pb-3 pt-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-200 text-slate-700 dark:bg-[#2e2e2e] dark:text-[#e5e5e5]">
                    <span className="text-sm font-semibold">{view.initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-[#f1f1f1]">{socio.nombre}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-[#8c8c8c]">DNI {socio.dni}</p>
                  </div>
                </div>

                <nav className="space-y-1">
                  <button type="button" onClick={() => setSection('identidad')} className={navBtn(section === 'identidad')}>
                    <FileText className="h-4 w-4 opacity-80" strokeWidth={2} />
                    <span className="truncate">Identidad & Legal</span>
                  </button>
                  <button type="button" onClick={() => setSection('retiros')} className={navBtn(section === 'retiros')}>
                    <Package className="h-4 w-4 opacity-80" strokeWidth={2} />
                    <span className="truncate">Historial de retiros</span>
                  </button>
                  <button type="button" onClick={() => setSection('pagos')} className={navBtn(section === 'pagos')}>
                    <CreditCard className="h-4 w-4 opacity-80" strokeWidth={2} />
                    <span className="truncate">Pagos</span>
                  </button>
                </nav>

                <div className="mt-6 border-t border-slate-200/70 pt-4 dark:border-[#2f2f2f]">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex w-full items-center gap-2 rounded-2xl px-3 py-2.5 text-left text-sm font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:text-rose-300 dark:hover:bg-rose-950/40"
                  >
                    {deleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" strokeWidth={2} />
                    )}
                    <span className="truncate">Eliminar paciente</span>
                  </button>
                </div>
              </aside>

              <section className="p-6 md:max-h-full md:overflow-y-auto md:overscroll-contain md:p-8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <h2 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1]">{socio.nombre}</h2>
                    <p className="mt-1 text-sm text-slate-500 dark:text-[#8c8c8c]">
                      Código {socio.reprocannCode} · Vence {socio.reprocannExpiresOn ?? '—'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                          view.legalStatus === 'vigente'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : view.legalStatus === 'expira'
                              ? 'bg-amber-500/10 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
                              : 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                        )}
                      >
                        {view.legalStatus === 'vigente' ? (
                          <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
                        ) : view.legalStatus === 'expira' ? (
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <CircleAlert className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {view.legalStatus === 'vigente' ? 'Vigente' : view.legalStatus === 'expira' ? 'Expira <30 días' : 'Vencido'}
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                          socio.financialStatus === 'al_dia'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
                        )}
                      >
                        {socio.financialStatus === 'al_dia' ? (
                          <CreditCard className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {socio.financialStatus === 'al_dia' ? 'Cuota al día' : 'Deuda'}
                      </span>
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-700 dark:bg-[#2a2a2a] dark:text-[#c4c4c4]">
                        Consumo mes: {fmtGrams(socio.monthlyDispensedGrams)} / 40g
                      </span>
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-semibold',
                          socio.consentStatus === 'aceptado'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : socio.consentStatus === 'revocado'
                              ? 'bg-rose-500/10 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-amber-500/10 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200',
                        )}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
                        {socio.consentStatus === 'aceptado'
                          ? 'Consentimiento firmado'
                          : socio.consentStatus === 'revocado'
                            ? 'Consentimiento revocado'
                            : 'Consentimiento pendiente'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={dispenseBlocked}
                    onClick={() => setDispenseOpen(true)}
                    className={cn(
                      'inline-flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition',
                      'bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-500 dark:text-[#05110c] dark:hover:bg-emerald-400',
                      'disabled:cursor-not-allowed disabled:opacity-40',
                    )}
                    title={
                      consentBlocked
                        ? 'Bloqueado: el paciente todavía no firmó el consentimiento'
                        : dispenseBlocked
                          ? 'Acción bloqueada: Regularizar estado legal o financiero'
                          : 'Dispensar'
                    }
                  >
                    <Package className="h-4 w-4" aria-hidden />
                    Dispensar
                  </button>
                </div>

                <div className="mt-6">
                  {section === 'identidad' ? (
                    <div className="space-y-4">
                      {/* Teléfono / WhatsApp */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Contacto</p>
                        <div className="mt-2 flex items-center gap-2">
                          {editingPhone ? (
                            <>
                              <PhoneInput
                                value={phoneInput}
                                onChange={setPhoneInput}
                                autoFocus
                                inputClass="border-slate-200 bg-white text-slate-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  upsertSocio(socio.id, { phone: phoneInput.trim() || undefined })
                                  setEditingPhone(false)
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingPhone(false)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-[#3d3d3d] dark:text-[#c4c4c4] dark:hover:bg-[#2a2a2a]"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : socio.phone ? (
                            <div className="flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                              <span className="text-sm text-slate-700 dark:text-[#d4d4d4]">{socio.phone}</span>
                              <button
                                type="button"
                                onClick={() => { setPhoneInput(socio.phone ?? ''); setEditingPhone(true) }}
                                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 dark:hover:text-[#c4c4c4]"
                              >
                                Editar
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => { setPhoneInput(''); setEditingPhone(true) }}
                              className="flex items-center gap-1.5 text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700 dark:text-[#8c8c8c] dark:hover:text-[#c4c4c4]"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Agregar teléfono / WhatsApp
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Vencimiento REPROCANN editable */}
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Vencimiento REPROCANN</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {editingExpiry ? (
                            <>
                              <input
                                type="date"
                                value={expiryInput}
                                onChange={(e) => setExpiryInput(e.target.value)}
                                autoFocus
                                className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const val = /^\d{4}-\d{2}-\d{2}$/.test(expiryInput) ? expiryInput : null
                                  upsertSocio(socio.id, { reprocannExpiresOn: val })
                                  setEditingExpiry(false)
                                }}
                                className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                              >
                                Guardar
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingExpiry(false)}
                                className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-[#3d3d3d] dark:text-[#c4c4c4] dark:hover:bg-[#2a2a2a]"
                              >
                                Cancelar
                              </button>
                            </>
                          ) : (
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden />
                              <span className="text-sm text-slate-700 dark:text-[#d4d4d4]">
                                {socio.reprocannExpiresOn ?? '—'}
                              </span>
                              <button
                                type="button"
                                onClick={() => { setExpiryInput(socio.reprocannExpiresOn ?? ''); setEditingExpiry(true) }}
                                className="text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600 dark:hover:text-[#c4c4c4]"
                              >
                                Editar
                              </button>
                            </div>
                          )}
                        </div>
                        {/* Aviso + botón WhatsApp cuando expira/vencido */}
                        {(view.legalStatus === 'expira' || view.legalStatus === 'vencido') && socio.phone ? (
                          <div className="mt-2">
                            <a
                              href={buildWhatsAppUrl(
                                socio.phone,
                                view.legalStatus === 'vencido'
                                  ? `Hola ${socio.nombre}! Tu REPROCANN está vencido. Por favor actualizá tus documentos lo antes posible para seguir activo en el club.\n\nCanspace Club`
                                  : `Hola ${socio.nombre}! Tu REPROCANN vence el ${socio.reprocannExpiresOn}. Acordate de renovarlo para seguir activo en el club.\n\nCanspace Club`,
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                            >
                              <MessageCircle className="h-4 w-4" aria-hidden />
                              {view.legalStatus === 'vencido' ? 'Avisar por WhatsApp (vencido)' : 'Recordar renovación por WhatsApp'}
                            </a>
                          </div>
                        ) : (view.legalStatus === 'expira' || view.legalStatus === 'vencido') ? (
                          <p className="mt-1.5 text-xs text-slate-400 dark:text-[#6b6b6b]">
                            Sin número de WhatsApp. Agregalo arriba para enviar aviso.
                          </p>
                        ) : null}
                      </div>

                      {/* Consentimiento informado (clickwrap) */}
                      {socio.consentToken ? (
                        <div className="rounded-2xl border border-slate-200/90 bg-slate-50/70 p-4 dark:border-[#2f2f2f] dark:bg-[#161616]">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-[#8c8c8c]">
                              Consentimiento Anexo III · firma electrónica
                            </p>
                            <button
                              type="button"
                              onClick={verifyConsent}
                              disabled={consentVerifying}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-white disabled:opacity-50 dark:border-[#3d3d3d] dark:text-[#c4c4c4] dark:hover:bg-[#2a2a2a]"
                            >
                              {consentVerifying ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                              Verificar estado
                            </button>
                          </div>

                          {socio.consentStatus === 'aceptado' ? (
                            <div className="mt-2 flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                              <span>
                                Aceptado{socio.consentAcceptedAt ? ` el ${formatLocalDate(socio.consentAcceptedAt)}` : ''}.
                                {socio.consentDocVersion ? ` Versión ${socio.consentDocVersion}.` : ''}
                              </span>
                            </div>
                          ) : (
                            <>
                              <p className="mt-2 text-xs text-slate-600 dark:text-[#b0b0b0]">
                                El paciente todavía no firmó. Compartile el enlace por WhatsApp; al aceptarlo, el perfil se activa
                                automáticamente y se libera la dispensa.
                              </p>
                              <p className="mt-2 break-all rounded-lg bg-white px-2.5 py-2 font-mono text-[11px] text-slate-700 dark:bg-black/30 dark:text-[#d4d4d4]">
                                {consentUrl}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={copyConsentLink}
                                  className={cn(
                                    'inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition',
                                    consentCopied
                                      ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                                      : 'border-slate-200 bg-white text-slate-800 hover:bg-slate-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#323232]',
                                  )}
                                >
                                  {consentCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                                  {consentCopied ? 'Copiado' : 'Copiar enlace'}
                                </button>
                                {consentWaUrl ? (
                                  <a
                                    href={consentWaUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110 no-underline"
                                  >
                                    <MessageCircle className="h-3.5 w-3.5" />
                                    Enviar por WhatsApp
                                  </a>
                                ) : null}
                                <button
                                  type="button"
                                  onClick={regenerateConsent}
                                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#c4c4c4] dark:hover:bg-[#323232]"
                                >
                                  Generar nuevo
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Documentos</p>
                      {[
                        { key: 'dniFront', label: 'DNI (frente)' },
                        { key: 'dniBack', label: 'DNI (dorso)' },
                        { key: 'reprocannPdf', label: 'Reprocann (PDF)' },
                        { key: 'recetaMedica', label: 'Receta médica' },
                        {
                          key: 'consentimientoAnexoIII',
                          label: 'Anexo III — consentimiento informado (firmado)',
                        },
                        { key: 'acuerdoAsociacion', label: 'Acuerdo de asociación (firmado)' },
                      ].map((row) => {
                        const k = row.key as keyof Socio['docs']
                        const present = Boolean(socio.docs?.[k])
                        return (
                          <div
                            key={row.key}
                            className="flex items-start justify-between gap-3 rounded-2xl bg-white p-3 shadow-sm dark:bg-[#1a1a1a]"
                          >
                            <div className="flex min-w-0 flex-1 flex-col items-stretch gap-1">
                              <div className="flex min-w-0 items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-slate-500 dark:text-[#8c8c8c]" aria-hidden />
                                <span className="truncate text-sm text-slate-800 dark:text-[#e5e5e5]">{row.label}</span>
                              </div>
                              {row.key === 'consentimientoAnexoIII' ? (
                                <a
                                  href={consentTemplateHref}
                                  download={CONSENTIMIENTO_ANEXO_III_FILENAME}
                                  className="w-max text-[11px] font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400/90"
                                >
                                  Descargar plantilla vacía (.txt)
                                </a>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                upsertSocio(socio.id, { docs: { ...socio.docs, [k]: present ? undefined : 'uploaded' } })
                              }
                              className={cn(
                                'shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition',
                                present
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-950/55'
                                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-[#2a2a2a] dark:text-[#c4c4c4] dark:hover:bg-[#303030]',
                              )}
                            >
                              {present ? 'Cargado' : 'Subir'}
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  ) : section === 'retiros' ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Retiros</p>
                      {socio.dispenseHistory.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-[#8c8c8c]">Todavía no hay retiros registrados.</p>
                      ) : (
                        socio.dispenseHistory.map((r) => (
                          <div key={r.id} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-[#1a1a1a]">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-[#f1f1f1]">{fmtGrams(r.grams)}</p>
                                <p className="mt-0.5 text-[12px] text-slate-500 dark:text-[#8c8c8c]">{formatLocalDate(r.date)}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-[#8c8c8c]">Lote</p>
                                <p className="mt-0.5 text-[12px] font-semibold text-slate-700 dark:text-[#c4c4c4] tabular-nums">{r.harvestBatchId}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Registrar nuevo pago */}
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-[#2f2f2f] dark:bg-[#1a1a1a]">
                        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Registrar pago</p>

                        {lastPay ? (
                          <div className="flex flex-col items-center gap-4 py-2 text-center">
                            <CheckCircle2 className="h-9 w-9 text-emerald-500" strokeWidth={1.5} />
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-[#f1f1f1]">Pago registrado — ${lastPay.amountArs}</p>
                              {lastPay.note && <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8c8c8c]">{lastPay.note}</p>}
                            </div>
                            {socio.phone ? (
                              <a
                                href={buildWhatsAppUrl(
                                  socio.phone,
                                  `Hola ${socio.nombre}! Confirmamos la recepción de tu pago de $${lastPay.amountArs} en el club.${lastPay.note ? ` (${lastPay.note})` : ''}\n\nCanspace Club`,
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
                              >
                                <MessageCircle className="h-4 w-4" aria-hidden />
                                Enviar confirmación por WhatsApp
                              </a>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-[#6b6b6b]">
                                Sin número de WhatsApp. Agregalo en Identidad &amp; Legal.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => setLastPay(null)}
                              className="text-xs text-slate-400 underline underline-offset-2"
                            >
                              Registrar otro pago
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-end gap-2">
                            <div>
                              <p className="mb-1 text-xs text-slate-500 dark:text-[#8c8c8c]">Monto ($)</p>
                              <input
                                type="number"
                                min={0}
                                step={100}
                                value={payAmount}
                                onChange={(e) => setPayAmount(e.target.value)}
                                placeholder="0"
                                className="h-9 w-32 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="mb-1 text-xs text-slate-500 dark:text-[#8c8c8c]">Nota (opcional)</p>
                              <input
                                type="text"
                                value={payNote}
                                onChange={(e) => setPayNote(e.target.value)}
                                placeholder="Ej. Cuota mayo"
                                className="h-9 w-full min-w-[120px] rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-emerald-500/25 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                              />
                            </div>
                            <button
                              type="button"
                              disabled={!payAmount || Number(payAmount) <= 0}
                              onClick={() => {
                                const amount = Math.max(0, Number(payAmount) || 0)
                                if (!amount) return
                                const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
                                upsertSocio(socio.id, {
                                  payments: [
                                    ...socio.payments,
                                    { id: uid(), date: new Date().toISOString(), amountArs: amount, note: payNote.trim() || undefined },
                                  ],
                                })
                                setLastPay({ amountArs: amount, note: payNote.trim() })
                                setPayAmount('')
                                setPayNote('')
                              }}
                              className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              <Plus className="h-4 w-4" />
                              Registrar
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Historial de pagos */}
                      <div className="space-y-2">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Historial</p>
                        {socio.payments.length === 0 ? (
                          <p className="text-sm text-slate-500 dark:text-[#8c8c8c]">Sin pagos registrados.</p>
                        ) : (
                          [...socio.payments].reverse().map((p) => (
                            <div key={p.id} className="rounded-2xl bg-white p-3 shadow-sm dark:bg-[#1a1a1a]">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-slate-900 dark:text-[#f1f1f1] tabular-nums">${p.amountArs}</p>
                                  <p className="mt-0.5 text-[12px] text-slate-500 dark:text-[#8c8c8c]">{formatLocalDate(p.date)}</p>
                                </div>
                                <p className="text-[12px] text-slate-500 dark:text-[#8c8c8c]">{p.note ?? '—'}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <DispensarModal open={dispenseOpen} onOpenChange={setDispenseOpen} socio={socio} stockBatches={stockBatches} />
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

