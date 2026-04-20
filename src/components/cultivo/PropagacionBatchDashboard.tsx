import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { AppLocale } from '../../store/useSettingsStore'
import type { GeneticsType, PropagacionLogEntry } from '../../store/cultivationTypes'
import { cn } from '../../lib/cn'

type TFn = (key: string, vars?: Record<string, string | number>) => string

export type BatchDashboardMode = 'propagacion' | 'vegetacion' | 'floracion'

type DashTab = 'clima' | 'luz' | 'nutricion' | 'salud'

/** Mismo estilo de pill que Germinación / Vegetación / Floración en CultivoTab. */
const dashTabActiveTone: Record<DashTab, string> = {
  clima:
    'bg-white text-teal-700 shadow-[0_4px_12px_-2px_rgba(20,184,166,0.2)] dark:bg-[#2a2a2a] dark:text-teal-300 dark:shadow-[0_4px_12px_-2px_rgba(20,184,166,0.12)]',
  luz: 'bg-white text-amber-700 shadow-[0_4px_12px_-2px_rgba(245,158,11,0.28)] dark:bg-[#2a2a2a] dark:text-amber-300 dark:shadow-[0_4px_12px_-2px_rgba(245,158,11,0.15)]',
  nutricion:
    'bg-white text-green-700 shadow-[0_4px_12px_-2px_rgba(34,197,94,0.2)] dark:bg-[#2a2a2a] dark:text-green-300 dark:shadow-[0_4px_12px_-2px_rgba(34,197,94,0.12)]',
  salud:
    'bg-white text-purple-700 shadow-[0_4px_12px_-2px_rgba(168,85,247,0.2)] dark:bg-[#2a2a2a] dark:text-purple-300 dark:shadow-[0_4px_12px_-2px_rgba(168,85,247,0.12)]',
}

type ClimaPt = { t: number; temp?: number; rh?: number; vpd?: number; ppfd?: number }
type LuzPt = { t: number; ppfd: number }
type NutPt = { source: 'diario' | 'measurement'; t: number; inPh?: number; inEc?: number; drPh?: number; drEc?: number }
type HealthPt = { t: number; score: number }

function padRange(min: number, max: number, pct: number): [number, number] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0, 1]
  if (min === max) {
    const d = Math.abs(min) * 0.1 || 0.5
    return [min - d, max + d]
  }
  const span = max - min
  return [min - span * pct, max + span * pct]
}

function mapLin(v: number, a: number, b: number, p0: number, p1: number): number {
  if (b === a) return (p0 + p1) / 2
  const u = (v - a) / (b - a)
  return p0 + (1 - u) * (p1 - p0)
}

/** Map domain value → SVG y: smaller values at bottom (y1), larger at top (y0). */
function pathFromSeries(
  xs: number[],
  vals: (number | undefined)[],
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  domain: [number, number],
): string {
  const [d0, d1] = domain
  const parts: string[] = []
  let started = false
  for (let i = 0; i < xs.length; i++) {
    const v = vals[i]
    if (v === undefined || !Number.isFinite(v)) {
      started = false
      continue
    }
    const x = mapLin(xs[i], xs[0], xs[xs.length - 1], x0, x1)
    const y = mapLin(v, d0, d1, y0, y1)
    if (!started) {
      parts.push(`M ${x.toFixed(1)} ${y.toFixed(1)}`)
      started = true
    } else {
      parts.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`)
    }
  }
  return parts.join(' ')
}

export function PropagacionBatchDashboard({
  propagacionLog,
  age,
  locale,
  t,
  inventory,
  lateInventory,
  mode = 'propagacion',
  vegStageDay,
  florFlowerDay,
  geneticsType,
  flowerDurationWeeks,
}: {
  propagacionLog: PropagacionLogEntry[] | undefined
  age: number
  locale: AppLocale
  t: TFn
  /** Lote en germinación: plantado, bajas Diario, vivos, % supervivencia. */
  inventory?: { planted: number; discarded: number; alive: number; survivalPct: number } | null
  /** Veg / flor: conteo por pulsera en el mismo `sourceBatchId` (o planta sola). */
  lateInventory?: { activos: number; bajas: number; cuarentena: number } | null
  mode?: BatchDashboardMode
  /** Día 1-based en vegetación (widget principal). */
  vegStageDay?: number
  /** Día 1-based en floración. */
  florFlowerDay?: number
  geneticsType?: GeneticsType
  flowerDurationWeeks?: number
}) {
  const [tab, setTab] = useState<DashTab>('clima')
  const hostRef = useRef<HTMLDivElement>(null)
  const [chartW, setChartW] = useState(360)

  useLayoutEffect(() => {
    const el = hostRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setChartW(Math.max(200, el.clientWidth)))
    ro.observe(el)
    setChartW(Math.max(200, el.clientWidth))
    return () => ro.disconnect()
  }, [])

  const log = propagacionLog ?? []

  const lastDliMol = useMemo(() => {
    for (let i = log.length - 1; i >= 0; i--) {
      const e = log[i]
      if (e.kind === 'diario_clima' && e.diarioClima?.dli != null && Number.isFinite(e.diarioClima.dli)) {
        return e.diarioClima.dli as number
      }
    }
    return null as number | null
  }, [log])

  const climaSeries = useMemo((): ClimaPt[] => {
    const rows = log
      .filter((e) => e.kind === 'diario_clima' && e.diarioClima)
      .map((e) => {
        const c = e.diarioClima!
        return {
          t: new Date(e.at).getTime(),
          temp: c.tempC,
          rh: c.rhPct,
          vpd: c.vpdKpa,
          ppfd: c.ppfd != null && Number.isFinite(c.ppfd) ? c.ppfd : undefined,
        }
      })
      .filter((r) => Number.isFinite(r.t))
      .sort((a, b) => a.t - b.t)
    return rows
  }, [log])

  const luzSeries = useMemo((): LuzPt[] => {
    return log
      .filter((e) => e.kind === 'diario_clima' && e.diarioClima?.ppfd != null && Number.isFinite(e.diarioClima.ppfd!))
      .map((e) => ({
        t: new Date(e.at).getTime(),
        ppfd: e.diarioClima!.ppfd as number,
      }))
      .filter((r) => Number.isFinite(r.t))
      .sort((a, b) => a.t - b.t)
  }, [log])

  const nutSeries = useMemo((): NutPt[] => {
    const rows: NutPt[] = []
    for (const e of log) {
      const tms = new Date(e.at).getTime()
      if (!Number.isFinite(tms)) continue
      if (e.kind === 'diario_riego_nutricion' && e.diarioRiegoNutricion) {
        const d = e.diarioRiegoNutricion
        rows.push({
          source: 'diario',
          t: tms,
          inPh: d.inletPh,
          inEc: d.inletEc,
          drPh: d.drainPh,
          drEc: d.drainEc,
        })
      }
      if (e.kind === 'measurement') {
        rows.push({
          source: 'measurement',
          t: tms,
          inPh: e.ph,
          inEc: e.ec,
        })
      }
    }
    return rows.sort((a, b) => a.t - b.t)
  }, [log])

  const healthSeries = useMemo((): HealthPt[] => {
    return log
      .filter((e) => e.kind === 'diario_inspeccion' && e.diarioInspeccion)
      .map((e) => ({
        t: new Date(e.at).getTime(),
        score: e.diarioInspeccion!.healthScore,
      }))
      .filter((r) => Number.isFinite(r.t))
      .sort((a, b) => a.t - b.t)
  }, [log])

  const lastClima = useMemo(() => {
    for (let i = climaSeries.length - 1; i >= 0; i--) {
      const p = climaSeries[i]
      if (p.temp != null || p.rh != null || p.vpd != null || p.ppfd != null) return p
    }
    return null
  }, [climaSeries])

  const chartH = 200
  const padL = 44
  const padR = 56
  const padT = 12
  const padB = 32
  const plotW = Math.max(40, chartW - padL - padR)
  const plotH = chartH - padT - padB
  const x0 = padL
  const x1 = padL + plotW
  const y0 = padT
  const y1 = padT + plotH

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) return '—'
    const loc = locale === 'es' ? 'es-AR' : 'ru-RU'
    return d.toLocaleString(loc, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const tabs: { id: DashTab; label: string }[] = [
    { id: 'clima', label: t('germinacionDetail.dashboardTabClima') },
    { id: 'luz', label: t('germinacionDetail.dashboardTabLuz') },
    { id: 'nutricion', label: t('germinacionDetail.dashboardTabNutricion') },
    { id: 'salud', label: t('germinacionDetail.dashboardTabSalud') },
  ]

  const renderClima = () => {
    if (climaSeries.length === 0) {
      return (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-[#222] dark:text-[#a3a3a3]">
          {t('germinacionDetail.dashboardEmptyClima')}
        </p>
      )
    }
    const xs = climaSeries.map((p) => p.t)
    const tMin = xs[0]
    const tMax = xs[xs.length - 1]

    const temps = climaSeries.map((p) => p.temp).filter((v): v is number => v != null && Number.isFinite(v))
    const vpds = climaSeries.map((p) => p.vpd).filter((v): v is number => v != null && Number.isFinite(v))

    const [tempA, tempB] = padRange(
      temps.length ? Math.min(...temps) : 18,
      temps.length ? Math.max(...temps) : 28,
      0.08,
    )
    const [rhA, rhB] = [0, 100]
    const vMax = vpds.length ? Math.max(...vpds) : 1.2
    const vMinFloor = mode === 'vegetacion' ? 0.35 : mode === 'floracion' ? 0.45 : 0
    const vTopDefault =
      mode === 'vegetacion' ? 1.35 : mode === 'floracion' ? Math.max(1.55, vMax) : Math.max(0.4, vMax)
    const [vpdA, vpdB] = padRange(vMinFloor, vTopDefault, 0.05)

    const pathTemp = pathFromSeries(
      xs,
      climaSeries.map((p) => p.temp),
      x0,
      x1,
      y0,
      y1,
      [tempA, tempB],
    )
    const pathRh = pathFromSeries(
      xs,
      climaSeries.map((p) => p.rh),
      x0,
      x1,
      y0,
      y1,
      [rhA, rhB],
    )
    const pathVpd = pathFromSeries(
      xs,
      climaSeries.map((p) => p.vpd),
      x0,
      x1,
      y0,
      y1,
      [vpdA, vpdB],
    )

    const tempTicks = [tempA, (tempA + tempB) / 2, tempB]
    const rhTicks = [0, 50, 100]
    const vpdTicks = [vpdA, (vpdA + vpdB) / 2, vpdB]

    return (
      <>
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible text-gray-500 dark:text-[#a3a3a3]"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('germinacionDetail.dashboardTabClima')}
        >
          {mode === 'vegetacion' ? (
            (() => {
              const lo = 0.8
              const hi = 1.2
              if (hi < vpdA || lo > vpdB) return null
              const yTop = mapLin(Math.min(hi, vpdB), vpdA, vpdB, y0, y1)
              const yBot = mapLin(Math.max(lo, vpdA), vpdA, vpdB, y0, y1)
              const yy = Math.min(yTop, yBot)
              const hh = Math.max(2, Math.abs(yBot - yTop))
              return (
                <rect
                  x={x0}
                  y={yy}
                  width={plotW}
                  height={hh}
                  className="fill-emerald-500/[0.14]"
                  rx={3}
                />
              )
            })()
          ) : mode === 'floracion' ? (
            (() => {
              const lo = 1.05
              const hi = 1.45
              if (hi < vpdA || lo > vpdB) return null
              const yTop = mapLin(Math.min(hi, vpdB), vpdA, vpdB, y0, y1)
              const yBot = mapLin(Math.max(lo, vpdA), vpdA, vpdB, y0, y1)
              const yy = Math.min(yTop, yBot)
              const hh = Math.max(2, Math.abs(yBot - yTop))
              return (
                <rect
                  x={x0}
                  y={yy}
                  width={plotW}
                  height={hh}
                  className="fill-violet-500/[0.12]"
                  rx={3}
                />
              )
            })()
          ) : null}
          {tempTicks.map((tv, i) => {
            const yy = mapLin(tv, tempA, tempB, y0, y1)
            return (
              <g key={`g-${i}`}>
                <line x1={x0} x2={x1} y1={yy} y2={yy} className="stroke-gray-100 dark:stroke-[#3d3d3d]" strokeWidth={1} />
                <text x={6} y={yy + 3} className="fill-gray-500 text-[9px]" fontSize={9}>
                  {tv.toFixed(1)}°
                </text>
              </g>
            )
          })}
          {rhTicks.map((rv) => {
            const yy = mapLin(rv, rhA, rhB, y0, y1)
            return (
              <text key={`rh${rv}`} x={x1 + 4} y={yy + 3} className="fill-violet-500/90 text-[8px]" fontSize={8}>
                {rv}%
              </text>
            )
          })}
          {vpdTicks.map((vv, i) => (
            <text
              key={`vpd${i}`}
              x={chartW - 4}
              y={mapLin(vv, vpdA, vpdB, y0, y1) + 3}
              className="fill-amber-600/90 text-[8px] text-end"
              fontSize={8}
              textAnchor="end"
            >
              {vv.toFixed(2)}
            </text>
          ))}
          {xs.length > 1 ? (
            <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
              {fmtTime(tMin)} — {fmtTime(tMax)}
            </text>
          ) : (
            <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
              {fmtTime(tMin)}
            </text>
          )}
          {pathRh ? <path d={pathRh} fill="none" className="stroke-violet-500" strokeWidth={1.75} opacity={0.85} /> : null}
          {pathTemp ? (
            <path d={pathTemp} fill="none" className="stroke-sky-600" strokeWidth={1.75} opacity={0.9} />
          ) : null}
          {pathVpd ? (
            <path d={pathVpd} fill="none" className="stroke-amber-500" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
          ) : null}
          {climaSeries.map((p, i) => {
            const x = mapLin(p.t, tMin, tMax, x0, x1)
            return (
              <g key={`dots-${i}`}>
                {p.temp != null && Number.isFinite(p.temp) ? (
                  <circle cx={x} cy={mapLin(p.temp, tempA, tempB, y0, y1)} r={3} className="fill-sky-600 stroke-white dark:stroke-[#252525]" strokeWidth={1} />
                ) : null}
                {p.rh != null && Number.isFinite(p.rh) ? (
                  <circle cx={x} cy={mapLin(p.rh, rhA, rhB, y0, y1)} r={2.75} className="fill-violet-500 stroke-white dark:stroke-[#252525]" strokeWidth={1} />
                ) : null}
                {p.vpd != null && Number.isFinite(p.vpd) ? (
                  <circle cx={x} cy={mapLin(p.vpd, vpdA, vpdB, y0, y1)} r={3.5} className="fill-amber-500 stroke-white dark:stroke-[#252525]" strokeWidth={1} />
                ) : null}
              </g>
            )
          })}
        </svg>
        <div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-[#3d3d3d]">
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-900 ring-1 ring-amber-100">
            VPD{' '}
            {lastClima?.vpd != null && Number.isFinite(lastClima.vpd)
              ? `${lastClima.vpd.toFixed(2)} kPa`
              : '—'}
          </span>
          <span className="rounded-lg bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-900 ring-1 ring-sky-100">
            {lastClima?.temp != null && Number.isFinite(lastClima.temp) ? `${lastClima.temp.toFixed(1)} °C` : 'Temp —'}
          </span>
          <span
            className={cn(
              'rounded-lg px-2.5 py-1 text-[11px] font-medium ring-1',
              mode === 'floracion' &&
                lastClima?.rh != null &&
                Number.isFinite(lastClima.rh) &&
                lastClima.rh > 60
                ? 'bg-red-50 text-red-900 ring-red-200'
                : 'bg-violet-50 text-violet-900 ring-violet-100',
            )}
          >
            {lastClima?.rh != null && Number.isFinite(lastClima.rh) ? `${Math.round(lastClima.rh)}% HR` : 'HR —'}
            {mode === 'floracion' &&
            lastClima?.rh != null &&
            Number.isFinite(lastClima.rh) &&
            lastClima.rh > 60 ? (
              <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">{t('floracionDetail.rhMoldRisk')}</span>
            ) : null}
          </span>
          {lastClima?.ppfd != null && Number.isFinite(lastClima.ppfd) ? (
            <span className="rounded-lg bg-amber-50/90 px-2.5 py-1 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-100">
              {Math.round(lastClima.ppfd)} PPFD
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-[#8c8c8c]">
          {mode === 'vegetacion'
            ? t('germinacionDetail.dashboardClimaAxisHintVeg')
            : mode === 'floracion'
              ? t('germinacionDetail.dashboardClimaAxisHintFlor')
              : t('germinacionDetail.dashboardClimaAxisHint')}
        </p>
      </>
    )
  }

  const renderLuz = () => {
    if (luzSeries.length === 0) {
      return (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-[#222] dark:text-[#a3a3a3]">
          {t('germinacionDetail.dashboardEmptyLuz')}
        </p>
      )
    }
    const xs = luzSeries.map((p) => p.t)
    const vals = luzSeries.map((p) => p.ppfd)
    const [ppfdA, ppfdB] = padRange(Math.min(...vals), Math.max(...vals), 0.08)
    const pathPpfd = pathFromSeries(xs, vals, x0, x1, y0, y1, [ppfdA, ppfdB])
    const ppfdTicks = [ppfdA, (ppfdA + ppfdB) / 2, ppfdB]
    const tMin = xs[0]
    const tMax = xs[xs.length - 1]

    return (
      <>
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible text-gray-500 dark:text-[#a3a3a3]"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('germinacionDetail.dashboardTabLuz')}
        >
          {ppfdTicks.map((pv, i) => {
            const yy = mapLin(pv, ppfdA, ppfdB, y0, y1)
            return (
              <g key={`lz-${i}`}>
                <line x1={x0} x2={x1} y1={yy} y2={yy} className="stroke-gray-100 dark:stroke-[#3d3d3d]" strokeWidth={1} />
                <text x={6} y={yy + 3} className="fill-amber-800/90 text-[9px]" fontSize={9}>
                  {Math.round(pv)}
                </text>
              </g>
            )
          })}
          {xs.length > 1 ? (
            <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
              {fmtTime(tMin)} — {fmtTime(tMax)}
            </text>
          ) : (
            <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
              {fmtTime(tMin)}
            </text>
          )}
          {pathPpfd ? (
            <path
              d={pathPpfd}
              fill="none"
              className="stroke-amber-500"
              strokeWidth={2.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ) : null}
          {luzSeries.map((p, i) => {
            const x = mapLin(p.t, tMin, tMax, x0, x1)
            const y = mapLin(p.ppfd, ppfdA, ppfdB, y0, y1)
            return (
              <circle key={i} cx={x} cy={y} r={3.5} className="fill-amber-500 stroke-white dark:stroke-[#252525]" strokeWidth={1.2} />
            )
          })}
        </svg>
        <div className="mt-2 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-[#3d3d3d]">
          <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-100">
            PPFD {vals.length ? Math.round(vals[vals.length - 1]) : '—'}
          </span>
          {mode === 'floracion' ? (
            <span
              className={cn(
                'rounded-lg px-2.5 py-1 text-[11px] font-semibold ring-1',
                lastDliMol != null && lastDliMol >= 35 && lastDliMol <= 45
                  ? 'bg-indigo-50 text-indigo-950 ring-indigo-100'
                  : lastDliMol != null && (lastDliMol < 35 || lastDliMol > 45)
                    ? 'bg-amber-50 text-amber-950 ring-amber-200'
                    : 'bg-gray-50 text-gray-700 ring-gray-100 dark:bg-[#2a2a2a] dark:text-[#d4d4d4] dark:ring-[#3d3d3d]',
              )}
            >
              {lastDliMol != null
                ? t('floracionDetail.dliLastReading', { n: String(lastDliMol) })
                : t('floracionDetail.dliNoData')}
            </span>
          ) : null}
        </div>
        <p className="mt-2 text-[10px] text-gray-400 dark:text-[#8c8c8c]">
          {mode === 'floracion' ? t('floracionDetail.dashboardLuzDliHint') : t('germinacionDetail.dashboardLuzAxisHint')}
        </p>
      </>
    )
  }

  const renderNutricion = () => {
    if (nutSeries.length === 0) {
      return (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-[#222] dark:text-[#a3a3a3]">
          {t('germinacionDetail.dashboardEmptyNutricion')}
        </p>
      )
    }
    const xs = nutSeries.map((p) => p.t)
    const phVals = nutSeries.flatMap((p) => [p.inPh, p.drPh].filter((v): v is number => v != null && Number.isFinite(v)))
    const ecVals = nutSeries.flatMap((p) => [p.inEc, p.drEc].filter((v): v is number => v != null && Number.isFinite(v)))
    const [phA, phB] = padRange(
      phVals.length ? Math.min(...phVals) : 5.5,
      phVals.length ? Math.max(...phVals) : 6.5,
      0.12,
    )
    const [ecA, ecB] = padRange(
      ecVals.length ? Math.min(...ecVals) : 0.4,
      ecVals.length ? Math.max(...ecVals) : 2,
      0.12,
    )
    const pathInPh = pathFromSeries(
      xs,
      nutSeries.map((p) => p.inPh),
      x0,
      x1,
      y0,
      y1,
      [phA, phB],
    )
    const pathDrPh = pathFromSeries(
      xs,
      nutSeries.map((p) => p.drPh),
      x0,
      x1,
      y0,
      y1,
      [phA, phB],
    )
    const pathInEc = pathFromSeries(
      xs,
      nutSeries.map((p) => p.inEc),
      x0,
      x1,
      y0,
      y1,
      [ecA, ecB],
    )
    const pathDrEc = pathFromSeries(
      xs,
      nutSeries.map((p) => p.drEc),
      x0,
      x1,
      y0,
      y1,
      [ecA, ecB],
    )

    const last = nutSeries[nutSeries.length - 1]

    return (
      <>
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible text-gray-500 dark:text-[#a3a3a3]"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('germinacionDetail.dashboardTabNutricion')}
        >
          {[0, 0.5, 1].map((u) => {
            const ph = phA + (phB - phA) * u
            const yy = mapLin(ph, phA, phB, y0, y1)
            return (
              <g key={`phg-${u}`}>
                <line x1={x0} x2={x1} y1={yy} y2={yy} className="stroke-gray-100 dark:stroke-[#3d3d3d]" strokeWidth={1} />
                <text x={6} y={yy + 3} className="fill-sky-700 text-[9px]" fontSize={9}>
                  pH {ph.toFixed(1)}
                </text>
              </g>
            )
          })}
          {[ecA, (ecA + ecB) / 2, ecB].map((ev, i) => {
            const yy = mapLin(ev, ecA, ecB, y0, y1)
            return (
              <text key={`ec-${i}`} x={chartW - 4} y={yy + 3} className="fill-emerald-700 text-[8px]" fontSize={8} textAnchor="end">
                EC {ev.toFixed(2)}
              </text>
            )
          })}
          <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
            {fmtTime(xs[0])} — {fmtTime(xs[xs.length - 1])}
          </text>
          {pathInEc ? (
            <path
              d={pathInEc}
              fill="none"
              className="stroke-emerald-600"
              strokeWidth={mode === 'vegetacion' || mode === 'floracion' ? 2.65 : 1.75}
              strokeLinecap="round"
            />
          ) : null}
          {pathDrEc ? (
            <path
              d={pathDrEc}
              fill="none"
              className={mode === 'vegetacion' || mode === 'floracion' ? 'stroke-orange-500' : 'stroke-emerald-600'}
              strokeWidth={mode === 'vegetacion' || mode === 'floracion' ? 2.35 : 1.5}
              strokeDasharray={mode === 'vegetacion' || mode === 'floracion' ? '6 4' : '5 4'}
              opacity={mode === 'vegetacion' || mode === 'floracion' ? 0.95 : 0.75}
              strokeLinecap="round"
            />
          ) : null}
          {pathInPh ? <path d={pathInPh} fill="none" className="stroke-sky-600" strokeWidth={1.75} /> : null}
          {pathDrPh ? (
            <path
              d={pathDrPh}
              fill="none"
              className="stroke-sky-600"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              opacity={0.75}
            />
          ) : null}
        </svg>
        <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-[10px] text-gray-600 dark:border-[#3d3d3d] dark:text-[#c4c4c4]">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded-sm bg-sky-600" /> {t('germinacionDetail.dashboardLegInPh')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-4 border-t-2 border-dashed border-sky-600" /> {t('germinacionDetail.dashboardLegDrPh')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-4 rounded-sm bg-emerald-600" /> {t('germinacionDetail.dashboardLegInEc')}
          </span>
          <span className="inline-flex items-center gap-1">
            <span
              className={cn(
                'h-0.5 w-4 border-t-2 border-dashed',
                mode === 'vegetacion' || mode === 'floracion' ? 'border-orange-500' : 'border-emerald-600',
              )}
            />{' '}
            {t('germinacionDetail.dashboardLegDrEc')}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <span className="rounded-lg bg-gray-50 px-2.5 py-1 text-[11px] text-gray-800 ring-1 ring-gray-100 dark:bg-[#2a2a2a] dark:text-[#e8e8e8] dark:ring-[#3d3d3d]">
            {t('germinacionDetail.dashboardLatest')}: pH{' '}
            {last.inPh != null ? last.inPh.toFixed(1) : last.drPh != null ? last.drPh.toFixed(1) : '—'} · EC{' '}
            {last.inEc != null ? last.inEc.toFixed(2) : last.drEc != null ? last.drEc.toFixed(2) : '—'}
          </span>
          {(mode === 'vegetacion' || mode === 'floracion') &&
          last.inEc != null &&
          Number.isFinite(last.inEc) &&
          last.drEc != null &&
          Number.isFinite(last.drEc) ? (
            <span
              className="rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-950 ring-1 ring-amber-100"
              title={t('germinacionDetail.dashboardEcDeltaHint')}
            >
              {t('germinacionDetail.dashboardEcDelta', {
                n: String(Math.round((last.drEc - last.inEc) * 100) / 100),
              })}
            </span>
          ) : null}
        </div>
        {mode === 'vegetacion' ? (
          <p className="mt-2 text-[10px] font-medium text-emerald-800/90">{t('germinacionDetail.dashboardNutricionVegHint')}</p>
        ) : mode === 'floracion' ? (
          <p className="mt-2 text-[10px] font-medium text-purple-900/90">{t('germinacionDetail.dashboardNutricionFlorHint')}</p>
        ) : null}
      </>
    )
  }

  const renderSalud = () => {
    if (healthSeries.length === 0) {
      return (
        <p className="rounded-xl bg-gray-50 px-4 py-8 text-center text-sm text-gray-500 dark:bg-[#222] dark:text-[#a3a3a3]">
          {t('germinacionDetail.dashboardEmptySalud')}
        </p>
      )
    }
    const xs = healthSeries.map((p) => p.t)
    const scores = healthSeries.map((p) => p.score)
    const [sA, sB] = [1, 5] as [number, number]
    const path = pathFromSeries(xs, scores, x0, x1, y0, y1, [sA, sB])

    return (
      <>
        <svg
          width="100%"
          height={chartH}
          viewBox={`0 0 ${chartW} ${chartH}`}
          className="overflow-visible text-gray-500 dark:text-[#a3a3a3]"
          preserveAspectRatio="none"
          role="img"
          aria-label={t('germinacionDetail.dashboardTabSalud')}
        >
          {[1, 2, 3, 4, 5].map((lvl) => {
            const yy = mapLin(lvl, sA, sB, y0, y1)
            return (
              <g key={`hl-${lvl}`}>
                <line x1={x0} x2={x1} y1={yy} y2={yy} className="stroke-gray-100 dark:stroke-[#3d3d3d]" strokeWidth={1} />
                <text x={8} y={yy + 3} className="fill-amber-800/80 text-[9px]" fontSize={9}>
                  {lvl}
                </text>
              </g>
            )
          })}
          <text x={x0} y={chartH - 6} className="fill-gray-400 dark:fill-[#8c8c8c] text-[9px]" fontSize={9}>
            {fmtTime(xs[0])} — {fmtTime(xs[xs.length - 1])}
          </text>
          {path ? <path d={path} fill="none" className="stroke-amber-600" strokeWidth={2.25} strokeLinecap="round" /> : null}
          {healthSeries.map((p, i) => {
            const x = mapLin(p.t, xs[0], xs[xs.length - 1], x0, x1)
            const y = mapLin(p.score, sA, sB, y0, y1)
            return <circle key={i} cx={x} cy={y} r={3.5} className="fill-amber-500 stroke-white dark:stroke-[#252525]" strokeWidth={1.5} />
          })}
        </svg>
        <div className="mt-2 text-[10px] text-gray-500 dark:text-[#a3a3a3]">{t('germinacionDetail.dashboardSaludHint')}</div>
      </>
    )
  }

  return (
    <div className="rounded-3xl border border-gray-100 bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)] dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/25">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-[#a3a3a3]">
          {t('germinacionDetail.dashboardTitle')}
        </p>
        {mode === 'vegetacion' && vegStageDay != null ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/90">
            {t('vegetacionDetail.dashboardVegFocus')}
          </p>
        ) : mode === 'floracion' && florFlowerDay != null ? (
          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-800/85">
            {t('floracionDetail.dashboardFlorFocus')}
          </p>
        ) : (
          <p className="text-[11px] font-semibold text-gray-400 dark:text-[#8c8c8c]">
            {t('germinacionDetail.ageDayLabel', { n: String(age) })}
          </p>
        )}
      </div>

      {mode === 'floracion' && florFlowerDay != null ? (
        <div className="mt-3 space-y-2">
          <div className="rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-600 via-violet-700 to-indigo-900 p-4 text-white shadow-[0_12px_36px_rgba(109,40,217,0.32)]">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-purple-100/90">
              {t('floracionDetail.flowerTimerTitle')}
            </p>
            <p className="mt-1 text-2xl font-black tabular-nums leading-tight tracking-tight">
              {t('floracionDetail.flowerTimerLine', {
                week: String(Math.max(1, Math.ceil(florFlowerDay / 7))),
                day: String(florFlowerDay),
              })}
            </p>
            <p className="mt-2 text-xs font-medium text-purple-50/95">
              {geneticsType === 'automatica'
                ? t('floracionDetail.flowerEstAuto')
                : t('floracionDetail.flowerEstWeeksRange', {
                    min: String(flowerDurationWeeks ?? 8),
                    max: String((flowerDurationWeeks ?? 8) + 1),
                  })}
            </p>
          </div>
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-2.5 text-[11px] text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/35 dark:text-indigo-100">
            <p className="font-semibold">{t('floracionDetail.dliWidgetTitle')}</p>
            <p className="mt-1 text-indigo-900/90">
              {lastDliMol != null
                ? t('floracionDetail.dliWidgetValue', { n: String(lastDliMol) })
                : t('floracionDetail.dliWidgetEmpty')}
            </p>
            <p className="mt-1 text-[10px] text-indigo-800/80">{t('floracionDetail.dliTargetHint')}</p>
          </div>
        </div>
      ) : null}

      {mode === 'vegetacion' && vegStageDay != null ? (
        <div className="mt-3 rounded-2xl border border-emerald-200/90 bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 p-4 text-white shadow-[0_12px_36px_rgba(5,150,105,0.35)]">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-100/90">
            {t('vegetacionDetail.vegStageWidgetTitle')}
          </p>
          <p className="mt-1 text-4xl font-black tabular-nums leading-none tracking-tight">
            {t('vegetacionDetail.vegStageWidgetDay', { n: vegStageDay })}
          </p>
          <p className="mt-2 text-xs font-medium text-emerald-50/95">{t('vegetacionDetail.vegStageWidgetHint')}</p>
        </div>
      ) : null}

      <div className="mt-3 flex w-full min-w-0 gap-1 rounded-full border border-green-900/5 bg-green-50/60 p-1.5 shadow-inner backdrop-blur-md dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-none dark:backdrop-blur-none">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={cn(
              'inline-flex min-h-[40px] items-center justify-center rounded-full py-2 text-[11px] font-medium transition-all duration-300 sm:text-sm',
              x.id === 'nutricion'
                ? 'max-w-none flex-none shrink-0 px-2.5 sm:px-3'
                : 'min-w-0 flex-1 basis-0 px-2 sm:px-3',
              tab === x.id
                ? cn('font-semibold', dashTabActiveTone[x.id])
                : 'text-gray-500 hover:text-green-700 dark:text-[#a3a3a3] dark:hover:text-green-400',
            )}
          >
            <span className={x.id === 'nutricion' ? 'whitespace-nowrap' : 'min-w-0 truncate'}>{x.label}</span>
          </button>
        ))}
      </div>

      {mode === 'propagacion' && inventory && inventory.planted > 0 ? (
        <div className="mt-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 p-3.5 dark:border-emerald-900/35 dark:from-[#1a2420] dark:via-[#222] dark:to-[#1a2220]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/90">
            {t('germinacionDetail.dashboardInvTitle')}
          </p>
          <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-gray-100 dark:bg-[#2a2a2a]/90 dark:ring-[#3d3d3d]">
              <p className="text-[10px] font-medium text-gray-500 dark:text-[#a3a3a3]">{t('germinacionDetail.dashboardInvPlanted')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-[#f1f1f1]">{inventory.planted}</p>
            </div>
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-red-100 dark:bg-[#2a2a2a]/90 dark:ring-red-900/40">
              <p className="text-[10px] font-medium text-red-700/80">{t('germinacionDetail.dashboardInvDiscarded')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-red-700">−{inventory.discarded}</p>
            </div>
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-emerald-100 dark:bg-[#2a2a2a]/90 dark:ring-emerald-900/40">
              <p className="text-[10px] font-medium text-emerald-800/80 dark:text-emerald-300/90">{t('germinacionDetail.dashboardInvAlive')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">{inventory.alive}</p>
            </div>
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-gray-100 dark:bg-[#2a2a2a]/90 dark:ring-[#3d3d3d]">
              <p className="text-[10px] font-medium text-gray-500 dark:text-[#a3a3a3]">{t('germinacionDetail.dashboardInvSurvival')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-gray-900 dark:text-[#f1f1f1]">{inventory.survivalPct}%</p>
            </div>
          </div>
        </div>
      ) : null}

      {(mode === 'vegetacion' || mode === 'floracion') && lateInventory ? (
        <div className="mt-3 rounded-2xl border border-emerald-100/90 bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/20 p-3.5 dark:border-emerald-900/35 dark:from-[#1a2420] dark:via-[#222] dark:to-[#252018]">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800/80 dark:text-emerald-200/90">
            {t('germinacionDetail.dashboardInvLateTitle')}
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-emerald-100 dark:bg-[#2a2a2a]/90 dark:ring-emerald-900/40">
              <p className="text-[10px] font-medium text-emerald-800/80 dark:text-emerald-300/90">{t('germinacionDetail.dashboardInvActivos')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-emerald-900 dark:text-emerald-200">{lateInventory.activos}</p>
            </div>
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-red-100 dark:bg-[#2a2a2a]/90 dark:ring-red-900/40">
              <p className="text-[10px] font-medium text-red-700/80">{t('germinacionDetail.dashboardInvBajasLate')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-red-700">{lateInventory.bajas}</p>
            </div>
            <div className="rounded-xl bg-white/90 px-2.5 py-2 ring-1 ring-amber-100 dark:bg-[#2a2a2a]/90 dark:ring-amber-900/40">
              <p className="text-[10px] font-medium text-amber-800/80 dark:text-amber-300/90">{t('germinacionDetail.dashboardInvCuarentena')}</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-amber-900 dark:text-amber-200">{lateInventory.cuarentena}</p>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={hostRef} className="mt-4 w-full min-w-0">
        {tab === 'clima' ? renderClima() : null}
        {tab === 'luz' ? renderLuz() : null}
        {tab === 'nutricion' ? renderNutricion() : null}
        {tab === 'salud' ? renderSalud() : null}
      </div>
    </div>
  )
}
