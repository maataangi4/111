import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CircleHelp,
  CreditCard,
  Plus,
  Users,
} from 'lucide-react'
import { cn } from '../../lib/cn'
import {
  useSociosStore,
  SOCIOS_CLUB_ACTIVE_CAP,
  type Socio,
  type SocioLegalStatus,
} from '../../store/useSociosStore'
import { SocioProfileModal } from '../socios/SocioProfileModal'
import { CreateSocioModal } from '../socios/CreateSocioModal'

/** Mismo verde que Cultivo / cabecera. */
const SOCIOS_ADD_FAB_GREEN = '#06663F'
const ADD_FAB_COLLAPSED_PX = 56
const ADD_FAB_EXPAND_WIDTH_PAD_PX = 10
const MONTHLY_GRAMS_LIMIT = 40
const FLOWERING_PLANTS_PER_MEMBER_MAX = 9

const MONTHLY_LIMIT_LEGAL_HELP =
  'Límite mensual por socio: 40g, de conformidad con la Ley 27.350 y la Resolución 782/2022 del Ministerio de Salud de la Nación.'

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
  const checkReprocannExpiry = useSociosStore((s) => s.checkReprocannExpiry)

  useEffect(() => {
    checkReprocannExpiry()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const [activeSocioId, setActiveSocioId] = useState<string | null>(null)
  const [addFabOpen, setAddFabOpen] = useState(false)
  const [addFabMotionOk, setAddFabMotionOk] = useState(true)
  const [createSocioOpen, setCreateSocioOpen] = useState(false)
  const [consumoHelpOpen, setConsumoHelpOpen] = useState(false)

  const addFabLabelText = useMemo(() => 'Nuevo paciente', [])
  const addFabMeasureRef = useRef<HTMLSpanElement>(null)
  const [addFabExpandedW, setAddFabExpandedW] = useState(ADD_FAB_COLLAPSED_PX)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setAddFabMotionOk(!mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useLayoutEffect(() => {
    const el = addFabMeasureRef.current
    if (!el) return
    const measure = () => {
      const w = Math.ceil(el.scrollWidth)
      setAddFabExpandedW(
        Math.min(920, Math.max(ADD_FAB_COLLAPSED_PX + 4, w + ADD_FAB_EXPAND_WIDTH_PAD_PX)),
      )
    }
    let alive = true
    const safeMeasure = () => {
      if (alive) measure()
    }
    safeMeasure()
    window.addEventListener('resize', safeMeasure)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const p = fonts?.ready
    if (p) void p.then(safeMeasure)
    return () => {
      alive = false
      window.removeEventListener('resize', safeMeasure)
    }
  }, [addFabLabelText])

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

  useEffect(() => {
    const onCreate = () => setCreateSocioOpen(true)
    window.addEventListener('socios:open-create', onCreate)
    return () => window.removeEventListener('socios:open-create', onCreate)
  }, [])

  return (
    <div className="min-h-0 w-full">
      <div className="flex flex-col gap-5 p-6 sm:p-7">
        <header className="flex flex-col gap-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-4xl font-semibold tracking-tight text-white">Socios</h1>
            </div>
            <div className="flex shrink-0 justify-end overflow-visible self-end sm:self-start">
              <button
                type="button"
                aria-label={addFabLabelText}
                title={addFabLabelText}
                aria-expanded={addFabOpen}
                onClick={() => setCreateSocioOpen(true)}
                onMouseEnter={() => setAddFabOpen(true)}
                onMouseLeave={() => setAddFabOpen(false)}
                onFocus={() => setAddFabOpen(true)}
                onBlur={() => setAddFabOpen(false)}
                className={cn(
                  'relative flex h-14 shrink-0 cursor-pointer items-center overflow-hidden rounded-full text-sm font-semibold text-white',
                  addFabOpen ? 'justify-end' : 'justify-center',
                  'hover:brightness-110 active:brightness-95',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#181818]',
                )}
                style={{
                  width: addFabOpen ? addFabExpandedW : ADD_FAB_COLLAPSED_PX,
                  backgroundColor: SOCIOS_ADD_FAB_GREEN,
                  transition: addFabMotionOk ? 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)' : undefined,
                }}
              >
                <span
                  ref={addFabMeasureRef}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 -z-10 flex w-max flex-row items-center gap-2 pl-5 pr-4 opacity-0"
                >
                  <span className="whitespace-nowrap">{addFabLabelText}</span>
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
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
                  <Plus className="h-6 w-6 shrink-0" strokeWidth={2.25} aria-hidden />
                </span>
              </button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <MetricCard
            icon={Users}
            title="Cupo Reprocann (límite ONG)"
            value={`${fmtInt(activeSocios.length)} / ${SOCIOS_CLUB_ACTIVE_CAP}`}
            sub="Activos"
            tone="emerald"
            progress={{ value: activeSocios.length, max: SOCIOS_CLUB_ACTIVE_CAP }}
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
          <div className="min-h-0 flex-1">
            <div className="grid grid-cols-[1.6fr_1fr_1.1fr_1.2fr_0.9fr] gap-3 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/45">
              <span>Socio</span>
              <span>Estado legal</span>
              <span>Código</span>
              <div
                className="relative flex min-w-0 items-center gap-1"
                onMouseEnter={() => setConsumoHelpOpen(true)}
                onMouseLeave={() => setConsumoHelpOpen(false)}
              >
                <span className="truncate">Consumo mensual</span>
                <span
                  className={cn(
                    'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/40',
                    consumoHelpOpen ? 'text-white/70' : '',
                  )}
                  aria-hidden
                >
                  <CircleHelp className="h-3.5 w-3.5" strokeWidth={2} />
                </span>
                {consumoHelpOpen ? (
                  <div className="absolute left-0 top-full z-30 w-[min(18rem,calc(100vw-2rem))] pt-1">
                    {/* Puente invisible para no perder el hover al bajar al texto. */}
                    <div className="absolute -top-2 left-0 right-0 h-3" aria-hidden />
                    <div
                      role="tooltip"
                      className={cn(
                        'relative rounded-xl border px-3 py-2.5 text-left shadow-lg',
                        'border-white/[0.12] bg-[#1e1e1e] text-[11px] font-normal normal-case leading-snug tracking-normal text-white/85',
                      )}
                    >
                      {MONTHLY_LIMIT_LEGAL_HELP}
                    </div>
                  </div>
                ) : null}
              </div>
              <span>Finanzas</span>
            </div>

            <div className="min-h-0 max-h-[calc(100vh-25rem)] overflow-y-auto">
              {socios.length === 0 ? (
                <div className="px-2 py-6 text-sm text-white/55">Sin socios.</div>
              ) : (
                socios.map((s) => (
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
                        {s.consentStatus !== 'aceptado' ? (
                          <p className="mt-0.5 inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                            {s.consentStatus === 'revocado' ? 'Consent. revocado' : 'Pendiente firma'}
                          </p>
                        ) : null}
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

      <CreateSocioModal
        open={createSocioOpen}
        onOpenChange={setCreateSocioOpen}
        onCreated={(id) => setActiveSocioId(id)}
      />
      <SocioProfileModal socio={activeSocio} open={Boolean(activeSocio)} onOpenChange={(v) => (!v ? setActiveSocioId(null) : undefined)} />
    </div>
  )
}

