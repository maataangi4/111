import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { CalendarClock, Download, Filter, ListChecks, Search, X } from 'lucide-react'
import { anchorForZonedYmd, formatInClubTimeZone, zonedISODate } from '../../lib/clubTime'
import { cn } from '../../lib/cn'
import { useSociosStore, type MovimientoEntry, type MovimientoTipo } from '../../store/useSociosStore'
import { useSettingsStore } from '../../store/useSettingsStore'

function fmtInt(n: number) {
  try {
    return new Intl.NumberFormat('es-AR').format(n)
  } catch {
    return String(n)
  }
}

function fmtMoney(n: number) {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
  } catch {
    return `$${Math.round(n)}`
  }
}

function fmtGrams(n: number) {
  const g = Math.round(n * 10) / 10
  return `${String(g).replace('.', ',')}g`
}

function toCsvCell(v: unknown) {
  const s = String(v ?? '')
  if (/[,"\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

function downloadCsv(filename: string, rows: string[][]) {
  const content = rows.map((r) => r.map(toCsvCell).join(',')).join('\n')
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function MetricCard({
  title,
  value,
  Icon,
}: {
  title: string
  value: string
  Icon: typeof ListChecks
}) {
  return (
    <div className="rounded-[22px] bg-white/[0.04] p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06] text-white/70">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{title}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
        </div>
      </div>
    </div>
  )
}

function TipoBadge({ tipo }: { tipo: MovimientoTipo }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold',
        tipo === 'legal' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-slate-500/15 text-white/70',
      )}
    >
      {tipo === 'legal' ? 'Legal' : 'Interno'}
    </span>
  )
}

export function MovimientosTab() {
  const movimientos = useSociosStore((s) => s.movimientos)
  const anularMovimiento = useSociosStore((s) => s.anularMovimiento)
  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const appLocale = useSettingsStore((s) => s.locale)

  const [q, setQ] = useState('')
  const [from, setFrom] = useState<string>('')
  const [to, setTo] = useState<string>('')
  const [todayOnly, setTodayOnly] = useState(false)
  const [onlyLegal, setOnlyLegal] = useState(false)
  const [batchId, setBatchId] = useState<string>('')
  const [groupByDay, setGroupByDay] = useState(true)
  const [annulTarget, setAnnulTarget] = useState<MovimientoEntry | null>(null)
  const [annulMotivo, setAnnulMotivo] = useState('')
  const [annulError, setAnnulError] = useState<string | null>(null)

  const batches = useMemo(() => {
    const set = new Map<string, string>()
    for (const m of movimientos) {
      if (!m.harvestBatchId) continue
      if (!set.has(m.harvestBatchId)) set.set(m.harvestBatchId, m.harvestBatchLabel || m.harvestBatchId)
    }
    return [...set.entries()].map(([id, label]) => ({ id, label }))
  }, [movimientos])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    const fromD = from ? new Date(`${from}T00:00:00`) : null
    const toD = to ? new Date(`${to}T23:59:59`) : null
    const todayClub = zonedISODate(new Date(), clubTimeZone)
    return movimientos.filter((m) => {
      if (todayOnly && zonedISODate(new Date(m.createdAt), clubTimeZone) !== todayClub) return false
      if (onlyLegal && m.tipo !== 'legal') return false
      if (batchId && m.harvestBatchId !== batchId) return false
      const t = new Date(m.createdAt)
      if (fromD && t < fromD) return false
      if (toD && t > toD) return false
      if (query) {
        const bag = `${m.socioNombre} ${m.socioDni} ${m.harvestBatchLabel} ${m.harvestBatchId}`.toLowerCase()
        if (!bag.includes(query)) return false
      }
      return true
    })
  }, [movimientos, q, from, to, todayOnly, onlyLegal, batchId, clubTimeZone])

  const grouped = useMemo(() => {
    if (!groupByDay) return null
    const map = new Map<string, MovimientoEntry[]>()
    for (const m of filtered) {
      const day = zonedISODate(new Date(m.createdAt), clubTimeZone)
      const arr = map.get(day) ?? []
      arr.push(m)
      map.set(day, arr)
    }
    const days = [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
    return days.map(([day, items]) => ({ day, items }))
  }, [filtered, groupByDay, clubTimeZone])

  const totals = useMemo(() => {
    let grams = 0
    let aportes = 0
    for (const m of filtered) {
      grams += m.grams
      aportes += m.aporteArs
    }
    return {
      grams: Math.round(grams * 10) / 10,
      aportes: Math.round(aportes * 100) / 100,
      tx: filtered.length,
    }
  }, [filtered])

  const exportCsv = () => {
    const rows: string[][] = [
      ['Fecha', 'Socio', 'DNI', 'Lote', 'Cantidad (g)', 'Aporte (ARS)', 'Método', 'Tipo', 'Estado', 'Motivo anulación'],
      ...filtered.map((m) => [
        formatInClubTimeZone(m.createdAt, clubTimeZone, appLocale, {
          dateStyle: 'short',
          timeStyle: 'medium',
        }),
        m.socioNombre,
        m.socioDni,
        m.harvestBatchLabel || m.harvestBatchId,
        String(m.grams),
        String(m.aporteArs),
        m.metodoPago,
        m.tipo,
        m.status ?? 'ok',
        m.anulacion?.motivo ?? '',
      ]),
    ]
    downloadCsv(`movimientos-${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  const applyPreset = (daysBack: number) => {
    const now = new Date()
    const fromD = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    setFrom(fromD.toISOString().slice(0, 10))
    setTo(now.toISOString().slice(0, 10))
    setTodayOnly(false)
  }

  const applyYear = (years: number) => {
    const now = new Date()
    const fromD = new Date(now)
    fromD.setFullYear(now.getFullYear() - years)
    setFrom(fromD.toISOString().slice(0, 10))
    setTo(now.toISOString().slice(0, 10))
    setTodayOnly(false)
  }

  const openAnnul = (m: MovimientoEntry) => {
    setAnnulTarget(m)
    setAnnulMotivo('')
    setAnnulError(null)
  }

  const submitAnnul = () => {
    if (!annulTarget) return
    setAnnulError(null)
    const motivo = annulMotivo.trim()
    if (!motivo) {
      setAnnulError('Motivo de anulación es requerido.')
      return
    }
    const res = anularMovimiento({ movimientoId: annulTarget.id, motivo, actorName: 'Admin' })
    if (!res.ok) {
      setAnnulError('No se pudo anular la operación.')
      return
    }
    window.dispatchEvent(
      new CustomEvent('inventory:restore', {
        detail: { harvestBatchId: annulTarget.harvestBatchId, grams: Math.abs(annulTarget.grams) },
      }),
    )
    setAnnulTarget(null)
    setAnnulMotivo('')
  }

  return (
    <div className="min-h-0 w-full">
      <div className="flex flex-col gap-5 p-6 sm:p-7">
        <header className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">Movimientos</h1>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:bg-[#262626] dark:text-[#e5e5e5] dark:hover:bg-[#2e2e2e]"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </button>
        </header>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MetricCard title="Volumen total (g)" value={fmtGrams(totals.grams)} Icon={ListChecks} />
          <MetricCard title="Aportes totales ($)" value={fmtMoney(totals.aportes)} Icon={CalendarClock} />
          <MetricCard title="Transacciones" value={fmtInt(totals.tx)} Icon={Filter} />
        </section>

        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative w-full sm:max-w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar socio o DNI…"
                  className="h-10 w-full rounded-full border-0 bg-[#252525] pl-12 pr-4 text-[15px] text-white outline-none placeholder:text-white/35 focus:bg-[#2a2a2a]"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="h-10 rounded-full border-0 bg-[#252525] px-3 text-sm text-white/85 outline-none focus:bg-[#2a2a2a]"
                  aria-label="Desde"
                />
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="h-10 rounded-full border-0 bg-[#252525] px-3 text-sm text-white/85 outline-none focus:bg-[#2a2a2a]"
                  aria-label="Hasta"
                />
                <select
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value)}
                  className="h-10 rounded-full border-0 bg-[#252525] px-3 text-sm text-white/85 outline-none focus:bg-[#2a2a2a]"
                  aria-label="Lote"
                >
                  <option value="">Todos los lotes</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => applyPreset(2)}
                  className="h-10 rounded-full bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06]"
                >
                  2 días
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(30)}
                  className="h-10 rounded-full bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06]"
                >
                  30 días
                </button>
                <button
                  type="button"
                  onClick={() => applyYear(1)}
                  className="h-10 rounded-full bg-white/[0.04] px-4 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06]"
                >
                  1 año
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTodayOnly((v) => !v)}
                className={cn(
                  'h-10 rounded-full px-4 text-sm font-semibold transition',
                  todayOnly ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.06]',
                )}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => setOnlyLegal((v) => !v)}
                className={cn(
                  'h-10 rounded-full px-4 text-sm font-semibold transition',
                  onlyLegal ? 'bg-emerald-500/15 text-emerald-100' : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.06]',
                )}
              >
                {onlyLegal ? 'Solo Legal' : 'Ver Todo'}
              </button>
              <button
                type="button"
                onClick={() => setGroupByDay((v) => !v)}
                className={cn(
                  'h-10 rounded-full px-4 text-sm font-semibold transition',
                  groupByDay ? 'bg-white/[0.06] text-white' : 'bg-white/[0.04] text-white/70 hover:bg-white/[0.06]',
                )}
              >
                {groupByDay ? 'Agrupar: día' : 'Sin agrupar'}
              </button>
            </div>
          </div>

          <div className="min-h-0">
            <div className="grid grid-cols-[1.3fr_1.2fr_1.2fr_0.7fr_0.9fr_0.7fr] gap-3 px-4 py-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              <span>Fecha/Hora</span>
              <span>Socio</span>
              <span>Lote</span>
              <span>Cantidad</span>
              <span>Aporte</span>
              <span>Tipo</span>
            </div>

            <div className="max-h-[calc(100vh-26rem)] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2 py-6 text-sm text-white/55">Sin movimientos en este rango.</div>
              ) : groupByDay && grouped ? (
                <div className="space-y-4 px-2 pb-2">
                  {grouped.map((g) => (
                    <DayGroup key={g.day} day={g.day} items={g.items} onAnnul={openAnnul} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1 px-2 pb-2">
                  {filtered.map((m) => (
                    <MovimientoRow key={m.id} m={m} onAnnul={openAnnul} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      <AnimatePresence>
        {annulTarget ? (
          <motion.div
            className="fixed inset-0 z-[160] flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <button className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setAnnulTarget(null)} aria-label="Cerrar" />
            <motion.div
              initial={{ y: 12, scale: 0.98, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 10, scale: 0.98, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              className="relative z-10 w-full max-w-lg overflow-hidden rounded-[26px] border border-white/[0.12] bg-[#1c1c1c] shadow-[0_26px_90px_rgba(0,0,0,0.75)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between border-b border-white/[0.08] p-5">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Anulación auditada</p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Anular operación</h3>
                  <p className="mt-1 text-sm text-white/55">
                    {annulTarget.socioNombre} · {fmtGrams(Math.abs(annulTarget.grams))} · {annulTarget.harvestBatchLabel || annulTarget.harvestBatchId}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAnnulTarget(null)}
                  className="rounded-full p-2 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                  aria-label="Cerrar"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-3 p-5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">
                  Motivo de anulación (requerido)
                </label>
                <input
                  value={annulMotivo}
                  onChange={(e) => setAnnulMotivo(e.target.value)}
                  placeholder="Ej.: Error de carga / Paciente отказался…"
                  className="h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm text-white outline-none focus:border-rose-400/35 focus:ring-2 focus:ring-rose-400/15"
                />
                {annulError ? (
                  <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                    {annulError}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] p-5">
                <button
                  type="button"
                  onClick={() => setAnnulTarget(null)}
                  className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/[0.06]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={submitAnnul}
                  className="rounded-full bg-rose-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-rose-600"
                >
                  Anular operación
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function DayGroup({
  day,
  items,
  onAnnul,
}: {
  day: string
  items: MovimientoEntry[]
  onAnnul: (m: MovimientoEntry) => void
}) {
  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const appLocale = useSettingsStore((s) => s.locale)
  const anchor = anchorForZonedYmd(day, clubTimeZone)
  const label =
    anchor != null
      ? formatInClubTimeZone(anchor, clubTimeZone, appLocale, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : day
  const totals = items.reduce(
    (acc, m) => {
      acc.grams += m.grams
      acc.aportes += m.aporteArs
      return acc
    },
    { grams: 0, aportes: 0 },
  )
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 px-2 pb-2">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">{label}</p>
        <p className="text-xs font-semibold text-white/55 tabular-nums">
          {fmtGrams(Math.round(totals.grams * 10) / 10)} · {fmtMoney(Math.round(totals.aportes))}
        </p>
      </div>
      <div className="space-y-1">
        {items.map((m) => (
          <MovimientoRow key={m.id} m={m} onAnnul={onAnnul} />
        ))}
      </div>
    </div>
  )
}

function MovimientoRow({ m, onAnnul }: { m: MovimientoEntry; onAnnul: (m: MovimientoEntry) => void }) {
  const clubTimeZone = useSettingsStore((s) => s.timezone)
  const appLocale = useSettingsStore((s) => s.locale)
  const dateLabel = formatInClubTimeZone(m.createdAt, clubTimeZone, appLocale, {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  const openSocio = () => {
    window.dispatchEvent(new CustomEvent('socios:open', { detail: { socioId: m.socioId } }))
    window.dispatchEvent(new CustomEvent('dashboard:open-tab', { detail: { tab: 'socios' } }))
  }
  const openTrazabilidad = () => {
    window.dispatchEvent(new CustomEvent('traceability:open', { detail: { harvestBatchId: m.harvestBatchId } }))
  }
  const anulada = m.status === 'anulado'
  const reversal = m.status === 'reversion'
  return (
    <div
      className={cn(
        'grid grid-cols-[1.3fr_1.2fr_1.2fr_0.7fr_0.9fr_0.7fr] items-center gap-3 rounded-2xl px-3 py-3',
        'transition hover:bg-white/[0.04]',
        (anulada || reversal) && 'opacity-60',
      )}
      title={
        anulada && m.anulacion
          ? `Anulado por ${m.anulacion.by} · ${formatInClubTimeZone(m.anulacion.at, clubTimeZone, appLocale, { dateStyle: 'short', timeStyle: 'short' })} · ${m.anulacion.motivo}`
          : undefined
      }
    >
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold text-white/85 tabular-nums', anulada && 'line-through')}>
          {dateLabel}
        </p>
      </div>
      <button type="button" onClick={openSocio} className="min-w-0 text-left">
        <p className={cn('truncate text-sm font-semibold text-white hover:underline', anulada && 'line-through')}>
          {m.socioNombre}
        </p>
        <p className="truncate text-[12px] text-white/55">DNI {m.socioDni}</p>
      </button>
      <div className="min-w-0">
        <button
          type="button"
          onClick={openTrazabilidad}
          className="truncate text-left text-sm font-semibold text-white/85 hover:underline"
          title="Ver trazabilidad"
        >
          {m.harvestBatchLabel || m.harvestBatchId}
        </button>
        <p className="truncate text-[12px] text-white/55 tabular-nums">{m.harvestBatchId}</p>
      </div>
      <p className={cn('text-sm font-semibold text-white/85 tabular-nums', anulada && 'line-through')}>
        {fmtGrams(m.grams)}
      </p>
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold text-white/85 tabular-nums', anulada && 'line-through')}>
          {fmtMoney(m.aporteArs)}
        </p>
        <p className="truncate text-[12px] text-white/55">{m.metodoPago}</p>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <TipoBadge tipo={m.tipo} />
          {anulada ? (
            <span className="inline-flex items-center rounded-full bg-rose-500/15 px-2.5 py-1 text-[11px] font-semibold text-rose-200">
              Anulado
            </span>
          ) : reversal ? (
            <span className="inline-flex items-center rounded-full bg-sky-500/15 px-2.5 py-1 text-[11px] font-semibold text-sky-200">
              Reversión
            </span>
          ) : null}
        </div>
        {!anulada && !reversal ? (
          <button
            type="button"
            onClick={() => onAnnul(m)}
            className="rounded-full px-3 py-1 text-[11px] font-semibold text-rose-200 transition hover:bg-rose-500/10"
            title="Anular operación"
          >
            Anular
          </button>
        ) : null}
      </div>
    </div>
  )
}

