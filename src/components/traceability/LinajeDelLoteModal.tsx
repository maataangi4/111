import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo } from 'react'
import { CalendarClock, Leaf, Package, Scale, Sprout, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useSociosStore } from '../../store/useSociosStore'

function fmtGrams(n: number) {
  const g = Math.round(n * 10) / 10
  return `${String(g).replace('.', ',')} g`
}

function fmtDate(iso: string) {
  const d = new Date(iso)
  if (!Number.isFinite(d.getTime())) return iso
  return d.toLocaleString('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
}

function NodeCard({
  title,
  subtitle,
  Icon,
  children,
}: {
  title: string
  subtitle?: string
  Icon: typeof Sprout
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'relative w-full rounded-[22px] border border-white/[0.10] bg-white/[0.05] p-4',
        'shadow-[0_18px_70px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)]',
        'backdrop-blur-xl backdrop-saturate-150',
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/75 ring-1 ring-white/[0.08]">
          <Icon className="h-5 w-5" strokeWidth={1.8} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{title}</p>
          {subtitle ? (
            <p className="mt-1 text-base font-semibold tracking-tight text-white">{subtitle}</p>
          ) : null}
        </div>
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}

function FlowRail() {
  return (
    <div className="relative mx-auto my-2 h-10 w-full max-w-[520px]" aria-hidden>
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.10]" />
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-gradient-to-b from-emerald-400/35 via-sky-400/25 to-transparent blur-[0.5px]" />
    </div>
  )
}

export function LinajeDelLoteModal({
  open,
  harvestBatchId,
  onOpenChange,
}: {
  open: boolean
  harvestBatchId: string | null
  onOpenChange: (v: boolean) => void
}) {
  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const movimientos = useSociosStore((s) => s.movimientos)

  const batch = useMemo(
    () => (harvestBatchId ? harvestBatches.find((b) => b.id === harvestBatchId) ?? null : null),
    [harvestBatchId, harvestBatches],
  )

  const disp = useMemo(() => {
    if (!harvestBatchId) return []
    return movimientos.filter((m) => m.harvestBatchId === harvestBatchId)
  }, [movimientos, harvestBatchId])

  const dispTotals = useMemo(() => {
    let grams = 0
    let aportes = 0
    for (const m of disp) {
      grams += m.grams
      aportes += m.aporteArs
    }
    return { grams: Math.round(grams * 10) / 10, aportes: Math.round(aportes * 100) / 100, tx: disp.length }
  }, [disp])

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

  const openSocio = (socioId: string) => {
    window.dispatchEvent(new CustomEvent('socios:open', { detail: { socioId } }))
    window.dispatchEvent(new CustomEvent('dashboard:open-tab', { detail: { tab: 'socios' } }))
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="linaje-modal-root"
          className="fixed inset-0 z-[140] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
            aria-label="Cerrar"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            className={cn(
              'relative z-10 w-full max-w-[min(920px,95vw)] overflow-hidden rounded-[2.25rem] border border-white/[0.10]',
              'bg-gradient-to-br from-[#06130e]/95 via-[#091524]/92 to-[#0b1730]/95',
              'shadow-[0_26px_90px_-14px_rgba(0,0,0,0.75)] backdrop-blur-2xl backdrop-saturate-150',
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
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition hover:bg-white/[0.06] hover:text-white"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div className="p-6 sm:p-8">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Linaje del lote</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-white">
                {batch ? `${batch.strain || 'Lote'} · ${batch.id}` : harvestBatchId ? `Lote · ${harvestBatchId}` : '—'}
              </h2>
              <p className="mt-1 text-sm text-white/55">
                Camino vertical desde origen hasta dispensaciones (trazabilidad bidireccional).
              </p>

              <div className="mt-6 flex max-h-[70vh] min-h-0 flex-col overflow-y-auto pr-1">
                <div className="mx-auto flex w-full max-w-[520px] flex-col items-stretch">
                  <NodeCard
                    title="Genética & Origen"
                    subtitle={batch?.strain ? `Proyecto · ${batch.strain}` : 'Proyecto · —'}
                    Icon={Leaf}
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[12px] text-white/60">
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1">Origen: Banco interno</span>
                      <span className="rounded-full bg-white/[0.04] px-2.5 py-1">Registro: pendiente (demo)</span>
                    </div>
                  </NodeCard>

                  <FlowRail />

                  <NodeCard
                    title="Lote de Cultivo"
                    subtitle={batch ? `Lote · ${batch.tableLabel || '—'} · ${batch.roomLabel || '—'}` : 'Lote · —'}
                    Icon={Sprout}
                  >
                    <div className="grid grid-cols-1 gap-2 text-[12px] text-white/60 sm:grid-cols-2">
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Corte</p>
                        <p className="mt-0.5 font-semibold text-white/80 tabular-nums">{batch?.harvestDate ?? '—'}</p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Plantas</p>
                        <p className="mt-0.5 font-semibold text-white/80 tabular-nums">{batch?.plantCount ?? '—'}</p>
                      </div>
                    </div>
                  </NodeCard>

                  <FlowRail />

                  <NodeCard
                    title="Procesamiento granel"
                    subtitle={batch ? `Seco total: ${batch.dryWeight != null ? fmtGrams(batch.dryWeight) : '—'}` : 'Seco total: —'}
                    Icon={Scale}
                  >
                    <div className="grid grid-cols-1 gap-2 text-[12px] text-white/60 sm:grid-cols-3">
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Premium</p>
                        <p className="mt-0.5 font-semibold text-white/80 tabular-nums">
                          {batch?.stockGradePremiumG != null ? fmtGrams(batch.stockGradePremiumG) : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Popcorn</p>
                        <p className="mt-0.5 font-semibold text-white/80 tabular-nums">
                          {batch?.stockGradePopcornG != null ? fmtGrams(batch.stockGradePopcornG) : '—'}
                        </p>
                      </div>
                      <div className="rounded-2xl bg-white/[0.04] px-3 py-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/45">Biomasa</p>
                        <p className="mt-0.5 font-semibold text-white/80 tabular-nums">
                          {batch?.stockGradeBiomassG != null ? fmtGrams(batch.stockGradeBiomassG) : '—'}
                        </p>
                      </div>
                    </div>
                  </NodeCard>

                  <FlowRail />

                  <NodeCard
                    title="Dispensación"
                    subtitle={`${dispTotals.tx} transacciones · ${fmtGrams(dispTotals.grams)}`}
                    Icon={Package}
                  >
                    {disp.length === 0 ? (
                      <p className="text-sm text-white/55">Todavía no hay dispensaciones vinculadas a este lote.</p>
                    ) : (
                      <div className="space-y-2">
                        {disp.slice(0, 20).map((m) => (
                          <div
                            key={m.id}
                            className="flex items-start justify-between gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => openSocio(m.socioId)}
                                className="truncate text-left text-sm font-semibold text-white hover:underline"
                              >
                                {m.socioNombre}
                              </button>
                              <p className="mt-0.5 truncate text-[12px] text-white/55">
                                <CalendarClock className="mr-1 inline-block h-3.5 w-3.5" aria-hidden />
                                {fmtDate(m.createdAt)} · {m.tipo === 'legal' ? 'Legal' : 'Interno'}
                              </p>
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-sm font-semibold text-white tabular-nums">{fmtGrams(m.grams)}</p>
                              <p className="mt-0.5 text-[12px] text-white/55">{m.metodoPago}</p>
                            </div>
                          </div>
                        ))}
                        {disp.length > 20 ? (
                          <p className="pt-1 text-[12px] text-white/55">
                            Mostrando 20 de {disp.length}. Usá “Movimientos” para ver el listado completo.
                          </p>
                        ) : null}
                      </div>
                    )}
                  </NodeCard>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

