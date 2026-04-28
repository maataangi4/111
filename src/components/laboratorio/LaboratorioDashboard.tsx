import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Droplet, GitBranch, Plus, Sparkles } from 'lucide-react'
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/cn'
import { FinalizarProcesoModal } from './FinalizarProcesoModal'
import { NuevaElaboracionModal } from './NuevaElaboracionModal'

const ACCENT = '#11caa0'
const ACCENT_2 = '#00ff88'
const ADD_FAB_COLLAPSED_PX = 52

type RawLot = {
  id: string
  strain: string
  harvestedAt: string
  availableGrams: number
}

type ProductCategory = 'aceites' | 'topicos' | 'resinas'

type ActiveProcess = {
  id: string
  name: string
  originLotId: string
  originStrain: string
  status: 'in_progress' | 'resting'
  progressPct: number
  plannedUnits: number
  category: ProductCategory
  startedAt: string
  plannedVolPerUnit: number
}

type FinishedLot = {
  id: string
  category: ProductCategory
  createdAt: string
  units: number
  volPerUnit: number
  originLotId: string
  originStrain: string
}

function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-[12px]',
        'shadow-[0_20px_70px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <GlassCard className="p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-200 tabular-nums">{value}</p>
    </GlassCard>
  )
}

function ProgressBar({ pct }: { pct: number }) {
  const p = Math.max(0, Math.min(100, pct))
  return (
    <div className="h-2.5 rounded-full bg-white/10">
      <div
        className="h-2.5 rounded-full"
        style={{
          width: `${p}%`,
          backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
          boxShadow: '0 0 18px rgba(17,202,160,0.20)',
        }}
      />
    </div>
  )
}

function catLabel(c: ProductCategory): string {
  if (c === 'aceites') return 'Aceites y Tinturas'
  if (c === 'topicos') return 'Tópicos y Cremas'
  return 'Resinas y Extractos'
}

function catIcon(c: ProductCategory) {
  if (c === 'aceites') return Droplet
  if (c === 'topicos') return Sparkles
  return Sparkles
}

export function LaboratorioDashboard() {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const addFabMeasureRef = useRef<HTMLSpanElement>(null)
  const [addFabOpen, setAddFabOpen] = useState(false)
  const [addFabMotionOk] = useState(true)
  const [addFabExpandedW, setAddFabExpandedW] = useState(280)

  const [newOpen, setNewOpen] = useState(false)
  const [finish, setFinish] = useState<ActiveProcess | null>(null)

  const [rawLots] = useState<RawLot[]>(() => [
    { id: '045', strain: '13-Dawgs', harvestedAt: '2026-03-15', availableGrams: 520 },
    { id: '046', strain: 'Gelato', harvestedAt: '2026-03-19', availableGrams: 410 },
    { id: '047', strain: 'Lemon Haze', harvestedAt: '2026-03-23', availableGrams: 690 },
  ])

  const [active, setActive] = useState<ActiveProcess[]>(() => [
    {
      id: 'LAB-001',
      name: 'Extracción Full Spectrum 10%',
      originLotId: '045',
      originStrain: '13-Dawgs',
      status: 'resting',
      progressPct: 72,
      plannedUnits: 20,
      category: 'aceites',
      startedAt: '2026-03-22',
      plannedVolPerUnit: 30,
    },
    {
      id: 'LAB-002',
      name: 'Rosin · Prensa 2T',
      originLotId: '046',
      originStrain: 'Gelato',
      status: 'in_progress',
      progressPct: 38,
      plannedUnits: 14,
      category: 'resinas',
      startedAt: '2026-03-24',
      plannedVolPerUnit: 1,
    },
  ])

  const [history, setHistory] = useState<FinishedLot[]>(() => [
    {
      id: 'ACE-001',
      category: 'aceites',
      createdAt: '2026-03-10',
      units: 20,
      volPerUnit: 30,
      originLotId: '044',
      originStrain: 'OG Kush',
    },
    {
      id: 'TOP-004',
      category: 'topicos',
      createdAt: '2026-03-12',
      units: 12,
      volPerUnit: 50,
      originLotId: '043',
      originStrain: 'CBD Critical',
    },
  ])

  const kpiActive = String(active.length)
  const kpiEfficiency = '94%'
  const kpiProcessed = '1.2 kg'

  const addFabLabelText = t('lab.dashboardNew')
  const measureAddFabExpanded = useCallback(() => {
    const el = addFabMeasureRef.current
    if (!el) return
    const sw = Math.ceil(el.scrollWidth)
    const rw = Math.ceil(el.getBoundingClientRect().width)
    const intrinsic = Math.max(sw, rw, ADD_FAB_COLLAPSED_PX)
    const cap = typeof window !== 'undefined' ? Math.max(160, window.innerWidth - 48) : 720
    setAddFabExpandedW(Math.min(cap, intrinsic + 14))
  }, [])

  useLayoutEffect(() => {
    let alive = true
    const safe = () => {
      if (alive) measureAddFabExpanded()
    }
    safe()
    const raf = requestAnimationFrame(safe)
    window.addEventListener('resize', safe)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const p = fonts?.ready
    if (p) void p.then(safe)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', safe)
    }
  }, [measureAddFabExpanded])

  const onCreate = (p: {
    originLotId: string
    originStrain: string
    grams: number
    category: ProductCategory
    plannedUnits: number
    volPerUnit: number
    formula?: string
  }) => {
    void p
    const n = active.length + history.length + 1
    const id = `LAB-${String(n).padStart(3, '0')}`
    const name =
      p.category === 'aceites'
        ? 'Aceite · Full Spectrum'
        : p.category === 'topicos'
          ? 'Tópico · Fórmula'
          : 'Resina · Extracto'

    setActive((prev) => [
      {
        id,
        name,
        originLotId: p.originLotId,
        originStrain: p.originStrain,
        status: 'in_progress',
        progressPct: 12,
        plannedUnits: p.plannedUnits,
        category: p.category,
        startedAt: new Date().toISOString().slice(0, 10),
        plannedVolPerUnit: p.volPerUnit,
      },
      ...prev,
    ])
  }

  const onFinalize = (processId: string, obtainedUnits: number, mermaReason?: string) => {
    const proc = active.find((x) => x.id === processId)
    if (!proc) return
    void mermaReason
    setActive((prev) => prev.filter((x) => x.id !== processId))
    setHistory((prev) => [
      {
        id: proc.category === 'aceites' ? `ACE-${processId.slice(-3)}` : `LOT-${processId.slice(-3)}`,
        category: proc.category,
        createdAt: new Date().toISOString().slice(0, 10),
        units: obtainedUnits,
        volPerUnit: proc.plannedVolPerUnit,
        originLotId: proc.originLotId,
        originStrain: proc.originStrain,
      },
      ...prev,
    ])
  }

  const page = useMemo(() => cn('relative min-h-0 h-full w-full overflow-hidden bg-[#050505] text-slate-200'), [])

  return (
    <motion.div
      className={page}
      layout
      initial={reduceMotion ? false : { opacity: 0, scaleX: 0.985 }}
      animate={{ opacity: 1, scaleX: 1 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      style={{ transformOrigin: '50% 40%' }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -left-40 -top-48 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(17,202,160,0.10), transparent 60%)' }}
        />
        <div
          className="absolute -right-56 top-1/3 h-[620px] w-[620px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.08), transparent 62%)' }}
        />
      </div>

      <motion.div className="relative z-[1] flex w-full flex-col gap-10 px-6 py-10 sm:px-10" layout>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-slate-200">
              {t('lab.dashboardTitle')}
            </h1>
          </div>
          <button
            type="button"
            aria-label={addFabLabelText}
            title={addFabLabelText}
            aria-expanded={addFabOpen}
            onClick={() => setNewOpen(true)}
            onMouseEnter={() => setAddFabOpen(true)}
            onMouseLeave={() => setAddFabOpen(false)}
            onFocus={() => setAddFabOpen(true)}
            onBlur={() => setAddFabOpen(false)}
            className={cn(
              'relative flex h-12 shrink-0 cursor-pointer items-center overflow-hidden rounded-full text-sm font-semibold text-black',
              addFabOpen ? 'justify-end' : 'justify-center',
              'hover:brightness-110 active:brightness-95',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#181818]',
            )}
            style={{
              width: addFabOpen ? addFabExpandedW : ADD_FAB_COLLAPSED_PX,
              backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
              boxShadow: '0 0 22px rgba(17,202,160,0.22)',
              transition: addFabMotionOk ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
            }}
          >
            <span
              ref={addFabMeasureRef}
              aria-hidden
              className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max flex-row items-center gap-2 pl-5 pr-4 opacity-0"
            >
              <span className="whitespace-nowrap">{addFabLabelText}</span>
              <Plus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
            <span
              className={cn(
                'relative z-[1] flex h-full w-max shrink-0 flex-row items-center',
                addFabOpen ? 'justify-end gap-2 pl-5 pr-4' : 'justify-center gap-0',
              )}
            >
              <span
                className={cn(
                  'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out',
                  addFabOpen ? 'max-w-[min(90vw,720px)]' : 'max-w-0',
                )}
                aria-hidden={!addFabOpen}
              >
                {addFabLabelText}
              </span>
              <Plus className="h-5 w-5 shrink-0" strokeWidth={2.25} aria-hidden />
            </span>
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <KPI label={t('lab.kpiActive')} value={kpiActive} />
          <KPI label={t('lab.kpiEfficiency')} value={kpiEfficiency} />
          <KPI label={t('lab.kpiProcessed')} value={kpiProcessed} />
        </div>

        <div>
          <div className="flex items-end justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-200">{t('lab.activeTitle')}</h2>
          </div>

          <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
            {active.map((p) => {
              const Icon = catIcon(p.category)
              return (
                <GlassCard key={p.id} className="min-w-[340px] p-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200">
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-200">{p.name}</p>
                        <p className="truncate text-xs text-white/45">
                          Lote Origen: #{p.originLotId} ({p.originStrain})
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/55">
                      {p.status === 'resting' ? 'En reposo' : 'En proceso'}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3">
                    <ProgressBar pct={p.progressPct} />
                    <div className="flex items-center justify-between text-xs text-white/45">
                      <span>{catLabel(p.category)}</span>
                      <span className="tabular-nums">{p.plannedUnits} u plan</span>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('dashboard:open-tab', { detail: { tab: 'trazabilidad' } }))
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold text-black transition hover:brightness-110 active:brightness-95"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
                        boxShadow: '0 0 14px rgba(17,202,160,0.14)',
                      }}
                    >
                      <GitBranch className="h-4 w-4" strokeWidth={1.75} />
                      {t('lab.openTrace')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFinish(p)}
                      className="rounded-full px-4 py-2 text-xs font-semibold text-black transition hover:brightness-110 active:brightness-95"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
                        boxShadow: '0 0 14px rgba(17,202,160,0.16)',
                      }}
                    >
                      {t('lab.finishProcess')}
                    </button>
                  </div>
                </GlassCard>
              )
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold tracking-tight text-slate-200">{t('lab.historyTitle')}</h2>
          <GlassCard className="mt-4 overflow-hidden">
            <div className="grid grid-cols-12 gap-3 bg-white/[0.04] px-6 py-4 text-[11px] font-semibold uppercase tracking-wide text-white/55">
              <div className="col-span-3">ID</div>
              <div className="col-span-3">Tipo</div>
              <div className="col-span-2">Fecha</div>
              <div className="col-span-3">Volumen</div>
              <div className="col-span-1 text-right"> </div>
            </div>
            <div className="divide-y divide-white/[0.06]">
              {history.map((h) => (
                <div key={h.id} className="grid grid-cols-12 items-center gap-3 px-6 py-4 text-sm">
                  <div className="col-span-3 font-semibold text-slate-200">{h.id}</div>
                  <div className="col-span-3 text-white/70">{catLabel(h.category)}</div>
                  <div className="col-span-2 text-white/55 tabular-nums">{h.createdAt}</div>
                  <div className="col-span-3 text-white/70 tabular-nums">
                    {h.units} x {h.volPerUnit}
                    {h.category === 'resinas' ? ' g' : ' ml'}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('dashboard:open-tab', { detail: { tab: 'trazabilidad' } }))
                      }}
                      className="rounded-full p-2 text-black transition hover:brightness-110 active:brightness-95"
                      style={{
                        backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
                        boxShadow: '0 0 12px rgba(17,202,160,0.12)',
                      }}
                      aria-label={t('lab.openTrace')}
                      title={t('lab.openTrace')}
                    >
                      <GitBranch className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </motion.div>

      <AnimatePresence>
        {newOpen ? (
          <NuevaElaboracionModal
            open={newOpen}
            onClose={() => setNewOpen(false)}
            lots={rawLots}
            onCreate={(x) => {
              onCreate(x)
              setNewOpen(false)
            }}
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {finish ? (
          <FinalizarProcesoModal
            process={finish}
            onClose={() => setFinish(null)}
            onFinalize={(obtainedUnits, mermaReason) => {
              onFinalize(finish.id, obtainedUnits, mermaReason)
              setFinish(null)
            }}
          />
        ) : null}
      </AnimatePresence>
    </motion.div>
  )
}

