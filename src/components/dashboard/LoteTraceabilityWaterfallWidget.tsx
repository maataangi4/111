import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronDown, ChevronUp, Flower2, Leaf, Minus, Plus, Sprout, Wheat } from 'lucide-react'
import { useCallback, useMemo, useState } from 'react'
import { cn } from '../../lib/cn'

const TITLE = 'EMBUDO DE TRAZABILIDAD DEL LOTE: TROPICANA BANANA'

const DEFAULT_INICIO = 100
const DEFAULT_LOSS_ROOT = 8
const DEFAULT_LOSS_VEG = 27
const DEFAULT_LOSS_FLOR = 2

function clamp(n: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, n))
}

function fmtPct(p: number) {
  if (!Number.isFinite(p)) return '0%'
  const rounded = Math.round(p * 10) / 10
  return `${String(rounded).replace('.', ',')}%`
}

type StageDef = {
  key: string
  stepLabel: string
  countLabel: (n: number, pctOfStart: number) => string
  flowLabel: (lost: number) => string
  Icon: typeof Sprout
  iconClass: string
}

const STAGES: StageDef[] = [
  {
    key: 'inicio',
    stepLabel: '1. INICIO (CLONES)',
    countLabel: (n, pct) => `${n} ESQUEJES (${fmtPct(pct)})`,
    flowLabel: (lost) => `−${lost} PÉRDIDAS EN ENRAIZAMIENTO`,
    Icon: Sprout,
    iconClass: 'text-emerald-300',
  },
  {
    key: 'postRoot',
    stepLabel: '2. POST-ENRAIZAMIENTO',
    countLabel: (n, pct) => `${n} PLANTAS (${fmtPct(pct)})`,
    flowLabel: (lost) => `−${lost} PÉRDIDAS EN VEGETACIÓN`,
    Icon: Leaf,
    iconClass: 'text-lime-300',
  },
  {
    key: 'postVeg',
    stepLabel: '3. POST-VEGETACIÓN',
    countLabel: (n, pct) => `${n} PLANTAS (${fmtPct(pct)})`,
    flowLabel: (lost) => `−${lost} PÉRDIDAS EN FLORACIÓN`,
    Icon: Flower2,
    iconClass: 'text-fuchsia-300',
  },
  {
    key: 'cosecha',
    stepLabel: '4. COSECHA (HARVEST)',
    countLabel: (n, pct) => `${n} PLANTAS (${fmtPct(pct)})`,
    flowLabel: () => '',
    Icon: Wheat,
    iconClass: 'text-amber-300',
  },
]

function FlowConnector({
  fromPct,
  toPct,
  lossPct,
  flowText,
  compact,
}: {
  fromPct: number
  toPct: number
  lossPct: number
  flowText: string
  compact: boolean
}) {
  const reduceMotion = useReducedMotion()
  const wFrom = Math.max(18, (fromPct / 100) * 100)
  const wTo = Math.max(18, (toPct / 100) * 100)
  const midX = 50
  const y0 = 0
  const y1 = compact ? 22 : 28
  const y2 = compact ? 44 : 56
  const x0 = midX - wFrom / 2
  const x1 = midX + wFrom / 2
  const x2 = midX - wTo / 2
  const x3 = midX + wTo / 2
  const pathD = `M ${x0} ${y0} L ${x1} ${y0} L ${x3} ${y2} L ${x2} ${y2} Z`

  return (
    <div className={cn('relative mx-auto w-full max-w-[min(100%,20rem)]', compact ? 'py-0.5' : 'py-1')}>
      <svg
        viewBox="0 0 100 60"
        className="h-[clamp(2.5rem,6vw,3.75rem)] w-full overflow-visible"
        preserveAspectRatio="none"
        aria-hidden
      >
        <defs>
          <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(52,211,153,0.55)" />
            <stop offset="55%" stopColor="rgba(56,189,248,0.45)" />
            <stop offset="100%" stopColor="rgba(96,165,250,0.35)" />
          </linearGradient>
          <linearGradient id="flowStroke" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.35)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.08)" />
          </linearGradient>
        </defs>
        {!reduceMotion ? (
          <motion.path
            d={pathD}
            fill="url(#flowGrad)"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: [0.45, 0.85, 0.55] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          />
        ) : (
          <path d={pathD} fill="url(#flowGrad)" opacity={0.55} />
        )}
        <path
          d={`M ${midX} ${y0} L ${midX} ${y1}`}
          fill="none"
          stroke="url(#flowStroke)"
          strokeWidth={0.9}
          strokeDasharray="2 3"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={`M ${midX} ${y1} L ${midX} ${y2 - 0.5}`}
          fill="none"
          stroke="rgba(248,113,113,0.55)"
          strokeWidth={0.85}
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div
        className={cn(
          'pointer-events-none absolute inset-x-0 flex flex-col items-center text-center',
          compact ? 'top-[38%]' : 'top-[40%]',
        )}
      >
        <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-rose-200/95">{flowText}</p>
        <p className="mt-0.5 text-[10px] font-medium tabular-nums text-white/75">
          Pérdida: <span className="text-rose-200">{fmtPct(lossPct)}</span>
        </p>
      </div>
    </div>
  )
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  compact,
}: {
  label: string
  value: number
  min: number
  max: number
  onChange: (n: number) => void
  compact: boolean
}) {
  const dec = () => onChange(clamp(value - 1, min, max))
  const inc = () => onChange(clamp(value + 1, min, max))
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.08]', compact && 'p-2')}>
      <span className="text-[9px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={dec}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90 ring-1 ring-white/10 transition hover:bg-white/[0.14] active:scale-95"
          aria-label="Disminuir"
        >
          <Minus className="h-4 w-4" strokeWidth={2.2} />
        </button>
        <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums text-white">{value}</span>
        <button
          type="button"
          onClick={inc}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-white/90 ring-1 ring-white/10 transition hover:bg-white/[0.14] active:scale-95"
          aria-label="Aumentar"
        >
          <Plus className="h-4 w-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}

function LossSlider({
  label,
  value,
  max,
  onChange,
  compact,
}: {
  label: string
  value: number
  max: number
  onChange: (n: number) => void
  compact: boolean
}) {
  const safeMax = Math.max(0, max)
  return (
    <div className={cn('flex flex-col gap-1.5 rounded-2xl bg-white/[0.04] p-2.5 ring-1 ring-white/[0.08]', compact && 'p-2')}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-white/45">{label}</span>
        <span className="text-xs font-semibold tabular-nums text-rose-200/90">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={safeMax}
        step={1}
        value={clamp(value, 0, safeMax)}
        onChange={(e) => onChange(clamp(Number(e.target.value), 0, safeMax))}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08]',
          '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none',
          '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-emerald-300 [&::-webkit-slider-thumb]:to-sky-400',
          '[&::-webkit-slider-thumb]:shadow-[0_0_0_2px_rgba(255,255,255,0.25)]',
          '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0',
          '[&::-moz-range-thumb]:bg-gradient-to-br [&::-moz-range-thumb]:from-emerald-300 [&::-moz-range-thumb]:to-sky-400',
          compact ? 'mt-0.5' : 'mt-1',
        )}
        aria-label={label}
      />
    </div>
  )
}

export function LoteTraceabilityWaterfallWidget({ compact = false }: { compact?: boolean }) {
  const [inicio, setInicio] = useState(DEFAULT_INICIO)
  const [lossRoot, setLossRoot] = useState(DEFAULT_LOSS_ROOT)
  const [lossVeg, setLossVeg] = useState(DEFAULT_LOSS_VEG)
  const [lossFlor, setLossFlor] = useState(DEFAULT_LOSS_FLOR)
  const [controlsOpen, setControlsOpen] = useState(!compact)

  const afterRoot = useMemo(() => Math.max(0, inicio - lossRoot), [inicio, lossRoot])
  const afterVeg = useMemo(() => Math.max(0, afterRoot - lossVeg), [afterRoot, lossVeg])
  const finalCount = useMemo(() => Math.max(0, afterVeg - lossFlor), [afterVeg, lossFlor])

  const globalSurvivalPct = useMemo(() => {
    if (inicio <= 0) return 0
    return Math.round((finalCount / inicio) * 1000) / 10
  }, [inicio, finalCount])

  const pctOfStart = useCallback((n: number) => (inicio > 0 ? (n / inicio) * 100 : 0), [inicio])

  const lossPctRoot = useMemo(() => (inicio > 0 ? (lossRoot / inicio) * 100 : 0), [inicio, lossRoot])
  const lossPctVeg = useMemo(() => (afterRoot > 0 ? (lossVeg / afterRoot) * 100 : 0), [afterRoot, lossVeg])
  const lossPctFlor = useMemo(() => (afterVeg > 0 ? (lossFlor / afterVeg) * 100 : 0), [afterVeg, lossFlor])

  const counts = [inicio, afterRoot, afterVeg, finalCount]
  const flowLosses = [lossRoot, lossVeg, lossFlor]
  const flowPcts = [lossPctRoot, lossPctVeg, lossPctFlor]

  const ringPct = clamp(globalSurvivalPct, 0, 100)
  const circumference = 2 * Math.PI * 42
  const dash = (ringPct / 100) * circumference

  const setLossRootSafe = useCallback(
    (n: number) => setLossRoot(clamp(n, 0, Math.max(0, inicio - 1))),
    [inicio],
  )
  const setLossVegSafe = useCallback(
    (n: number) => setLossVeg(clamp(n, 0, Math.max(0, afterRoot - 1))),
    [afterRoot],
  )
  const setLossFlorSafe = useCallback(
    (n: number) => setLossFlor(clamp(n, 0, Math.max(0, afterVeg - 1))),
    [afterVeg],
  )

  return (
    <div
      className={cn(
        'flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[22px]',
        'border border-white/[0.12] bg-gradient-to-br from-[#07140f]/95 via-[#0a1624]/92 to-[#0c1830]/95',
        'shadow-[0_12px_48px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.06)]',
        'backdrop-blur-xl backdrop-saturate-150',
      )}
    >
      <div
        className={cn(
          'pointer-events-none absolute inset-0 opacity-[0.55]',
          'bg-[radial-gradient(120%_80%_at_20%_0%,rgba(6,102,63,0.35),transparent_55%),radial-gradient(90%_70%_at_100%_20%,rgba(37,99,235,0.22),transparent_50%)]',
        )}
        aria-hidden
      />

      <div className={cn('relative z-[1] flex min-h-0 flex-1 flex-col', compact ? 'gap-2 p-3' : 'gap-3 p-4 sm:p-5')}>
        <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-200/70">Canspace · Lote</p>
            <h2 className="mt-1 line-clamp-2 text-[11px] font-semibold leading-snug text-white/95 sm:text-xs">
              {TITLE}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
            <div className="relative h-[4.5rem] w-[4.5rem] shrink-0 sm:h-[5.25rem] sm:w-[5.25rem]">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden>
                <defs>
                  <linearGradient id="ringSurvival" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#38bdf8" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="url(#ringSurvival)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${dash} ${circumference}`}
                  className="transition-[stroke-dasharray] duration-500 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center px-1 text-center">
                <span className="text-[6px] font-semibold uppercase leading-tight tracking-[0.06em] text-white/55 sm:text-[7px]">
                  Tasa global de supervivencia
                </span>
                <span className="mt-0.5 text-base font-semibold tabular-nums text-white sm:text-lg">{globalSurvivalPct}%</span>
              </div>
            </div>
            <p className="hidden text-end text-[9px] font-medium uppercase tracking-wide text-white/45 sm:block">
              Supervivencia
            </p>
          </div>
        </header>

        <p className="shrink-0 text-center text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-100/80">
          Flujo vertical · trazabilidad por etapa
        </p>

        <div
          className={cn(
            'flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden',
            compact ? 'max-h-[220px]' : 'max-h-none',
          )}
        >
          <div className="mx-auto flex w-full max-w-md flex-col items-stretch pb-1">
            {STAGES.map((stage, idx) => {
              const n = counts[idx]!
              const Icon = stage.Icon
              const isLast = idx === STAGES.length - 1
              return (
                <div key={stage.key} className="flex w-full flex-col items-center">
                  <motion.article
                    layout
                    initial={false}
                    className={cn(
                      'relative w-full max-w-[min(100%,19rem)] rounded-2xl border border-white/[0.1]',
                      'bg-white/[0.06] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
                      'ring-1 ring-white/[0.05]',
                      compact && 'p-2.5',
                    )}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                          'bg-gradient-to-br from-white/[0.12] to-white/[0.04] ring-1 ring-white/10',
                          compact && 'h-9 w-9',
                        )}
                      >
                        <Icon className={cn('h-[1.15rem] w-[1.15rem]', stage.iconClass)} strokeWidth={2} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/55">{stage.stepLabel}</p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">{stage.countLabel(n, pctOfStart(n))}</p>
                      </div>
                    </div>
                  </motion.article>

                  {!isLast ? (
                    <FlowConnector
                      fromPct={pctOfStart(n)}
                      toPct={pctOfStart(counts[idx + 1]!)}
                      lossPct={flowPcts[idx]!}
                      flowText={stage.flowLabel(flowLosses[idx]!)}
                      compact={compact}
                    />
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>

        <div className="shrink-0 border-t border-white/[0.08] pt-2">
          <button
            type="button"
            onClick={() => setControlsOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-xl px-1 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wide text-white/55 transition hover:bg-white/[0.04]"
          >
            <span>Panel de control · pérdidas y plantas iniciales</span>
            {controlsOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-white/50" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-white/50" />
            )}
          </button>
          <AnimatePresence initial={false}>
            {controlsOpen ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className={cn('mt-2 grid gap-2', compact ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4')}>
                  <Stepper label="Inicio (esquejes)" value={inicio} min={10} max={5000} onChange={setInicio} compact={compact} />
                  <LossSlider
                    label="Pérdida enraizamiento"
                    value={lossRoot}
                    max={Math.max(0, inicio - 1)}
                    onChange={setLossRootSafe}
                    compact={compact}
                  />
                  <LossSlider
                    label="Pérdida vegetación"
                    value={lossVeg}
                    max={Math.max(0, afterRoot - 1)}
                    onChange={setLossVegSafe}
                    compact={compact}
                  />
                  <LossSlider
                    label="Pérdida floración"
                    value={lossFlor}
                    max={Math.max(0, afterVeg - 1)}
                    onChange={setLossFlorSafe}
                    compact={compact}
                  />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
