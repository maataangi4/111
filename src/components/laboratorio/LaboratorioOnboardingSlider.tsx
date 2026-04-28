import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Beaker,
  Check,
  Droplet,
  Filter,
  Scale,
  Sparkles,
  Tablet,
} from 'lucide-react'
import { useCallback, useMemo, useState, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/cn'
import { CanspaceLeafMark } from '../branding/CanspaceLeafMark'

const ACCENT = '#11caa0'
const ACCENT_2 = '#00ff88'
const EASE = [0.22, 1, 0.36, 1] as const

type SlideDef = {
  id: string
  render: () => ReactElement
}

function TripleLeafMark({ className }: { className?: string }) {
  return <CanspaceLeafMark className={cn('h-20 w-24 text-white', className)} />
}

function SlideShell({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="w-full">{children}</div>
  )
}

function SlideIndicator({
  count,
  current,
  onGo,
}: {
  count: number
  current: number
  onGo: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: count }).map((_, i) => {
        const on = i === current
        return (
          <button
            key={i}
            type="button"
            onClick={() => onGo(i)}
            className={cn(
              'h-2.5 rounded-full transition',
              on ? 'w-8' : 'w-2.5',
              on ? 'bg-emerald-300/90' : 'bg-white/15 hover:bg-white/22',
            )}
            style={on ? { boxShadow: `0 0 0 4px rgba(17,202,160,0.10)` } : undefined}
            aria-label={`Slide ${i + 1}`}
          />
        )
      })}
    </div>
  )
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-200">{label}</span>
        <span className="font-semibold text-slate-200 tabular-nums">{Math.round(v)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-white/10">
        <div
          className="h-2.5 rounded-full"
          style={{
            width: `${v}%`,
            backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
            boxShadow: '0 0 18px rgba(17,202,160,0.20)',
          }}
        />
      </div>
    </div>
  )
}

function TableLite({
  rows,
}: {
  rows: { fecha: string; id: string; tipo: string; causa: string; cantidad: string }[]
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
      <div className="grid grid-cols-5 gap-3 bg-white/[0.04] px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-white/55">
        <div>Fecha</div>
        <div>ID Proceso</div>
        <div>Tipo</div>
        <div className="col-span-2">Causa Justificada · Cantidad</div>
      </div>
      <div className="divide-y divide-white/[0.06]">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-5 gap-3 px-5 py-3 text-sm">
            <div className="text-slate-200">{r.fecha}</div>
            <div className="text-slate-200">{r.id}</div>
            <div className="text-slate-200">{r.tipo}</div>
            <div className="col-span-2 flex items-center justify-between gap-4">
              <span className="min-w-0 truncate text-zinc-300">{r.causa}</span>
              <span className="shrink-0 font-semibold text-slate-200 tabular-nums">{r.cantidad}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function TimelineRow() {
  const items = [
    { label: 'Genética', icon: Sparkles },
    { label: 'Cultivo', icon: Beaker },
    { label: 'Laboratorio', icon: Droplet },
    { label: 'Paciente', icon: Tablet },
  ]
  return (
    <div className="mt-6">
      <div className="flex items-center justify-between gap-3">
        {items.map((it, idx) => (
          <div key={it.label} className="flex min-w-0 flex-1 items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04]"
              style={{ boxShadow: '0 0 30px rgba(17,202,160,0.08)' }}
            >
              <it.icon className="h-5 w-5 text-emerald-200" strokeWidth={1.75} />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-200">{it.label}</p>
              <p className="truncate text-xs text-white/45">{idx === 2 ? 'Procesos & galénica' : 'Registro'}</p>
            </div>
            {idx < items.length - 1 ? (
              <div className="mx-2 h-px flex-1 bg-gradient-to-r from-emerald-400/35 to-transparent" />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function LaboratorioOnboardingSlider({ onComplete }: { onComplete: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides: SlideDef[] = useMemo(
    () => [
      {
        id: 'hero',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-3xl text-center">
              <div
                className="mx-auto flex items-center justify-center"
              >
                <TripleLeafMark />
              </div>
              <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-200 sm:text-5xl">
                Laboratorio <span style={{ color: ACCENT }}>Canspace</span>
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-zinc-300">
                De la planta a la esencia. Gestión profesional de extracciones, procesos galénicos y cumplimiento legal.
              </p>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'features-bridge',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-3xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-200">
                El puente entre el cultivo y el paciente
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">
                Transformá tu cosecha en productos Full Spectrum con trazabilidad, control de rendimiento e inventario final listo para auditoría.
              </p>
              <ul className="mt-7 inline-flex flex-col items-start gap-3 text-left">
                {['Cree nuevas extracciones', 'Gestione inventario', 'Controle el rendimiento'].map((x) => (
                  <li key={x} className="flex items-start gap-3">
                    <span className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-200">
                      <Check className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    <span className="text-sm font-medium text-slate-200">{x}</span>
                  </li>
                ))}
              </ul>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'materia',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-4xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">La Ciencia de la Resina</h2>
              <p className="mx-auto mt-5 max-w-3xl text-base leading-relaxed text-zinc-300">
                Todo proceso nace de la calidad de la materia vegetal. Canspace registra el perfil terpénico y la potencia de cada Lote de Cosecha. Nadie pierde el rastro.
              </p>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'flow',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-5xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">Flujo de Elaboración</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: Scale, title: 'Suministro', sub: 'Selección del lote y pesaje' },
                  { icon: Filter, title: 'Proceso', sub: 'Extracción por solvente o prensa' },
                  { icon: Droplet, title: 'Fraccionamiento', sub: 'Envasado con etiquetado automático' },
                ].map((c) => (
                  <div key={c.title} className="p-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200">
                        <c.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div>
                        <p className="text-base font-semibold text-slate-200">{c.title}</p>
                        <p className="text-sm text-white/45">{c.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'yield',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">Control de Rendimiento</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                Medí eficiencia por lote, compará técnicas y defendé cada mililitro ante auditoría.
              </p>
              <div className="mx-auto mt-8 max-w-md space-y-5 text-left">
                <ProgressBar label="Lote #045" value={92} />
                <ProgressBar label="Lote #046" value={85} />
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'merma-table',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-5xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">Justificación de Pérdidas</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                Registro mínimo, legalmente robusto. Sin ruido: sólo lo que un inspector necesita.
              </p>
              <div className="mt-6">
                <TableLite
                  rows={[
                    {
                      fecha: '15 Mar 2026',
                      id: 'PROC-013',
                      tipo: 'Merma Técnica',
                      causa: 'Evaporación controlada',
                      cantidad: '-12.5 ml',
                    },
                    {
                      fecha: '18 Mar 2026',
                      id: 'PROC-014',
                      tipo: 'Descarte',
                      causa: 'Muestra de laboratorio',
                      cantidad: '-5.0 g',
                    },
                    {
                      fecha: '21 Mar 2026',
                      id: 'PROC-015',
                      tipo: 'Merma Técnica',
                      causa: 'Retención en filtro',
                      cantidad: '-4.0 ml',
                    },
                  ]}
                />
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'inventory-tiles',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-5xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">Inventario Final</h2>
              <div className="mt-6 grid gap-4 md:grid-cols-3">
                {[
                  { icon: Droplet, title: 'Aceites y Gotas', sub: 'Viales de 10ml, 30ml' },
                  { icon: Tablet, title: 'Tópicos y Cremas', sub: 'Bálsamos, ungüentos' },
                  { icon: Sparkles, title: 'Resinas y Extractos', sub: 'Rosin, BHO' },
                ].map((c) => (
                  <div key={c.title} className="p-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-400/12 text-emerald-200">
                        <c.icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-base font-semibold text-slate-200">{c.title}</p>
                        <p className="truncate text-sm text-white/45">{c.sub}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'trace-line',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-5xl">
              <h2 className="text-3xl font-semibold tracking-tight text-slate-200">Trazabilidad Ininterrumpida</h2>
              <div className="mt-6">
                <TimelineRow />
              </div>
              <p className="mt-6 text-sm leading-relaxed text-zinc-300">
                El Killer Feature: Una línea ininterrumpida que garantiza que este aceite es el mismo que recetó el médico.
              </p>
            </div>
          </SlideShell>
        ),
      },
      {
        id: 'cta',
        render: () => (
          <SlideShell>
            <div className="mx-auto w-full max-w-3xl text-center">
              <h2 className="mt-6 text-4xl font-semibold tracking-tight text-slate-200">¿Listo para empezar?</h2>
              <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-zinc-300">
                Iniciá una elaboración en 3 pasos: materia prima → formato → plan. Luego registrá el rendimiento final con merma justificada.
              </p>
            </div>
          </SlideShell>
        ),
      },
    ],
    [onComplete, t],
  )

  const total = slides.length
  const last = total - 1

  const clampGo = useCallback((i: number) => setCurrentSlide(Math.max(0, Math.min(last, i))), [last])
  const next = useCallback(() => clampGo(currentSlide + 1), [clampGo, currentSlide])
  const prev = useCallback(() => clampGo(currentSlide - 1), [clampGo, currentSlide])
  const skip = useCallback(() => clampGo(last), [clampGo, last])

  const slide = slides[currentSlide]!
  const navMotion = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: EASE }
  const slideTransition = reduceMotion
    ? { duration: 0 }
    : { type: 'tween' as const, duration: 0.28, ease: EASE }

  return (
    <div className="h-full w-full p-0 flex flex-col overflow-hidden bg-[#0a0a0a]">
      <div
        className="w-full h-full min-h-[600px] bg-[#0a0a0a] rounded-none relative overflow-hidden flex flex-col border-0 shadow-none"
        style={{ color: '#e2e8f0' }}
      >
        {/* Radial glows (organic modernism) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div
            className="absolute -left-32 -top-40 h-[520px] w-[520px] rounded-full blur-3xl opacity-80"
            style={{ background: 'radial-gradient(circle, rgba(17,202,160,0.16), transparent 60%)' }}
          />
          <div
            className="absolute -right-40 top-1/3 h-[560px] w-[560px] rounded-full blur-3xl opacity-80"
            style={{ background: 'radial-gradient(circle, rgba(0,255,136,0.12), transparent 60%)' }}
          />
          <div
            className="absolute bottom-[-240px] left-1/4 h-[620px] w-[620px] rounded-full blur-3xl opacity-80"
            style={{ background: 'radial-gradient(circle, rgba(17,202,160,0.10), transparent 62%)' }}
          />
          <div className="absolute inset-0 bg-[#050505]" style={{ opacity: 0.55 }} />
        </div>

        {/* Content */}
        <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-8 pb-32 z-10 min-h-0">
          <div className="w-full max-w-5xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={reduceMotion ? false : { opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
                transition={slideTransition}
              >
                {slide.render()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation (no absolute) */}
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          transition={navMotion}
          className="absolute bottom-10 left-0 w-full flex flex-col items-center gap-6 z-20 px-6"
        >
          <SlideIndicator count={total} current={currentSlide} onGo={clampGo} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={skip}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-white/55 transition hover:bg-white/[0.06] hover:text-white/80"
            >
              {t('lab.onboardingSkip')}
            </button>
            <button
              type="button"
              onClick={prev}
              disabled={currentSlide === 0}
              className={cn(
                'rounded-full px-4 py-2 text-sm font-semibold transition',
                currentSlide === 0
                  ? 'cursor-not-allowed bg-white/[0.03] text-white/25'
                  : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.10] hover:text-white',
              )}
            >
              {t('lab.onboardingPrev')}
            </button>
            <button
              type="button"
              onClick={currentSlide === last ? onComplete : next}
              className="rounded-full px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:brightness-95"
              style={{
                backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`,
                boxShadow: '0 0 18px rgba(17,202,160,0.18)',
              }}
            >
              {currentSlide === last ? t('lab.onboardingStart') : t('lab.onboardingNext')}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

