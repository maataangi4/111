import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, BadgeCheck, CalendarClock, CreditCard, Search, Users } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useSociosStore, type Socio, type SocioLegalStatus } from '../../store/useSociosStore'
import { SocioProfileModal } from '../socios/SocioProfileModal'

const CLUB_LIMIT = 150
const MONTHLY_GRAMS_LIMIT = 40
const FLOWERING_PLANTS_PER_MEMBER_MAX = 9

function fmtInt(n: number) {
  try {
    return new Intl.NumberFormat('es-AR').format(n)
  } catch {
    return String(n)
  }
}

function fmtGrams(n: number) {
  const g = Math.round(n * 10) / 10
  return `${String(g).replace('.', ',')}g`
}

function badgeTone(status: SocioLegalStatus) {
  if (status === 'vigente')
    return 'bg-emerald-500/10 text-emerald-200'
  if (status === 'expira')
    return 'bg-amber-500/10 text-amber-200'
  return 'bg-rose-500/10 text-rose-200'
}

function MicroProgress({ value, max }: { value: number; max: number }) {
  const pct = max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100))
  const tone =
    pct >= 100 ? 'bg-rose-400/70' : pct >= 75 ? 'bg-amber-300/70' : 'bg-emerald-300/70'
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
        <div className={cn('h-full rounded-full', tone)} style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-white/60">
        <span className="tabular-nums">{fmtGrams(value)}</span>
        <span className="tabular-nums">{fmtGrams(max)}</span>
      </div>
    </div>
  )
}

function MetricCard({
  icon: Icon,
  title,
  value,
  sub,
  tone = 'emerald',
  progress,
}: {
  icon: typeof Users
  title: string
  value: string
  sub: string
  tone?: 'emerald' | 'blue' | 'amber'
  progress?: { value: number; max: number }
}) {
  const iconTone =
    tone === 'emerald'
      ? 'text-emerald-200 bg-emerald-400/10'
      : tone === 'amber'
        ? 'text-amber-200 bg-amber-400/10'
        : 'text-sky-200 bg-sky-400/10'
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[22px] p-4',
        'bg-white/[0.04]',
      )}
    >
      <div className="flex items-start gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl', iconTone)}>
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/55">{title}</p>
          <p className="mt-1 text-xl font-semibold tracking-tight text-white tabular-nums">{value}</p>
          <p className="mt-0.5 text-[12px] text-white/55">{sub}</p>
        </div>
      </div>
      {progress ? (
        <div className="mt-3">
          <MicroProgress value={progress.value} max={progress.max} />
        </div>
      ) : null}
    </div>
  )
}

export function SociosTab() {
  const socios = useSociosStore((s) => s.socios)
  const getSocioLegalStatus = useSociosStore((s) => s.getSocioLegalStatus)
  const getSocioInitials = useSociosStore((s) => s.getSocioInitials)
  const [query, setQuery] = useState('')
  const [activeSocioId, setActiveSocioId] = useState<string | null>(null)

  const now = new Date()
  const in30 = useMemo(() => new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), [now])

  const activeSocios = useMemo(() => socios.filter((x) => x.activo), [socios])
  const expiringSoonCount = useMemo(
    () =>
      socios.filter((x) => {
        const exp = x.reprocannExpiresOn ? new Date(x.reprocannExpiresOn) : null
        if (!exp) return false
        return exp >= now && exp <= in30
      }).length,
    [socios, now, in30],
  )

  const plantLimit = activeSocios.length * FLOWERING_PLANTS_PER_MEMBER_MAX

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return socios
    return socios.filter((s) => {
      const key = `${s.nombre} ${s.dni} ${s.reprocannCode}`.toLowerCase()
      return key.includes(q)
    })
  }, [socios, query])

  const activeSocio: Socio | null = useMemo(
    () => (activeSocioId ? socios.find((x) => x.id === activeSocioId) ?? null : null),
    [activeSocioId, socios],
  )

  useEffect(() => {
    const onOpen = (evt: Event) => {
      const id = (evt as CustomEvent<{ socioId?: string }>).detail?.socioId
      if (!id) return
      setActiveSocioId(id)
    }
    window.addEventListener('socios:open', onOpen as EventListener)
    return () => window.removeEventListener('socios:open', onOpen as EventListener)
  }, [])

  return (
    <div className="min-h-0 w-full">
      <div className="flex flex-col gap-5 p-6 sm:p-7">
        <header className="flex flex-col gap-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-4xl font-semibold tracking-tight text-white">Socios</h1>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MetricCard
            icon={Users}
            title="Cupo Reprocann (límite ONG)"
            value={`${fmtInt(activeSocios.length)} / ${CLUB_LIMIT}`}
            sub="Activos"
            tone="emerald"
            progress={{ value: activeSocios.length, max: CLUB_LIMIT }}
          />
          <MetricCard
            icon={BadgeCheck}
            title="Límite de plantas permitidas"
            value={`Autorizado: ${fmtInt(plantLimit)}`}
            sub="Plantas en floración (máx. 9 por socio activo)"
            tone="blue"
          />
          <MetricCard
            icon={CalendarClock}
            title="Vencimientos próximos"
            value={fmtInt(expiringSoonCount)}
            sub="Licencias Reprocann que vencen en los próximos 30 días"
            tone="amber"
          />
        </section>

        <section className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-2">
              <div className="relative w-full sm:w-[360px]">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar socio, DNI o código…"
                  className={cn(
                    'h-10 w-full rounded-full border-0 bg-[#252525] pl-12 pr-4 text-[15px] text-white outline-none',
                    'placeholder:text-white/35 focus:bg-[#2a2a2a]',
                  )}
                />
              </div>
            </div>
            <div className="text-xs text-white/45">
              Límite mensual por socio: <span className="font-semibold text-white/70">{MONTHLY_GRAMS_LIMIT}g</span>
            </div>
          </div>

          <div className="min-h-0 flex-1">
            <div className="grid grid-cols-[1.6fr_1fr_1.1fr_1.2fr_0.9fr] gap-3 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              <span>Socio</span>
              <span>Estado legal</span>
              <span>Código</span>
              <span>Consumo mensual</span>
              <span>Finanzas</span>
            </div>

            <div className="min-h-0 max-h-[calc(100vh-25rem)] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-2 py-6 text-sm text-white/55">Sin resultados.</div>
              ) : (
                filtered.map((s) => (
                  (() => {
                    const legalStatus = getSocioLegalStatus(s)
                    const initials = getSocioInitials(s)
                    return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSocioId(s.id)}
                    className={cn(
                      'grid w-full grid-cols-[1.6fr_1fr_1.1fr_1.2fr_0.9fr] items-center gap-3 px-2 py-3 text-left',
                      'transition hover:bg-white/[0.03]',
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/[0.06]">
                        <span className="text-xs font-semibold text-white/80">{initials}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-white">{s.nombre}</p>
                        <p className="truncate text-[12px] text-white/55">DNI {s.dni}</p>
                      </div>
                    </div>

                    <div className="min-w-0">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold', badgeTone(legalStatus))}>
                        {legalStatus === 'vigente'
                          ? 'Vigente'
                          : legalStatus === 'expira'
                            ? 'Expira <30 días'
                            : 'Vencido'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold tabular-nums text-white/85">{s.reprocannCode}</p>
                      <p className="truncate text-[11px] text-white/45">{s.reprocannExpiresOn ?? '—'}</p>
                    </div>

                    <div className="min-w-0">
                      <MicroProgress value={s.monthlyDispensedGrams} max={MONTHLY_GRAMS_LIMIT} />
                    </div>

                    <div className="min-w-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                          s.financialStatus === 'al_dia'
                            ? 'bg-emerald-500/10 text-emerald-200'
                            : 'bg-rose-500/10 text-rose-200',
                        )}
                      >
                        {s.financialStatus === 'al_dia' ? (
                          <CreditCard className="h-3.5 w-3.5" aria-hidden />
                        ) : (
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        )}
                        {s.financialStatus === 'al_dia' ? 'Cuota al día' : 'Deuda'}
                      </span>
                    </div>
                  </button>
                    )
                  })()
                ))
              )}
            </div>
          </div>
        </section>
      </div>

      <SocioProfileModal socio={activeSocio} open={Boolean(activeSocio)} onOpenChange={(v) => (!v ? setActiveSocioId(null) : undefined)} />
    </div>
  )
}

