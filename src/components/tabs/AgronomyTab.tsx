import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  UserRound,
  BoxSelect,
  Camera,
  CirclePlus,
  Dna,
  Droplets,
  Flower2,
  Image as ImageIcon,
  ImagePlus,
  LayoutGrid,
  Leaf,
  Lightbulb,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  Scale,
  Skull,
  SlidersHorizontal,
  Sprout,
  Tag,
  Thermometer,
  Timer,
  Trash2,
  Wheat,
  X,
} from 'lucide-react'
import { createElement, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { recognizeBraceletDigitsFromSnapshot } from '../../lib/braceletOcr'
import {
  STRAIN_TAGS_AROMAS,
  STRAIN_TAGS_EFECTOS,
  STRAIN_TAGS_MEDICINAL,
  STRAIN_TAGS_TERPENOS,
  strainTagLabel,
} from '../../data/strainProfileTags'
import { getPotencyByStrainName } from '../../data/strainPotency'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import {
  MOTHER_ROOM_ID,
  type CultivationRoom,
  type CultivationTable,
  type GeneticsBankEntry,
  type HarvestBatch,
  type PlantCardItem,
  type PlantRecord,
  type PlantStatus,
  type PropagatorSeedling,
  type SeedlingOrigin,
  type TableStage,
} from '../../store/cultivationTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useCrmStore } from '../../store/useCrmStore'
import { useStrainsStore } from '../../store/useStrainsStore'
import { StrainProfileSlideOver } from '../agronomy/StrainProfileSlideOver'
import { StrainAutocomplete } from '../ui/StrainAutocomplete'
import { RowActionsMenu } from '../ui/RowActionsMenu'
import { SoftSelect } from '../ui/SoftSelect'

type CultivationSub =
  | 'banco'
  | 'mapa'
  | 'propagador'
  | 'registro'
  | 'aislamiento'
  | 'cosecha'

const SUB_TABS: { id: CultivationSub; labelKey: string; icon: typeof LayoutGrid }[] = [
  { id: 'propagador', labelKey: 'cultivation.tabPropagator', icon: CirclePlus },
  { id: 'banco', labelKey: 'cultivation.tabGeneticsBank', icon: Dna },
  { id: 'registro', labelKey: 'cultivation.tabRegistry', icon: Tag },
  { id: 'cosecha', labelKey: 'cultivation.tabHarvest', icon: Archive },
]

function SegmentedCultivation({
  active,
  tabs,
  onChange,
  t,
}: {
  active: CultivationSub
  tabs: { id: CultivationSub; labelKey: string; icon: typeof LayoutGrid }[]
  onChange: (v: CultivationSub) => void
  t: (k: string) => string
}) {
  return (
    <div className={cn('relative flex rounded-2xl p-1 shadow-inner', C.segmentedBg)}>
      {tabs.map(({ id, labelKey, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={cn(
            'relative flex flex-1 items-center justify-center gap-2 rounded-xl px-2 py-2.5 text-center text-[12px] font-medium transition sm:text-sm',
            active === id
              ? C.heading
              : cn(C.muted, 'hover:text-gray-800 dark:hover:text-green-400'),
          )}
        >
          {active === id && (
            <motion.span
              layoutId="cultivation-segment-pill"
              className={cn('absolute inset-0 rounded-xl shadow-sm', C.segmentedPill)}
              transition={{ type: 'spring', damping: 28, stiffness: 380 }}
            />
          )}
          <span className="relative z-[1] flex items-center justify-center gap-1.5 sm:gap-2">
            <Icon className="relative z-[1] h-4 w-4 shrink-0 opacity-80" strokeWidth={1.75} />
            <span className="hidden min-[420px]:inline">{t(labelKey)}</span>
          </span>
        </button>
      ))}
    </div>
  )
}

function statusPillClass(status: PlantStatus) {
  switch (status) {
    case 'activa':
      return 'bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-300 dark:ring-emerald-800'
    case 'cuarentena':
      return 'bg-amber-50 text-amber-900 ring-amber-200/80 dark:bg-amber-950/45 dark:text-amber-200 dark:ring-amber-800'
    case 'muerta':
      return 'bg-gray-100 text-gray-600 ring-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:ring-zinc-600'
    case 'cosechada':
      return 'bg-sky-50 text-sky-900 ring-sky-200/80 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800'
    default:
      return C.pill
  }
}

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onClose: () => void
}) {
  const { t } = useTranslation()
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center',
        C.modalBackdrop,
      )}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 24, opacity: 0.98 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 16, opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn('max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-2xl p-6', C.modalCard)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className={cn('text-lg font-semibold tracking-tight', C.heading)}>{title}</h2>
            {subtitle ? <p className={cn('mt-1 text-sm', C.muted)}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

function PropagatorRowMenu({
  t,
  onEdit,
  onDelete,
}: {
  t: (k: string) => string
  onEdit: () => void
  onDelete: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-xl p-2 transition text-gray-500 hover:bg-gray-100 hover:text-gray-800',
          'dark:text-green-600 dark:hover:bg-zinc-800 dark:hover:text-green-400',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('rowActions.menu')}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open ? (
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            'absolute right-0 top-full z-20 mt-1 min-w-[188px] overflow-hidden rounded-2xl border py-1 shadow-[var(--shadow-soft-lg)]',
            'border-gray-200/90 bg-white dark:border-zinc-700 dark:bg-zinc-900',
          )}
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-100 dark:text-zinc-100 dark:hover:bg-zinc-800"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
          >
            <Pencil className="h-4 w-4 opacity-70" />
            {t('common.edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/35"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4 opacity-70" />
            {t('common.delete')}
          </button>
        </motion.div>
      ) : null}
    </div>
  )
}

function SeedProfileExperience({
  seedling,
  macroImage,
  onClose,
  onPutBracelet,
}: {
  seedling: PropagatorSeedling
  macroImage: string | null
  onClose: () => void
  onPutBracelet: () => void
}) {
  const [imgErr, setImgErr] = useState(false)
  const progress = 15
  const ring = `conic-gradient(#0f4c3f 0 ${progress}%, #9fe3c6 ${progress}% ${Math.min(100, progress + 12)}%, #e5e7eb ${Math.min(100, progress + 12)}% 100%)`

  const glassCard =
    'rounded-3xl bg-white/72 p-5 shadow-[0_20px_50px_-28px_rgba(15,76,63,0.35),0_8px_20px_-14px_rgba(15,76,63,0.2)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_28px_58px_-28px_rgba(15,76,63,0.4),0_14px_26px_-16px_rgba(15,76,63,0.28)]'

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] bg-white"
    >
      <div className="h-full w-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-6">
        <div className="mb-4 flex items-start justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {seedling.strain || 'Seedling'}
              </h1>
              <span className="inline-flex items-center rounded-full bg-gray-200 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-white shadow-[0_12px_24px_-14px_rgba(31,41,55,0.5)]">
                ФАЗА ПРОПАГАЦИИ | БЕЗ НОМЕРА СЕМЕНИ
              </span>
            </div>

            <div className="relative isolate min-h-[460px] overflow-hidden rounded-[36px]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_45%_55%,rgba(16,185,129,0.28),rgba(16,185,129,0.06)_32%,rgba(255,255,255,0)_68%)]" />
              <div className="absolute inset-0 grid place-items-center p-6">
                {!imgErr && macroImage ? (
                  <img
                    src={macroImage}
                    alt={seedling.strain}
                    onError={() => setImgErr(true)}
                    className="h-full max-h-[620px] w-full max-w-[620px] object-contain drop-shadow-[0_28px_38px_rgba(15,76,63,0.24)]"
                  />
                ) : (
                  <div className="flex h-full w-full max-w-[620px] flex-col items-center justify-center rounded-[30px] bg-gradient-to-br from-emerald-50 to-white text-center shadow-sm">
                    <Sprout className="h-16 w-16 text-emerald-700/80" />
                    <p className="mt-3 text-base font-semibold text-gray-700">
                      Изображение семени недоступно
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Интерфейс сохранен без фото (fallback mode)
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 pb-8">
            <article className={glassCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                УКОРЕНЕНИЕ (ВИЗУАЛЬНО)
              </p>
              <div className="mt-4 flex items-center justify-center">
                <div
                  className="grid h-36 w-36 place-items-center rounded-full"
                  style={{ background: ring }}
                >
                  <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-center shadow-inner">
                    <span className="text-xs font-medium text-gray-500">maintain</span>
                    <span className="text-xl font-bold text-gray-800">{progress}%</span>
                  </div>
                </div>
              </div>
            </article>

            <article className={glassCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                РЕКОМЕНДУЕМЫЕ УСЛОВИЯ (ЦЕЛЬ)
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl bg-white/75 p-3">
                  <Thermometer className="mb-1 h-4 w-4 text-emerald-700" />
                  <p className="text-gray-500">Температура</p>
                  <p className="font-semibold text-gray-800">22-24 C</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-3">
                  <Droplets className="mb-1 h-4 w-4 text-emerald-700" />
                  <p className="text-gray-500">Влажность</p>
                  <p className="font-semibold text-gray-800">70-80%</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-3">
                  <Lightbulb className="mb-1 h-4 w-4 text-emerald-700" />
                  <p className="text-gray-500">Свет</p>
                  <p className="font-semibold text-gray-800">18/6, мягкий PPFD</p>
                </div>
                <div className="rounded-2xl bg-white/75 p-3">
                  <Leaf className="mb-1 h-4 w-4 text-emerald-700" />
                  <p className="text-gray-500">Полив</p>
                  <p className="font-semibold text-gray-800">Микро-порции</p>
                </div>
              </div>
            </article>

            <article className={glassCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                РЕКОМЕНДУЕМЫЕ УДОБРЕНИЯ (УКОРЕНЕНИЕ)
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
                <li><strong>Biobizz</strong> Root Juice + Bio-Heaven (низкая дозировка)</li>
                <li><strong>Canna</strong> Rhizotonic (старт корней)</li>
                <li><strong>General Hydroponics</strong> RapidStart (мягкий запуск)</li>
                <li><strong>Botanicare</strong> Cal-Mag Plus (при мягкой воде)</li>
              </ul>
            </article>

            <article className={glassCard}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                ВАШИ СОВЕТЫ ПО ВЫРАЩИВАНИЮ ({seedling.strain.toUpperCase()})
              </p>
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-gray-700">
                <li>Держите среду стабильно влажной, но не мокрой.</li>
                <li>Избегайте резких перепадов температуры ночью.</li>
                <li>Проверяйте тургор листьев 2 раза в день.</li>
                <li>После укрепления корней переведите на браслет и в вегетацию.</li>
              </ul>
            </article>

            <div className="pt-2">
              <button
                type="button"
                onClick={onPutBracelet}
                className="inline-flex items-center justify-center rounded-2xl bg-[#0F4C3F] px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_28px_-16px_rgba(15,76,63,0.8)] transition hover:bg-emerald-700"
              >
                Назначить браслет
              </button>
            </div>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

function mapTagIdsToLabels(
  ids: string[],
  source: { id: string; es: string; ru: string }[],
  locale: 'es' | 'ru',
) {
  const dict = new Map(source.map((x) => [x.id, strainTagLabel(x, locale)]))
  return ids.map((id) => dict.get(id) ?? id).filter(Boolean)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function potencyColor(value: number): string {
  const v = Math.max(0, value)
  let hue = 120
  if (v <= 10) hue = 120
  else if (v <= 15) hue = lerp(120, 60, (v - 10) / 5)
  else if (v <= 20) hue = lerp(60, 35, (v - 15) / 5)
  else if (v <= 30) hue = lerp(35, 0, (v - 20) / 10)
  else hue = 0
  return `hsl(${hue} 85% 48%)`
}

function StrainProfileView({
  item,
  locale,
  onClose,
}: {
  item: GeneticsBankEntry
  locale: 'es' | 'ru'
  onClose: () => void
}) {
  const aromas = mapTagIdsToLabels(item.aromas ?? [], STRAIN_TAGS_AROMAS, locale)
  const efectos = mapTagIdsToLabels(
    item.efectosPositivos ?? [],
    STRAIN_TAGS_EFECTOS,
    locale,
  )
  const medicinal = mapTagIdsToLabels(
    item.medicinal ?? [],
    STRAIN_TAGS_MEDICINAL,
    locale,
  )
  const terpenos = mapTagIdsToLabels(item.terpenos ?? [], STRAIN_TAGS_TERPENOS, locale)

  const card =
    'rounded-3xl bg-white/72 p-5 shadow-[0_20px_50px_-28px_rgba(15,76,63,0.35),0_8px_20px_-14px_rgba(15,76,63,0.2)] backdrop-blur-md'

  const chip =
    'inline-flex items-center rounded-full bg-emerald-100/95 px-2.5 py-1 text-xs font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-200'
  const rawDescription = item.notes || item.summary || '—'
  const potency = getPotencyByStrainName(item.name)
  const thcPercent = potency?.thc ?? 0
  const cbdPercent = potency?.cbd ?? 0
  const thcLabel = potency?.thcLabel ?? '—'
  const cbdLabel = potency?.cbdLabel ?? '—'
  const thcBarColor = potencyColor(thcPercent)
  const cbdBarColor = potencyColor(cbdPercent)

  const copy =
    locale === 'ru'
      ? {
          header: '🔹 Base Global / Профиль сорта',
          sectionGeneral: 'Общее',
          fieldType: 'Тип',
          fieldBreeder: 'Бридер',
          fieldRatio: 'Соотношение',
          sectionEffects: 'Эффекты',
          sectionAromas: 'Вкусы / ароматы',
          sectionMedTerp: 'Медицинские и терпеновые заметки',
          fieldMedical: 'Медицинские',
          fieldTerpenes: 'Терпены',
          fieldDescription: 'Описание',
          sliderTHC: 'THC',
          sliderCBD: 'CBD',
        }
      : {
          header: '🔹 Base Global / Perfil de variedad',
          sectionGeneral: 'General',
          fieldType: 'Tipo',
          fieldBreeder: 'Banco / criador',
          fieldRatio: 'Proporción',
          sectionEffects: 'Efectos',
          sectionAromas: 'Sabores / aromas',
          sectionMedTerp: 'Notas medicinales y terpenos',
          fieldMedical: 'Medicinal',
          fieldTerpenes: 'Terpenos',
          fieldDescription: 'Descripción',
          sliderTHC: 'THC',
          sliderCBD: 'CBD',
        }

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] overflow-hidden bg-white"
    >
      <div className="mx-auto h-full w-full max-w-[1320px] overflow-y-auto overscroll-contain px-6 py-6 sm:px-8 lg:px-12">
        <div className="mb-6 flex items-start justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid min-h-[calc(100vh-96px)] gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <section className="space-y-6">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
                {item.name}
              </h1>
              <span className="inline-flex items-center rounded-full bg-sky-100 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-800">
                {copy.header}
              </span>
            </div>

            <div className="relative isolate rounded-[28px] bg-white p-3 shadow-sm">
              <div className="flex h-[min(68vh,760px)] w-full items-center justify-center">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain object-center"
                  />
                ) : (
                  <div className="flex h-full w-full max-w-[620px] items-center justify-center rounded-[30px] bg-gradient-to-br from-emerald-50 to-white shadow-sm">
                    <ImagePlus className="h-16 w-16 text-emerald-700/80" />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-4 pb-8">
            <article className={card}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                {copy.sectionGeneral}
              </p>
              <div className="mt-3 grid gap-2 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">{copy.fieldType}:</span>{' '}
                  {item.lineage || item.summary || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">{copy.fieldBreeder}:</span>{' '}
                  {item.breeder || '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">{copy.fieldRatio}:</span>{' '}
                  {item.geneticRatio || '—'}
                </p>
                <div className="mt-2 space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                      <span>{copy.sliderTHC}</span>
                      <span className="font-medium">{thcLabel}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-200/90">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, thcPercent))}%`,
                          background: thcBarColor,
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between text-sm text-gray-700">
                      <span>{copy.sliderCBD}</span>
                      <span className="font-medium">{cbdLabel}</span>
                    </div>
                    <div className="h-3 rounded-full bg-gray-200/90">
                      <div
                        className="h-3 rounded-full"
                        style={{
                          width: `${Math.max(0, Math.min(100, cbdPercent))}%`,
                          background: cbdBarColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </article>

            <article className={card}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                {copy.sectionEffects}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(efectos.length ? efectos : ['—']).map((x) => (
                  <span key={x} className={chip}>
                    {x}
                  </span>
                ))}
              </div>
            </article>

            <article className={card}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                {copy.sectionAromas}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(aromas.length ? aromas : ['—']).map((x) => (
                  <span key={x} className={chip}>
                    {x}
                  </span>
                ))}
              </div>
            </article>

            <article className={card}>
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-gray-500">
                {copy.sectionMedTerp}
              </p>
              <div className="mt-3 space-y-3 text-sm text-gray-700">
                <p>
                  <span className="font-semibold text-gray-900">{copy.fieldMedical}:</span>{' '}
                  {medicinal.length ? medicinal.join(', ') : '—'}
                </p>
                <p>
                  <span className="font-semibold text-gray-900">{copy.fieldTerpenes}:</span>{' '}
                  {terpenos.length ? terpenos.join(', ') : '—'}
                </p>
                <p className="leading-relaxed">
                  <span className="font-semibold text-gray-900">{copy.fieldDescription}:</span>{' '}
                  {rawDescription}
                </p>
              </div>
            </article>
          </section>
        </div>
      </div>
    </motion.div>
  )
}

function PlantRowMenu({
  plant,
  t,
  onDead,
  onQuarantine,
  onActivate,
  onMove,
  onUnassign,
  onSetMotherStock,
  onDelete,
  hideMove,
}: {
  plant: PlantRecord
  t: (k: string) => string
  onDead: () => void
  onQuarantine: () => void
  onActivate: () => void
  onMove: () => void
  onUnassign: () => void
  /** Marcar / desmarcar planta madre (Zala Madre). */
  onSetMotherStock?: (asMother: boolean) => void
  /** Eliminar la planta del registro (incluye cosechadas). */
  onDelete: () => void
  /** En mapa: el traslado solo desde el registro. */
  hideMove?: boolean
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const canAct = plant.status === 'activa' || plant.status === 'cuarentena'
  const canQuarantine = plant.status === 'activa'
  const canActivate = plant.status === 'cuarentena'
  // 允许对“已收割/死亡”也显示菜单（至少能删除）
  const canMove = plant.status !== 'cosechada' && plant.status !== 'muerta'
  const canUnassign =
    Boolean(plant.roomId && plant.tableId) &&
    plant.status !== 'cosechada' &&
    plant.status !== 'muerta'
  const canMarkMother =
    Boolean(onSetMotherStock) && plant.status === 'activa' && !plant.isMotherStock
  const canUnmarkMother =
    Boolean(onSetMotherStock) &&
    plant.isMotherStock &&
    (plant.status === 'activa' || plant.status === 'cuarentena')

  // 对已收割/死亡：仍然显示三点菜单（删除）

  return (
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-xl p-2 transition text-gray-500 hover:bg-gray-100 hover:text-gray-800',
          'dark:text-green-600 dark:hover:bg-zinc-800 dark:hover:text-green-400',
        )}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('rowActions.menu')}
      >
        <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
      </button>
      {open && (
        <motion.div
          role="menu"
          initial={{ opacity: 0, y: -4, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          className={cn(
            'absolute right-0 top-full z-20 mt-1 min-w-[188px] overflow-hidden rounded-2xl border py-1 shadow-[var(--shadow-soft-lg)]',
            'border-gray-200/90 bg-white dark:border-zinc-700 dark:bg-zinc-900',
          )}
        >
          {canQuarantine ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-amber-800 hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950/40"
              onClick={() => {
                setOpen(false)
                onQuarantine()
              }}
            >
              <Leaf className="h-4 w-4 opacity-70" />
              {t('cultivation.actionQuarantine')}
            </button>
          ) : null}
          {canActivate ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-emerald-800 hover:bg-emerald-50 dark:text-emerald-200 dark:hover:bg-emerald-950/40"
              onClick={() => {
                setOpen(false)
                onActivate()
              }}
            >
              <Leaf className="h-4 w-4 opacity-70" />
              {t('cultivation.actionActivate')}
            </button>
          ) : null}
          {canMarkMother ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-fuchsia-800 hover:bg-fuchsia-50 dark:text-fuchsia-200 dark:hover:bg-fuchsia-950/40"
              onClick={() => {
                setOpen(false)
                onSetMotherStock!(true)
              }}
            >
              <UserRound className="h-4 w-4 opacity-80" />
              {t('cultivation.actionMarkMother')}
            </button>
          ) : null}
          {canUnmarkMother ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-fuchsia-800 hover:bg-fuchsia-50 dark:text-fuchsia-200 dark:hover:bg-fuchsia-950/40"
              onClick={() => {
                setOpen(false)
                onSetMotherStock!(false)
              }}
            >
              <UserRound className="h-4 w-4 opacity-80" />
              {t('cultivation.actionUnmarkMother')}
            </button>
          ) : null}
          {canMove && !hideMove ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-green-400 dark:hover:bg-zinc-800"
              onClick={() => {
                setOpen(false)
                onMove()
              }}
            >
              <LayoutGrid className="h-4 w-4 opacity-70" />
              {t('cultivation.actionMove')}
            </button>
          ) : null}
          {canUnassign ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-green-400 dark:hover:bg-zinc-800"
              onClick={() => {
                setOpen(false)
                onUnassign()
              }}
            >
              <X className="h-4 w-4 opacity-70" />
              {t('cultivation.actionUnassignFromRoom')}
            </button>
          ) : null}
          {canAct ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
              onClick={() => {
                setOpen(false)
                onDead()
              }}
            >
              <Skull className="h-4 w-4 opacity-80" />
              {t('cultivation.actionDead')}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/35"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4 opacity-70" />
            {t('cultivation.actionDeletePlant')}
          </button>
        </motion.div>
      )}
    </div>
  )
}

/** Mesa 1 siempre a la izquierda, Mesa 2 a la derecha (orden estable en la cuadrícula). */
function tableDisplayOrder(tb: CultivationTable): number {
  const m = tb.label.match(/(\d+)/)
  if (m) return parseInt(m[1]!, 10)
  const idM = tb.id.match(/-t(\d+)$/i)
  if (idM) return parseInt(idM[1]!, 10)
  return 999
}

function sortRoomTables(tbs: CultivationTable[]): CultivationTable[] {
  return [...tbs].sort((a, b) => {
    const oa = tableDisplayOrder(a)
    const ob = tableDisplayOrder(b)
    if (oa !== ob) return oa - ob
    return a.id.localeCompare(b.id)
  })
}

function normStrainKey(s: string) {
  return s.trim().toLowerCase()
}

function strainImageFromBank(
  bank: { name: string; imageUrl: string }[],
  strain: string,
): string | null {
  const k = normStrainKey(strain)
  const g = bank.find((b) => normStrainKey(b.name) === k)
  const u = g?.imageUrl?.trim()
  return u || null
}

function sortSeedlingsNewestFirst(a: PropagatorSeedling, b: PropagatorSeedling): number {
  const pa = Date.parse(a.addedAt)
  const pb = Date.parse(b.addedAt)
  const na = Number.isNaN(pa) ? 0 : pa
  const nb = Number.isNaN(pb) ? 0 : pb
  if (nb !== na) return nb - na
  return b.id.localeCompare(a.id)
}

function sortPlantsNewestFirst(a: PlantRecord, b: PlantRecord): number {
  const pa = a.registeredAt
    ? Date.parse(a.registeredAt)
    : Date.parse(`${a.plantedDate}T12:00:00.000Z`)
  const pb = b.registeredAt
    ? Date.parse(b.registeredAt)
    : Date.parse(`${b.plantedDate}T12:00:00.000Z`)
  const na = Number.isNaN(pa) ? 0 : pa
  const nb = Number.isNaN(pb) ? 0 : pb
  if (nb !== na) return nb - na
  return b.id.localeCompare(a.id, undefined, { numeric: true })
}

function formatLocation(
  plant: PlantRecord,
  rooms: { id: string; label: string }[],
  tables: { id: string; label: string; roomId: string }[],
  t: (k: string) => string,
) {
  if (!plant.roomId || !plant.tableId) {
    if (plant.status === 'cosechada') return t('cultivation.locDrying')
    if (plant.status === 'muerta') return '—'
    if (plant.status === 'cuarentena') return t('cultivation.locOffTable')
    return '—'
  }
  const room = rooms.find((r) => r.id === plant.roomId)
  const table = tables.find((x) => x.id === plant.tableId)
  if (!room || !table) return '—'
  if (room.id === 'r-quarantine') return room.label
  return `${room.label} — ${table.label}`
}

function stageOptions(vegetationOnly: boolean): TableStage[] {
  if (vegetationOnly) return ['empty', 'vegetacion']
  return ['empty', 'vegetacion', 'floracion']
}

function stageSelectLabel(t: (k: string) => string, st: TableStage) {
  if (st === 'empty') return t('cultivation.stageEmpty')
  if (st === 'vegetacion') return t('cultivation.stageVeg')
  return t('cultivation.stageFlor')
}

/** Статус строки реестра по полям карточки канбана (baja / cuarentena). */
function plantStatusFromKanbanCard(item: PlantCardItem): PlantStatus {
  if (item.cultivoUnitStatus === 'baja') return 'muerta'
  if (item.cultivoUnitStatus === 'quarantine') return 'cuarentena'
  return 'activa'
}

function tableStageIcon(st: TableStage) {
  if (st === 'empty') return BoxSelect
  if (st === 'vegetacion') return Leaf
  return Flower2
}

function StageGlyph({
  stage,
  className,
  strokeWidth = 1.75,
}: {
  stage: TableStage
  className?: string
  strokeWidth?: number
}) {
  return createElement(tableStageIcon(stage), { className, strokeWidth })
}

function tableIconAccentClass(st: TableStage) {
  if (st === 'vegetacion') return 'text-emerald-600 dark:text-emerald-400'
  if (st === 'floracion') return 'text-indigo-600 dark:text-indigo-300'
  return 'text-gray-400 dark:text-zinc-500'
}

type MapListRow =
  | { kind: 'plant'; room: CultivationRoom; table: CultivationTable; plant: PlantRecord }
  | { kind: 'vacant'; room: CultivationRoom; table: CultivationTable }

function MapTableSlideOver({
  tableId,
  plantFocusId,
  onClose,
  rooms,
  tables,
  plants,
  strainOptions,
  t,
  setTableStage,
  setTableStrain,
  harvestPlant,
  onHarvestSuccess,
  onDeadPlant,
  onQuarantinePlant,
  onActivatePlant,
  onUnassignPlant,
  onSetMotherStock,
  onDeletePlant,
}: {
  tableId: string
  /** null = mesa vacía (sin fila de planta); id = una planta concreta del mapa. */
  plantFocusId: string | null
  onClose: () => void
  rooms: CultivationRoom[]
  tables: CultivationTable[]
  plants: PlantRecord[]
  strainOptions: string[]
  t: (k: string) => string
  setTableStage: (tableId: string, stage: TableStage) => boolean
  setTableStrain: (tableId: string, strain: string) => void
  harvestPlant: (plantId: string) => string | null
  onHarvestSuccess: () => void
  onDeadPlant: (plantId: string) => void
  onQuarantinePlant: (plantId: string) => void
  onActivatePlant: (plantId: string) => void
  onUnassignPlant: (plantId: string) => void
  onSetMotherStock: (plantId: string, asMother: boolean) => void
  onDeletePlant: (plantId: string) => void
}) {
  const tb = tables.find((x) => x.id === tableId)
  const room = tb ? rooms.find((r) => r.id === tb.roomId) : undefined

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)
  const labelClass = cn('mb-1.5 block text-xs font-medium', C.label)

  const focusPlant = plantFocusId
    ? plants.find((p) => p.id === plantFocusId)
    : undefined

  useLayoutEffect(() => {
    if (!plantFocusId) return
    const p = plants.find((x) => x.id === plantFocusId)
    if (!p || p.tableId !== tableId) onClose()
  }, [plantFocusId, tableId, plants, onClose])

  if (!tb || !room) return null

  const plantMode = Boolean(plantFocusId && focusPlant && focusPlant.tableId === tb.id)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="map-slide-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('fixed inset-0 z-[80]', C.modalBackdrop)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 340 }}
        className={cn(
          'absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col shadow-[-12px_0_48px_rgba(0,0,0,0.08)]',
          C.modalCard,
          'rounded-none sm:rounded-l-3xl',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-3 px-5 pb-4 pt-5">
          <div className="flex min-w-0 flex-1 gap-3">
            <div
              className={cn(
                'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl',
                tb.stage === 'empty'
                  ? 'bg-gray-100 dark:bg-zinc-800'
                  : tb.stage === 'vegetacion'
                    ? 'bg-emerald-100/90 dark:bg-emerald-950/60'
                    : 'bg-indigo-100/90 dark:bg-indigo-950/60',
              )}
            >
              <StageGlyph
                stage={tb.stage}
                className={cn('h-7 w-7', tableIconAccentClass(tb.stage))}
              />
            </div>
            <div className="min-w-0 pt-0.5">
              <h2 id="map-slide-title" className={cn('text-lg font-semibold leading-tight tracking-tight', C.heading)}>
                {room.label.toUpperCase()} – {tb.label.toUpperCase()}
              </h2>
              {plantMode && focusPlant ? (
                <p className={cn('mt-1 text-base font-semibold', C.heading)}>
                  {focusPlant.strain.trim() || '—'}
                </p>
              ) : null}
              <p className={cn('mt-2 text-[11px] font-semibold uppercase tracking-wider', C.muted)}>
                {t('cultivation.currentStageLabel')}: {stageSelectLabel(t, tb.stage)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          {!plantMode &&
          tb.stage !== 'empty' &&
          plants.some((p) => p.tableId === tb.id && p.status === 'activa') ? (
            <div
              className={cn(
                'mb-5 flex items-center gap-3 rounded-2xl p-4 shadow-sm',
                C.card,
              )}
            >
              <div
                className={cn(
                  'flex h-11 w-11 items-center justify-center rounded-xl',
                  tb.stage === 'vegetacion'
                    ? 'bg-emerald-100/80 dark:bg-emerald-950/50'
                    : 'bg-indigo-100/80 dark:bg-indigo-950/50',
                )}
              >
                {tb.stage === 'vegetacion' ? (
                  <Leaf className="h-5 w-5 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
                ) : (
                  <Flower2 className="h-5 w-5 text-indigo-700 dark:text-indigo-300" strokeWidth={1.75} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className={cn('text-[10px] font-medium uppercase tracking-wide', C.muted)}>
                  {t('cultivation.strainCardLabel')}
                </p>
                <p className={cn('truncate text-base font-semibold', C.heading)}>
                  {tb.strain.trim() || '—'}
                </p>
              </div>
              <div className="flex gap-1">
                <span className="rounded-lg p-2 text-gray-400 dark:text-zinc-500">
                  <Scale className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="rounded-lg p-2 text-gray-400 dark:text-zinc-500">
                  <Timer className="h-4 w-4" strokeWidth={1.75} />
                </span>
              </div>
            </div>
          ) : null}

          <div className="mb-5">
            <label className={labelClass}>{t('cultivation.changeStage')}</label>
            <SoftSelect
              value={tb.stage}
              onChange={(v) => {
                const st = v as TableStage
                const ok = setTableStage(tb.id, st)
                if (!ok && room.vegetationOnly && st === 'floracion') {
                  window.alert('Zala 1: solo vegetación.')
                }
              }}
              options={stageOptions(room.vegetationOnly).map((st) => ({
                value: st,
                label: stageSelectLabel(t, st),
              }))}
              chipText={stageSelectLabel(t, tb.stage)}
              ariaLabel={t('cultivation.changeStage')}
              variant="field"
              triggerClassName={inputClass}
            />
            {!room.vegetationOnly ? (
              <p className={cn('mt-1.5 text-[11px] leading-snug', C.subheading)}>
                {t('cultivation.changeStageHint')}
              </p>
            ) : null}
          </div>

          {plantMode && focusPlant ? (
            <div
              className={cn(
                'mb-5 rounded-2xl p-4 shadow-sm',
                C.card,
              )}
            >
              <p className={cn('text-[10px] font-medium uppercase tracking-wide', C.muted)}>
                {t('cultivation.slideBracelet')}
              </p>
              <p className={cn('mt-2 font-mono text-lg font-semibold tracking-tight', C.heading)}>
                {focusPlant.id}
              </p>
              <p className={cn('mt-3 text-xs', C.muted)}>
                {t('cultivation.colPlanted')}:{' '}
                <span className={cn('font-medium', C.subheading)}>{focusPlant.plantedDate}</span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-medium ring-1 ring-inset',
                    statusPillClass(focusPlant.status),
                  )}
                >
                  {t(`cultivation.status_${focusPlant.status}` as 'cultivation.status_activa')}
                </span>
                <PlantRowMenu
                  plant={focusPlant}
                  t={t}
                  hideMove
                  onDead={() => onDeadPlant(focusPlant.id)}
                  onQuarantine={() => onQuarantinePlant(focusPlant.id)}
                  onActivate={() => onActivatePlant(focusPlant.id)}
                  onMove={() => {}}
                  onUnassign={() => onUnassignPlant(focusPlant.id)}
                  onDelete={() => {
                    if (!confirm(t('cultivation.confirmDeletePlant'))) return
                    onDeletePlant(focusPlant.id)
                    onClose()
                  }}
                  onSetMotherStock={(asMother) =>
                    onSetMotherStock(focusPlant.id, asMother)
                  }
                />
              </div>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <label className={labelClass}>{t('cultivation.strain')}</label>
                <input
                  className={inputClass}
                  list={`slide-strain-dl-${tb.id}`}
                  value={tb.strain}
                  onChange={(e) => setTableStrain(tb.id, e.target.value)}
                  placeholder="…"
                />
                <datalist id={`slide-strain-dl-${tb.id}`}>
                  {strainOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>
              <p className={cn('text-sm leading-relaxed', C.muted)}>
                {t('cultivation.mapTableVacantHint')}
              </p>
            </>
          )}
        </div>

        {plantMode && focusPlant ? (
          <div className="shrink-0 bg-white/95 p-5 dark:bg-zinc-950/95">
            <button
              type="button"
              disabled={focusPlant.status !== 'activa'}
              onClick={() => {
                if (focusPlant.status !== 'activa') return
                if (focusPlant.isMotherStock) {
                  if (!confirm(t('cultivation.destroyMotherConfirm'))) return
                  onDeadPlant(focusPlant.id)
                  onClose()
                  return
                }
                if (!confirm(t('cultivation.harvestPlantConfirm'))) return
                const hid = harvestPlant(focusPlant.id)
                if (!hid) window.alert(t('cultivation.noPlantsToHarvest'))
                else {
                  onHarvestSuccess()
                  onClose()
                }
              }}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold tracking-tight',
                focusPlant.isMotherStock
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/20 hover:bg-red-500 dark:bg-red-500 dark:text-white dark:hover:bg-red-400'
                  : C.btnPrimary,
                focusPlant.status !== 'activa' && 'cursor-not-allowed opacity-50',
              )}
            >
              <Wheat className="h-5 w-5" strokeWidth={1.75} />
              {focusPlant.isMotherStock
                ? t('cultivation.destroyMotherPlant')
                : t('cultivation.harvestPlant')}
            </button>
          </div>
        ) : null}
      </motion.aside>
    </motion.div>
  )
}

export function AgronomyTab({
  initialSub = 'propagador',
  visibleSubs,
  hideTabs = false,
}: {
  initialSub?: CultivationSub
  visibleSubs?: CultivationSub[]
  hideTabs?: boolean
} = {}) {
  const tenantId = 'tenant-default'
  const { t, locale } = useTranslation()
  const allowedSubSet = useMemo(
    () => new Set(visibleSubs && visibleSubs.length ? visibleSubs : SUB_TABS.map((s) => s.id)),
    [visibleSubs],
  )
  const availableTabs = useMemo(
    () => SUB_TABS.filter((tab) => allowedSubSet.has(tab.id)),
    [allowedSubSet],
  )
  const [sub, setSub] = useState<CultivationSub>(
    allowedSubSet.has(initialSub) ? initialSub : (availableTabs[0]?.id ?? 'propagador'),
  )
  useEffect(() => {
    if (allowedSubSet.has(sub)) return
    const next = allowedSubSet.has(initialSub) ? initialSub : (availableTabs[0]?.id ?? 'propagador')
    setSub(next)
  }, [allowedSubSet, availableTabs, initialSub, sub])

  const rooms = useCultivationStore((s) => s.rooms)
  const tables = useCultivationStore((s) => s.tables)
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)
  const addGeneticsBank = useCultivationStore((s) => s.addGeneticsBank)
  const updateGeneticsBank = useCultivationStore((s) => s.updateGeneticsBank)
  const removeGeneticsBank = useCultivationStore((s) => s.removeGeneticsBank)
  const propagator = useCultivationStore((s) => s.propagator)
  const plants = useCultivationStore((s) => s.plants)
  const cultivoBoard = useCultivationStore((s) => s.cultivoBoard)
  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const setTableStage = useCultivationStore((s) => s.setTableStage)
  const setTableStrain = useCultivationStore((s) => s.setTableStrain)
  const harvestPlant = useCultivationStore((s) => s.harvestPlant)
  const addRoom = useCultivationStore((s) => s.addRoom)
  const addPlant = useCultivationStore((s) => s.addPlant)
  const addSeedlings = useCultivationStore((s) => s.addSeedlings)
  const moveSeedlingToVegetation = useCultivationStore((s) => s.moveSeedlingToVegetation)
  const removePropagatorSeedling = useCultivationStore((s) => s.removePropagatorSeedling)
  const updatePropagatorSeedling = useCultivationStore((s) => s.updatePropagatorSeedling)
  const setPlantStatus = useCultivationStore((s) => s.setPlantStatus)
  const setPlantMotherStock = useCultivationStore((s) => s.setPlantMotherStock)
  const movePlant = useCultivationStore((s) => s.movePlant)
  const updateHarvest = useCultivationStore((s) => s.updateHarvest)
  const archiveHarvest = useCultivationStore((s) => s.archiveHarvest)
  const removeHarvestBatch = useCultivationStore((s) => s.removeHarvestBatch)
  const removePlant = useCultivationStore((s) => s.removePlant)

  const stock = useCrmStore((s) => s.stock)
  const mergeStockFromHarvest = useCrmStore((s) => s.mergeStockFromHarvest)
  const globalStrains = useStrainsStore((s) => s.globalStrains)
  const localStrains = useStrainsStore((s) => s.localStrains)
  const allTenantStrains = useMemo(() => {
    return [
      ...globalStrains.map((s) => s.name),
      ...localStrains
        .filter((s) => s.tenantId === tenantId)
        .map((s) => s.name),
    ]
  }, [globalStrains, localStrains, tenantId])

  const cultivoHubPlants = useMemo<PlantRecord[]>(() => {
    const col = (tab: keyof typeof cultivoBoard) =>
      Array.isArray(cultivoBoard?.[tab]) ? cultivoBoard[tab] : []
    const buildRows = (
      tab: 'propagacion' | 'vegetacion' | 'floracion' | 'cosecha',
      stage: TableStage,
    ) =>
      col(tab).map((item) => {
        const bracelet = item.braceletId?.trim()
        const id = bracelet ? bracelet.replace(/^#/, '') : item.id
        const plantedDate = item.date?.trim() || new Date().toISOString().slice(0, 10)
        return {
          id,
          strain: item.strain,
          roomId: item.topologyRoomId ?? '',
          tableId: item.topologyFixtureId ?? '',
          plantedDate,
          status: plantStatusFromKanbanCard(item),
          growthStage: stage,
          registeredAt:
            item.floweringStartDate?.trim() || item.vegetacionStartDate?.trim() || undefined,
          motherPlantId: item.motherPlantId,
          isMotherStock: false,
        }
      })
    return [
      ...buildRows('propagacion', 'empty'),
      ...buildRows('vegetacion', 'vegetacion'),
      ...buildRows('floracion', 'floracion'),
      ...buildRows('cosecha', 'floracion'),
    ].sort(sortPlantsNewestFirst)
  }, [cultivoBoard])

  const strainOptions = useMemo(() => {
    const fromBank = geneticsBank.map((g) => g.name.trim()).filter(Boolean)
    const bankKeys = new Set(fromBank.map(normStrainKey))
    const fromPlants = [
      ...new Set(allTenantStrains.map((s) => s.trim()).filter(Boolean)),
      ...new Set(plants.map((p) => p.strain.trim()).filter(Boolean)),
      ...new Set(cultivoHubPlants.map((p) => p.strain.trim()).filter(Boolean)),
    ].filter((s) => !bankKeys.has(normStrainKey(s)))
    fromPlants.sort((a, b) => a.localeCompare(b))
    return [...fromBank, ...fromPlants]
  }, [geneticsBank, plants, cultivoHubPlants, allTenantStrains])

  const sortedGeneticsBank = useMemo(
    () =>
      [...geneticsBank].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      ),
    [geneticsBank],
  )

  const [mapDetail, setMapDetail] = useState<{
    tableId: string
    plantId: string | null
  } | null>(null)
  const mapRoomFilterInit = useRef(false)
  const [mapRoomFilterIds, setMapRoomFilterIds] = useState<string[]>([])
  const [mapAddRoomOpen, setMapAddRoomOpen] = useState(false)
  const [mapNewRoomLabel, setMapNewRoomLabel] = useState('')
  const [mapNewRoomVegOnly, setMapNewRoomVegOnly] = useState(false)

  useEffect(() => {
    if (mapRoomFilterInit.current || rooms.length === 0) return
    mapRoomFilterInit.current = true
    setMapRoomFilterIds(rooms.map((r) => r.id))
  }, [rooms])

  useEffect(() => {
    const order = new Map(rooms.map((r, i) => [r.id, i]))
    setMapRoomFilterIds((prev) => {
      const missing = rooms.map((r) => r.id).filter((id) => !prev.includes(id))
      if (missing.length === 0) return prev
      return [...prev, ...missing].sort(
        (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
      )
    })
  }, [rooms])

  /** Contexto opcional en Registro: mesa destino al mover desde vegetación (veg pool). */
  const [addToTableContext, setAddToTableContext] = useState<{
    roomId: string
    tableId: string
    strainKey: string
  } | null>(null)
  const [registerOpen, setRegisterOpen] = useState(false)
  const [movePlantId, setMovePlantId] = useState<string | null>(null)
  const [deadPlantId, setDeadPlantId] = useState<string | null>(null)
  const [deadReason, setDeadReason] = useState('')
  const [transferBatch, setTransferBatch] = useState<HarvestBatch | null>(null)
  const [transferGeneticsId, setTransferGeneticsId] = useState('')
  const [transferGrams, setTransferGrams] = useState('')
  const [transferPrecio, setTransferPrecio] = useState('')
  const [motherAssignPlantId, setMotherAssignPlantId] = useState<string | null>(null)
  const [motherAssignTableId, setMotherAssignTableId] = useState('')

  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterStrain, setFilterStrain] = useState<string>('all')

  const [regId, setRegId] = useState('')
  const [regStrain, setRegStrain] = useState('')
  const [regRoomId, setRegRoomId] = useState(rooms[0]?.id ?? '')
  const [regTableId, setRegTableId] = useState('')
  const [regDate, setRegDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [regErr, setRegErr] = useState<string | null>(null)

  const [seedOpen, setSeedOpen] = useState(false)
  const [seedStrain, setSeedStrain] = useState('')
  const [seedDate, setSeedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [seedQty, setSeedQty] = useState('10')
  const [seedOrigin, setSeedOrigin] = useState<SeedlingOrigin>('semilla')
  const [seedGenetics, setSeedGenetics] = useState('')
  const [seedMotherId, setSeedMotherId] = useState('')
  const [seedErr, setSeedErr] = useState<string | null>(null)

  const [seedMove, setSeedMove] = useState<PropagatorSeedling | null>(null)
  const [seedEdit, setSeedEdit] = useState<PropagatorSeedling | null>(null)
  const [seedEditStrain, setSeedEditStrain] = useState('')
  const [seedEditDate, setSeedEditDate] = useState('')
  const [seedEditOrigin, setSeedEditOrigin] = useState<SeedlingOrigin>('semilla')
  const [seedEditGenetics, setSeedEditGenetics] = useState('')
  const [seedEditMotherId, setSeedEditMotherId] = useState('')
  const [seedEditErr, setSeedEditErr] = useState<string | null>(null)
  const [seedMoveBracelet, setSeedMoveBracelet] = useState('')
  const [seedMoveDate, setSeedMoveDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [seedMoveErr, setSeedMoveErr] = useState<string | null>(null)
  const [seedMoveStep, setSeedMoveStep] = useState<1 | 2>(1)
  const [seedVegRoomId, setSeedVegRoomId] = useState('')
  const [seedVegTableId, setSeedVegTableId] = useState('')
  const [seedProfile, setSeedProfile] = useState<PropagatorSeedling | null>(null)
  const [geneticsModal, setGeneticsModal] = useState<
    null | 'new' | { editId: string }
  >(null)
  const [geneticsViewId, setGeneticsViewId] = useState<string | null>(null)
  const [pendingGeneticsViewId, setPendingGeneticsViewId] = useState<string | null>(null)

  const [ocrOpen, setOcrOpen] = useState(false)
  const [ocrTarget, setOcrTarget] = useState<'register' | 'bracelet' | null>(null)
  const [ocrBusy, setOcrBusy] = useState(false)
  const [ocrErr, setOcrErr] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!seedMove) return
    setSeedMoveStep(1)
    setSeedMoveErr(null)
  }, [seedMove?.id])
  const streamRef = useRef<MediaStream | null>(null)

  const [moveTargetRoom, setMoveTargetRoom] = useState(rooms[0]?.id ?? '')
  const [moveTargetTable, setMoveTargetTable] = useState('')

  useEffect(() => {
    if (geneticsModal != null) return
    if (!pendingGeneticsViewId) return
    setGeneticsViewId(pendingGeneticsViewId)
    setPendingGeneticsViewId(null)
  }, [geneticsModal, pendingGeneticsViewId])

  const filteredPlants = useMemo(() => {
    return cultivoHubPlants
      .filter((p) => filterStatus === 'all' || p.status === filterStatus)
      .filter((p) => (filterStrain === 'all' ? true : p.strain === filterStrain))
      .sort(sortPlantsNewestFirst)
  }, [cultivoHubPlants, filterStatus, filterStrain])

  const motherPlantOptions = useMemo(() => {
    const pool = plants.filter(
      (p) => p.status === 'activa' || p.status === 'cuarentena',
    )
    const marked = pool.filter((p) => p.isMotherStock)
    const use = marked.length > 0 ? marked : pool
    return [...use].sort((a, b) => a.id.localeCompare(b.id))
  }, [plants])

  const healthyTaggedPlants = useMemo(() => {
    return plants
      .filter((p) => p.status === 'activa')
      .sort(sortPlantsNewestFirst)
  }, [plants])

  const propagatorGroups = useMemo(() => {
    const byStrain = new Map<string, PropagatorSeedling[]>()
    for (const s of propagator) {
      const k = s.strain.trim() || '—'
      if (!byStrain.has(k)) byStrain.set(k, [])
      byStrain.get(k)!.push(s)
    }
    return [...byStrain.entries()]
      .map(([strain, items]) => ({
        strain,
        count: items.length,
        items: items.sort(sortSeedlingsNewestFirst),
      }))
      .sort((a, b) =>
        a.strain.localeCompare(b.strain, undefined, { sensitivity: 'base' }),
      )
  }, [propagator])

  const sortedPropagator = useMemo(() => {
    return [...propagator].sort(sortSeedlingsNewestFirst)
  }, [propagator])

  const selectedSeedMacroImage = useMemo(() => {
    if (!seedProfile) return null
    return strainImageFromBank(geneticsBank, seedProfile.strain)
  }, [seedProfile, geneticsBank])

  const motherRoomTables = useMemo(
    () => sortRoomTables(tables.filter((tb) => tb.roomId === MOTHER_ROOM_ID)),
    [tables],
  )

  const mapProductionRows = useMemo(() => {
    const idSet = new Set(mapRoomFilterIds)
    const rows: MapListRow[] = []
    for (const room of rooms) {
      if (!idSet.has(room.id)) continue
      const roomTables = sortRoomTables(tables.filter((tb) => tb.roomId === room.id))
      for (const tb of roomTables) {
        const onTable = plants.filter(
          (p) => p.tableId === tb.id && p.status === 'activa',
        )
        if (onTable.length === 0) {
          rows.push({ kind: 'vacant', room, table: tb })
        } else {
          for (const plant of [...onTable].sort(sortPlantsNewestFirst)) {
            rows.push({ kind: 'plant', room, table: tb, plant })
          }
        }
      }
    }
    return rows
  }, [rooms, tables, plants, mapRoomFilterIds])

  const toggleMapRoomFilter = (roomId: string) => {
    setMapRoomFilterIds((prev) => {
      if (prev.includes(roomId)) return prev.filter((x) => x !== roomId)
      const order = new Map(rooms.map((r, i) => [r.id, i]))
      return [...prev, roomId].sort(
        (a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0),
      )
    })
  }

  const isolationPlants = useMemo(() => {
    return plants
      .filter((p) => p.status === 'cuarentena' || p.status === 'muerta')
      .sort(sortPlantsNewestFirst)
  }, [plants])

  const vegPoolForAdd = useMemo(() => {
    if (!addToTableContext) return null
    const targetRoom = rooms.find((r) => r.id === addToTableContext.roomId)
    if (!targetRoom || targetRoom.vegetationOnly) return null
    const vegRoom = rooms.find((r) => r.vegetationOnly)
    if (!vegRoom) return null
    const table = tables.find((t) => t.id === addToTableContext.tableId)
    const fromCtx = addToTableContext.strainKey.trim()
    const cardStrain = fromCtx || table?.strain.trim() || ''
    let pool = plants.filter(
      (p) => p.status === 'activa' && p.roomId === vegRoom.id,
    )
    if (cardStrain)
      pool = pool.filter(
        (p) => normStrainKey(p.strain) === normStrainKey(cardStrain),
      )
    const byStrain = new Map<string, PlantRecord[]>()
    for (const p of pool) {
      const k = p.strain.trim() || '—'
      if (!byStrain.has(k)) byStrain.set(k, [])
      byStrain.get(k)!.push(p)
    }
    const groups = [...byStrain.entries()]
      .map(([strain, items]) => ({
        strain,
        items: items.sort(sortPlantsNewestFirst),
      }))
      .sort((a, b) =>
        a.strain.localeCompare(b.strain, undefined, { sensitivity: 'base' }),
      )
    return { vegRoomLabel: vegRoom.label, cardStrain, groups }
  }, [addToTableContext, rooms, tables, plants])

  const activeBatches = useMemo(
    () => harvestBatches.filter((b) => !b.archived),
    [harvestBatches],
  )

  const transferStrainPreview = useMemo(() => {
    const entry = geneticsBank.find((x) => x.id === transferGeneticsId)
    return entry ? strainImageFromBank(geneticsBank, entry.name) : null
  }, [geneticsBank, transferGeneticsId])

  const openTransfer = (b: HarvestBatch) => {
    setTransferBatch(b)
    const gEntry = geneticsBank.find(
      (x) => normStrainKey(x.name) === normStrainKey(b.strain),
    )
    setTransferGeneticsId(gEntry?.id ?? '')
    const g =
      b.dryWeight != null && Number.isFinite(b.dryWeight)
        ? String(b.dryWeight)
        : ''
    setTransferGrams(g)
    const match = gEntry
      ? stock.find(
          (i) =>
            i.geneticsEntryId === gEntry.id ||
            (!i.geneticsEntryId &&
              i.tipo.trim().toLowerCase() === gEntry.name.trim().toLowerCase()),
        )
      : undefined
    setTransferPrecio(
      match != null && match.precio >= 0 ? String(match.precio) : '',
    )
  }

  const submitTransfer = () => {
    if (!transferBatch || !transferGeneticsId.trim()) {
      window.alert(t('cultivation.errorTransferGenetics'))
      return
    }
    const entry = geneticsBank.find((x) => x.id === transferGeneticsId)
    if (!entry) {
      window.alert(t('cultivation.errorTransferGenetics'))
      return
    }
    const g = Number(transferGrams.replace(',', '.'))
    const p = Number(transferPrecio.replace(',', '.'))
    if (!Number.isFinite(g) || g <= 0) return
    mergeStockFromHarvest({
      geneticsEntryId: entry.id,
      tipo: entry.name,
      imageUrl: entry.imageUrl,
      addGrams: g,
      precioPerGram: Number.isFinite(p) && p >= 0 ? p : 0,
    })
    archiveHarvest(transferBatch.id)
    setTransferBatch(null)
  }

  const onSubChange = (v: CultivationSub) => {
    if (!allowedSubSet.has(v)) return
    setSub(v)
    if (v !== 'registro') setAddToTableContext(null)
  }

  const requestSetMotherStock = (plantId: string, asMother: boolean) => {
    if (!asMother) {
      setPlantMotherStock(plantId, false)
      return
    }
    const firstTableId = motherRoomTables[0]?.id ?? ''
    if (!firstTableId) return
    setMotherAssignPlantId(plantId)
    setMotherAssignTableId(firstTableId)
  }

  const handleMoveFromVegToTarget = (plantId: string) => {
    if (!addToTableContext) return
    const plant = plants.find((x) => x.id === plantId)
    if (!plant) return
    const tblBefore = tables.find((x) => x.id === addToTableContext.tableId)
    const ok = movePlant(
      plantId,
      addToTableContext.roomId,
      addToTableContext.tableId,
    )
    if (!ok) return
    if (tblBefore && !tblBefore.strain.trim() && plant.strain.trim())
      setTableStrain(addToTableContext.tableId, plant.strain)
    if (tblBefore?.stage === 'empty')
      setTableStage(addToTableContext.tableId, 'vegetacion')
  }

  const moveActivePlantToTarget = (plantId: string) => {
    if (!addToTableContext) return
    const plant = plants.find((x) => x.id === plantId)
    if (!plant) return
    const same =
      plant.roomId === addToTableContext.roomId &&
      plant.tableId === addToTableContext.tableId
    if (same) return
    if (plant.roomId && plant.tableId) {
      const curRoom = rooms.find((r) => r.id === plant.roomId)?.label ?? '—'
      const curTable = tables.find((tb) => tb.id === plant.tableId)?.label ?? '—'
      if (
        !confirm(
          `${plant.id} уже стоит: ${curRoom} — ${curTable}. Переместить растение?`,
        )
      )
        return
    }
    const tblBefore = tables.find((x) => x.id === addToTableContext.tableId)
    const ok = movePlant(
      plantId,
      addToTableContext.roomId,
      addToTableContext.tableId,
    )
    if (!ok) return
    if (tblBefore && !tblBefore.strain.trim() && plant.strain.trim())
      setTableStrain(addToTableContext.tableId, plant.strain)
    if (tblBefore?.stage === 'empty')
      setTableStage(addToTableContext.tableId, 'vegetacion')
  }

  const submitRegister = (e: React.FormEvent) => {
    e.preventDefault()
    setRegErr(null)
    const roomId = regRoomId || rooms[0]?.id
    const tableId =
      regTableId || tables.find((x) => x.roomId === roomId)?.id || ''
    if (!roomId || !tableId) return
    const res = addPlant(regId, regStrain, roomId, tableId, regDate)
    if (!res.ok) setRegErr(res.error)
    else {
      setRegisterOpen(false)
      setRegErr(null)
      setRegId('')
    }
  }

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)
  const labelClass = cn('mb-1.5 block text-xs font-medium', C.label)

  const openOcr = (target: 'register' | 'bracelet') => {
    setOcrErr(null)
    setOcrTarget(target)
    setOcrOpen(true)
  }

  const closeOcr = () => {
    setOcrOpen(false)
    setOcrTarget(null)
    setOcrBusy(false)
    setOcrErr(null)
    const st = streamRef.current
    if (st) {
      for (const tr of st.getTracks()) tr.stop()
      streamRef.current = null
    }
  }

  const captureBraceletFromCamera = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !ocrTarget) return
    setOcrBusy(true)
    setOcrErr(null)
    try {
      for (let i = 0; i < 50; i++) {
        if (video.videoWidth > 2 && video.videoHeight > 2) {
          if (typeof video.requestVideoFrameCallback === 'function') {
            await new Promise<void>((resolve) => {
              video.requestVideoFrameCallback(() => resolve())
            })
          }
          break
        }
        await new Promise((r) => setTimeout(r, 50))
      }
      const w = video.videoWidth
      const h = video.videoHeight
      if (w < 2 || h < 2) {
        setOcrErr(t('cultivation.cameraNoDigits'))
        setOcrBusy(false)
        return
      }
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no_ctx')
      ctx.drawImage(video, 0, 0, w, h)
      const digits = await recognizeBraceletDigitsFromSnapshot(canvas)
      if (!digits) {
        setOcrErr(t('cultivation.cameraNoDigits'))
        setOcrBusy(false)
        return
      }
      if (ocrTarget === 'register') setRegId(digits)
      else setSeedMoveBracelet(digits)
      closeOcr()
    } catch {
      setOcrErr(t('cultivation.cameraNoDigits'))
      setOcrBusy(false)
    }
  }

  useEffect(() => {
    if (!ocrOpen) return
    let cancelled = false
    ;(async () => {
      try {
        const st = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          for (const tr of st.getTracks()) tr.stop()
          return
        }
        streamRef.current = st
        if (videoRef.current) {
          videoRef.current.srcObject = st
          await videoRef.current.play()
        }
      } catch {
        setOcrErr(t('cultivation.cameraNotAvailable'))
      }
    })()
    return () => {
      cancelled = true
      const st = streamRef.current
      if (st) {
        for (const tr of st.getTracks()) tr.stop()
        streamRef.current = null
      }
    }
  }, [ocrOpen, t])

  return (
    <div className="min-h-0 w-full overflow-x-hidden px-6 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
            {t('nav.geneticsBank')}
          </h1>
        </div>
      </div>

      {!hideTabs ? (
        <div className="mb-8">
          <SegmentedCultivation active={sub} tabs={availableTabs} onChange={onSubChange} t={t} />
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {sub === 'banco' && (
          <motion.section
            key="banco"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => setGeneticsModal('new')}
                className={cn(
                  'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
                  C.btnPrimary,
                )}
              >
                <Plus className="h-5 w-5" strokeWidth={2} />
                {t('cultivation.geneticsNew')}
              </motion.button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {sortedGeneticsBank.map((item) => (
                <motion.article
                  layout
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  role="button"
                  tabIndex={0}
                  onClick={() => setGeneticsViewId(item.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ')
                      setGeneticsViewId(item.id)
                  }}
                  className={cn(
                    'group relative cursor-pointer overflow-hidden rounded-2xl shadow-sm transition',
                    C.card,
                    C.cardHover,
                  )}
                >
                  <div
                    className={cn(
                      'relative aspect-[4/3] overflow-hidden bg-gradient-to-br',
                      C.imagePlaceholder,
                    )}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-gray-300 dark:text-green-900">
                        <ImagePlus className="h-12 w-12" strokeWidth={1} />
                      </div>
                    )}
                    <div
                      className="absolute right-2 top-2"
                      onClick={(e) => e.stopPropagation()}
                      onKeyDown={(e) => e.stopPropagation()}
                    >
                      <RowActionsMenu
                        onEdit={() => setGeneticsModal({ editId: item.id })}
                        onDelete={() => {
                          if (confirm(t('cultivation.geneticsDeleteConfirm')))
                            removeGeneticsBank(item.id)
                        }}
                      />
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className={cn('font-semibold', C.heading)}>{item.name}</h3>
                    {item.notes ? (
                      <p className={cn('mt-2 line-clamp-3 text-sm', C.muted)}>{item.notes}</p>
                    ) : null}
                  </div>
                </motion.article>
              ))}
            </div>
            {sortedGeneticsBank.length === 0 ? (
              <div
                className={cn(
                  'rounded-2xl bg-gray-50/70 py-16 text-center text-sm dark:bg-zinc-900/50',
                  C.muted,
                )}
              >
                {t('cultivation.geneticsEmpty')}
              </div>
            ) : null}
          </motion.section>
        )}

        {sub === 'mapa' && (
          <motion.section
            key="mapa"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div
              className={cn(
                'rounded-2xl bg-gradient-to-br from-white via-white to-emerald-50/40 p-4 shadow-sm',
                'dark:from-zinc-950 dark:via-zinc-950 dark:to-emerald-950/25',
                C.card,
              )}
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl',
                      'bg-emerald-500/12 ring-1 ring-emerald-500/25 dark:bg-emerald-500/15',
                    )}
                  >
                    <SlidersHorizontal className="h-5 w-5 text-emerald-700 dark:text-emerald-400" strokeWidth={1.75} />
                  </div>
                  <div>
                    <p className={cn('text-sm font-semibold tracking-tight', C.heading)}>
                      {t('cultivation.mapFilterRooms')}
                    </p>
                    <p className={cn('mt-0.5 max-w-md text-xs leading-relaxed', C.muted)}>
                      {t('cultivation.mapFilterHint')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMapRoomFilterIds(rooms.map((r) => r.id))}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium',
                      C.btnSecondary,
                    )}
                  >
                    {t('cultivation.mapSelectAllRooms')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapRoomFilterIds([])}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium',
                      C.btnSecondary,
                    )}
                  >
                    {t('cultivation.mapClearRooms')}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMapNewRoomLabel('')
                      setMapNewRoomVegOnly(false)
                      setMapAddRoomOpen(true)
                    }}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold',
                      'border-emerald-400/40 bg-emerald-500/10 text-emerald-900 hover:bg-emerald-500/15',
                      'dark:border-emerald-500/35 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20',
                    )}
                  >
                    <Plus className="h-3.5 w-3.5" strokeWidth={2.5} />
                    {t('cultivation.mapAddRoom')}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {rooms.map((room) => {
                  const sel = mapRoomFilterIds.includes(room.id)
                  return (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => toggleMapRoomFilter(room.id)}
                      className={cn(
                        'inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
                        sel
                          ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-950 shadow-sm ring-2 ring-emerald-500/15 dark:bg-emerald-500/10 dark:text-emerald-100 dark:border-emerald-500/40'
                          : 'border-gray-200/90 bg-white/90 text-gray-600 hover:border-gray-300 hover:bg-white dark:border-zinc-700 dark:bg-zinc-900/60 dark:text-zinc-300 dark:hover:border-zinc-600',
                      )}
                    >
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          sel ? 'bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.25)]' : 'bg-gray-300 dark:bg-zinc-600',
                        )}
                      />
                      <span className="truncate">{room.label}</span>
                      {room.vegetationOnly && !room.isMotherRoom ? (
                        <span
                          className={cn(
                            'shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                            'bg-amber-100/90 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200',
                          )}
                        >
                          {t('cultivation.mapRoomVegBadge')}
                        </span>
                      ) : null}
                      {null}
                    </button>
                  )
                })}
              </div>
            </div>

            {mapRoomFilterIds.length === 0 ? (
              <div className={cn('rounded-2xl px-4 py-10 text-center text-sm shadow-sm', C.card, C.muted)}>
                {t('cultivation.mapEmptyRoomFilter')}
              </div>
            ) : (
              <div className={cn('overflow-hidden rounded-2xl shadow-sm', C.card)}>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[860px] text-left text-sm">
                    <thead className={cn('text-xs uppercase tracking-wide', C.tableHead)}>
                      <tr>
                        <th className="w-14 px-2 py-3 font-medium">{t('cultivation.colPhoto')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.colBracelet')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.colStrain')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.colMadre')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.selectTable')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.colLocation')}</th>
                        <th className="px-4 py-3 font-medium">{t('cultivation.currentStageLabel')}</th>
                      </tr>
                    </thead>
                    <tbody className={C.tableRow}>
                      {mapProductionRows.map((row) => {
                        const { room, table: tb } = row
                        const st = tb.stage
                        if (row.kind === 'vacant') {
                          return (
                            <tr
                              key={`${tb.id}__vacant`}
                              className={cn('cursor-pointer transition', C.rowHover)}
                              onClick={() =>
                                setMapDetail({ tableId: tb.id, plantId: null })
                              }
                            >
                              <td className="px-2 py-3">
                                <div
                                  className={cn(
                                    'flex h-9 w-9 items-center justify-center rounded-lg shadow-sm',
                                    C.cardMuted,
                                  )}
                                >
                                  <ImageIcon className="h-5 w-5 opacity-35" strokeWidth={1.5} />
                                </div>
                              </td>
                              <td className={cn('px-4 py-3 tabular-nums', C.heading)}>—</td>
                              <td className={cn('px-4 py-3 italic', C.heading)}>
                                {t('cultivation.disponible')}
                              </td>
                              <td className={cn('px-4 py-3', C.heading)}>—</td>
                              <td className={cn('px-4 py-3 font-medium', C.heading)}>
                                {tb.label}
                              </td>
                              <td className={cn('px-4 py-3', C.heading)}>
                                <span className="font-medium text-gray-800 dark:text-zinc-200">
                                  {room.label}
                                </span>
                              </td>
                              <td className={cn('px-4 py-3', C.muted)}>
                                <span className="inline-flex items-center gap-1.5">
                                  <StageGlyph
                                    stage={st}
                                    className={cn(
                                      'h-4 w-4 shrink-0',
                                      tableIconAccentClass(st),
                                    )}
                                  />
                                  {stageSelectLabel(t, st)}
                                </span>
                              </td>
                            </tr>
                          )
                        }
                        const { plant } = row
                        const strainImg = strainImageFromBank(geneticsBank, plant.strain)
                        return (
                          <tr
                            key={plant.id}
                            className={cn('cursor-pointer transition', C.rowHover)}
                            onClick={() =>
                              setMapDetail({
                                tableId: plant.tableId,
                                plantId: plant.id,
                              })
                            }
                          >
                            <td className="px-2 py-3">
                              <div
                                className={cn(
                                  'flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg shadow-sm',
                                  C.cardMuted,
                                )}
                              >
                                {strainImg ? (
                                  <img src={strainImg} alt="" className="h-full w-full object-cover" />
                                ) : (
                                  <ImageIcon className="h-5 w-5 opacity-35" strokeWidth={1.5} />
                                )}
                              </div>
                            </td>
                            <td className={cn('px-4 py-3', C.heading)}>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[13px]">{plant.id}</span>
                                {plant.isMotherStock ? (
                                  <span className="inline-flex items-center rounded-md bg-fuchsia-100/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-fuchsia-900 dark:bg-fuchsia-950/55 dark:text-fuchsia-100">
                                    {t('cultivation.motherMapBadge')}
                                  </span>
                                ) : null}
                              </div>
                            </td>
                            <td className={cn('px-4 py-3', C.heading)}>{plant.strain}</td>
                            <td className={cn('px-4 py-3', C.heading)}>
                              {plant.motherPlantId?.trim() ? plant.motherPlantId.trim() : '—'}
                            </td>
                            <td className={cn('px-4 py-3 font-medium', C.heading)}>
                              {tb.label}
                            </td>
                            <td className={cn('px-4 py-3', C.heading)}>
                              <span className="font-medium text-gray-800 dark:text-zinc-200">
                                {room.label}
                              </span>
                            </td>
                            <td className={cn('px-4 py-3', C.muted)}>
                              <span className="inline-flex items-center gap-1.5">
                                <StageGlyph
                                  stage={st}
                                  className={cn(
                                    'h-4 w-4 shrink-0',
                                    tableIconAccentClass(st),
                                  )}
                                />
                                {stageSelectLabel(t, st)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
                {mapProductionRows.length === 0 ? (
                  <div className={cn('px-4 py-12 text-center text-sm', C.muted)}>
                    {t('cultivation.mapListEmpty')}
                  </div>
                ) : null}
              </div>
            )}
          </motion.section>
        )}

        {sub === 'propagador' && (
          <motion.section
            key="propagador"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={cn('max-w-2xl text-sm leading-relaxed', C.muted)}>
                  {t('cultivation.subtitlePropagator')}
                </p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                  <span className={cn('inline-flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs shadow-sm', C.cardMuted)}>
                    <span className={cn('font-semibold', C.heading)}>
                      {t('cultivation.propagatorTotal')}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', C.segmentedPill)}>
                      {propagator.length}
                    </span>
                  </span>
                  {propagatorGroups.length > 0 ? (
                    <span className={cn('text-xs', C.muted)}>
                      {t('cultivation.propagatorByStrain')}:{' '}
                      {propagatorGroups.map((g) => `${g.strain} (${g.count})`).join(' · ')}
                    </span>
                  ) : null}
                </div>
              </div>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  setSeedErr(null)
                  setSeedStrain('')
                  setSeedDate(new Date().toISOString().slice(0, 10))
                  setSeedQty('10')
                  setSeedOrigin('semilla')
                  setSeedGenetics('')
                  setSeedMotherId('')
                  setSeedOpen(true)
                }}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
                  C.btnPrimary,
                )}
              >
                <Plus className="h-5 w-5" />
                {t('cultivation.addSeedling')}
              </motion.button>
            </div>

            <div className={cn('overflow-hidden rounded-2xl shadow-sm', C.card)}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className={cn('text-xs uppercase tracking-wide', C.tableHead)}>
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colStrain')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colSeeded')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colOrigin')}</th>
                      <th className="min-w-[120px] px-4 py-3 font-medium">
                        {t('cultivation.colGenetics')}
                      </th>
                      <th className="min-w-[100px] px-4 py-3 font-medium">
                        {t('cultivation.colMadre')}
                      </th>
                      <th className="min-w-[280px] px-4 py-3 text-right font-medium">
                        {t('cultivation.colNext')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className={C.tableRow}>
                    {sortedPropagator.map((s) => (
                      <tr
                        key={s.id}
                        className={cn('cursor-pointer transition', C.rowHover)}
                        onClick={() => setSeedProfile(s)}
                      >
                        <td className={cn('px-4 py-3', C.muted)}>{s.strain}</td>
                        <td className={cn('px-4 py-3 tabular-nums', C.muted)}>{s.seededDate}</td>
                        <td className={cn('px-4 py-3', C.muted)}>
                          {s.origin === 'clone'
                            ? t('cultivation.originClone')
                            : t('cultivation.originSemilla')}
                        </td>
                        <td className={cn('max-w-[200px] truncate px-4 py-3', C.muted)}>
                          {s.genetics?.trim() ? s.genetics.trim() : '—'}
                        </td>
                        <td className={cn('px-4 py-3 font-mono text-xs', C.muted)}>
                          {s.origin === 'clone' && s.motherPlantId?.trim()
                            ? s.motherPlantId.trim()
                            : '—'}
                        </td>
                        <td
                          className="px-4 py-3 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex w-full flex-wrap items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSeedMoveErr(null)
                                setSeedMove(s)
                                setSeedMoveBracelet('')
                                setSeedMoveDate(new Date().toISOString().slice(0, 10))
                              }}
                              className={cn('rounded-xl px-3 py-2 text-sm font-medium', C.btnSecondary)}
                            >
                              {t('cultivation.putOnBracelet')}
                            </button>
                            <div onClick={(e) => e.stopPropagation()}>
                              <PropagatorRowMenu
                                t={t}
                                onEdit={() => {
                                  setSeedEditErr(null)
                                  setSeedEdit(s)
                                  setSeedEditStrain(s.strain)
                                  setSeedEditDate(s.seededDate)
                                  setSeedEditOrigin(s.origin === 'clone' ? 'clone' : 'semilla')
                                  setSeedEditGenetics(s.genetics ?? '')
                                  setSeedEditMotherId(s.motherPlantId ?? '')
                                }}
                                onDelete={() => {
                                  if (!confirm(t('cultivation.confirmDeleteSeedling'))) return
                                  removePropagatorSeedling(s.id)
                                  if (seedMove?.id === s.id) setSeedMove(null)
                                  if (seedEdit?.id === s.id) setSeedEdit(null)
                                  if (seedProfile?.id === s.id) setSeedProfile(null)
                                }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {propagator.length === 0 ? (
                <div className={cn('px-4 py-12 text-center text-sm', C.muted)}>
                  {t('cultivation.emptyPropagator')}
                </div>
              ) : null}
            </div>
          </motion.section>
        )}

        {sub === 'registro' && (
          <motion.section
            key="registro"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {addToTableContext ? (
              <div
                className={cn(
                  'space-y-4 rounded-2xl p-4 shadow-sm sm:p-5',
                  C.card,
                )}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className={cn('text-sm font-semibold', C.heading)}>
                      {t('cultivation.addToTableTarget')}:{' '}
                      {rooms.find((r) => r.id === addToTableContext.roomId)?.label ?? '—'}{' '}
                      —{' '}
                      {tables.find((x) => x.id === addToTableContext.tableId)?.label ?? '—'}
                    </p>
                    <p className={cn('text-sm', C.muted)}>
                      {t('cultivation.addToTableStrainCard')}:{' '}
                      <span className={cn('font-medium', C.subheading)}>
                        {vegPoolForAdd?.cardStrain
                          ? vegPoolForAdd.cardStrain
                          : t('cultivation.addToTableStrainAny')}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setAddToTableContext(null)}
                      className={cn(
                        'rounded-xl px-3 py-2 text-sm font-medium',
                        C.muted,
                        'ring-1 ring-inset ring-gray-200 hover:bg-gray-50 dark:ring-zinc-600 dark:hover:bg-zinc-800',
                      )}
                    >
                      {t('cultivation.dismissAddTarget')}
                    </button>
                  </div>
                </div>
                {vegPoolForAdd && vegPoolForAdd.groups.length > 0 ? (
                  <div className="mt-2 space-y-3 pt-4">
                    <div>
                      <p className={cn('text-xs font-semibold uppercase tracking-wide', C.heading)}>
                        {t('cultivation.vegPoolTitle')}
                      </p>
                      <p className={cn('mt-1 text-xs leading-snug', C.muted)}>
                        {t('cultivation.vegPoolHint')}
                      </p>
                      <p className={cn('mt-1 text-[11px]', C.subheading)}>
                        {vegPoolForAdd.vegRoomLabel}
                      </p>
                    </div>
                    <div className="max-h-64 space-y-3 overflow-y-auto pr-1 sm:max-h-80">
                      {vegPoolForAdd.groups.map(({ strain, items }) => (
                        <div
                          key={strain}
                          className={cn('rounded-xl bg-gray-50/70 px-3 py-2 shadow-sm dark:bg-zinc-900/55')}
                        >
                          <p className={cn('text-xs font-semibold', C.heading)}>
                            {strain}{' '}
                            <span className={cn('font-normal', C.muted)}>
                              ({items.length})
                            </span>
                          </p>
                          <ul className="mt-2 flex flex-wrap gap-1.5">
                            {items.map((p) => (
                              <li key={p.id}>
                                <button
                                  type="button"
                                  onClick={() => handleMoveFromVegToTarget(p.id)}
                                  className={cn(
                                    'inline-flex flex-col items-start gap-0.5 rounded-lg px-2 py-1.5 text-left text-xs',
                                    'ring-1 ring-inset ring-gray-200 hover:bg-emerald-50 dark:ring-zinc-700 dark:hover:bg-emerald-950/40',
                                  )}
                                >
                                  <span className={cn('font-mono', C.heading)}>{p.id}</span>
                                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400">
                                    {t('cultivation.moveToThisTable')}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : vegPoolForAdd && vegPoolForAdd.groups.length === 0 ? (
                  <p className={cn('mt-3 pt-1 text-sm', C.muted)}>
                    {t('cultivation.emptyVegPool')}
                  </p>
                ) : null}

                <div className="mt-2 space-y-3 pt-4">
                  <div>
                    <p className={cn('text-xs font-semibold uppercase tracking-wide', C.heading)}>
                      {t('cultivation.healthyPoolTitle')}
                    </p>
                    <p className={cn('mt-1 text-xs leading-snug', C.muted)}>
                      {t('cultivation.healthyPoolHint')}
                    </p>
                  </div>
                  <div className="max-h-80 overflow-y-auto pr-1">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className={cn('text-[11px] uppercase tracking-wide', C.tableHead)}>
                        <tr>
                          <th className="px-2 py-2 font-medium">{t('cultivation.colBracelet')}</th>
                          <th className="px-2 py-2 font-medium">{t('cultivation.colStrain')}</th>
                          <th className="px-2 py-2 font-medium">{t('cultivation.colLocation')}</th>
                          <th className="w-40 px-2 py-2 font-medium" />
                        </tr>
                      </thead>
                      <tbody className={C.tableRow}>
                        {healthyTaggedPlants.map((p) => (
                          <tr key={p.id} className={cn('transition', C.rowHover)}>
                            <td className={cn('px-2 py-2 font-mono text-[12px]', C.heading)}>{p.id}</td>
                            <td className={cn('px-2 py-2 text-xs', C.muted)}>{p.strain}</td>
                            <td className={cn('px-2 py-2 text-xs', C.muted)}>
                              {formatLocation(p, rooms, tables, t)}
                            </td>
                            <td className="px-2 py-2">
                              <button
                                type="button"
                                onClick={() => moveActivePlantToTarget(p.id)}
                                className={cn('rounded-lg px-2.5 py-1.5 text-xs font-medium', C.btnSecondary)}
                              >
                                {t('cultivation.moveToThisTable')}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {healthyTaggedPlants.length === 0 ? (
                      <p className={cn('py-6 text-center text-sm', C.muted)}>
                        {t('cultivation.emptyHealthyPool')}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div>
                  <label className={cn(labelClass, 'sr-only sm:not-sr-only')}>
                    {t('cultivation.filterStatus')}
                  </label>
                  <SoftSelect
                    value={filterStatus}
                    onChange={(v) => setFilterStatus(v)}
                    options={[
                      { value: 'all', label: t('cultivation.all') },
                      { value: 'activa', label: t('cultivation.status_activa') },
                      { value: 'cuarentena', label: t('cultivation.status_cuarentena') },
                      { value: 'muerta', label: t('cultivation.status_muerta') },
                      { value: 'cosechada', label: t('cultivation.status_cosechada') },
                    ]}
                    chipText={
                      filterStatus === 'all'
                        ? t('cultivation.all')
                        : t(`cultivation.status_${filterStatus}` as 'cultivation.status_activa')
                    }
                    ariaLabel={t('cultivation.filterStatus')}
                    variant="field"
                    className="w-full min-w-[160px] sm:w-auto"
                    triggerClassName={cn(inputClass, 'w-full min-w-[160px] sm:w-auto')}
                  />
                </div>
                <div>
                  <label className={cn(labelClass, 'sr-only sm:not-sr-only')}>
                    {t('cultivation.filterStrain')}
                  </label>
                  <SoftSelect
                    value={filterStrain}
                    onChange={setFilterStrain}
                    options={[
                      { value: 'all', label: t('cultivation.all') },
                      ...strainOptions.map((s) => ({ value: s, label: s })),
                    ]}
                    chipText={
                      filterStrain === 'all' ? t('cultivation.all') : filterStrain
                    }
                    ariaLabel={t('cultivation.filterStrain')}
                    variant="field"
                    className="w-full min-w-[180px] sm:w-auto"
                    triggerClassName={cn(inputClass, 'w-full min-w-[180px] sm:w-auto')}
                  />
                </div>
              </div>
            </div>

            <div
              className={cn(
                'overflow-hidden rounded-2xl',
                hideTabs ? 'bg-[#fdfdfd]' : cn('shadow-sm', C.card),
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead className={cn('text-xs uppercase tracking-wide', C.tableHead)}>
                    <tr>
                      <th className="w-14 px-2 py-3 font-medium">{t('cultivation.colPhoto')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colBracelet')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colStrain')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colMadre')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colLocation')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.currentStageLabel')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colPlanted')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colStatus')}</th>
                      <th className="w-14 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className={C.tableRow}>
                    {filteredPlants.map((p) => {
                      const strainImg = strainImageFromBank(geneticsBank, p.strain)
                      const stageValue: TableStage =
                        p.growthStage ?? 'vegetacion'
                      return (
                      <tr key={p.id} className={cn('transition', C.rowHover)}>
                        <td className="px-2 py-3 align-middle">
                          <div
                            className={cn(
                              'flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-gray-50/90 shadow-sm dark:bg-zinc-900/50',
                              C.imagePlaceholder,
                            )}
                          >
                            {strainImg ? (
                              <img
                                src={strainImg}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon className="h-5 w-5 opacity-35" strokeWidth={1.5} />
                            )}
                          </div>
                        </td>
                        <td className={cn('px-4 py-3', C.heading)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13px]">{p.id}</span>
                            {p.isMotherStock ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-100/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/55 dark:text-emerald-200 dark:ring-emerald-800">
                                {t('cultivation.motherMapBadge')}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={cn('px-4 py-3', C.muted)}>{p.strain}</td>
                        <td className={cn('px-4 py-3 font-mono text-[12px]', C.muted)}>
                          {p.motherPlantId?.trim() ? p.motherPlantId.trim() : '—'}
                        </td>
                        <td className={cn('px-4 py-3', C.muted)}>
                          {formatLocation(p, rooms, tables, t)}
                        </td>
                        <td className={cn('px-4 py-3', C.muted)}>
                          <div className="inline-flex items-center gap-2">
                            <StageGlyph
                              stage={stageValue}
                              className={cn(
                                'h-4 w-4 shrink-0',
                                tableIconAccentClass(stageValue),
                              )}
                            />
                            <span className={cn('text-xs font-medium', C.heading)}>
                              {stageValue === 'empty'
                                ? t('cultivoBoard.tabGerminacion')
                                : stageSelectLabel(t, stageValue)}
                            </span>
                          </div>
                        </td>
                        <td className={cn('px-4 py-3 tabular-nums', C.muted)}>{p.plantedDate}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              statusPillClass(p.status),
                            )}
                          >
                            {t(`cultivation.status_${p.status}` as 'cultivation.status_activa')}
                          </span>
                        </td>
                        <td className="px-2 py-3">
                          <span className={cn('text-xs', C.muted)}>—</span>
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {filteredPlants.length === 0 ? (
                <div className={cn('px-4 py-12 text-center text-sm', C.muted)}>
                  {t('cultivation.emptyRegistry')}
                </div>
              ) : null}
            </div>
          </motion.section>
        )}

        {sub === 'aislamiento' && (
          <motion.section
            key="aislamiento"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            <p className={cn('max-w-2xl text-sm leading-relaxed', C.muted)}>
              {t('cultivation.subtitleIsolation')}
            </p>
            <div
              className={cn(
                'overflow-hidden rounded-2xl shadow-sm',
                C.card,
              )}
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[680px] text-left text-sm">
                  <thead className={cn('text-xs uppercase tracking-wide', C.tableHead)}>
                    <tr>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colBracelet')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colStrain')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colPlanted')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colStatus')}</th>
                      <th className="px-4 py-3 font-medium">{t('cultivation.colDeathReason')}</th>
                      <th className="w-14 px-2 py-3" />
                    </tr>
                  </thead>
                  <tbody className={C.tableRow}>
                    {isolationPlants.map((p) => (
                      <tr key={p.id} className={cn('transition', C.rowHover)}>
                        <td className={cn('px-4 py-3', C.heading)}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-[13px]">{p.id}</span>
                            {p.isMotherStock ? (
                              <span className="inline-flex items-center rounded-md bg-emerald-100/95 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-emerald-800 ring-1 ring-inset ring-emerald-200/80 dark:bg-emerald-950/55 dark:text-emerald-200 dark:ring-emerald-800">
                                {t('cultivation.motherMapBadge')}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className={cn('px-4 py-3', C.muted)}>{p.strain}</td>
                        <td className={cn('px-4 py-3 tabular-nums', C.muted)}>{p.plantedDate}</td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
                              statusPillClass(p.status),
                            )}
                          >
                            {t(`cultivation.status_${p.status}` as 'cultivation.status_activa')}
                          </span>
                        </td>
                        <td className={cn('px-4 py-3 text-xs', C.muted)}>
                          {p.status === 'muerta' ? p.deathReason ?? '—' : '—'}
                        </td>
                        <td className="px-2 py-3">
                          <PlantRowMenu
                            plant={p}
                            t={t}
                            onDead={() => {
                              setDeadPlantId(p.id)
                              setDeadReason('')
                            }}
                            onQuarantine={() => setPlantStatus(p.id, 'cuarentena')}
                            onActivate={() => setPlantStatus(p.id, 'activa')}
                            onMove={() => {
                              setMovePlantId(p.id)
                              const r = rooms[0]!.id
                              setMoveTargetRoom(r)
                              const ts = tables.filter((x) => x.roomId === r)
                              setMoveTargetTable(ts[0]?.id ?? '')
                            }}
                            onUnassign={() => {
                              movePlant(p.id, '', '')
                            }}
                            onDelete={() => {
                              if (!confirm(t('cultivation.confirmDeletePlant'))) return
                              removePlant(p.id)
                            }}
                            onSetMotherStock={(asMother) =>
                              requestSetMotherStock(p.id, asMother)
                            }
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {isolationPlants.length === 0 ? (
                <div className={cn('px-4 py-12 text-center text-sm', C.muted)}>
                  {t('cultivation.emptyIsolation')}
                </div>
              ) : null}
            </div>
          </motion.section>
        )}

        {sub === 'cosecha' && (
          <motion.section
            key="cosecha"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          >
            {activeBatches.map((b) => (
              <article
                key={b.id}
                className={cn(
                  'flex flex-col gap-4 rounded-3xl p-5 shadow-sm',
                  C.card,
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-2xl', C.iconBox)}>
                    <Scale className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn('text-sm font-semibold', C.heading)}>
                      {b.roomLabel} · {b.tableLabel}
                    </p>
                    <p className={cn('mt-0.5 text-sm', C.muted)}>{b.strain}</p>
                    <p className={cn('mt-1 text-xs', C.subheading)}>
                      {t('cultivation.batchPlants')}: {b.plantCount}
                    </p>
                  </div>
                  <button
                    type="button"
                    title={t('cultivation.deleteHarvest')}
                    aria-label={t('cultivation.deleteHarvest')}
                    onClick={() => {
                      if (!confirm(t('cultivation.deleteHarvestConfirm'))) return
                      removeHarvestBatch(b.id)
                      setTransferBatch((cur) => (cur?.id === b.id ? null : cur))
                    }}
                    className={cn(
                      'shrink-0 rounded-xl p-2 text-red-600/90 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40',
                    )}
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={1.75} aria-hidden />
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t('cultivation.wetWeight')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={b.wetWeight ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value
                        updateHarvest(b.id, {
                          wetWeight: v === '' ? null : Number(v.replace(',', '.')),
                        })
                      }}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.dryWeight')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className={inputClass}
                      value={b.dryWeight ?? ''}
                      placeholder="—"
                      onChange={(e) => {
                        const v = e.target.value
                        updateHarvest(b.id, {
                          dryWeight: v === '' ? null : Number(v.replace(',', '.')),
                        })
                      }}
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => openTransfer(b)}
                  className={cn('mt-auto rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                >
                  {t('cultivation.transferStock')}
                </button>
              </article>
            ))}
            {activeBatches.length === 0 ? (
              <div
                className={cn(
                  'col-span-full rounded-2xl bg-gray-50/70 py-16 text-center text-sm dark:bg-zinc-900/50',
                  C.cardMuted,
                  C.muted,
                )}
              >
                {t('cultivation.emptyHarvest')}
              </div>
            ) : null}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(() => {
          if (!geneticsViewId) return null
          const selected = geneticsBank.find((g) => g.id === geneticsViewId)
          if (!selected) return null
          return (
            <StrainProfileView
              item={selected}
              locale={locale}
              onClose={() => setGeneticsViewId(null)}
            />
          )
        })()}

        {seedProfile ? (
          <SeedProfileExperience
            seedling={seedProfile}
            macroImage={selectedSeedMacroImage}
            onClose={() => setSeedProfile(null)}
            onPutBracelet={() => {
              setSeedMoveErr(null)
              setSeedMove(seedProfile)
              setSeedMoveBracelet('')
              setSeedMoveDate(new Date().toISOString().slice(0, 10))
              setSeedProfile(null)
            }}
          />
        ) : null}

        {mapDetail ? (
          <MapTableSlideOver
            key={`${mapDetail.tableId}-${mapDetail.plantId ?? 'mesa'}`}
            tableId={mapDetail.tableId}
            plantFocusId={mapDetail.plantId}
            onClose={() => setMapDetail(null)}
            rooms={rooms}
            tables={tables}
            plants={plants}
            strainOptions={strainOptions}
            t={t}
            setTableStage={setTableStage}
            setTableStrain={setTableStrain}
            harvestPlant={harvestPlant}
            onHarvestSuccess={() => onSubChange('cosecha')}
            onDeadPlant={(id) => {
              setDeadPlantId(id)
              setDeadReason('')
            }}
            onQuarantinePlant={(id) => setPlantStatus(id, 'cuarentena')}
            onActivatePlant={(id) => setPlantStatus(id, 'activa')}
            onUnassignPlant={(id) => {
              movePlant(id, '', '')
            }}
            onSetMotherStock={(pid, asMother) => {
              requestSetMotherStock(pid, asMother)
            }}
            onDeletePlant={(id) => removePlant(id)}
          />
        ) : null}

        {mapAddRoomOpen ? (
          <ModalShell
            title={t('cultivation.mapAddRoomTitle')}
            subtitle={t('cultivation.mapAddRoomSubtitle')}
            onClose={() => setMapAddRoomOpen(false)}
          >
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault()
                const id = addRoom(mapNewRoomLabel, mapNewRoomVegOnly)
                setMapRoomFilterIds((prev) =>
                  prev.includes(id) ? prev : [...prev, id],
                )
                setMapAddRoomOpen(false)
                setMapNewRoomLabel('')
                setMapNewRoomVegOnly(false)
              }}
            >
              <div>
                <label className={labelClass}>{t('cultivation.mapRoomNameLabel')}</label>
                <input
                  className={inputClass}
                  value={mapNewRoomLabel}
                  onChange={(e) => setMapNewRoomLabel(e.target.value)}
                  placeholder={t('cultivation.mapRoomNamePh')}
                  autoComplete="off"
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 dark:border-zinc-600"
                  checked={mapNewRoomVegOnly}
                  onChange={(e) => setMapNewRoomVegOnly(e.target.checked)}
                />
                <span className={cn('text-sm', C.heading)}>{t('cultivation.mapRoomVegOnly')}</span>
              </label>
              <button type="submit" className={cn('w-full rounded-2xl py-3.5 text-sm font-semibold', C.btnPrimary)}>
                {t('cultivation.mapRoomSave')}
              </button>
            </form>
          </ModalShell>
        ) : null}

        {geneticsModal ? (
          <StrainProfileSlideOver
            key={
              geneticsModal === 'new'
                ? 'genetics-new'
                : `genetics-${geneticsModal.editId}`
            }
            initial={
              geneticsModal === 'new'
                ? null
                : geneticsBank.find((g) => g.id === geneticsModal.editId) ?? null
            }
            locale={locale}
            onClose={() => setGeneticsModal(null)}
            onSave={(row) => {
              if (geneticsModal === 'new') {
                const r = addGeneticsBank(row)
                if (!r.ok) {
                  if (r.error === 'duplicate') {
                    const key = row.name.trim().toLowerCase()
                    const existing = geneticsBank.find(
                      (g) => g.name.trim().toLowerCase() === key,
                    )
                    if (existing) {
                      setPendingGeneticsViewId(existing.id)
                      return
                    }
                  }
                  window.alert(t('cultivation.geneticsNameRequired'))
                  return false
                }
                setPendingGeneticsViewId(r.id)
                return
              }
              const ok = updateGeneticsBank(geneticsModal.editId, row)
              if (!ok) {
                window.alert(t('cultivation.geneticsDuplicate'))
                return false
              }
            }}
            t={t}
          />
        ) : null}

        {registerOpen && (
          <ModalShell
            title={t('cultivation.registerPlantTitle')}
            onClose={() => setRegisterOpen(false)}
          >
            <form onSubmit={submitRegister} className="space-y-3">
              <div>
                <label className={labelClass}>{t('cultivation.registerNumber')}</label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    placeholder={t('cultivation.registerNumberPh')}
                    autoComplete="off"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => openOcr('register')}
                    className={cn('inline-flex items-center gap-2 rounded-2xl px-3 text-sm font-medium', C.btnSecondary)}
                    aria-label={t('cultivation.scanBracelet')}
                  >
                    <Camera className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.strain')}</label>
                <StrainAutocomplete
                  tenantId={tenantId}
                  value={regStrain}
                  onChange={setRegStrain}
                  className={inputClass}
                  required
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass}>{t('cultivation.selectRoom')}</label>
                  <SoftSelect
                    value={regRoomId}
                    onChange={(v) => {
                      setRegRoomId(v)
                      const ft = tables.find((x) => x.roomId === v)
                      if (ft) setRegTableId(ft.id)
                    }}
                    options={rooms.map((r) => ({ value: r.id, label: r.label }))}
                    chipText={rooms.find((r) => r.id === regRoomId)?.label ?? ''}
                    ariaLabel={t('cultivation.selectRoom')}
                    variant="field"
                    triggerClassName={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>{t('cultivation.selectTable')}</label>
                  <SoftSelect
                    value={regTableId}
                    onChange={setRegTableId}
                    options={tables
                      .filter((x) => x.roomId === regRoomId)
                      .map((tb) => ({ value: tb.id, label: tb.label }))}
                    chipText={
                      tables.find((x) => x.id === regTableId)?.label ?? ''
                    }
                    ariaLabel={t('cultivation.selectTable')}
                    variant="field"
                    triggerClassName={inputClass}
                  />
                </div>
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.registerDate')}</label>
                <input
                  className={inputClass}
                  type="date"
                  value={regDate}
                  onChange={(e) => setRegDate(e.target.value)}
                  required
                />
              </div>
              {regErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {regErr === 'duplicate'
                    ? t('cultivation.errorDuplicate')
                    : regErr === 'strain'
                      ? t('cultivation.errorStrain')
                      : regErr === 'empty'
                        ? t('cultivation.errorIdEmpty')
                        : regErr}
                </p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(false)}
                  className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}>
                  {t('cultivation.registerSubmit')}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {seedOpen && (
          <ModalShell
            title={t('cultivation.addSeedlingsModalTitle')}
            onClose={() => setSeedOpen(false)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSeedErr(null)
                const res = addSeedlings(
                  seedStrain,
                  seedDate,
                  parseInt(seedQty, 10) || 0,
                  seedOrigin,
                  seedGenetics,
                  seedMotherId,
                )
                if (!res.ok) setSeedErr(res.error)
                else {
                  setSeedOpen(false)
                  setSeedErr(null)
                  setSeedStrain('')
                  setSeedGenetics('')
                  setSeedMotherId('')
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className={labelClass}>{t('cultivation.strain')}</label>
                <StrainAutocomplete
                  tenantId={tenantId}
                  value={seedStrain}
                  onChange={setSeedStrain}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.colSeeded')}</label>
                <input
                  className={inputClass}
                  type="date"
                  value={seedDate}
                  onChange={(e) => setSeedDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.originType')}</label>
                <SoftSelect
                  value={seedOrigin}
                  onChange={(v) => {
                    const x = v === 'clone' ? 'clone' : 'semilla'
                    setSeedOrigin(x)
                    if (x === 'semilla') setSeedMotherId('')
                  }}
                  options={[
                    { value: 'semilla', label: t('cultivation.originSemilla') },
                    { value: 'clone', label: t('cultivation.originClone') },
                  ]}
                  chipText={
                    seedOrigin === 'clone'
                      ? t('cultivation.originClone')
                      : t('cultivation.originSemilla')
                  }
                  ariaLabel={t('cultivation.originType')}
                  variant="field"
                  triggerClassName={inputClass}
                />
              </div>
              {seedOrigin === 'clone' ? (
                <div>
                  <label className={labelClass}>{t('cultivation.motherIdLabel')}</label>
                  <SoftSelect
                    value={seedMotherId}
                    onChange={setSeedMotherId}
                    options={[
                      { value: '', label: t('cultivation.motherIdSelect') },
                      ...motherPlantOptions.map((p) => ({
                        value: p.id,
                        label: `${p.id} · ${p.strain}`,
                      })),
                    ]}
                    chipText={
                      seedMotherId === ''
                        ? t('cultivation.motherIdSelect')
                        : (() => {
                            const p = motherPlantOptions.find((x) => x.id === seedMotherId)
                            return p ? `${p.id} · ${p.strain}` : seedMotherId
                          })()
                    }
                    ariaLabel={t('cultivation.motherIdLabel')}
                    variant="field"
                    triggerClassName={inputClass}
                    warning={seedMotherId === ''}
                  />
                </div>
              ) : null}
              <div>
                <label className={labelClass}>
                  {t('cultivation.geneticsLabel')}
                  <span className={cn('font-normal', C.muted)}>{' '}
                    ({t('cultivation.geneticsOptionalHint')})
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={seedGenetics}
                  onChange={(e) => setSeedGenetics(e.target.value)}
                  placeholder={t('cultivation.geneticsOptionalHint')}
                  autoComplete="off"
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.seedlingQuantity')}</label>
                <input
                  className={inputClass}
                  type="number"
                  min={1}
                  max={2000}
                  step={1}
                  value={seedQty}
                  onChange={(e) => setSeedQty(e.target.value)}
                  required
                />
              </div>
              {seedErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {seedErr === 'strain'
                    ? t('cultivation.errorStrain')
                    : seedErr === 'qty'
                      ? t('cultivation.errorQty')
                      : seedErr === 'mother_required'
                        ? t('cultivation.errorMotherRequired')
                        : seedErr === 'mother_not_found'
                          ? t('cultivation.errorMotherNotFound')
                          : seedErr}
                </p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSeedOpen(false)}
                  className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                >
                  {t('cultivation.addSeedling')}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {seedEdit && (
          <ModalShell
            title={t('cultivation.editSeedlingTitle')}
            onClose={() => setSeedEdit(null)}
          >
            <form
              onSubmit={(e) => {
                e.preventDefault()
                setSeedEditErr(null)
                const id = seedEdit.id
                const res = updatePropagatorSeedling(
                  id,
                  seedEditStrain,
                  seedEditDate,
                  seedEditOrigin,
                  seedEditGenetics,
                  seedEditMotherId,
                )
                if (!res.ok) setSeedEditErr(res.error)
                else {
                  setSeedEdit(null)
                  const g = seedEditGenetics.trim()
                  const mid =
                    seedEditOrigin === 'clone' ? seedEditMotherId.trim() : ''
                  setSeedMove((prev) =>
                    prev?.id === id
                      ? {
                          ...prev,
                          strain: seedEditStrain.trim(),
                          seededDate: seedEditDate,
                          origin: seedEditOrigin,
                          genetics: g || undefined,
                          motherPlantId: mid || undefined,
                        }
                      : prev,
                  )
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className={labelClass}>{t('cultivation.strain')}</label>
                <StrainAutocomplete
                  tenantId={tenantId}
                  value={seedEditStrain}
                  onChange={setSeedEditStrain}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.colSeeded')}</label>
                <input
                  className={inputClass}
                  type="date"
                  value={seedEditDate}
                  onChange={(e) => setSeedEditDate(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.originType')}</label>
                <SoftSelect
                  value={seedEditOrigin}
                  onChange={(v) => {
                    const x = v === 'clone' ? 'clone' : 'semilla'
                    setSeedEditOrigin(x)
                    if (x === 'semilla') setSeedEditMotherId('')
                  }}
                  options={[
                    { value: 'semilla', label: t('cultivation.originSemilla') },
                    { value: 'clone', label: t('cultivation.originClone') },
                  ]}
                  chipText={
                    seedEditOrigin === 'clone'
                      ? t('cultivation.originClone')
                      : t('cultivation.originSemilla')
                  }
                  ariaLabel={t('cultivation.originType')}
                  variant="field"
                  triggerClassName={inputClass}
                />
              </div>
              {seedEditOrigin === 'clone' ? (
                <div>
                  <label className={labelClass}>{t('cultivation.motherIdLabel')}</label>
                  <SoftSelect
                    value={seedEditMotherId}
                    onChange={setSeedEditMotherId}
                    options={[
                      { value: '', label: t('cultivation.motherIdSelect') },
                      ...(seedEditMotherId &&
                      !motherPlantOptions.some((x) => x.id === seedEditMotherId)
                        ? [{ value: seedEditMotherId, label: seedEditMotherId }]
                        : []),
                      ...motherPlantOptions.map((p) => ({
                        value: p.id,
                        label: `${p.id} · ${p.strain}`,
                      })),
                    ]}
                    chipText={
                      seedEditMotherId === ''
                        ? t('cultivation.motherIdSelect')
                        : (() => {
                            const p = motherPlantOptions.find(
                              (x) => x.id === seedEditMotherId,
                            )
                            return p
                              ? `${p.id} · ${p.strain}`
                              : seedEditMotherId
                          })()
                    }
                    ariaLabel={t('cultivation.motherIdLabel')}
                    variant="field"
                    triggerClassName={inputClass}
                    warning={seedEditMotherId === ''}
                  />
                </div>
              ) : null}
              <div>
                <label className={labelClass}>
                  {t('cultivation.geneticsLabel')}
                  <span className={cn('font-normal', C.muted)}>{' '}
                    ({t('cultivation.geneticsOptionalHint')})
                  </span>
                </label>
                <input
                  className={inputClass}
                  value={seedEditGenetics}
                  onChange={(e) => setSeedEditGenetics(e.target.value)}
                  placeholder={t('cultivation.geneticsOptionalHint')}
                  autoComplete="off"
                />
              </div>
              {seedEditErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {seedEditErr === 'strain'
                    ? t('cultivation.errorStrain')
                    : seedEditErr === 'mother_required'
                      ? t('cultivation.errorMotherRequired')
                      : seedEditErr === 'mother_not_found'
                        ? t('cultivation.errorMotherNotFound')
                        : seedEditErr}
                </p>
              ) : null}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSeedEdit(null)}
                  className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                >
                  {t('common.save')}
                </button>
              </div>
            </form>
          </ModalShell>
        )}

        {seedMove && (
          <ModalShell
            title={t('cultivation.putOnBracelet')}
            subtitle={
              seedMoveStep === 1
                ? [seedMove.strain, seedMove.genetics?.trim()].filter(Boolean).join(' · ') ||
                  seedMove.strain
                : t('cultivation.seedToVegPlacementHint')
            }
            onClose={() => {
              setSeedMove(null)
              setSeedMoveStep(1)
              setSeedVegRoomId('')
              setSeedVegTableId('')
              setSeedMoveBracelet('')
              setSeedMoveErr(null)
            }}
          >
            <div className="space-y-3">
              {seedMoveStep === 1 ? (
                <>
                  <div>
                    <label className={labelClass}>{t('cultivation.registerNumber')}</label>
                    <div className="flex gap-2">
                      <input
                        className={inputClass}
                        value={seedMoveBracelet}
                        onChange={(e) => setSeedMoveBracelet(e.target.value)}
                        placeholder={t('cultivation.registerNumberPh')}
                        autoComplete="off"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => openOcr('bracelet')}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-2xl px-3 text-sm font-medium',
                          C.btnSecondary,
                        )}
                        aria-label={t('cultivation.scanBracelet')}
                      >
                        <Camera className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.braceletDate')}</label>
                    <input
                      className={inputClass}
                      type="date"
                      value={seedMoveDate}
                      onChange={(e) => setSeedMoveDate(e.target.value)}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className={cn('text-sm leading-relaxed', C.muted)}>
                    {[seedMove.strain, seedMove.genetics?.trim()].filter(Boolean).join(' · ') ||
                      seedMove.strain}{' '}
                    ·{' '}
                    <span className="tabular-nums">
                      {seedMoveBracelet.trim() ? seedMoveBracelet.trim() : '—'}
                    </span>
                  </p>
                  <div>
                    <label className={labelClass}>{t('cultivation.selectRoom')}</label>
                    <SoftSelect
                      value={seedVegRoomId}
                      onChange={(rid) => {
                        setSeedVegRoomId(rid)
                        const list = tables.filter((x) => x.roomId === rid)
                        setSeedVegTableId(list[0]?.id ?? '')
                      }}
                      options={rooms.map((r) => ({ value: r.id, label: r.label }))}
                      chipText={
                        rooms.find((r) => r.id === seedVegRoomId)?.label ?? ''
                      }
                      ariaLabel={t('cultivation.selectRoom')}
                      variant="field"
                      triggerClassName={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.selectTable')}</label>
                    <SoftSelect
                      value={seedVegTableId}
                      onChange={setSeedVegTableId}
                      options={tables
                        .filter((x) => x.roomId === seedVegRoomId)
                        .map((tb) => ({ value: tb.id, label: tb.label }))}
                      chipText={
                        tables.find((x) => x.id === seedVegTableId)?.label ?? ''
                      }
                      ariaLabel={t('cultivation.selectTable')}
                      variant="field"
                      triggerClassName={inputClass}
                    />
                  </div>
                </>
              )}

              {seedMoveErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {seedMoveErr === 'duplicate'
                    ? t('cultivation.errorDuplicate')
                    : seedMoveErr === 'empty'
                      ? t('cultivation.errorIdEmpty')
                      : seedMoveErr === 'mother_required'
                        ? t('cultivation.errorMotherRequired')
                        : seedMoveErr === 'mother_not_found'
                          ? t('cultivation.errorMotherNotFound')
                          : seedMoveErr === 'mother_same_id'
                            ? t('cultivation.errorMotherSameId')
                            : seedMoveErr === 'not_found'
                              ? t('cultivation.errorPropagatorNotFound')
                              : seedMoveErr === 'bad_location'
                                ? t('cultivation.errorBadLocation')
                                : seedMoveErr}
                </p>
              ) : null}

              <div className="flex gap-2 pt-2">
                {seedMoveStep === 1 ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSeedMove(null)
                        setSeedMoveStep(1)
                        setSeedVegRoomId('')
                        setSeedVegTableId('')
                        setSeedMoveBracelet('')
                        setSeedMoveErr(null)
                      }}
                      className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeedMoveErr(null)
                        const idTrim = seedMoveBracelet.trim()
                        if (!idTrim) {
                          setSeedMoveErr('empty')
                          return
                        }
                        if (!seedMoveDate.trim()) return
                        const defaultRoomId = rooms.some((r) => r.id === MOTHER_ROOM_ID)
                          ? MOTHER_ROOM_ID
                          : rooms.find((r) => r.vegetationOnly)?.id ?? rooms[0]?.id ?? ''
                        const defaultTableId =
                          tables.find((tb) => tb.roomId === defaultRoomId)?.id ?? ''
                        setSeedVegRoomId(defaultRoomId)
                        setSeedVegTableId(defaultTableId)
                        setSeedMoveStep(2)
                      }}
                      className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                    >
                      {t('cultivation.nextToPlacement')}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setSeedMoveErr(null)
                        setSeedMoveStep(1)
                      }}
                      className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                    >
                      {t('common.back')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!seedMove) return
                        setSeedMoveErr(null)
                        const res = moveSeedlingToVegetation(
                          seedMove.id,
                          seedMoveBracelet,
                          seedMoveDate,
                          seedVegRoomId,
                          seedVegTableId,
                        )
                        if (!res.ok) setSeedMoveErr(res.error)
                        else {
                          setSeedMoveBracelet('')
                          setSeedMoveErr(null)
                          setSeedMove(null)
                          setSeedMoveStep(1)
                          setSeedVegRoomId('')
                          setSeedVegTableId('')
                        }
                      }}
                      className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                    >
                      {t('common.save')}
                    </button>
                  </>
                )}
              </div>
            </div>
          </ModalShell>
        )}

        {deadPlantId && (
          <ModalShell title={t('cultivation.deadTitle')} onClose={() => setDeadPlantId(null)}>
            <textarea
              className={cn(inputClass, 'min-h-[100px] resize-y')}
              value={deadReason}
              onChange={(e) => setDeadReason(e.target.value)}
              placeholder={t('cultivation.deadReasonPh')}
            />
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setDeadPlantId(null)}
                className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPlantStatus(deadPlantId, 'muerta', deadReason || undefined)
                  setDeadPlantId(null)
                }}
                className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
              >
                {t('common.save')}
              </button>
            </div>
          </ModalShell>
        )}

        {motherAssignPlantId && (
          <ModalShell
            title={t('cultivation.actionMarkMother')}
            onClose={() => setMotherAssignPlantId(null)}
          >
            <div className="space-y-3">
              <p className={cn('text-sm', C.muted)}>
                {rooms.find((r) => r.id === MOTHER_ROOM_ID)?.label ?? '—'}
              </p>
              <div>
                <label className={labelClass}>{t('cultivation.selectTable')}</label>
                <SoftSelect
                  value={motherAssignTableId}
                  onChange={setMotherAssignTableId}
                  options={motherRoomTables.map((tb) => ({
                    value: tb.id,
                    label: tb.label,
                  }))}
                  chipText={
                    motherRoomTables.find((x) => x.id === motherAssignTableId)
                      ?.label ?? ''
                  }
                  ariaLabel={t('cultivation.selectTable')}
                  variant="field"
                  triggerClassName={inputClass}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMotherAssignPlantId(null)}
                className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!motherAssignPlantId || !motherAssignTableId) return
                  setPlantMotherStock(
                    motherAssignPlantId,
                    true,
                    motherAssignTableId,
                  )
                  setMotherAssignPlantId(null)
                }}
                className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
              >
                {t('common.save')}
              </button>
            </div>
          </ModalShell>
        )}

        {movePlantId && (
          <ModalShell title={t('cultivation.moveTitle')} onClose={() => setMovePlantId(null)}>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>{t('cultivation.selectRoom')}</label>
                <SoftSelect
                  value={moveTargetRoom}
                  onChange={(rid) => {
                    setMoveTargetRoom(rid)
                    const tsList = tables.filter((x) => x.roomId === rid)
                    setMoveTargetTable(tsList[0]?.id ?? '')
                  }}
                  options={rooms.map((r) => ({ value: r.id, label: r.label }))}
                  chipText={
                    rooms.find((r) => r.id === moveTargetRoom)?.label ?? ''
                  }
                  ariaLabel={t('cultivation.selectRoom')}
                  variant="field"
                  triggerClassName={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.selectTable')}</label>
                <SoftSelect
                  value={moveTargetTable}
                  onChange={setMoveTargetTable}
                  options={tables
                    .filter((x) => x.roomId === moveTargetRoom)
                    .map((tb) => ({ value: tb.id, label: tb.label }))}
                  chipText={
                    tables.find((x) => x.id === moveTargetTable)?.label ?? ''
                  }
                  ariaLabel={t('cultivation.selectTable')}
                  variant="field"
                  triggerClassName={inputClass}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setMovePlantId(null)}
                className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (movePlantId) movePlant(movePlantId, moveTargetRoom, moveTargetTable)
                  setMovePlantId(null)
                }}
                className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
              >
                {t('common.save')}
              </button>
            </div>
          </ModalShell>
        )}

        {transferBatch && (
          <ModalShell
            title={t('cultivation.transferModalTitle')}
            subtitle={t('cultivation.transferHint')}
            onClose={() => setTransferBatch(null)}
          >
            <div className="space-y-3">
              {transferStrainPreview ? (
                <div className="flex justify-center">
                  <img
                    src={transferStrainPreview}
                    alt=""
                    className="h-20 w-20 rounded-2xl object-cover shadow-sm ring-1 ring-black/10 dark:ring-white/10"
                  />
                </div>
              ) : null}
              <div>
                <label className={labelClass}>{t('cultivation.transferGeneticsLabel')}</label>
                <SoftSelect
                  value={transferGeneticsId}
                  onChange={setTransferGeneticsId}
                  options={[
                    { value: '', label: t('stock.geneticsPick') },
                    ...sortedGeneticsBank.map((gb) => ({
                      value: gb.id,
                      label: gb.name,
                    })),
                  ]}
                  chipText={
                    transferGeneticsId === ''
                      ? t('stock.geneticsPick')
                      : sortedGeneticsBank.find((g) => g.id === transferGeneticsId)
                          ?.name ?? t('stock.geneticsPick')
                  }
                  ariaLabel={t('cultivation.transferGeneticsLabel')}
                  variant="field"
                  triggerClassName={inputClass}
                  warning={transferGeneticsId === ''}
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.dryWeight')} (stock)</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={transferGrams}
                  onChange={(e) => setTransferGrams(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>{t('cultivation.pricePerGram')}</label>
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  step="0.01"
                  value={transferPrecio}
                  onChange={(e) => setTransferPrecio(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setTransferBatch(null)}
                className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitTransfer}
                className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
              >
                {t('cultivation.transferConfirm')}
              </button>
            </div>
          </ModalShell>
        )}

        {ocrOpen && (
          <ModalShell
            title={t('cultivation.cameraTitle')}
            subtitle={t('cultivation.cameraHint')}
            onClose={closeOcr}
          >
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl bg-gray-50/50 shadow-sm dark:bg-zinc-900/40">
                <video ref={videoRef} className="h-auto w-full bg-black" playsInline muted />
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center p-[8%]"
                  aria-hidden
                >
                  <div className="h-[42%] w-[86%] max-h-[min(40vw,220px)] rounded-xl border-2 border-emerald-400/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] dark:border-emerald-300/85" />
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
              {ocrErr ? (
                <p className="text-sm text-red-600 dark:text-red-400">{ocrErr}</p>
              ) : null}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={closeOcr}
                  className={cn('flex-1 rounded-2xl border py-3 text-sm font-medium', C.btnSecondary)}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  disabled={ocrBusy}
                  onClick={captureBraceletFromCamera}
                  className={cn('flex-1 rounded-2xl py-3 text-sm font-medium', C.btnPrimary)}
                >
                  {ocrBusy ? t('cultivation.cameraReading') : t('cultivation.cameraCapture')}
                </button>
              </div>
            </div>
          </ModalShell>
        )}
      </AnimatePresence>
    </div>
  )
}
