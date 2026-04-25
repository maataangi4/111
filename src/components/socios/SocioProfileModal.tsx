import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  CreditCard,
  FileText,
  Package,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
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
  const view = useMemo(() => (socio ? deriveSocioView(socio) : null), [socio])
  const upsertSocio = useSociosStore((s) => s.upsertSocio)
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
  }, [open, socio?.id])

  const legalBlocked = view?.legalStatus === 'vencido'
  const financialBlocked = socio?.financialStatus === 'deuda'
  const dispenseBlocked = Boolean(legalBlocked || financialBlocked)

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
              'relative z-10 w-full max-w-[min(980px,95vw)] overflow-hidden rounded-[2.25rem] border border-slate-200/90 bg-white shadow-[0_26px_90px_-14px_rgba(15,23,42,0.28)]',
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
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="grid min-h-[520px] grid-cols-1 md:grid-cols-[280px_1fr]">
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
              </aside>

              <section className="p-6 md:p-8">
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
                    title={dispenseBlocked ? 'Acción bloqueada: Regularizar estado legal o financiero' : 'Dispensar'}
                  >
                    <Package className="h-4 w-4" aria-hidden />
                    Dispensar
                  </button>
                </div>

                <div className="mt-6">
                  {section === 'identidad' ? (
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
                    <div className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 dark:text-[#8c8c8c]">Pagos</p>
                      {socio.payments.length === 0 ? (
                        <p className="text-sm text-slate-500 dark:text-[#8c8c8c]">Sin pagos registrados.</p>
                      ) : (
                        socio.payments.map((p) => (
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

