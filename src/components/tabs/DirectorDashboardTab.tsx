import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  defaultDropAnimation,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  LineChart,
  Plus,
  Shield,
  CloudRain,
  MapPin,
  X,
} from 'lucide-react'
import {
  buildCalendarCellsInTimeZone,
  getDayCardInClubZone,
  zonedISODate,
} from '../../lib/clubTime'
import { C } from '../../lib/crmUi'
import { bentoPanelRadius, bentoShell } from '../../lib/bentoShell'
import { cn } from '../../lib/cn'
import { type AppLocale, useSettingsStore } from '../../store/useSettingsStore'
import type { PlantCardItem } from '../../store/cultivationTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { LoteTraceabilityWaterfallWidget } from '../dashboard/LoteTraceabilityWaterfallWidget'
import { AgronomyTab } from './AgronomyTab'

function fakeWeekTemps() {
  return [23.4, 24.1, 25.2, 24.8, 25.9, 24.7, 23.9]
}

/** Barras legibles sobre fondo verde marca. */
const WEATHER_BAR_GRAD = 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.45) 100%)'
const WEATHER_AXIS_HOURS = ['00', '04', '08', '12', '16', '20'] as const

function buildRainBarHeights(weekTemps: number[], count: number): number[] {
  if (weekTemps.length === 0) return Array.from({ length: count }, () => 5)
  const lo = Math.min(...weekTemps)
  const hi = Math.max(...weekTemps)
  const span = Math.max(0.1, hi - lo)
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    const blend = count > 1 ? i / (count - 1) : 0
    const idx = Math.min(weekTemps.length - 1, Math.round(blend * (weekTemps.length - 1)))
    const base = weekTemps[idx] ?? weekTemps[0]!
    const wave = 0.35 * Math.sin(i * 0.42)
    const t = base + wave
    const n = (t - lo) / span
    out.push(4 + Math.min(1, Math.max(0, n)) * 2)
  }
  return out
}

/** Ancho celda = 158 + 22 + 158 (col-span-2); el componente llena la celda (sin 338px fijos). */
function WeatherRainWideWidget({
  city,
  temps,
  tMin,
  tMax,
}: {
  city: string
  temps: number[]
  tMin: number
  tMax: number
}) {
  const barHeights = useMemo(() => buildRainBarHeights(temps, 40), [temps])
  const currentRounded = Math.round(temps.reduce((a, x) => a + x, 0) / Math.max(1, temps.length))
  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] bg-[#06663F] text-white">
      <div className="flex shrink-0 flex-row items-center justify-between gap-2 px-4 pt-3">
        <div className="flex min-w-0 flex-col items-start gap-1">
          <div className="flex flex-row items-center gap-1">
            <span className="truncate text-[15px] font-medium leading-tight">{city}</span>
            <MapPin className="size-[9px] shrink-0 text-white" aria-hidden strokeWidth={2.5} />
          </div>
          <p
            className={cn(
              'm-0 text-[clamp(1.75rem,8vw,2.8125rem)] font-light leading-none tracking-tight',
              'font-[family-name:var(--font12)]',
            )}
          >
            {currentRounded}°
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5">
          <CloudRain className="h-[19px] w-6 shrink-0 text-white" strokeWidth={1.75} aria-hidden />
          <div className="flex flex-col items-end gap-0.5 text-[12px] font-medium leading-tight sm:text-[13px]">
            <span>H: {Math.round(tMax)}°</span>
            <span>L: {Math.round(tMin)}°</span>
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-1 pt-1">
        <p className="shrink-0 text-[10px] font-semibold leading-tight text-white/56 sm:text-[11px]">
          Temperatura próximas horas
        </p>
        <div className="mt-1 flex min-h-0 flex-1 flex-col justify-end gap-1">
          <div className="flex shrink-0 flex-col gap-[7px]">
            {[0, 1, 2].map((k) => (
              <div key={k} className="h-px w-full border-t border-dashed border-white/28" aria-hidden />
            ))}
            <div className="h-px w-full border-t border-solid border-white/28" aria-hidden />
          </div>
          <div className="grid w-full shrink-0 grid-cols-[repeat(40,minmax(0,1fr))] items-end gap-0.5">
            {barHeights.map((h, i) => (
              <div
                key={i}
                className="min-w-0 rounded-t-[20px]"
                style={{ height: `${h}px`, background: WEATHER_BAR_GRAD }}
                aria-hidden
              />
            ))}
          </div>
          <div className="flex shrink-0 flex-row justify-between text-[10px] font-normal leading-tight text-white/56 sm:text-[12px]">
            {WEATHER_AXIS_HOURS.map((h) => (
              <span key={h} className="min-w-0 flex-1 text-center">
                {h}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="shrink-0 pb-1.5 text-center text-[11px] font-medium leading-none text-white/95 [text-shadow:0_0_12px_rgba(0,0,0,0.45)]">
        Weather
      </div>
    </div>
  )
}

/** Total plantas en una columna del tablero Cultivo (germinación / veg / flor). */
function kanbanColumnPlantTotal(items: PlantCardItem[] | undefined): number {
  if (!Array.isArray(items)) return 0
  let n = 0
  for (const item of items) {
    if (item.trackingType === 'planta') {
      n += Math.max(1, item.quantity ?? 1)
    } else {
      n += Math.max(0, item.quantity ?? item.initialQuantity ?? 0)
    }
  }
  return n
}

/** Misma duración/ease que el rail del `Dashboard` — los tiles no van «a remolque». */
const DASHBOARD_RAIL_LAYOUT_MS = 0.42
const DASHBOARD_RAIL_LAYOUT_EASE = [0.22, 1, 0.36, 1] as const

type WidgetId =
  | 'floweringCount'
  | 'expectedHarvest'
  | 'weather'
  | 'dailyPrompt'
  | 'forestMetric'
  | 'vegetacionMetric'
  | 'localTime'
  | 'vpd'
  | 'climateAlerts'
  | 'tasksToday'
  | 'transitions'
  | 'cloneSuccess'
  | 'licenseLimit'
  | 'recentMovements'
  | 'cultivoOverview'

type WidgetLayout = 'full' | 'square'
type SquareColSpan = 3 | 4
type SquareAlign = 'start' | 'end'

function isCompactCultivoBentoWidget(id: WidgetId): boolean {
  return id === 'forestMetric' || id === 'vegetacionMetric'
}

function isFixed158DashboardTile(id: WidgetId): boolean {
  return isCompactCultivoBentoWidget(id) || id === 'localTime'
}

const DEFAULT_WIDGET_ORDER: WidgetId[] = [
  'floweringCount',
  'expectedHarvest',
  'weather',
  'dailyPrompt',
  'forestMetric',
  'vegetacionMetric',
  'localTime',
  'vpd',
  'climateAlerts',
  'tasksToday',
  'transitions',
  'cloneSuccess',
  'licenseLimit',
  'recentMovements',
  'cultivoOverview',
]

const DEFAULT_WIDGET_VISIBILITY: Record<WidgetId, boolean> = {
  floweringCount: true,
  expectedHarvest: true,
  weather: true,
  dailyPrompt: true,
  forestMetric: true,
  vegetacionMetric: true,
  localTime: true,
  vpd: true,
  climateAlerts: true,
  tasksToday: true,
  transitions: true,
  cloneSuccess: true,
  licenseLimit: true,
  recentMovements: true,
  cultivoOverview: true,
}

/** Verde del wordmark / iconos activos del rail (Dashboard.tsx). */
const BRAND_GREEN = '#06663F'

const DEFAULT_WIDGET_LAYOUT: Record<WidgetId, WidgetLayout> = {
  floweringCount: 'square',
  expectedHarvest: 'full',
  weather: 'square',
  dailyPrompt: 'square',
  forestMetric: 'square',
  vegetacionMetric: 'square',
  localTime: 'square',
  vpd: 'full',
  climateAlerts: 'full',
  tasksToday: 'full',
  transitions: 'full',
  cloneSuccess: 'full',
  licenseLimit: 'full',
  recentMovements: 'full',
  cultivoOverview: 'full',
}

/** Figma: track 158px, gap 22px; 338px wide = col-span-2 (158+22+158). */
function bentoCellWrapperClass(id: WidgetId, layout: WidgetLayout): string {
  const fill = 'h-full w-full min-h-0 min-w-0'
  if (id === 'cultivoOverview') return cn('col-span-full row-span-4', fill)
  if (layout === 'full') return cn('col-span-full row-span-2', fill)
  if (id === 'weather' && layout === 'square') return cn('col-span-2 row-span-1', fill)
  return cn('col-span-1 row-span-1', fill)
}

const DEFAULT_SQUARE_COLS: Record<WidgetId, SquareColSpan> = {
  floweringCount: 4,
  expectedHarvest: 4,
  weather: 4,
  dailyPrompt: 4,
  forestMetric: 4,
  vegetacionMetric: 4,
  localTime: 4,
  vpd: 4,
  climateAlerts: 4,
  tasksToday: 4,
  transitions: 4,
  cloneSuccess: 4,
  licenseLimit: 4,
  recentMovements: 4,
  cultivoOverview: 4,
}

const DEFAULT_SQUARE_ALIGN: Record<WidgetId, SquareAlign> = {
  floweringCount: 'start',
  expectedHarvest: 'start',
  weather: 'start',
  dailyPrompt: 'start',
  forestMetric: 'start',
  vegetacionMetric: 'start',
  localTime: 'start',
  vpd: 'start',
  climateAlerts: 'start',
  tasksToday: 'start',
  transitions: 'start',
  cloneSuccess: 'start',
  licenseLimit: 'start',
  recentMovements: 'start',
  cultivoOverview: 'start',
}

const WIDGET_LABEL: Record<WidgetId, string> = {
  floweringCount: 'Floración',
  expectedHarvest: 'Proyección de cosecha',
  weather: 'Weather',
  dailyPrompt: 'Daily prompt',
  forestMetric: 'Plantas en floración',
  vegetacionMetric: 'Plantas en vegetación',
  localTime: 'Día',
  vpd: 'VPD',
  climateAlerts: 'Alertas de clima',
  tasksToday: 'Tareas del día',
  transitions: 'Calendario de transiciones',
  cloneSuccess: 'Embudo de trazabilidad del lote',
  licenseLimit: 'Límites de licencia',
  recentMovements: 'Últimos movimientos',
  cultivoOverview: 'Cultivo overview',
}

/** Lun→Dom (índice 0 = lun); sáb/dom columnas 5–6 = fin de semana. */
const CAL_HEADER_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'] as const

function LocalTimeSquareFlip({
  dashboardNow,
  localDayCard,
  timeZone,
  uiLocale,
}: {
  dashboardNow: Date
  localDayCard: { weekdayLabel: string; monthLabel: string; dayOfMonth: number }
  timeZone: string
  uiLocale: AppLocale
}) {
  const [flipped, setFlipped] = useState(false)
  const reduceMotion = useReducedMotion()
  const calendarCells = useMemo(
    () => buildCalendarCellsInTimeZone(dashboardNow, dashboardNow, timeZone),
    [dashboardNow, timeZone],
  )
  const monthTitle = useMemo(() => {
    const loc = uiLocale === 'ru' ? 'ru-RU' : 'es'
    return new Intl.DateTimeFormat(loc, { timeZone, month: 'long' })
      .format(dashboardNow)
      .replace(/\./g, '')
      .toUpperCase()
  }, [dashboardNow, timeZone, uiLocale])

  const calRows = useMemo(() => {
    const rows: (typeof calendarCells)[] = []
    for (let i = 0; i < calendarCells.length; i += 7) rows.push(calendarCells.slice(i, i + 7))
    return rows
  }, [calendarCells])

  const frontFace = (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[22px] bg-[#1c1c1e] px-4 py-4',
      )}
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'translateZ(1px)',
      }}
    >
      <div className="flex w-full flex-col items-center">
        <p
          className={cn(
            'm-0 w-full pt-4 text-center text-[27px] font-[590] leading-tight tracking-[0.01em]',
            'font-[family-name:var(--font6)]',
          )}
        >
          <span className="inline-flex items-baseline justify-center gap-1">
            <span style={{ color: BRAND_GREEN }}>{localDayCard.weekdayLabel}</span>
            <span className="text-[#8e8d93]">{localDayCard.monthLabel}</span>
          </span>
        </p>
        <div className="flex w-full flex-col items-center">
          <time
            dateTime={zonedISODate(dashboardNow, timeZone)}
            className={cn(
              '-mt-[21px] inline-block text-center font-semibold tabular-nums leading-none text-white',
              'font-[family-name:var(--font12)]',
              localDayCard.dayOfMonth >= 10 ? 'text-[78px] tracking-[-0.05em]' : 'text-[108px]',
            )}
            style={{ unicodeBidi: 'isolate' }}
          >
            {localDayCard.dayOfMonth}
          </time>
        </div>
      </div>
    </div>
  )

  const backFaceStatic = (
    <div className="absolute inset-0 flex flex-col items-center overflow-hidden rounded-[22px] bg-[#1c1c1e] px-3 pb-3 pt-[17px]">
      <div className="flex w-[134px] shrink-0 flex-col gap-2 pl-1 pt-0.5">
        <p className="text-left text-[11px] font-semibold uppercase leading-[13px] tracking-normal text-[#FF4539]">
          {monthTitle}
        </p>
      </div>
      <div className="flex min-h-0 w-[134px] flex-1 flex-col gap-px [transform:scale(0.92)] origin-top">
        <div className="grid w-full grid-cols-7 justify-items-center gap-x-0.5">
          {CAL_HEADER_LETTERS.map((h, idx) => (
            <div
              key={h}
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center text-[10px] font-semibold uppercase leading-3',
                idx >= 5 ? 'text-[#8E8D93]' : 'text-white',
              )}
            >
              {h}
            </div>
          ))}
        </div>
        {calRows.map((row, ri) => (
          <div key={ri} className="grid w-full grid-cols-7 justify-items-center gap-x-0.5">
            {row.map((cell, ci) => {
              if (cell.kind === 'blank') {
                return <div key={`b-${ri}-${ci}`} className="h-[18px] w-[18px] shrink-0" aria-hidden />
              }
              const { n, isToday, isWeekend } = cell
              return (
                <div
                  key={`d-${ri}-${n}`}
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[10px] text-[10px] font-semibold uppercase leading-3',
                    isToday && 'bg-[#FF4539] text-white',
                    !isToday && isWeekend && 'text-[#8E8D93]',
                    !isToday && !isWeekend && 'text-white',
                  )}
                >
                  {n}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  const backFace = (
    <div
      className={cn(
        'absolute inset-0 flex flex-col items-center overflow-hidden rounded-[22px] bg-[#1c1c1e] px-3 pb-3 pt-[17px]',
      )}
      style={{
        backfaceVisibility: 'hidden',
        WebkitBackfaceVisibility: 'hidden',
        transform: 'rotateY(180deg) translateZ(1px)',
      }}
    >
      <div className="flex w-[134px] shrink-0 flex-col gap-2 pl-1 pt-0.5">
        <p className="text-left text-[11px] font-semibold uppercase leading-[13px] tracking-normal text-[#FF4539]">
          {monthTitle}
        </p>
      </div>
      <div className="flex min-h-0 w-[134px] flex-1 flex-col gap-px [transform:scale(0.92)] origin-top">
        <div className="grid w-full grid-cols-7 justify-items-center gap-x-0.5">
          {CAL_HEADER_LETTERS.map((h, idx) => (
            <div
              key={`b2-${h}`}
              className={cn(
                'flex h-[18px] w-[18px] items-center justify-center text-[10px] font-semibold uppercase leading-3',
                idx >= 5 ? 'text-[#8E8D93]' : 'text-white',
              )}
            >
              {h}
            </div>
          ))}
        </div>
        {calRows.map((row, ri) => (
          <div key={`br-${ri}`} className="grid w-full grid-cols-7 justify-items-center gap-x-0.5">
            {row.map((cell, ci) => {
              if (cell.kind === 'blank') {
                return <div key={`b-${ri}-${ci}`} className="h-[18px] w-[18px] shrink-0" aria-hidden />
              }
              const { n, isToday, isWeekend } = cell
              return (
                <div
                  key={`d-${ri}-${n}`}
                  className={cn(
                    'flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[10px] text-[10px] font-semibold uppercase leading-3',
                    isToday && 'bg-[#FF4539] text-white',
                    !isToday && isWeekend && 'text-[#8E8D93]',
                    !isToday && !isWeekend && 'text-white',
                  )}
                >
                  {n}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )

  if (reduceMotion) {
    return (
      <div className="relative h-full min-h-0 w-full overflow-hidden rounded-[22px]">
        <div className="pointer-events-none absolute inset-0">{flipped ? backFaceStatic : frontFace}</div>
        <button
          type="button"
          className="absolute inset-0 z-10 cursor-pointer rounded-[22px] border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-expanded={flipped}
          aria-label={flipped ? 'Ver resumen del día' : 'Ver calendario del mes'}
          onClick={() => setFlipped((v) => !v)}
        />
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-0 w-full rounded-[22px]">
      {/* perspective fuera de overflow-hidden: si no, el navegador aplana y parece un corte brusco */}
      <div
        className="relative h-full min-h-0 w-full rounded-[22px]"
        style={{ perspective: '1200px', perspectiveOrigin: '50% 50%' }}
      >
        <div
          className="pointer-events-none relative h-full min-h-0 w-full transition-transform duration-[900ms] ease-[cubic-bezier(0.2,0.75,0.25,1)] will-change-transform"
          style={{
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            transformStyle: 'preserve-3d',
            WebkitTransformStyle: 'preserve-3d',
          }}
        >
          {frontFace}
          {backFace}
        </div>
        <button
          type="button"
          className="absolute inset-0 z-20 cursor-pointer rounded-[22px] border-0 bg-transparent p-0 outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-expanded={flipped}
          aria-label={flipped ? 'Ver resumen del día' : 'Ver calendario del mes'}
          onClick={() => setFlipped((v) => !v)}
        />
      </div>
    </div>
  )
}

function SortableWidget({
  id,
  editMode,
  layout,
  postDropHideIds,
  children,
}: {
  id: WidgetId
  editMode: boolean
  layout: WidgetLayout
  /** Durante el drop: ocultar dragged + target para no ver dos cartas a la vez. */
  postDropHideIds: readonly WidgetId[] | null
  children: ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  const hideSlot = isDragging || (postDropHideIds?.includes(id) ?? false)
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(hideSlot
      ? ({ opacity: 0, visibility: 'hidden' as const, pointerEvents: 'none' as const } as const)
      : ({ opacity: 1, visibility: 'visible' as const } as const)),
  }
  const layoutTween = reduceMotion
    ? ({ duration: 0 } as const)
    : ({
        type: 'tween' as const,
        duration: DASHBOARD_RAIL_LAYOUT_MS,
        ease: DASHBOARD_RAIL_LAYOUT_EASE,
      } as const)
  const squareTile = layout === 'square' && id !== 'cultivoOverview'
  const tightBentoTile = squareTile || isFixed158DashboardTile(id)
  const hoverScaleTransition =
    reduceMotion || hideSlot || editMode
      ? ({ duration: 0 } as const)
      : ({
          type: 'tween' as const,
          duration: 0.3,
          ease: [0.22, 0.65, 0.28, 1] as const,
        } as const)
  return (
    <motion.div
      ref={setNodeRef}
      layout={id === 'localTime' ? false : !isDragging ? 'position' : false}
      style={style}
      transition={{ layout: layoutTween }}
      data-dashboard-widget={id}
      className={cn(
        bentoCellWrapperClass(id, layout),
        isDragging && 'z-20',
        editMode && 'cursor-grab touch-none active:cursor-grabbing',
      )}
      {...(editMode ? { ...listeners, ...attributes } : {})}
    >
      <motion.div
        layout={false}
        data-dashboard-drag-size={tightBentoTile ? id : undefined}
        transformTemplate={(_latest, generated) =>
          generated?.trim()
            ? `translate3d(0,0,0.01px) ${generated}`
            : 'translate3d(0,0,0.01px)'
        }
        className="relative h-full min-h-0 w-full min-w-0 origin-center antialiased [backface-visibility:hidden]"
        initial={false}
        transition={hoverScaleTransition}
        {...(!reduceMotion && !hideSlot && !editMode ? { whileHover: { scale: 1.014 } as const } : {})}
      >
        {id === 'localTime' ? (
          <div className="relative flex h-full min-h-0 w-full flex-col">{children}</div>
        ) : (
          children
        )}
      </motion.div>
    </motion.div>
  )
}

function WidgetShell({
  compact,
  centerContent,
  children,
}: {
  compact?: boolean
  centerContent?: boolean
  children: ReactNode
}) {
  return (
    <article
      className={cn(
        bentoShell,
        compact && 'p-4 sm:p-5',
        centerContent &&
          cn(
            'flex min-h-0 flex-col justify-center overflow-hidden text-center',
            compact ? 'h-full' : 'h-auto min-h-[11rem] sm:min-h-[12rem] md:max-h-[14rem]',
          ),
        !centerContent && 'h-full',
        'min-h-0 min-w-0 transition-[border-color,box-shadow] duration-300 ease-out',
      )}
    >
      {children}
    </article>
  )
}

export function DirectorDashboardTab({
  editMode = false,
  onExitEditMode,
  railNarrow: _railNarrow = false,
}: {
  editMode?: boolean
  /** Clic en el fondo del lienzo (fuera de tarjetas) cierra el modo edición. */
  onExitEditMode?: () => void
  /** Reservado (sidebar); el bento usa `auto-fit` y no depende del ancho del rail. */
  railNarrow?: boolean
}) {
  void _railNarrow
  const plants = useCultivationStore((s) => s.plants)
  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const cultivoBoard = useCultivationStore((s) => s.cultivoBoard)
  const [widgetOrder, setWidgetOrder] = useState<WidgetId[]>(DEFAULT_WIDGET_ORDER)
  const [widgetVisible, setWidgetVisible] = useState<Record<WidgetId, boolean>>(DEFAULT_WIDGET_VISIBILITY)
  const [widgetLayout, setWidgetLayout] = useState<Record<WidgetId, WidgetLayout>>(DEFAULT_WIDGET_LAYOUT)
  const [widgetSquareCols, setWidgetSquareCols] = useState<Record<WidgetId, SquareColSpan>>(DEFAULT_SQUARE_COLS)
  const [widgetSquareAlign, setWidgetSquareAlign] = useState<Record<WidgetId, SquareAlign>>(DEFAULT_SQUARE_ALIGN)
  const [activeDragId, setActiveDragId] = useState<WidgetId | null>(null)
  const [dragOverlayBox, setDragOverlayBox] = useState<{ w: number; h: number } | null>(null)
  const [postDropHideIds, setPostDropHideIds] = useState<readonly WidgetId[] | null>(null)
  const postDropTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [addWidgetModalOpen, setAddWidgetModalOpen] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 10 } }))

  const [dashboardNow, setDashboardNow] = useState(() => new Date())
  useEffect(() => {
    const tick = window.setInterval(() => setDashboardNow(new Date()), 60_000)
    return () => window.clearInterval(tick)
  }, [])

  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const uiLocale = useSettingsStore((s) => s.locale)

  const localDayCard = useMemo(
    () => getDayCardInClubZone(dashboardNow, clubTimeZone, uiLocale),
    [dashboardNow, clubTimeZone, uiLocale],
  )

  useEffect(() => {
    try {
      const raw = localStorage.getItem('green-luck-dashboard-widgets-v1')
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        order?: WidgetId[]
        visible?: Partial<Record<WidgetId, boolean>>
        layout?: Partial<Record<WidgetId, WidgetLayout>>
        squareCols?: Partial<Record<WidgetId, SquareColSpan>>
        squareAlign?: Partial<Record<WidgetId, SquareAlign>>
      }
      if (Array.isArray(parsed.order)) {
        const raw = parsed.order as string[]
        let weatherSeen = false
        const migrated: string[] = []
        for (const id of raw) {
          const nid = id === 'temperature' ? 'weather' : id
          if (nid === 'weather') {
            if (weatherSeen) continue
            weatherSeen = true
          }
          migrated.push(nid)
        }
        const normalized = DEFAULT_WIDGET_ORDER.filter((wid) => migrated.includes(wid))
        const missing = DEFAULT_WIDGET_ORDER.filter((wid) => !normalized.includes(wid))
        setWidgetOrder([...normalized, ...missing])
      }
      if (parsed.visible && typeof parsed.visible === 'object') {
        const vis = { ...parsed.visible } as Record<string, boolean | undefined>
        if ('temperature' in vis && vis.weather === undefined) {
          vis.weather = vis.temperature
        }
        delete vis.temperature
        setWidgetVisible((prev) => ({ ...prev, ...vis }))
      }
      if (parsed.layout && typeof parsed.layout === 'object') {
        const next: Partial<Record<WidgetId, WidgetLayout>> = {}
        for (const key of Object.keys(parsed.layout)) {
          if (key === 'temperature') continue
          if (!(DEFAULT_WIDGET_ORDER as readonly string[]).includes(key)) continue
          const wid = key as WidgetId
          const v = parsed.layout[wid]
          if (v === 'full' || v === 'square') next[wid] = v
        }
        setWidgetLayout((prev) => ({ ...prev, ...next, cultivoOverview: 'full', weather: 'square' }))
      }
      if (parsed.squareCols && typeof parsed.squareCols === 'object') {
        const next: Partial<Record<WidgetId, SquareColSpan>> = {}
        for (const key of Object.keys(parsed.squareCols)) {
          if (key === 'temperature') continue
          if (!(DEFAULT_WIDGET_ORDER as readonly string[]).includes(key)) continue
          const wid = key as WidgetId
          const v = parsed.squareCols[wid]
          if (v === 3 || v === 4) next[wid] = v
        }
        setWidgetSquareCols((prev) => ({ ...prev, ...next, cultivoOverview: 4 }))
      }
      if (parsed.squareAlign && typeof parsed.squareAlign === 'object') {
        const next: Partial<Record<WidgetId, SquareAlign>> = {}
        for (const key of Object.keys(parsed.squareAlign)) {
          if (key === 'temperature') continue
          if (!(DEFAULT_WIDGET_ORDER as readonly string[]).includes(key)) continue
          const wid = key as WidgetId
          const v = parsed.squareAlign[wid]
          if (v === 'start' || v === 'end') next[wid] = v
        }
        setWidgetSquareAlign((prev) => ({ ...prev, ...next, cultivoOverview: 'start' }))
      }
    } catch {
      // ignore malformed persisted state
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(
        'green-luck-dashboard-widgets-v1',
        JSON.stringify({
          order: widgetOrder,
          visible: widgetVisible,
          layout: widgetLayout,
          squareCols: widgetSquareCols,
          squareAlign: widgetSquareAlign,
        }),
      )
    } catch {
      // ignore storage errors
    }
  }, [widgetOrder, widgetVisible, widgetLayout, widgetSquareCols, widgetSquareAlign])

  const floracionBoardCount = useMemo(
    () => (Array.isArray(cultivoBoard?.floracion) ? cultivoBoard.floracion.length : 0),
    [cultivoBoard?.floracion],
  )

  /** Plantas en floración según el tablero Cultivo (evita registros huérfanos en `plants`). */
  const floweringPlantsCount = useMemo(
    () => kanbanColumnPlantTotal(cultivoBoard?.floracion),
    [cultivoBoard?.floracion],
  )

  const vegetacionPlantsCount = useMemo(
    () => kanbanColumnPlantTotal(cultivoBoard?.vegetacion),
    [cultivoBoard?.vegetacion],
  )

  const expectedHarvest = useMemo(() => {
    const activeBloom = plants.filter(
      (p) => p.status === 'activa' && (p.growthStage === 'floracion' || p.floraSubStage != null),
    ).length
    const projected = activeBloom * 85
    const dryFromBatches = harvestBatches.reduce((acc, b) => acc + (b.dryWeight ?? 0), 0)
    return projected + dryFromBatches
  }, [plants, harvestBatches])

  const temps = useMemo(() => fakeWeekTemps(), [])
  const tMin = Math.min(...temps)
  const tMax = Math.max(...temps)
  const latestVpd = useMemo(() => Number(((tMax - tMin) / 2.6).toFixed(2)), [tMax, tMin])
  const climateAlerts = useMemo(() => {
    const alerts: string[] = []
    if (latestVpd < 0.8 || latestVpd > 1.45) alerts.push(`VPD fuera de rango: ${latestVpd.toFixed(2)} kPa`)
    if (tMax > 28) alerts.push(`Temperatura alta: ${tMax.toFixed(1)}°C`)
    const flowerCount = Array.isArray(cultivoBoard?.floracion) ? cultivoBoard.floracion.length : 0
    if (flowerCount > 0 && latestVpd > 1.2) alerts.push('Sala 2: Humedad alta (peligro de Botrytis)')
    return alerts
  }, [cultivoBoard?.floracion, latestVpd, tMax])

  const tasksToday = useMemo(() => {
    const vegCount = Array.isArray(cultivoBoard?.vegetacion) ? cultivoBoard.vegetacion.length : 0
    return [
      `Riego de vegetación · ${Math.min(vegCount, 12)} lotes`,
      'Ajustar solución: EC 1.8 / pH 6.1',
      'Defoliación selectiva en sala floración',
    ]
  }, [cultivoBoard?.vegetacion])

  const transitionHints = useMemo(() => {
    const propCount = Array.isArray(cultivoBoard?.propagacion) ? cultivoBoard.propagacion.length : 0
    const vegCount = Array.isArray(cultivoBoard?.vegetacion) ? cultivoBoard.vegetacion.length : 0
    return [
      `${Math.min(vegCount, 6)} lotes listos para pasar a floración`,
      `${Math.min(propCount, 8)} clones listos para vegetación`,
    ]
  }, [cultivoBoard?.propagacion, cultivoBoard?.vegetacion])

  const licenseLimit = useMemo(() => {
    const active = plants.filter((p) => p.status === 'activa').length
    const maxAllowed = 500
    const pct = Math.min(100, Math.round((active / maxAllowed) * 100))
    return { active, maxAllowed, pct }
  }, [plants])

  const recentMovements = useMemo(
    () =>
      [...plants]
        .filter((p) => typeof p.registeredAt === 'string' && p.registeredAt)
        .sort((a, b) => {
          const av = a.registeredAt ?? ''
          const bv = b.registeredAt ?? ''
          return av < bv ? 1 : -1
        })
        .slice(0, 4)
        .map((p) => ({
          id: p.id,
          strain: p.strain,
          date: p.registeredAt?.slice(0, 10) ?? '—',
        })),
    [plants],
  )

  const widgetBodies = useMemo((): Record<WidgetId, ReactNode> => {
    const L = widgetLayout
    return {
      floweringCount:
        L.floweringCount === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Floración</p>
            <p className={cn('mt-1 text-4xl font-semibold tabular-nums sm:text-5xl', C.heading)}>{floracionBoardCount}</p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Floración</p>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', C.heading)}>{floracionBoardCount}</p>
          </WidgetShell>
        ),
      expectedHarvest:
        L.expectedHarvest === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Cosecha esp. (g)</p>
            <p className={cn('mt-1 text-3xl font-semibold tabular-nums sm:text-4xl', C.heading)}>{Math.round(expectedHarvest)}</p>
            <LineChart className="mx-auto mt-2 h-5 w-5 text-emerald-600 opacity-80 dark:text-emerald-400" />
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Cosecha esperada (g)</p>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', C.heading)}>{Math.round(expectedHarvest)}</p>
            <div className={cn('mt-2 inline-flex items-center gap-1 text-xs', C.subheading)}>
              <LineChart className="h-4 w-4" />
              Projection + post-cosecha
            </div>
          </WidgetShell>
        ),
      weather: <WeatherRainWideWidget city="Lima" temps={temps} tMin={tMin} tMax={tMax} />,
      dailyPrompt: (
        <div className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] p-5">
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col overflow-hidden',
              'bg-[linear-gradient(180deg,#353A5A_0%,#1F2138_100%)]',
              "font-[var(--second-family)] text-[#C0C6EA]",
            )}
          >
            {/* Top row */}
            <div className="flex w-full shrink-0 items-start justify-between">
              <div className="text-[14px] font-semibold leading-[1.43] tracking-[-0.01em]">Monday</div>
              <div className="h-[19px] w-[19px] shrink-0">
              <svg
                width="19"
                height="19"
                viewBox="0 0 19 19"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <mask
                  id="dailyPromptMask0"
                  style={{ maskType: 'alpha' }}
                  maskUnits="userSpaceOnUse"
                  x="9"
                  y="0"
                  width="10"
                  height="19"
                >
                  <path
                    d="M15.0135 18.973C11.2051 18.1013 10.0434 16.9324 9.91992 14.6108V9.76036H13.668L15.5768 10.0785C16.002 10.1494 16.3137 10.5173 16.3137 10.9484V17.9137C16.3137 18.6036 15.6859 19.1269 15.0135 18.973Z"
                    fill="#FF6560"
                  />
                  <path
                    d="M18.5184 8.00533V0.87929C18.5184 0.304249 17.975 -0.11737 17.419 0.0293801C13.7402 1.00037 11.6891 1.81795 10.357 4.06521C10.0373 4.60455 9.91992 5.23423 9.91992 5.86121V14.6108C10.6611 11.1219 13.7427 10.1159 17.8933 8.84873C18.2642 8.73549 18.5184 8.39311 18.5184 8.00533Z"
                    fill="url(#dailyPromptPaint1)"
                  />
                </mask>
                <g mask="url(#dailyPromptMask0)">
                  <path
                    d="M15.0135 18.9724C11.2051 18.1007 10.0434 16.9318 9.91992 14.6102V9.75977H13.668L15.5768 10.0779C16.002 10.1488 16.3137 10.5167 16.3137 10.9478V17.9132C16.3137 18.603 15.6859 19.1263 15.0135 18.9724Z"
                    fill="#FF6560"
                  />
                  <path
                    d="M18.5184 8.0058V0.87977C18.5184 0.30473 17.975 -0.116889 17.419 0.0298609C13.7402 1.00085 11.6891 1.81843 10.357 4.06569C10.0373 4.60503 9.91992 5.23471 9.91992 5.86169V14.6113C10.6611 11.1225 13.7427 10.1164 17.8933 8.84921C18.2642 8.73597 18.5184 8.39359 18.5184 8.0058Z"
                    fill="url(#dailyPromptPaint1)"
                  />
                </g>
                <mask
                  id="dailyPromptMask1"
                  style={{ maskType: 'alpha' }}
                  maskUnits="userSpaceOnUse"
                  x="0"
                  y="0"
                  width="9"
                  height="19"
                >
                  <path
                    d="M3.50492 18.973C7.31336 18.1013 8.47499 16.9324 8.59851 14.6108V9.76036H4.85044L2.94166 10.0785C2.51642 10.1494 2.20475 10.5173 2.20475 10.9484V17.9137C2.20475 18.6036 2.83248 19.1269 3.50492 18.973Z"
                    fill="#D9D9D9"
                  />
                  <path
                    d="M0 8.00533V0.87929C0 0.304249 0.543384 -0.11737 1.09938 0.0293801C4.77824 1.00037 6.82929 1.81795 8.16141 4.06521C8.48112 4.60455 8.59851 5.23423 8.59851 5.86121V14.6108C7.85733 11.1219 4.77571 10.1159 0.625093 8.84873C0.254208 8.73549 0 8.39311 0 8.00533Z"
                    fill="#D9D9D9"
                  />
                </mask>
                <g mask="url(#dailyPromptMask1)">
                  <path
                    d="M3.50407 18.9724C7.31251 18.1007 8.47414 16.9318 8.59766 14.6102V9.75977H4.84959L2.94081 10.0779C2.51557 10.1488 2.20389 10.5167 2.20389 10.9478V17.9132C2.20389 18.603 2.83163 19.1263 3.50407 18.9724Z"
                    fill="#8D9CF7"
                  />
                  <path
                    d="M-0.000850677 8.0058V0.87977C-0.000850677 0.30473 0.542533 -0.116889 1.09853 0.0298609C4.77739 1.00085 6.82844 1.81843 8.16056 4.06569C8.48027 4.60503 8.59766 5.23471 8.59766 5.86169V14.6113C7.85648 11.1225 4.77486 10.1164 0.624242 8.84921C0.253357 8.73597 -0.000850677 8.39359 -0.000850677 8.0058Z"
                    fill="url(#dailyPromptPaint2)"
                  />
                </g>
                <defs>
                  <linearGradient
                    id="dailyPromptPaint1"
                    x1="20.9436"
                    y1="7.68318"
                    x2="9.69945"
                    y2="7.68318"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop offset="0.218319" stopColor="#FE9395" />
                    <stop offset="1" stopColor="#FDDECA" />
                  </linearGradient>
                  <linearGradient
                    id="dailyPromptPaint2"
                    x1="-0.000850619"
                    y1="4.72362"
                    x2="8.37718"
                    y2="4.72362"
                    gradientUnits="userSpaceOnUse"
                  >
                    <stop stopColor="#6D6EA9" />
                    <stop offset="1" stopColor="#BE7199" />
                  </linearGradient>
                </defs>
              </svg>
              </div>
            </div>

            {/* Middle copy — min-h-0 + overflow-hidden so text cannot paint over the button row */}
            <div className="mt-3 flex min-h-0 flex-1 flex-col justify-center overflow-hidden">
              <div
                className={cn(
                  'text-left text-[14px] font-bold leading-[1.15] tracking-[-0.02em]',
                  'bg-[linear-gradient(90deg,#9CC0FE_0%,#878BEE_100%)] bg-clip-text text-transparent',
                )}
              >
                How will you
                <br />
                make tomorrow
                <br />
                meaningful?
              </div>
            </div>

            {/* Bottom row — always reserves its height; never overlapped */}
            <div className="flex w-full shrink-0 items-center justify-between gap-3 pt-2">
              <button
                type="button"
                className={cn(
                  'flex h-8 min-h-8 flex-1 items-center justify-center gap-2 rounded-full',
                  'bg-[linear-gradient(90deg,#6577A5_0%,#5C629C_100%)]',
                  'shadow-[0_4px_4px_rgba(0,0,0,0.08)]',
                  "font-[var(--second-family)] text-[14px] font-semibold leading-[1.43] tracking-[-0.01em] text-white",
                )}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path
                    d="M13.0703 1.81026L11.9492 0.689163L12.4141 0.231155C12.6875 -0.0422828 13.1113 -0.0832984 13.3574 0.162795L13.5557 0.354202C13.8359 0.634475 13.8223 1.04463 13.5352 1.33858L13.0703 1.81026ZM4.96973 9.07002C4.79883 9.13838 4.59375 8.94014 4.66895 8.75557L5.29102 7.36104L11.4092 1.2292L12.5371 2.34346L6.41211 8.4753L4.96973 9.07002ZM2.31738 13.739C0.806641 13.739 0 12.9392 0 11.4421V3.62862C0 2.12471 0.806641 1.33174 2.31738 1.33174H9.83008L8.3125 2.84932H2.44727C1.8457 2.84932 1.52441 3.15694 1.52441 3.78584V11.278C1.52441 11.9069 1.8457 12.2146 2.44727 12.2146H10.1104C10.5615 12.2146 10.8828 11.9069 10.8828 11.278V5.47432L12.4072 3.9499V11.4421C12.4072 12.9392 11.6074 13.739 10.2402 13.739H2.31738Z"
                    fill="white"
                  />
                </svg>
                New
              </button>

              <button
                type="button"
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                  'bg-[#5B5F9F]',
                  'shadow-[0_4px_4px_rgba(0,0,0,0.08)]',
                )}
                aria-label="Refresh"
              >
                <svg className="h-4 w-4" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <path
                    d="M11.0196 13.0039C12.2637 11.7051 14.0479 10.8711 16.0098 10.8711C19.6534 10.8711 22.668 13.6533 23.0918 17.1123H24.0625C24.6231 17.1123 24.7666 17.543 24.4385 18.001L22.7295 20.3799C22.4629 20.749 22.0459 20.749 21.7862 20.3799L20.0772 17.9941C19.7491 17.543 19.9063 17.1123 20.4532 17.1123H21.4991C21.1026 14.4941 18.8262 12.4365 16.0098 12.4365C14.458 12.4365 13.0635 13.0791 12.0723 14.1045C11.6621 14.4668 11.211 14.4189 10.9239 14.1182C10.6436 13.8311 10.6368 13.3525 11.0196 13.0039ZM7.56055 17.9941L9.26953 15.6221C9.53613 15.2529 9.95312 15.2529 10.2197 15.6221L11.9219 18.001C12.25 18.459 12.0928 18.8828 11.5459 18.8828H10.5137C10.9102 21.501 13.1865 23.5586 16.0098 23.5586C17.5615 23.5586 18.9629 22.916 19.9473 21.8838C20.3574 21.5283 20.8086 21.5625 21.0957 21.8701C21.3691 22.1504 21.376 22.6357 21 22.9912C19.7559 24.29 17.9717 25.1309 16.0098 25.1309C12.3594 25.1309 9.34473 22.3418 8.9209 18.8828H7.93652C7.38281 18.8828 7.23242 18.4521 7.56055 17.9941Z"
                    fill="white"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ),
      forestMetric: (
        <div className="flex h-full min-h-0 w-full items-stretch justify-stretch">
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[22px] pb-2 pt-3',
              'font-[var(--second-family)]',
            )}
            style={{ backgroundColor: BRAND_GREEN }}
          >
            <div className="w-full shrink-0 px-5">
            <p className="w-full text-left text-[14px] font-semibold leading-[1.2] tracking-[-0.01em] text-white/90">
              Floración
            </p>
            <div className="mt-2.5 flex shrink-0 flex-col items-center px-0.5 pt-0.5">
              <p
                className={cn(
                  'text-center text-[46px] font-semibold leading-none tracking-[-0.01em] tabular-nums text-white',
                  '[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.2))]',
                )}
              >
                {floweringPlantsCount}
              </p>
              <p className="mt-0.5 text-center text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white/95">
                {floweringPlantsCount === 1 ? 'Planta' : 'Plantas'}
              </p>
            </div>
            </div>
            {/* Спейсер забирает высоту — кнопка прижимается к низу, без «висения» по центру */}
            <div className="min-h-0 flex-1 shrink" aria-hidden />
            <div className="w-full shrink-0 px-2">
              <button
                type="button"
                className={cn(
                  'flex h-8 w-full items-center justify-center text-[14px] leading-none',
                  'rounded-full bg-white font-semibold text-[#06663F] shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
                  'transition-colors duration-200 ease-out hover:bg-white/90',
                )}
                onClick={() => {
                  try {
                    sessionStorage.setItem('cultivo-pending-board-tab', 'floracion')
                  } catch {
                    // ignore
                  }
                  window.dispatchEvent(
                    new CustomEvent('dashboard:open-tab', { detail: { tab: 'cultivo' } }),
                  )
                }}
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      ),
      vegetacionMetric: (
        <div className="flex h-full min-h-0 w-full items-stretch justify-stretch">
          <div
            className={cn(
              'flex min-h-0 w-full flex-1 flex-col overflow-hidden rounded-[22px] pb-2 pt-3',
              'font-[var(--second-family)]',
            )}
            style={{ backgroundColor: BRAND_GREEN }}
          >
            <div className="w-full shrink-0 px-5">
              <p className="w-full text-left text-[14px] font-semibold leading-[1.2] tracking-[-0.01em] text-white/90">
                Vegetación
              </p>
              <div className="mt-2.5 flex shrink-0 flex-col items-center px-0.5 pt-0.5">
                <p
                  className={cn(
                    'text-center text-[46px] font-semibold leading-none tracking-[-0.01em] tabular-nums text-white',
                    '[filter:drop-shadow(0_2px_6px_rgba(0,0,0,0.2))]',
                  )}
                >
                  {vegetacionPlantsCount}
                </p>
                <p className="mt-0.5 text-center text-[14px] font-semibold leading-tight tracking-[-0.01em] text-white/95">
                  {vegetacionPlantsCount === 1 ? 'Planta' : 'Plantas'}
                </p>
              </div>
            </div>
            {/* Спейсер забирает высоту — кнопка прижимается к низу, без «висения» по центру */}
            <div className="min-h-0 flex-1 shrink" aria-hidden />
            <div className="w-full shrink-0 px-2">
              <button
                type="button"
                className={cn(
                  'flex h-8 w-full items-center justify-center text-[14px] leading-none',
                  'rounded-full bg-white font-semibold text-[#06663F] shadow-[0_2px_8px_rgba(0,0,0,0.12)]',
                  'transition-colors duration-200 ease-out hover:bg-white/90',
                )}
                onClick={() => {
                  try {
                    sessionStorage.setItem('cultivo-pending-board-tab', 'vegetacion')
                  } catch {
                    // ignore
                  }
                  window.dispatchEvent(
                    new CustomEvent('dashboard:open-tab', { detail: { tab: 'cultivo' } }),
                  )
                }}
              >
                Ver
              </button>
            </div>
          </div>
        </div>
      ),
      vpd:
        L.vpd === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>VPD</p>
            <p className={cn('mt-1 text-3xl font-semibold tabular-nums sm:text-4xl', C.heading)}>{latestVpd.toFixed(2)}</p>
            <p className="text-[11px] text-gray-500 dark:text-[#9a9a9a]">kPa</p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>VPD en tiempo real</p>
            <p className={cn('mt-2 text-2xl font-semibold tabular-nums', C.heading)}>{latestVpd.toFixed(2)} kPa</p>
            <p
              className={cn(
                'mt-2 text-xs',
                latestVpd >= 0.8 && latestVpd <= 1.2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400',
              )}
            >
              {latestVpd >= 0.8 && latestVpd <= 1.2 ? 'Dentro del corredor ideal' : 'Fuera de rango recomendado'}
            </p>
          </WidgetShell>
        ),
      climateAlerts:
        L.climateAlerts === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Alertas</p>
            {climateAlerts.length === 0 ? (
              <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">Sin alertas</p>
            ) : (
              <>
                <p className={cn('mt-2 text-3xl font-semibold tabular-nums', C.heading)}>{climateAlerts.length}</p>
                <p className={cn('mt-1 text-[11px]', C.subheading)}>avisos activos</p>
              </>
            )}
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Alertas de clima</p>
            {climateAlerts.length === 0 ? (
              <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">Sin alertas críticas</p>
            ) : (
              <div className="mt-3 space-y-2">
                {climateAlerts.map((alert) => (
                  <div
                    key={alert}
                    className="flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-900/20 dark:text-amber-300"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{alert}</span>
                  </div>
                ))}
              </div>
            )}
          </WidgetShell>
        ),
      tasksToday:
        L.tasksToday === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Tareas</p>
            <p className={cn('mt-2 text-3xl font-semibold tabular-nums', C.heading)}>{tasksToday.length}</p>
            <p className={cn('mt-1 text-[11px]', C.subheading)}>pendientes hoy</p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Tareas del día</p>
            <ul className="mt-3 space-y-2">
              {tasksToday.map((task) => (
                <li key={task} className="flex items-start gap-2 text-sm text-gray-700 dark:text-[#d4d4d4]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{task}</span>
                </li>
              ))}
            </ul>
          </WidgetShell>
        ),
      transitions:
        L.transitions === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Transiciones</p>
            <CalendarClock className="mx-auto mt-2 h-7 w-7 text-blue-500" />
            <p className={cn('mt-2 line-clamp-3 px-1 text-center text-[11px] leading-snug', C.subheading)}>
              {transitionHints.join(' · ')}
            </p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Calendario de transiciones</p>
            <div className="mt-3 space-y-2">
              {transitionHints.map((hint) => (
                <div key={hint} className="flex items-start gap-2 text-sm text-gray-700 dark:text-[#d4d4d4]">
                  <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
                  <span>{hint}</span>
                </div>
              ))}
            </div>
          </WidgetShell>
        ),
      cloneSuccess: <LoteTraceabilityWaterfallWidget compact={L.cloneSuccess === 'square'} />,
      licenseLimit:
        L.licenseLimit === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Licencia</p>
            <p className={cn('mt-1 text-3xl font-semibold tabular-nums', C.heading)}>{licenseLimit.pct}%</p>
            <div className="mt-3 h-2 w-full max-w-[10rem] overflow-hidden rounded-full bg-gray-200 dark:bg-[#333333]">
              <div
                className={cn(
                  'h-full rounded-full',
                  licenseLimit.pct > 90 ? 'bg-red-500' : licenseLimit.pct > 75 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${licenseLimit.pct}%` }}
              />
            </div>
            <p className={cn('mt-2 text-[11px]', C.subheading)}>
              {licenseLimit.active}/{licenseLimit.maxAllowed} pl.
            </p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Límites de licencia</p>
            <p className={cn('mt-2 text-sm', C.heading)}>
              {licenseLimit.active} / {licenseLimit.maxAllowed} plantas
            </p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-[#333333]">
              <div
                className={cn(
                  'h-full rounded-full',
                  licenseLimit.pct > 90 ? 'bg-red-500' : licenseLimit.pct > 75 ? 'bg-amber-500' : 'bg-emerald-500',
                )}
                style={{ width: `${licenseLimit.pct}%` }}
              />
            </div>
            <div className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 dark:text-[#8c8c8c]">
              <Shield className="h-3.5 w-3.5" />
              {licenseLimit.pct}% del cupo
            </div>
          </WidgetShell>
        ),
      recentMovements:
        L.recentMovements === 'square' ? (
          <WidgetShell compact centerContent>
            <p className={cn('text-[10px] font-semibold uppercase tracking-wide', C.muted)}>Movimientos</p>
            <p className={cn('mt-2 text-3xl font-semibold tabular-nums', C.heading)}>{recentMovements.length}</p>
            <p className={cn('mt-1 text-[11px]', C.subheading)}>últimos registros</p>
          </WidgetShell>
        ) : (
          <WidgetShell>
            <p className={cn('text-xs uppercase tracking-wide', C.muted)}>Últimos movimientos</p>
            <div className="mt-3 space-y-2">
              {recentMovements.map((m) => (
                <div key={m.id} className="rounded-lg bg-gray-50 px-2.5 py-2 text-sm dark:bg-[#2a2a2a]">
                  <p className="font-medium text-gray-800 dark:text-[#f1f1f1]">{m.id}</p>
                  <p className="text-xs text-gray-500 dark:text-[#8c8c8c]">
                    {m.strain} · {m.date}
                  </p>
                </div>
              ))}
            </div>
          </WidgetShell>
        ),
      localTime:
        L.localTime === 'square' ? (
          <div className="flex h-full min-h-0 w-full items-center justify-center">
            <LocalTimeSquareFlip
              dashboardNow={dashboardNow}
              localDayCard={localDayCard}
              timeZone={clubTimeZone}
              uiLocale={uiLocale}
            />
          </div>
        ) : (
          <WidgetShell>
            <div
              className={cn(
                'flex min-h-[11rem] w-full min-w-0 flex-col items-center justify-center rounded-[22px] bg-[#1c1c1e] px-4 py-6',
              )}
            >
              <div className="flex w-full flex-col items-center">
                <p
                  className={cn(
                    'm-0 w-full max-w-[280px] pt-4 text-center text-[27px] font-[590] leading-tight tracking-[0.01em]',
                    'font-[family-name:var(--font6)]',
                  )}
                >
                  <span className="inline-flex items-baseline justify-center gap-1">
                    <span style={{ color: BRAND_GREEN }}>{localDayCard.weekdayLabel}</span>
                    <span className="text-[#8e8d93]">{localDayCard.monthLabel}</span>
                  </span>
                </p>
                <div className="flex w-full flex-col items-center">
                  <time
                    dateTime={zonedISODate(dashboardNow, clubTimeZone)}
                    className={cn(
                      '-mt-[21px] inline-block text-center text-7xl font-semibold tabular-nums leading-none text-white sm:text-8xl md:text-9xl',
                      'font-[family-name:var(--font12)]',
                      localDayCard.dayOfMonth >= 10 && 'tracking-[-0.05em]',
                    )}
                    style={{ unicodeBidi: 'isolate' }}
                  >
                    {localDayCard.dayOfMonth}
                  </time>
                </div>
              </div>
            </div>
          </WidgetShell>
        ),
      cultivoOverview: (
        <div
          className={cn(
            bentoShell,
            'h-full min-h-0 min-w-0 overflow-hidden transition-[border-color] duration-300 ease-out',
          )}
        >
          <AgronomyTab initialSub="registro" visibleSubs={['registro']} hideTabs />
        </div>
      ),
    }
  }, [
    editMode,
    widgetLayout,
    dashboardNow,
    localDayCard,
    floracionBoardCount,
    floweringPlantsCount,
    vegetacionPlantsCount,
    expectedHarvest,
    temps,
    tMin,
    tMax,
    latestVpd,
    climateAlerts,
    tasksToday,
    transitionHints,
    licenseLimit,
    recentMovements,
  ])

  const handleDragStart = (event: DragStartEvent) => {
    const id = event.active.id as WidgetId
    window.clearTimeout(postDropTimerRef.current)
    postDropTimerRef.current = undefined
    setPostDropHideIds(null)
    setActiveDragId(id)
    requestAnimationFrame(() => {
      const useSquareMeasure =
        id !== 'cultivoOverview' &&
        (widgetLayout[id] === 'square' ||
          isCompactCultivoBentoWidget(id) ||
          id === 'localTime' ||
          id === 'weather')
      const node = document.querySelector(
        useSquareMeasure ? `[data-dashboard-drag-size="${id}"]` : `[data-dashboard-widget="${id}"]`,
      )
      if (node instanceof HTMLElement) {
        const r = node.getBoundingClientRect()
        setDragOverlayBox({ w: Math.round(r.width), h: Math.round(r.height) })
      }
    })
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    const droppedId = active.id as WidgetId
    setActiveDragId(null)
    setDragOverlayBox(null)

    if (!over || active.id === over.id) {
      window.clearTimeout(postDropTimerRef.current)
      postDropTimerRef.current = undefined
      setPostDropHideIds(null)
      return
    }

    const a = droppedId
    const o = over.id as WidgetId
    setPostDropHideIds([a, o])
    setWidgetOrder((prev) => {
      const visible = prev.filter((id) => widgetVisible[id])
      const oldIndex = visible.indexOf(a)
      const newIndex = visible.indexOf(o)
      if (oldIndex < 0 || newIndex < 0) return prev
      const nextVisible = arrayMove(visible, oldIndex, newIndex)
      let i = 0
      return prev.map((id) => (widgetVisible[id] ? nextVisible[i++]! : id))
    })

    window.clearTimeout(postDropTimerRef.current)
    postDropTimerRef.current = window.setTimeout(() => {
      setPostDropHideIds(null)
      postDropTimerRef.current = undefined
    }, 260)
  }

  const handleDragCancel = () => {
    window.clearTimeout(postDropTimerRef.current)
    postDropTimerRef.current = undefined
    setPostDropHideIds(null)
    setActiveDragId(null)
    setDragOverlayBox(null)
  }

  useEffect(() => {
    if (!editMode) setAddWidgetModalOpen(false)
  }, [editMode])

  useEffect(() => {
    if (!addWidgetModalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAddWidgetModalOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [addWidgetModalOpen])

  useEffect(
    () => () => {
      window.clearTimeout(postDropTimerRef.current)
    },
    [],
  )

  const visibleWidgetIds = widgetOrder.filter((id) => widgetVisible[id])
  const toggleWidget = (id: WidgetId) => setWidgetVisible((prev) => ({ ...prev, [id]: !prev[id] }))
  const reduceMotion = useReducedMotion()
  const gridLayoutTween = reduceMotion
    ? ({ duration: 0 } as const)
    : ({
        type: 'tween' as const,
        duration: DASHBOARD_RAIL_LAYOUT_MS,
        ease: DASHBOARD_RAIL_LAYOUT_EASE,
      } as const)

  const onCanvasPointerDown = (e: React.PointerEvent) => {
    if (!editMode || !onExitEditMode || addWidgetModalOpen) return
    const el = e.target as HTMLElement
    if (el.closest('[data-dashboard-widget],[data-dashboard-add-slot],[role="dialog"]')) return
    onExitEditMode()
  }

  return (
    <LayoutGroup id="director-dashboard-layout">
      <div
        className={cn(
          'col-span-12 w-full min-w-0',
          editMode ? 'min-h-[calc(100vh-12rem)]' : 'min-h-0',
          reduceMotion
            ? undefined
            : 'transition-[min-height] duration-[480ms] [transition-timing-function:cubic-bezier(0.22,1,0.36,1)]',
        )}
        data-dashboard-canvas
        onPointerDownCapture={onCanvasPointerDown}
      >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <>
          <div className="grid w-full min-w-0 grid-cols-[repeat(auto-fit,minmax(158px,158px))] gap-[22px] auto-rows-[158px] justify-center">
            <AnimatePresence initial={false}>
              {editMode ? (
                <motion.div
                  key="dashboard-add-widget-tile"
                  layout
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.88 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={
                    reduceMotion
                      ? { opacity: 0 }
                      : {
                          opacity: 0,
                          scale: 0.9,
                          transition: { duration: 0.36, ease: [0.22, 1, 0.36, 1] },
                        }
                  }
                  transition={{
                    layout: gridLayoutTween,
                    opacity: { duration: reduceMotion ? 0 : 0.26, ease: [0.22, 1, 0.36, 1] },
                    scale: reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 26, mass: 0.4 },
                  }}
                  className="col-span-1 row-span-1 h-full w-full min-h-0 min-w-0"
                  data-dashboard-add-slot
                >
                  <button
                    type="button"
                    onClick={() => setAddWidgetModalOpen(true)}
                    className={cn(
                      'flex h-full w-full min-h-0 items-center justify-center rounded-[22px] border transition-colors duration-200',
                      'border-slate-200/80 bg-white/70 text-slate-500 shadow-sm backdrop-blur-md',
                      'hover:border-slate-300 hover:bg-white/90 hover:text-slate-900',
                      'dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:shadow-none dark:backdrop-blur-md',
                      'dark:hover:bg-white/10 dark:hover:text-white',
                      'outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
                    )}
                    aria-label="Añadir widget"
                  >
                    <Plus className="h-7 w-7" strokeWidth={1.35} aria-hidden />
                  </button>
                </motion.div>
              ) : null}
            </AnimatePresence>
            <SortableContext items={visibleWidgetIds} strategy={rectSortingStrategy}>
              {visibleWidgetIds.map((wid) => (
                <SortableWidget
                  key={wid}
                  id={wid}
                  editMode={editMode}
                  layout={widgetLayout[wid]}
                  postDropHideIds={postDropHideIds}
                >
                  {widgetBodies[wid]}
                </SortableWidget>
              ))}
            </SortableContext>
          </div>
          <DragOverlay
            zIndex={1250}
            dropAnimation={{
              ...defaultDropAnimation,
              duration: 220,
              easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {activeDragId != null && editMode ? (
              <div
                className={cn(
                  bentoPanelRadius,
                  'box-border shrink-0 cursor-grabbing rounded-[22px] border border-gray-200/80 bg-[#fdfdfd] shadow-[0_24px_60px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.06] dark:border-[#3d3d3d] dark:bg-[#222222] dark:ring-white/[0.08]',
                  'overflow-visible will-change-transform',
                )}
                style={
                  dragOverlayBox
                    ? {
                        width: dragOverlayBox.w,
                        height: dragOverlayBox.h,
                        maxWidth: 'min(calc(100vw - 2rem), 960px)',
                      }
                    : { minHeight: 180, minWidth: 260 }
                }
              >
                <div className="flex h-full min-h-0 min-w-0 flex-col overflow-visible rounded-[inherit] pointer-events-none">
                  {widgetBodies[activeDragId]}
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </>
      </DndContext>

      <AnimatePresence>
        {addWidgetModalOpen ? (
          <motion.div
            key="add-widget-modal"
            className="fixed inset-0 z-[1400] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-add-widget-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.18 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-black/55 backdrop-blur-[3px]"
              aria-label="Cerrar"
              onClick={() => setAddWidgetModalOpen(false)}
            />
            <motion.div
              role="document"
              initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 32, mass: 0.55 }
              }
              className={cn(
                'relative z-[1] w-full max-w-md overflow-hidden rounded-2xl border p-5 shadow-2xl',
                'border-slate-200/90 bg-[#fafafa] dark:border-white/10 dark:bg-[#1a1a1c]',
              )}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h2 id="dashboard-add-widget-title" className={cn('text-lg font-semibold tracking-tight', C.heading)}>
                    Widgets del dashboard
                  </h2>
                  <p className={cn('mt-1 text-sm', C.muted)}>
                    Añade bloques ocultos u oculta los que no necesites.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAddWidgetModalOpen(false)}
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </div>
              <div className="max-h-[min(56vh,420px)] space-y-0.5 overflow-y-auto pr-1">
                {DEFAULT_WIDGET_ORDER.map((wid) => (
                  <div
                    key={wid}
                    className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-slate-100/90 dark:hover:bg-white/[0.06]"
                  >
                    <span className={cn('text-sm font-medium', C.heading)}>{WIDGET_LABEL[wid]}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      {widgetVisible[wid] ? (
                        <button
                          type="button"
                          className={cn(
                            'rounded-full px-3 py-1 text-xs font-medium text-slate-600 transition',
                            'hover:bg-slate-200/90 dark:text-slate-300 dark:hover:bg-white/10',
                          )}
                          onClick={() => toggleWidget(wid)}
                        >
                          Ocultar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                          onClick={() => {
                            toggleWidget(wid)
                            setAddWidgetModalOpen(false)
                          }}
                        >
                          Añadir
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
