import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import {
  Bell,
  CircleHelp,
  ChevronDown,
  FolderOpen,
  LayoutGrid,
  ListChecks,
  Menu,
  Moon,
  Plug,
  Search,
  Settings,
  Shield,
  SlidersHorizontal,
  Sprout,
  Sun,
  TestTube2,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'
import { Avatar, AvatarCircle, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useTranslation } from '../i18n/useTranslation'
import { C } from '../lib/crmUi'
import {
  bentoChromeLightBody,
  bentoChromeLightHeader,
  bentoPanelRadiusDark,
  bentoShell,
} from '../lib/bentoShell'
import { cn } from '../lib/cn'
import { shellWallpaperSrc } from '../lib/shellWallpapers'
import { SUBSCRIPTION_STUB } from '../lib/subscriptionStub'
import type { SettingsNavSection } from '../lib/settingsNavSection'
import { useLocationTopologyStore } from '../store/useLocationTopologyStore'
import { useSettingsStore } from '../store/useSettingsStore'
import { useCultivationStore } from '../store/useCultivationStore'
import { useCrmStore } from '../store/useCrmStore'
import { useSociosStore } from '../store/useSociosStore'
import { AgronomyTab } from './tabs/AgronomyTab'
import { CultivoErrorBoundary } from './CultivoErrorBoundary'
import { CultivoTab } from './tabs/CultivoTab'
import { DirectorDashboardTab } from './tabs/DirectorDashboardTab'
import { SettingsTab } from './tabs/SettingsTab'
import { SociosTab } from './tabs/SociosTab'
import { MovimientosTab } from './tabs/MovimientosTab'
import { StockTab } from './tabs/StockTab'
import { ToolsTab } from './tabs/ToolsTab'
import { IntegrationsTab } from './tabs/IntegrationsTab'
import { LinajeDelLoteModal } from './traceability/LinajeDelLoteModal'
import { GreenLuckLogoMark } from './branding/GreenLuckLogoMark'
import { PricingModal } from './PricingModal'
import { TeamMemberSlideOver, type TeamMemberId } from './TeamMemberSlideOver'
import { ProfileModal } from './ProfileModal'

export type DashboardTab =
  | 'dashboard'
  | 'genetics'
  | 'cultivo'
  | 'inventory'
  | 'socios'
  | 'movimientos'
  | 'tools'
  | 'integrations'
  | 'settings'

export { bentoShell }

/** Mismo círculo 56px y easing de ancho que el FAB «Anadir plantas» en `CultivoTab`. */
const COMPLIANCE_BADGE_COLLAPSED_PX = 56
const COMPLIANCE_BADGE_EXPAND_WIDTH_PAD_PX = 14
/** Si `scrollWidth` falla (p. ej. nodo dentro de `overflow-hidden`), no quedarse en ~56px. */
const COMPLIANCE_BADGE_EXPAND_FALLBACK_PX = 540
const COMPLIANCE_BADGE_LABEL =
  'Canspace: Architecture Compliant with Ley 27.350 & 27.669'

const navIds: { id: DashboardTab; icon: typeof LayoutGrid; labelKey: string }[] = [
  { id: 'dashboard', icon: LayoutGrid, labelKey: 'nav.dashboardSummary' },
  { id: 'genetics', icon: TestTube2, labelKey: 'nav.geneticsBank' },
  { id: 'cultivo', icon: Sprout, labelKey: 'nav.cultivo' },
  { id: 'inventory', icon: FolderOpen, labelKey: 'nav.inventory' },
  { id: 'socios', icon: Users, labelKey: 'nav.socios' },
  { id: 'movimientos', icon: ListChecks, labelKey: 'nav.movimientos' },
  { id: 'tools', icon: Wrench, labelKey: 'nav.tools' },
  { id: 'integrations', icon: Plug, labelKey: 'nav.integrations' },
  { id: 'settings', icon: Settings, labelKey: 'nav.settings' },
]

const mainNavIds = navIds.filter((item) => item.id !== 'settings')

const settingsNavSubItems: { section: SettingsNavSection; labelKey: string }[] = [
  { section: 'general', labelKey: 'nav.settingsSubGeneral' },
  { section: 'profile', labelKey: 'nav.settingsSubProfile' },
  { section: 'company', labelKey: 'nav.settingsSubCompany' },
  { section: 'subscription', labelKey: 'nav.settingsSubSubscription' },
]

type SearchHit = {
  key: string
  type: 'planta' | 'lote' | 'sala' | 'stock' | 'licencia' | 'documento' | 'comando' | 'socio'
  label: string
  sub: string
  tab: DashboardTab
  itemId?: string
  settingsSection?: SettingsNavSection
  command?: 'new_lot' | 'new_plant' | 'go_profile' | 'go_company'
}

/** Четыре круга 2×2 вместо LayoutGrid; stroke как у Lucide в сайдбаре (1.75). */
function DashboardFourCirclesNavIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="7" cy="7" r="3" />
      <circle cx="17" cy="7" r="3" />
      <circle cx="7" cy="17" r="3" />
      <circle cx="17" cy="17" r="3" />
    </svg>
  )
}

const SIDEBAR_RAIL_EASE = [0.22, 1, 0.36, 1] as const
const SIDEBAR_RAIL_MS = 0.42
/** Зелёный из wordmark SVG (листья / «Canspace»). */
const BRAND_GREEN = '#06663F'

/** Выпадашки верхней панели: матовое стекло (как SoftSelect). */
const topBarPopoverSurface = cn(
  'rounded-2xl border shadow-[0_16px_48px_rgba(0,0,0,0.1)] ring-1 ring-black/[0.05]',
  'border-gray-200/70 bg-white/78 backdrop-blur-xl backdrop-saturate-150',
  'dark:border-white/[0.08] dark:bg-[#1c1c1c]/72 dark:backdrop-blur-xl dark:backdrop-saturate-150',
  'dark:shadow-[0_20px_50px_rgba(0,0,0,0.55)] dark:ring-white/[0.06]',
)

function SidebarNav({
  tab,
  setTab,
  settingsSection,
  setSettingsSection,
  settingsNavOpen,
  setSettingsNavOpen,
  onNavigate,
  onTeamMemberClick,
  mobile,
  railExpanded = false,
}: {
  tab: DashboardTab
  setTab: (t: DashboardTab) => void
  settingsSection: SettingsNavSection
  setSettingsSection: (s: SettingsNavSection) => void
  settingsNavOpen: boolean
  setSettingsNavOpen: Dispatch<SetStateAction<boolean>>
  onNavigate?: () => void
  onTeamMemberClick?: (id: TeamMemberId) => void
  mobile?: boolean
  railExpanded?: boolean
}) {
  const { t } = useTranslation()
  const settingsActive = tab === 'settings'
  const rail = !mobile
  const expanded = mobile ? true : railExpanded

  const railMotion = {
    type: 'tween' as const,
    duration: SIDEBAR_RAIL_MS,
    ease: SIDEBAR_RAIL_EASE,
  }

  const railLabel = (child: ReactNode) =>
    rail ? (
      <motion.span
        initial={false}
        className="block min-w-0 overflow-hidden"
        animate={{
          maxWidth: expanded ? 220 : 0,
          opacity: expanded ? 1 : 0,
        }}
        transition={railMotion}
      >
        <span className="block whitespace-nowrap pr-1">{child}</span>
      </motion.span>
    ) : (
      child
    )

  const iconOrb = (active: boolean, content: ReactNode) => (
    <span
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-[background-color,color] duration-300 ease-out',
        active
          ? 'text-white'
          : 'bg-transparent text-slate-600 hover:bg-black/[0.04] dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]',
      )}
      style={active ? { backgroundColor: BRAND_GREEN } : undefined}
    >
      {content}
    </span>
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav
        className={cn(
          'flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden',
          mobile ? 'p-3 pt-1' : cn('pb-4 pt-2', expanded ? 'px-3' : 'px-1.5'),
        )}
      >
      {mainNavIds.map(({ id, icon: Icon, labelKey }) => {
        const active = tab === id
        const showLabel = expanded || !rail
        const iconNode =
          id === 'dashboard' ? (
            <DashboardFourCirclesNavIcon className="h-5 w-5" />
          ) : (
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          )

        return (
          <motion.button
            key={id}
            type="button"
            whileHover={mobile ? { x: 2 } : undefined}
            whileTap={{ scale: 0.97 }}
            transition={{ type: 'tween', duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => {
              setTab(id)
              onNavigate?.()
            }}
            className={cn(
              'flex w-full items-center py-2 text-left text-[15px] font-medium',
              rail
                ? expanded
                  ? 'justify-start px-1'
                  : 'justify-center px-0'
                : 'justify-start px-1',
              !active && (expanded || !rail) && 'gap-3',
            )}
          >
            {active ? (
              <span
                className={cn(
                  'box-border flex h-10 shrink-0 flex-row items-center overflow-hidden rounded-full',
                  rail && !expanded ? 'w-10 justify-center px-0' : 'w-full min-w-0 justify-start gap-2 px-1.5',
                )}
                style={{ backgroundColor: BRAND_GREEN }}
              >
                <span className="pointer-events-none flex h-10 w-10 shrink-0 grow-0 basis-10 items-center justify-center text-white">
                  {iconNode}
                </span>
                <span
                  className={cn(
                    'min-w-0 overflow-hidden whitespace-nowrap font-medium text-white',
                    showLabel ? 'max-w-[220px] opacity-100' : 'max-w-0 opacity-0',
                  )}
                  aria-hidden={!showLabel}
                >
                  <span className="block pr-1">{t(labelKey)}</span>
                </span>
              </span>
            ) : (
              <>
                {iconOrb(false, iconNode)}
                <motion.span
                  className="min-w-0 overflow-hidden text-gray-600 dark:text-[#a3a3a3]"
                  initial={false}
                  animate={{
                    maxWidth: showLabel ? 220 : 0,
                    opacity: showLabel ? 1 : 0,
                  }}
                  transition={railMotion}
                >
                  <span className="block whitespace-nowrap pr-1">{t(labelKey)}</span>
                </motion.span>
              </>
            )}
          </motion.button>
        )
      })}

      {/* Acordeón Configuración: disparador + submenú con borde izquierdo (referencia CRM) */}
      <div className="flex flex-col">
        <motion.button
          type="button"
          whileHover={mobile ? { x: 2 } : undefined}
          whileTap={{ scale: 0.98 }}
          aria-expanded={settingsNavOpen}
          onClick={() => {
            if (tab !== 'settings') {
              setTab('settings')
              setSettingsSection('general')
              setSettingsNavOpen(true)
            } else {
              setSettingsNavOpen((o) => !o)
            }
            onNavigate?.()
          }}
          className={cn(
            'flex w-full items-center py-2 text-left text-sm font-medium sm:py-3 sm:text-[15px]',
            rail
              ? expanded
                ? 'justify-between px-1'
                : 'justify-center px-0'
              : 'justify-between px-2 sm:px-3',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 items-center',
              expanded || !rail ? 'gap-3' : 'gap-0',
            )}
          >
            {iconOrb(
              settingsActive,
              <Settings className="h-5 w-5" strokeWidth={1.75} aria-hidden />,
            )}
            {rail ? (
              railLabel(
                <span className="text-slate-600 dark:text-[#a3a3a3]">{t('nav.settings')}</span>,
              )
            ) : (
              <span className="text-slate-600 dark:text-[#a3a3a3]">{t('nav.settings')}</span>
            )}
          </div>
          <motion.span
            className="flex shrink-0 items-center"
            initial={false}
            animate={{
              maxWidth: expanded || !rail ? 40 : 0,
              opacity: expanded || !rail ? 1 : 0,
            }}
            transition={railMotion}
          >
            <ChevronDown
              className={cn(
                'h-4 w-4 text-slate-500 transition-transform duration-300 dark:text-[#8c8c8c]',
                settingsNavOpen && 'rotate-180',
              )}
              strokeWidth={1.75}
              aria-hidden
            />
          </motion.span>
        </motion.button>

        {settingsNavOpen ? (
          <div
            className={cn(
              'mt-1 flex flex-col gap-1 border-slate-200 dark:border-[#3f3f3f]',
              rail
                ? expanded
                  ? 'ml-5 border-l pl-4'
                  : 'ml-0 border-l-0 pl-0'
                : 'ml-5 border-l pl-4',
            )}
          >
            {settingsNavSubItems.map(({ section, labelKey }) => {
              const subActive = settingsActive && settingsSection === section
              return (
                <button
                  key={section}
                  type="button"
                  onClick={() => {
                    setSettingsSection(section)
                    setTab('settings')
                    setSettingsNavOpen(true)
                    onNavigate?.()
                  }}
                  className={cn(
                    'flex w-full items-center py-1.5 text-left text-sm',
                    rail
                      ? expanded
                        ? 'justify-start gap-2 px-1'
                        : 'justify-center px-0'
                      : 'justify-start gap-2 px-1',
                  )}
                >
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center text-xs leading-none text-slate-400 dark:text-[#6b6b6b]"
                    aria-hidden
                  >
                    ·
                  </span>
                  {rail ? (
                    railLabel(
                      <span
                        className={cn(
                          'text-slate-600 dark:text-[#a3a3a3]',
                          subActive && 'font-medium text-gray-900 dark:text-[#f1f1f1]',
                        )}
                      >
                        {t(labelKey)}
                      </span>,
                    )
                  ) : (
                    <span
                      className={cn(
                        'text-slate-600 dark:text-[#a3a3a3]',
                        subActive && 'font-medium text-gray-900 dark:text-[#f1f1f1]',
                      )}
                    >
                      {t(labelKey)}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <h3
        className={cn(
          'mt-6 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8c8c8c]',
          rail && !expanded ? 'hidden' : 'block px-3',
        )}
      >
        Equipo
      </h3>
      <button
        type="button"
        onClick={() => onTeamMemberClick?.('eddie')}
        className={cn(
          'flex w-full items-center py-2 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:text-[#f1f1f1]',
          rail
            ? expanded
              ? 'justify-start gap-3 px-1'
              : 'justify-center px-0'
            : 'justify-start gap-3 px-1',
        )}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600 dark:bg-[#3f3f3f] dark:text-[#d4d4d4]">
            ED
          </div>
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border-2 border-white bg-green-500 dark:border-[#181818]" />
        </div>
        {rail ? railLabel(<span className="truncate">Eddie</span>) : <span className="truncate">Eddie</span>}
      </button>
      <button
        type="button"
        onClick={() => onTeamMemberClick?.('elian')}
        className={cn(
          'flex w-full items-center py-2 text-sm text-slate-600 transition-colors hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:text-[#f1f1f1]',
          rail
            ? expanded
              ? 'justify-start gap-3 px-1'
              : 'justify-center px-0'
            : 'justify-start gap-3 px-1',
        )}
      >
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-[10px] font-medium text-slate-600 dark:bg-[#3f3f3f] dark:text-[#d4d4d4]">
            EL
          </div>
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border-2 border-white bg-green-500 dark:border-[#181818]" />
        </div>
        {rail ? railLabel(<span className="truncate">Elian</span>) : <span className="truncate">Elian</span>}
      </button>
    </nav>
    </div>
  )
}

export function Dashboard() {
  const { t } = useTranslation()
  const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false)
  const [tab, setTab] = useState<DashboardTab>('dashboard')
  const [settingsNavOpen, setSettingsNavOpen] = useState(false)
  const [settingsSection, setSettingsSection] = useState<SettingsNavSection>('general')
  const prevTabRef = useRef<DashboardTab>(tab)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [myProfileModalOpen, setMyProfileModalOpen] = useState(false)
  const [linajeBatchId, setLinajeBatchId] = useState<string | null>(null)
  const [complianceOpen, setComplianceOpen] = useState(false)
  const [complianceBadgeOpen, setComplianceBadgeOpen] = useState(false)
  const complianceBadgeMeasureRef = useRef<HTMLSpanElement>(null)
  const [complianceBadgeExpandedW, setComplianceBadgeExpandedW] = useState(
    COMPLIANCE_BADGE_COLLAPSED_PX,
  )
  const [dashboardEditMode, setDashboardEditMode] = useState(false)
  const [pricingOpen, setPricingOpen] = useState(false)
  const [teamSlideMember, setTeamSlideMember] = useState<TeamMemberId | null>(null)
  const [sidebarRailExpanded, setSidebarRailExpanded] = useState(false)
  const board = useCultivationStore((s) => s.cultivoBoard)
  const topoRooms = useLocationTopologyStore((s) => (Array.isArray(s.rooms) ? s.rooms : []))
  const employees = useCrmStore((s) => (Array.isArray(s.employees) ? s.employees : []))
  const vaultDocuments = useCrmStore((s) =>
    Array.isArray(s.vaultDocuments) ? s.vaultDocuments : [],
  )
  const stockItems = useCrmStore((s) => (Array.isArray(s.stock) ? s.stock : []))
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const [systemPrefersDark, setSystemPrefersDark] = useState(false)
  const shellWallpaperId = useSettingsStore((s) => s.shellWallpaperId ?? null)
  const shellWallpaperUrl = shellWallpaperId ? shellWallpaperSrc(shellWallpaperId) : null
  const profileAvatarDataUrl = useSettingsStore((s) => s.profileAvatarDataUrl ?? null)
  const reduceMotion = useReducedMotion()

  const headerThemeIsDark = theme === 'dark' || (theme === 'system' && systemPrefersDark)

  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => setSystemPrefersDark(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [theme])

  const landingHydratedRef = useRef(false)
  useEffect(() => {
    const applyLanding = () => {
      if (landingHydratedRef.current) return
      landingHydratedRef.current = true
      const land = useSettingsStore.getState().defaultLandingTab
      if (land) setTab(land as DashboardTab)
    }
    if (useSettingsStore.persist.hasHydrated()) {
      applyLanding()
      return undefined
    }
    return useSettingsStore.persist.onFinishHydration(applyLanding)
  }, [])

  const measureComplianceBadgeExpanded = useCallback(() => {
    const el = complianceBadgeMeasureRef.current
    if (!el) return
    const sw = Math.ceil(el.scrollWidth)
    const rw = Math.ceil(el.getBoundingClientRect().width)
    let intrinsic = Math.max(sw, rw, 1)
    if (intrinsic < 120) intrinsic = COMPLIANCE_BADGE_EXPAND_FALLBACK_PX
    const cap =
      typeof window !== 'undefined' ? Math.max(120, window.innerWidth - 32) : 920
    setComplianceBadgeExpandedW(
      Math.min(
        cap,
        Math.max(
          COMPLIANCE_BADGE_COLLAPSED_PX + 4,
          intrinsic + COMPLIANCE_BADGE_EXPAND_WIDTH_PAD_PX,
        ),
      ),
    )
  }, [])

  useLayoutEffect(() => {
    let alive = true
    const safeMeasure = () => {
      if (alive) measureComplianceBadgeExpanded()
    }
    safeMeasure()
    const raf = requestAnimationFrame(safeMeasure)
    window.addEventListener('resize', safeMeasure)
    const fonts = typeof document !== 'undefined' ? document.fonts : undefined
    const p = fonts?.ready
    if (p) void p.then(safeMeasure)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', safeMeasure)
    }
  }, [measureComplianceBadgeExpanded])

  const notifications = useSociosStore((s) => s.notifications)
  const sociosSearchList = useSociosStore((s) => s.socios)
  const clearNotifications = useSociosStore((s) => s.clearNotifications)
  const restoreToHarvestBatch = useCultivationStore((s) => s.restoreToHarvestBatch)
  const popoverEase = [0.22, 1, 0.36, 1] as const
  const popoverTransition = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: popoverEase }

  const searchHits = useMemo<SearchHit[]>(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return []
    const hits: SearchHit[] = []
    const pushHit = (hit: SearchHit) => {
      if (hits.some((h) => h.key === hit.key)) return
      hits.push(hit)
    }
    const allCultivo = [
      ...(Array.isArray(board?.propagacion) ? board.propagacion : []),
      ...(Array.isArray(board?.vegetacion) ? board.vegetacion : []),
      ...(Array.isArray(board?.floracion) ? board.floracion : []),
      ...(Array.isArray(board?.cosecha) ? board.cosecha : []),
    ]
    for (const row of allCultivo) {
      const id = String(row.id ?? '').trim()
      const strain = String(row.strain ?? '').trim()
      const location = String(row.location ?? '').trim()
      const sourceBatch = String(row.sourceBatchId ?? '').trim()
      const stage = String(row.stage ?? '').trim()
      const bag = `${id} ${strain} ${location} ${sourceBatch} ${stage}`.toLowerCase()
      if (!bag.includes(q)) continue
      pushHit({
        key: `plant-${id}`,
        type: row.trackingType === 'planta' ? 'planta' : 'lote',
        label: id || strain || t('topBar.searchFallbackCultivo'),
        sub: `${strain || '—'} · ${location || '—'} · ${stage || '—'}`,
        tab: 'cultivo',
        itemId: id || undefined,
      })
    }

    for (const room of topoRooms) {
      const name = String(room.name ?? '').trim()
      if (!name) continue
      if (!name.toLowerCase().includes(q)) continue
      pushHit({
        key: `room-${room.id}`,
        type: 'sala',
        label: name,
        sub: t('topBar.searchTypeSala'),
        tab: 'settings',
        settingsSection: 'company',
      })
    }

    for (const item of stockItems) {
      const tipo = String(item.tipo ?? '').trim()
      const gid = String(item.geneticsEntryId ?? '').trim()
      const bag = `${tipo} ${gid}`.toLowerCase()
      if (!tipo || !bag.includes(q)) continue
      pushHit({
        key: `stock-${item.id}`,
        type: 'stock',
        label: tipo,
        sub: `Stock · ${gid || 'sin genética'}`,
        tab: 'inventory',
      })
    }

    for (const socio of sociosSearchList) {
      const nombre = String(socio.nombre ?? '').trim()
      const dni = String(socio.dni ?? '').trim()
      const code = String(socio.reprocannCode ?? '').trim()
      const bag = `${nombre} ${dni} ${code} socio paciente reprocann`.toLowerCase()
      if (!bag.includes(q)) continue
      pushHit({
        key: `socio-${socio.id}`,
        type: 'socio',
        label: nombre || `DNI ${dni || '—'}`,
        sub: `DNI ${dni || '—'} · Reprocann ${code || '—'}`,
        tab: 'socios',
        itemId: socio.id,
      })
    }

    for (const emp of employees) {
      const name = String(emp.name ?? '').trim()
      const dni = String(emp.dni ?? '').trim()
      const hasLicense = Boolean(emp.reprocan?.dataUrl)
      if (!hasLicense) continue
      const bag = `${name} ${dni} reprocan licencia`.toLowerCase()
      if (!bag.includes(q)) continue
      pushHit({
        key: `license-${emp.id}`,
        type: 'licencia',
        label: name || `DNI ${dni}`,
        sub: `Licencia / REPROCANN · ${dni || 'sin DNI'}`,
        tab: 'settings',
        settingsSection: 'company',
      })
    }

    for (const doc of vaultDocuments) {
      const title = String(doc.title ?? '').trim()
      const fileName = String(doc.fileName ?? '').trim()
      const mime = String(doc.mime ?? '').trim()
      const date = String(doc.uploadedAt ?? '').trim()
      const bag = `${title} ${fileName} ${mime} ${date} pdf documento`.toLowerCase()
      if (!title || !bag.includes(q)) continue
      pushHit({
        key: `doc-${doc.id}`,
        type: 'documento',
        label: title,
        sub: `${fileName || 'Documento'} · ${date || 'sin fecha'}`,
        tab: 'settings',
        settingsSection: 'company',
      })
    }

    const isQuickIntent =
      q.startsWith('nuevo') || q.startsWith('new') || q.startsWith('+') || q.startsWith('crear')
    if (isQuickIntent || q.includes('lote')) {
      pushHit({
        key: 'cmd-new-lot',
        type: 'comando',
        label: '+ Crear nuevo lote',
        sub: 'Comando rápido',
        tab: 'cultivo',
        command: 'new_lot',
      })
    }
    if (isQuickIntent || q.includes('planta')) {
      pushHit({
        key: 'cmd-new-plant',
        type: 'comando',
        label: '+ Añadir planta',
        sub: 'Comando rápido',
        tab: 'cultivo',
        command: 'new_plant',
      })
    }
    if (q.includes('perfil') || q.includes('profile')) {
      pushHit({
        key: 'cmd-go-profile',
        type: 'comando',
        label: 'Ir a ajustes de perfil',
        sub: 'Navegación rápida',
        tab: 'settings',
        settingsSection: 'profile',
        command: 'go_profile',
      })
    }
    if (q.includes('empresa') || q.includes('licencia') || q.includes('config')) {
      pushHit({
        key: 'cmd-go-company',
        type: 'comando',
        label: 'Ir a ajustes de empresa',
        sub: 'Navegación rápida',
        tab: 'settings',
        settingsSection: 'company',
        command: 'go_company',
      })
    }
    return hits.slice(0, 20)
  }, [board, employees, searchQuery, sociosSearchList, stockItems, t, topoRooms, vaultDocuments])

  const searchHitGroups = useMemo(() => {
    const groups: Array<{ key: string; title: string; items: SearchHit[] }> = []
    const defs: Array<{ key: string; title: string; types: SearchHit['type'][] }> = [
      { key: 'entities', title: 'Entidades', types: ['planta', 'lote', 'stock', 'socio'] },
      { key: 'locations', title: 'Ubicaciones', types: ['sala'] },
      { key: 'compliance', title: 'Compliance', types: ['licencia', 'documento'] },
      { key: 'commands', title: 'Comandos', types: ['comando'] },
    ]
    for (const def of defs) {
      const items = searchHits.filter((hit) => def.types.includes(hit.type))
      if (!items.length) continue
      groups.push({ key: def.key, title: def.title, items })
    }
    return groups
  }, [searchHits])

  useEffect(() => {
    if (tab === 'settings' && prevTabRef.current !== 'settings') {
      setSettingsNavOpen(true)
    }
    if (tab !== 'settings') {
      setSettingsNavOpen(false)
    }
    if (tab !== 'dashboard') {
      setDashboardEditMode(false)
    }
    prevTabRef.current = tab
  }, [tab])

  useEffect(() => {
    const onDocDown = (ev: PointerEvent) => {
      const el = ev.target as HTMLElement | null
      if (el?.closest('[data-topbar-floating]')) return
      setSearchOpen(false)
      setNotifOpen(false)
      setHelpOpen(false)
      setProfileOpen(false)
    }
    document.addEventListener('pointerdown', onDocDown, { capture: true })
    return () => document.removeEventListener('pointerdown', onDocDown, { capture: true })
  }, [])

  useEffect(() => {
    const onRestore = (evt: Event) => {
      const detail = (evt as CustomEvent<{ harvestBatchId?: string; grams?: number }>).detail
      const id = String(detail?.harvestBatchId ?? '').trim()
      const g = Number(detail?.grams ?? 0)
      if (!id || !Number.isFinite(g) || g <= 0) return
      restoreToHarvestBatch({ harvestBatchId: id, grams: g })
    }
    window.addEventListener('inventory:restore', onRestore as EventListener)
    return () => window.removeEventListener('inventory:restore', onRestore as EventListener)
  }, [restoreToHarvestBatch])

  useEffect(() => {
    const onOpen = (evt: Event) => {
      const id = (evt as CustomEvent<{ harvestBatchId?: string }>).detail?.harvestBatchId
      if (!id) return
      setLinajeBatchId(id)
    }
    window.addEventListener('traceability:open', onOpen as EventListener)
    return () => window.removeEventListener('traceability:open', onOpen as EventListener)
  }, [])

  /** Navegación global (p. ej. desde widgets del dashboard). */
  useEffect(() => {
    const onOpenTab = (evt: Event) => {
      const next = (evt as CustomEvent<{ tab?: DashboardTab }>).detail?.tab
      if (!next) return
      setTab(next)
      setSidebarMobileOpen(false)
    }
    window.addEventListener('dashboard:open-tab', onOpenTab as EventListener)
    return () => window.removeEventListener('dashboard:open-tab', onOpenTab as EventListener)
  }, [])

  const openCultivoCreate = (kind: 'lote' | 'planta') => {
    setTab('cultivo')
    window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent('cultivo:open-create', {
          detail: { kind },
        }),
      )
    }, 0)
  }

  const handleSearchHitClick = (hit: SearchHit) => {
    setSearchOpen(false)
    setSearchQuery('')
    if (hit.command === 'new_lot') {
      openCultivoCreate('lote')
      return
    }
    if (hit.command === 'new_plant') {
      openCultivoCreate('planta')
      return
    }
    setTab(hit.tab)
    if (hit.tab === 'settings') {
      setSettingsSection(hit.settingsSection ?? 'company')
      setSettingsNavOpen(true)
    }
    if (hit.tab === 'cultivo' && hit.itemId) {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('cultivo:focus-item', {
            detail: { itemId: hit.itemId },
          }),
        )
      }, 0)
    }
    if (hit.tab === 'socios' && hit.itemId) {
      window.setTimeout(() => {
        window.dispatchEvent(
          new CustomEvent('socios:open', {
            detail: { socioId: hit.itemId },
          }),
        )
      }, 0)
    }
  }

  const closeAllFloating = () => {
    setSearchOpen(false)
    setNotifOpen(false)
    setHelpOpen(false)
    setProfileOpen(false)
    setPricingOpen(false)
    setTeamSlideMember(null)
  }

  const openTeamMember = (id: TeamMemberId) => {
    setSearchOpen(false)
    setNotifOpen(false)
    setHelpOpen(false)
    setProfileOpen(false)
    setPricingOpen(false)
    setSidebarMobileOpen(false)
    setTeamSlideMember(id)
  }

  const sidebarHeader = (
    <div className="flex shrink-0 justify-end px-3 pb-2 pt-3 lg:hidden">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-0 bg-gradient-to-b from-white to-gray-50/90 text-gray-600 hover:to-gray-100/80 dark:from-[#2c2c2c] dark:to-[#232323] dark:text-[#f1f1f1] dark:hover:from-[#323232] dark:hover:to-[#282828]"
        onClick={() => setSidebarMobileOpen(false)}
        aria-label={t('dashboard.closeMenu')}
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  )

  const iconPill =
    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-gradient-to-b from-white to-gray-50/90 text-gray-600 transition hover:to-gray-100/80 dark:from-[#2c2c2c] dark:to-[#232323] dark:text-[#d4d4d4] dark:hover:from-[#323232] dark:hover:to-[#282828]'

  const headerActions = (
    <div className="flex shrink-0 items-center gap-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setNotifOpen((v) => !v)
            setHelpOpen(false)
            setProfileOpen(false)
            if (!notifOpen) clearNotifications()
          }}
          className={cn(iconPill, 'relative')}
          aria-label={t('topBar.notifications')}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={2} />
          {notifications.length > 0 ? (
            <span className="absolute right-2 top-2 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#181818]" />
          ) : null}
        </button>
        <AnimatePresence>
          {notifOpen ? (
            <motion.div
              key="topbar-notif"
              role="dialog"
              aria-label={t('topBar.notifications')}
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={popoverTransition}
              style={{ transformOrigin: 'top right' }}
              className={cn(
                'absolute right-0 top-[calc(100%+0.4rem)] z-[70] w-72 p-2',
                topBarPopoverSurface,
              )}
            >
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 dark:text-[#8c8c8c]">
                {t('topBar.notifications')}
              </p>
              {notifications.length === 0 ? (
                <p className="rounded-xl px-2 py-2 text-sm text-gray-600 dark:text-[#a3a3a3]">Sin novedades.</p>
              ) : (
                <div className="space-y-1">
                  {notifications.slice(0, 8).map((n) => (
                    <div
                      key={n.id}
                      className="rounded-xl px-2 py-2 text-sm text-gray-700 dark:text-[#f1f1f1]"
                    >
                      <p className="text-[12px] font-semibold text-gray-900 dark:text-[#f1f1f1]">{n.title}</p>
                      <p className="mt-0.5 text-[12px] text-gray-600 dark:text-[#a3a3a3]">{n.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="relative">
        <button
          type="button"
          onClick={() => {
            setHelpOpen((v) => !v)
            setNotifOpen(false)
            setProfileOpen(false)
          }}
          className={cn(iconPill)}
          aria-label={t('topBar.help')}
        >
          <CircleHelp className="h-[18px] w-[18px]" strokeWidth={2} />
        </button>
        <AnimatePresence>
          {helpOpen ? (
            <motion.div
              key="topbar-help"
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={popoverTransition}
              style={{ transformOrigin: 'top right' }}
              className={cn(
                'absolute right-0 top-[calc(100%+0.4rem)] z-[70] min-w-[200px] p-1.5',
                topBarPopoverSurface,
              )}
            >
              <button
                type="button"
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-100/80 dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]"
              >
                {t('topBar.supportChat')}
              </button>
              <button
                type="button"
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-100/80 dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]"
              >
                {t('topBar.faq')}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div
        className="relative flex h-10 w-[4.4rem] shrink-0 items-stretch rounded-full border-0 bg-gradient-to-b from-white to-gray-50/90 p-[3px] dark:from-[#252525] dark:to-[#1c1c1c]"
        role="group"
        aria-label={t('topBar.toggleTheme')}
      >
        <motion.span
          className="pointer-events-none absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-slate-100 dark:bg-[#181818]"
          initial={false}
          animate={{ left: headerThemeIsDark ? '4px' : 'calc(50% + 0px)' }}
          transition={{ type: 'tween', duration: 0.38, ease: [0.4, 0, 0.2, 1] }}
        />
        <button
          type="button"
          onClick={() => setTheme('dark')}
          className="relative z-10 flex flex-1 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:focus-visible:ring-white/20"
          aria-pressed={headerThemeIsDark}
          title={t('topBar.toggleTheme')}
        >
          <Moon
            className={cn(
              'h-[18px] w-[18px]',
              headerThemeIsDark ? 'text-gray-900 dark:text-[#f1f1f1]' : 'text-gray-400 dark:text-[#6b6b6b]',
            )}
            strokeWidth={2}
          />
        </button>
        <button
          type="button"
          onClick={() => setTheme('light')}
          className="relative z-10 flex flex-1 items-center justify-center rounded-full outline-none transition-colors focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:focus-visible:ring-white/20"
          aria-pressed={!headerThemeIsDark}
          title={t('topBar.toggleTheme')}
        >
          <Sun
            className={cn(
              'h-[18px] w-[18px]',
              !headerThemeIsDark ? 'text-gray-900 dark:text-[#f1f1f1]' : 'text-gray-400 dark:text-[#6b6b6b]',
            )}
            strokeWidth={2}
          />
        </button>
      </div>

      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => {
            setProfileOpen((v) => !v)
            setNotifOpen(false)
            setHelpOpen(false)
          }}
          className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 dark:focus-visible:ring-gray-500 dark:focus-visible:ring-offset-[#181818]"
          aria-label={t('topBar.profile')}
        >
          <Avatar className="h-10 w-10">
            <AvatarCircle>
              {profileAvatarDataUrl ? (
                <AvatarImage src={profileAvatarDataUrl} alt={t('topBar.profile')} />
              ) : (
                <AvatarFallback className="bg-gradient-to-br from-gray-400 via-gray-600 to-gray-800 text-sm font-bold text-white dark:from-[#3e3e3e] dark:via-[#303030] dark:to-[#222222]">
                  ED
                </AvatarFallback>
              )}
            </AvatarCircle>
          </Avatar>
        </button>
        <AnimatePresence>
          {profileOpen ? (
            <motion.div
              key="topbar-profile"
              initial={reduceMotion ? false : { opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
              transition={popoverTransition}
              style={{ transformOrigin: 'top right' }}
              className={cn(
                'absolute right-0 top-[calc(100%+0.45rem)] z-[70] min-w-[230px] p-1.5',
                topBarPopoverSurface,
              )}
            >
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  setMyProfileModalOpen(true)
                }}
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-100/80 dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]"
              >
                {t('topBar.myProfile')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  setSettingsSection('company')
                  setTab('settings')
                  setSettingsNavOpen(true)
                }}
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-100/80 dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]"
              >
                {t('topBar.companySettings')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setProfileOpen(false)
                  setSettingsSection('subscription')
                  setTab('settings')
                  setSettingsNavOpen(true)
                }}
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm hover:bg-gray-100/80 dark:text-[#f1f1f1] dark:hover:bg-white/[0.06]"
              >
                {t('topBar.subscriptionBilling')}
              </button>
              <button
                type="button"
                className="block w-full rounded-xl px-2.5 py-2 text-left text-sm text-red-600 hover:bg-red-50/90 dark:text-red-400 dark:hover:bg-red-950/40"
              >
                {t('topBar.logout')}
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => {
          setNotifOpen(false)
          setHelpOpen(false)
          setProfileOpen(false)
          setPricingOpen(true)
        }}
        className={cn(
          'grid h-10 min-h-10 shrink-0 place-items-center rounded-full border-0 p-0 px-4 text-center text-[15px] leading-tight antialiased transition active:scale-[0.98]',
          SUBSCRIPTION_STUB.isMaxPlan
            ? 'bg-white font-medium text-slate-700 hover:bg-slate-50 dark:bg-[#262626] dark:text-[#e5e5e5] dark:hover:bg-[#2e2e2e]'
            : 'font-semibold text-white hover:brightness-110 active:brightness-95',
        )}
        style={SUBSCRIPTION_STUB.isMaxPlan ? undefined : { backgroundColor: BRAND_GREEN }}
      >
        {SUBSCRIPTION_STUB.isMaxPlan ? t('topBar.subscriptionCta') : t('topBar.pricingCta')}
      </button>
    </div>
  )

  /** Ширина поля поиска в топбаре (логотип + действия остаются по краям). */
  const searchArea = (
    <div className="relative min-w-0 w-full">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={searchQuery}
        onFocus={() => setSearchOpen(true)}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          if (!searchOpen) setSearchOpen(true)
        }}
        placeholder={t('topBar.searchPlaceholderShort')}
        className="h-10 w-full rounded-full border-0 bg-gray-50 pl-12 pr-4 text-[15px] text-gray-900 outline-none ring-0 transition placeholder:text-gray-400 focus:bg-white focus:ring-0 focus:outline-none dark:bg-[#252525] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b] dark:focus:bg-[#2a2a2a]"
        aria-label={t('topBar.searchPlaceholderShort')}
      />
      <AnimatePresence>
        {searchOpen && searchQuery.trim() ? (
          <motion.div
            key="topbar-search"
            initial={reduceMotion ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -8 }}
            transition={popoverTransition}
            style={{ transformOrigin: 'top center' }}
            className={cn(
              'absolute left-0 right-0 top-[calc(100%+0.4rem)] z-[70] p-1.5',
              topBarPopoverSurface,
            )}
          >
            {searchHitGroups.length > 0 ? (
              searchHitGroups.map((group) => (
                <div key={group.key} className="pb-1.5">
                  <p className="px-2.5 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400 dark:text-[#7a7a7a]">
                    {group.title}
                  </p>
                  {group.items.map((hit) => (
                    <button
                      key={hit.key}
                      type="button"
                      onClick={() => handleSearchHitClick(hit)}
                      className="flex w-full items-start justify-between rounded-xl px-2.5 py-2 text-left hover:bg-gray-100/80 dark:hover:bg-white/[0.06]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-gray-900 dark:text-[#f1f1f1]">
                          {hit.label}
                        </span>
                        <span className="block truncate text-xs text-gray-500 dark:text-[#8c8c8c]">{hit.sub}</span>
                      </span>
                      <span className="ml-3 shrink-0 rounded-full border border-gray-200/90 bg-transparent px-3.5 py-1.5 text-[11px] font-semibold uppercase leading-none tracking-wide text-gray-600 dark:border-white/[0.14] dark:bg-transparent dark:text-[#a3a3a3]">
                        {hit.type === 'planta'
                          ? t('topBar.searchTypePlanta')
                          : hit.type === 'lote'
                            ? t('topBar.searchTypeLote')
                            : hit.type === 'sala'
                              ? t('topBar.searchTypeSala')
                              : hit.type === 'socio'
                                ? t('topBar.searchTypeSocio')
                                : hit.type}
                      </span>
                    </button>
                  ))}
                </div>
              ))
            ) : (
              <p className="px-2.5 py-2 text-xs text-gray-500 dark:text-[#8c8c8c]">{t('topBar.searchEmpty')}</p>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )

  const mainFullBleedContent =
    tab === 'cultivo' || tab === 'socios' || tab === 'movimientos' || tab === 'settings'

  return (
    <div className="relative min-h-screen w-full font-sans text-gray-900 dark:text-[#f1f1f1]">
      {shellWallpaperUrl ? (
        <>
          <div
            aria-hidden
            className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${shellWallpaperUrl})` }}
          />
          <div
            aria-hidden
            className={cn(
              'pointer-events-none fixed inset-0 z-0',
              theme === 'dark' ? 'bg-black/55' : 'bg-[#e3e3e3]/40',
            )}
          />
        </>
      ) : (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-0 bg-[#e3e3e3] dark:bg-[#333333]"
        />
      )}
      <div className="relative z-10 flex min-h-screen w-full items-start justify-center p-4 sm:p-8">
        <div
          className={cn(
            'relative flex min-h-[calc(100vh-4rem)] w-full max-w-[1600px] flex-col gap-5 overflow-visible rounded-none border-0 bg-transparent shadow-none',
          )}
        >
        <header
          className={cn(
            bentoChromeLightHeader,
            'flex h-18 shrink-0 items-center px-6 sm:px-8',
            'dark:border-0 dark:bg-[#181818] dark:shadow-none',
            'dark:rounded-[3rem] sm:dark:rounded-[3.5rem]',
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-4 sm:gap-5" data-topbar-floating>
            <button
              type="button"
              onClick={() => setSidebarMobileOpen(true)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-0 bg-gradient-to-b from-white to-gray-50/90 text-gray-700 transition hover:to-gray-100/80 lg:hidden dark:from-[#2c2c2c] dark:to-[#232323] dark:text-[#f1f1f1] dark:hover:from-[#323232] dark:hover:to-[#282828]"
              aria-label={t('dashboard.openMenu')}
            >
              <Menu className="h-6 w-6" strokeWidth={1.75} />
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('dashboard')
                closeAllFloating()
              }}
              className="-ml-6 hidden w-[15rem] shrink-0 cursor-pointer sm:block"
              aria-label={t('nav.dashboardSummary')}
            >
              <GreenLuckLogoMark className="max-h-[2.75rem] w-full sm:max-h-[3rem]" />
            </button>
            <div className="ml-auto mr-3 min-w-0 w-full max-w-[min(30rem,calc(100vw-14rem))] sm:max-w-[min(34rem,calc(100vw-16rem))]">
              {searchArea}
            </div>
          </div>
          <div
            className="ml-auto -mr-3 flex shrink-0 items-center gap-5 sm:gap-6"
            data-topbar-floating
          >
            {headerActions}
          </div>
        </header>

        <LayoutGroup id="dashboard-rail-main">
        <div className="flex min-h-0 w-full flex-1 lg:gap-5">
          {/* Desktop sidebar — отдельный блок под верхней панелью */}
          <motion.aside
            layout="position"
            className={cn(
              'hidden min-h-0 shrink-0 flex-col overflow-hidden lg:flex',
              bentoChromeLightBody,
              'dark:border-0 dark:bg-[#181818] dark:shadow-none',
              bentoPanelRadiusDark,
            )}
            initial={false}
            animate={{ width: sidebarRailExpanded ? 256 : 68 }}
            transition={{
              width: {
                type: 'tween',
                duration: SIDEBAR_RAIL_MS,
                ease: [...SIDEBAR_RAIL_EASE],
              },
              layout: {
                type: 'tween',
                duration: SIDEBAR_RAIL_MS,
                ease: [...SIDEBAR_RAIL_EASE],
              },
            }}
            onMouseEnter={() => setSidebarRailExpanded(true)}
            onMouseLeave={() => setSidebarRailExpanded(false)}
          >
            <SidebarNav
              tab={tab}
              setTab={setTab}
              settingsSection={settingsSection}
              setSettingsSection={setSettingsSection}
              settingsNavOpen={settingsNavOpen}
              setSettingsNavOpen={setSettingsNavOpen}
              onTeamMemberClick={openTeamMember}
              railExpanded={sidebarRailExpanded}
            />
          </motion.aside>

          <AnimatePresence>
            {sidebarMobileOpen ? (
              <>
                <motion.button
                  type="button"
                  aria-label={t('dashboard.closeMenu')}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className={cn('absolute inset-0 z-50 lg:hidden', C.sidebarOverlay)}
                  onClick={() => setSidebarMobileOpen(false)}
                />
                <motion.aside
                  role="navigation"
                  initial={{ x: '-100%' }}
                  animate={{ x: 0 }}
                  exit={{ x: '-100%' }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="absolute bottom-0 left-0 top-0 z-[60] flex min-h-0 w-[min(100%,16rem)] flex-col rounded-r-[3rem] border-y border-r border-gray-200/75 bg-[#f1f1f1] shadow-[0_12px_40px_rgba(15,23,42,0.12)] sm:rounded-r-[3.5rem] dark:border-0 dark:bg-[#181818] dark:shadow-2xl dark:rounded-r-[3rem] sm:dark:rounded-r-[3.5rem] lg:hidden"
                >
                  {sidebarHeader}
                  <SidebarNav
                    tab={tab}
                    setTab={setTab}
                    settingsSection={settingsSection}
                    setSettingsSection={setSettingsSection}
                    settingsNavOpen={settingsNavOpen}
                    setSettingsNavOpen={setSettingsNavOpen}
                    mobile
                    onNavigate={() => setSidebarMobileOpen(false)}
                    onTeamMemberClick={openTeamMember}
                  />
                </motion.aside>
              </>
            ) : null}
          </AnimatePresence>

          <motion.main
            layout="position"
            transition={{
              layout: {
                type: 'tween',
                duration: SIDEBAR_RAIL_MS,
                ease: [...SIDEBAR_RAIL_EASE],
              },
            }}
            className={cn(
              'flex min-h-0 min-w-0 flex-1 flex-col bg-transparent',
            )}
          >
          <div
            className={cn(
              'min-h-0 w-full flex-1',
              bentoChromeLightBody,
              'dark:border-0 dark:bg-[#181818] dark:shadow-none',
              tab === 'cultivo'
                ? 'scrollbar-modern overflow-x-visible overflow-y-auto dark:overflow-x-visible dark:overflow-y-auto'
                : tab === 'dashboard'
                  ? 'overflow-x-hidden overflow-y-auto dark:overflow-x-hidden dark:overflow-y-auto'
                  : mainFullBleedContent
                    ? 'scrollbar-modern overflow-x-hidden overflow-y-auto dark:overflow-x-hidden dark:overflow-y-auto'
                    : 'overflow-hidden dark:overflow-hidden',
              bentoPanelRadiusDark,
            )}
            onClick={() => closeAllFloating()}
          >
            <AnimatePresence mode="wait">
              {tab === 'dashboard' ? (
                <motion.div
                  key="dashboard"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className="min-h-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between px-8 pb-4 pt-8">
                    <div>
                      <h1 className="text-2xl font-semibold text-slate-900 dark:text-[#f1f1f1]">Dashboard</h1>
                    </div>
                    <button
                      type="button"
                      onClick={() => setDashboardEditMode((v) => !v)}
                      aria-label={t('dashboard.personalizeLayout')}
                      aria-pressed={dashboardEditMode}
                      className={cn(
                        'flex h-11 w-11 shrink-0 -translate-y-2.5 items-center justify-center rounded-full border-0 text-slate-700 transition-colors',
                        'bg-transparent hover:bg-slate-200/70 hover:text-slate-900',
                        'dark:text-[#d4d4d4] dark:hover:bg-white/[0.08] dark:hover:text-[#f1f1f1]',
                        dashboardEditMode && 'bg-emerald-100/90 dark:bg-emerald-950/40',
                      )}
                    >
                      <SlidersHorizontal className="h-5 w-5" strokeWidth={1.75} />
                    </button>
                  </div>
                  <div className="grid grid-flow-dense grid-cols-12 content-start items-start gap-3 px-8 pb-8">
                    <DirectorDashboardTab
                      editMode={dashboardEditMode}
                      onExitEditMode={() => setDashboardEditMode(false)}
                      railNarrow={sidebarRailExpanded}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={tab}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                  className={cn(
                    mainFullBleedContent
                      ? 'min-h-0 w-full flex-1 p-0'
                      : 'p-8 mx-auto w-full max-w-6xl',
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className={cn(
                      mainFullBleedContent ? 'min-h-0 h-full w-full bg-transparent' : bentoShell,
                    )}
                  >
                    {tab === 'genetics' && <AgronomyTab initialSub="banco" visibleSubs={['banco']} hideTabs />}
                    {tab === 'cultivo' && (
                      <CultivoErrorBoundary>
                        <CultivoTab />
                      </CultivoErrorBoundary>
                    )}
                    {tab === 'inventory' && <StockTab />}
                    {tab === 'socios' && <SociosTab />}
                    {tab === 'movimientos' && <MovimientosTab />}
                    {tab === 'tools' && <ToolsTab />}
                    {tab === 'integrations' && <IntegrationsTab />}
                    {tab === 'settings' && (
                      <SettingsTab
                        activeSection={settingsSection}
                        onSectionChange={setSettingsSection}
                      />
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          </motion.main>
        </div>
        </LayoutGroup>
      </div>
      <PricingModal
        open={pricingOpen}
        onOpenChange={setPricingOpen}
        isMaxPlanStub={SUBSCRIPTION_STUB.isMaxPlan}
      />
      <ProfileModal
        open={myProfileModalOpen}
        onOpenChange={setMyProfileModalOpen}
        onOpenSubscription={() => setPricingOpen(true)}
      />
      <TeamMemberSlideOver
        memberId={teamSlideMember}
        onClose={() => setTeamSlideMember(null)}
      />
      <LinajeDelLoteModal
        open={Boolean(linajeBatchId)}
        harvestBatchId={linajeBatchId}
        onOpenChange={(v) => (!v ? setLinajeBatchId(null) : undefined)}
      />

      {/* Compliance badge: bottom-right; ancho medido fuera del botón (overflow-hidden rompía scrollWidth). */}
      <div className="fixed bottom-4 right-4 z-[130] flex max-w-[calc(100vw-2rem)] items-center justify-end">
        <span
          ref={complianceBadgeMeasureRef}
          aria-hidden
          className="pointer-events-none fixed left-[-10000px] top-0 z-0 flex w-max flex-row items-center gap-2 whitespace-nowrap px-3 text-[12px] font-semibold text-white/85"
        >
          <span>{COMPLIANCE_BADGE_LABEL}</span>
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
            <Shield className="h-[18px] w-[18px] text-emerald-200" strokeWidth={2} aria-hidden />
          </span>
        </span>
        <button
          type="button"
          aria-label="Ver cumplimiento legal"
          title={COMPLIANCE_BADGE_LABEL}
          aria-expanded={complianceBadgeOpen}
          onClick={() => setComplianceOpen(true)}
          onMouseEnter={() => {
            measureComplianceBadgeExpanded()
            setComplianceBadgeOpen(true)
          }}
          onMouseLeave={() => setComplianceBadgeOpen(false)}
          onFocus={() => {
            measureComplianceBadgeExpanded()
            setComplianceBadgeOpen(true)
          }}
          onBlur={() => setComplianceBadgeOpen(false)}
          className={cn(
            'relative flex h-14 shrink-0 cursor-pointer items-center overflow-hidden rounded-full border border-white/[0.10]',
            'bg-black/55 text-left text-[12px] font-semibold text-white/85 shadow-[0_14px_50px_rgba(0,0,0,0.35)]',
            'backdrop-blur-xl backdrop-saturate-150 hover:bg-black/65 active:bg-black/60',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/35 focus-visible:ring-offset-2',
            'dark:focus-visible:ring-offset-[#181818]',
          )}
          style={{
            width: complianceBadgeOpen ? complianceBadgeExpandedW : COMPLIANCE_BADGE_COLLAPSED_PX,
            transition: reduceMotion ? undefined : 'width 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <span
            className={cn(
              'relative z-[1] flex h-full w-full min-w-0 flex-row items-center',
              complianceBadgeOpen ? 'justify-end gap-2 px-3' : 'justify-center',
            )}
          >
            <span
              className={cn(
                'min-w-0 overflow-hidden whitespace-nowrap transition-[max-width] duration-300 ease-out',
                complianceBadgeOpen ? 'max-w-[min(90vw,720px)]' : 'max-w-0',
              )}
              aria-hidden={!complianceBadgeOpen}
            >
              {COMPLIANCE_BADGE_LABEL}
            </span>
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/[0.08]">
              <Shield className="h-[18px] w-[18px] text-emerald-200" strokeWidth={2} aria-hidden />
            </span>
          </span>
        </button>
      </div>

      {/* Compliance help modal */}
      <AnimatePresence>
        {complianceOpen ? (
          <motion.div
            key="compliance-modal-root"
            className="fixed inset-0 z-[170] flex items-center justify-center p-4 sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <button
              type="button"
              className="absolute inset-0 bg-slate-900/35 backdrop-blur-[3px] dark:bg-black/50"
              aria-label={t('common.close')}
              onClick={() => setComplianceOpen(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              className={cn(
                'relative z-10 w-full max-w-[min(980px,95vw)] overflow-hidden rounded-[2.25rem] border border-slate-200/90 bg-white',
                'shadow-[0_26px_90px_-14px_rgba(15,23,42,0.28)]',
                'dark:border-[#3d3d3d] dark:bg-[#1c1c1c] dark:shadow-[0_26px_90px_-14px_rgba(0,0,0,0.55)]',
              )}
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              transition={{ type: 'spring', damping: 26, stiffness: 380 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setComplianceOpen(false)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" strokeWidth={1.75} />
              </button>

              <div className="flex max-h-[min(82vh,760px)] min-h-[560px] flex-col">
                <div className="border-b border-slate-200/80 bg-slate-50/70 px-6 py-5 dark:border-[#2f2f2f] dark:bg-[#161616]">
                  <div className="min-w-0 pr-10">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1]">
                      Términos de Servicio, Cumplimiento Normativo y Exención de Responsabilidad
                    </h2>
                  </div>
                </div>

                <div
                  className={cn(
                    'flex-1 overflow-auto bg-white px-6 py-6 md:px-8 dark:bg-[#1c1c1c]',
                    '[scrollbar-width:thin]',
                    '[scrollbar-color:rgba(148,163,184,0.55)_rgba(241,245,249,0.95)]',
                    'dark:[scrollbar-color:rgba(255,255,255,0.16)_rgba(28,28,28,0.98)]',
                    '[&::-webkit-scrollbar]:w-2',
                    '[&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-track]:bg-slate-100',
                    'dark:[&::-webkit-scrollbar-track]:bg-[#252525]',
                    '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/75',
                    'dark:[&::-webkit-scrollbar-thumb]:bg-white/14',
                    '[&::-webkit-scrollbar-thumb]:hover:bg-slate-400/85',
                    'dark:[&::-webkit-scrollbar-thumb]:hover:bg-white/22',
                  )}
                >
                  <div className="prose prose-slate max-w-none prose-p:text-sm prose-p:leading-6 dark:prose-invert dark:prose-p:text-[#cfcfcf]">
                    <p>
                      <strong>Términos de Servicio, Cumplimiento Normativo y Exención de Responsabilidad - Canspace</strong>
                    </p>
                    <p>
                      Bienvenido a Canspace, una plataforma de infraestructura informática tipo SaaS (Software as a Service).
                      Al utilizar nuestro software de gestión integral, la Asociación Civil, entidad o persona física autorizada
                      (en adelante, &quot;El Usuario&quot;) acepta y reconoce los presentes términos de cumplimiento legal y técnico.
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      1. Naturaleza del Servicio y Exclusión de Posesión
                    </h3>
                    <p>Canspace es exclusivamente un interfaz de software para la organización de datos.</p>
                    <p><strong>No Posesión:</strong> Canspace no entra en posesión, ni realiza almacenamiento, transporte, distribución o comercialización de sustancias psicoactivas o estupefacientes.</p>
                    <p><strong>Registros Digitales:</strong> Cualquier mención a gramajes, lotes o movimientos dentro del sistema es una entrada digital realizada por El Usuario y no confirma la existencia física o el movimiento de objetos materiales por parte de Canspace.</p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      2. Marco Legal: Genética y Trazabilidad (INASE)
                    </h3>
                    <p>
                      En cumplimiento con la Ley 20.247 y las normativas del Instituto Nacional de Semillas (INASE), El Usuario declara que:
                    </p>
                    <p>
                      Todo el material de propagación proviene de variedades registradas en el Registro Nacional de Cultivares (RNC) o se utiliza bajo proyectos de Fitomejoramiento e Investigación (I+D).
                    </p>
                    <p>
                      Canspace proporciona los módulos de trazabilidad, pero es responsabilidad exclusiva de El Usuario mantener la correspondencia física de estos datos ante auditorías.
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      3. Gestión de Pacientes y Límites (REPROCANN)
                    </h3>
                    <p>
                      Conforme a la Ley 27.350 y la Res. MSAL 1780/2025, El Usuario reconoce que:
                    </p>
                    <p>
                      El módulo &quot;Socios&quot; es para administrar pacientes con registro vigente.
                    </p>
                    <p>
                      <strong>Límites:</strong> La plataforma asiste en la visualización de los límites (150 pacientes por ONG, 1 a 9 plantas en floración).
                    </p>
                    <p>
                      <strong>Carácter Informativo:</strong> Las alertas de la plataforma son informativas. La responsabilidad de no dispensar a personas no habilitadas recae enteramente en El Usuario.
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      4. Naturaleza No Comercial y Ley 23.737
                    </h3>
                    <p>
                      Canspace es una herramienta para entidades &quot;Sin fines de lucro&quot;:
                    </p>
                    <p>
                      <strong>Prohibición de Venta:</strong> El sistema prohíbe terminología de compraventa. Todo ingreso debe ser bajo el concepto de &quot;Cuota Social&quot; o &quot;Aporte Solidario&quot;.
                    </p>
                    <p>
                      <strong>Responsabilidad Penal:</strong> El uso de herramientas de &quot;Ajuste de Stock&quot; o superación de límites de transporte (40g) por parte del administrador se realiza bajo su propia responsabilidad legal, eximiendo a Canspace de cualquier imputación vinculada a la Ley 23.737 (Ley de Drogas).
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      5. Control Sanitario y Mermas (ANMAT / Ley 27.669)
                    </h3>
                    <p>
                      El Usuario se compromete a registrar fielmente cualquier reducción de inventario (mermas técnicas, descartes por patógenos o muestras de laboratorio) mediante los módulos de &quot;Salidas Internas&quot;, generando los respaldos documentales pertinentes para las autoridades de aplicación.
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      6. Cláusulas de Protección Técnica y Legal de Canspace
                    </h3>
                    <p>
                      <strong>Uso Legítimo y Presunción de Buena Fe:</strong> El sistema se entrega &quot;AS IS&quot; (como está). Canspace no realiza monitoreo de datos en tiempo real ni es responsable si El Usuario utiliza el software para encubrir actos ilícitos.
                    </p>
                    <p>
                      <strong>Protección de Datos Personales (Ley 25.326):</strong> Canspace provee la seguridad técnica, pero El Usuario es el único responsable de obtener el consentimiento de los pacientes para el manejo de sus datos sensibles. Canspace no es el &quot;dueño&quot; de la base de datos, sino un proveedor de almacenamiento en la nube.
                    </p>
                    <p>
                      <strong>Autonomía de Algoritmos:</strong> Los algoritmos de control de límites son orientativos. El hecho de que el sistema permita técnicamente una operación (mediante confirmación manual del administrador) no implica aprobación ni incitación por parte de Canspace a violar las normas de salud pública.
                    </p>
                    <p>
                      <strong>Inmunidad a Cambios Legislativos:</strong> Debido a la alta dinámica legal en Argentina, Canspace no garantiza que el sistema cumpla en tiempo real con cada nueva resolución. El Usuario debe verificar que sus acciones coincidan con las normas vigentes.
                    </p>

                    <div className="not-prose my-10 border-t border-slate-200/80 dark:border-[#2f2f2f]" aria-hidden />

                    <h3 className="not-prose text-base font-semibold text-slate-900 dark:text-[#f1f1f1]">
                      Estatus de Cumplimiento Legal
                    </h3>
                    <p>
                      El uso de esta plataforma está sujeto a los Términos de Servicio aceptados previamente. El Usuario ratifica
                      su total responsabilidad civil y penal por los datos ingresados y las operaciones físicas realizadas,
                      eximiendo de toda responsabilidad a Canspace y sus desarrolladores.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>
    </div>
  )
}
