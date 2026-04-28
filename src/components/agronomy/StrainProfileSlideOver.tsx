import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, X } from 'lucide-react'
import { useRef, useState } from 'react'
import {
  STRAIN_TAGS_AROMAS,
  STRAIN_TAGS_EFECTOS,
  STRAIN_TAGS_MEDICINAL,
  STRAIN_TAGS_NEGATIVOS,
  STRAIN_TAGS_TERPENOS,
  strainTagLabel,
  type StrainProfileTag,
} from '../../data/strainProfileTags'
import type { AppLocale } from '../../store/useSettingsStore'
import type { GeneticsBankEntry } from '../../store/cultivationTypes'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { adaptGlobalStrainToGeneticsDraft } from '../../lib/adaptGlobalStrainToGenetics'
import { StrainAutocomplete } from '../ui/StrainAutocomplete'
import { AvatarBadge } from '@/components/ui/avatar'

type StrainTab = 'general' | 'cultivo' | 'genetica' | 'efectos'

function emptyDraft(): Omit<GeneticsBankEntry, 'id'> {
  return {
    name: '',
    imageUrl: '',
    notes: undefined,
    summary: undefined,
    breeder: undefined,
    floweringWeeks: undefined,
    harvestPeriod: undefined,
    yieldIndoor: undefined,
    yieldOutdoor: undefined,
    growNotes: undefined,
    plantStructure: undefined,
    lineage: undefined,
    geneticRatio: undefined,
    parentStrains: undefined,
    aromas: [],
    efectosPositivos: [],
    medicinal: [],
    terpenos: [],
    efectosNegativos: [],
  }
}

function entryToDraft(entry: GeneticsBankEntry): Omit<GeneticsBankEntry, 'id'> {
  const { id: _entryId, ...rest } = entry
  void _entryId
  return { ...rest }
}

const BRAND_GREEN = '#06663F'

function TagPillGrid({
  tags,
  selected,
  onToggle,
  locale,
}: {
  tags: StrainProfileTag[]
  selected: string[]
  onToggle: (id: string) => void
  locale: AppLocale
}) {
  const setSel = new Set(selected)
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const on = setSel.has(tag.id)
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => onToggle(tag.id)}
            className={cn(
              'rounded-full px-3 py-1.5 text-left text-[12px] font-medium leading-snug transition',
              on
                ? 'text-white shadow-sm'
                : 'bg-gray-100/90 text-gray-700 ring-1 ring-gray-200/80 hover:bg-gray-100 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-zinc-600/60 dark:hover:bg-zinc-800',
            )}
            style={on ? { backgroundColor: BRAND_GREEN } : undefined}
          >
            {strainTagLabel(tag, locale)}
          </button>
        )
      })}
    </div>
  )
}

const TAB_KEYS: { id: StrainTab; labelKey: string }[] = [
  { id: 'general', labelKey: 'cultivation.strainTabGeneral' },
  { id: 'cultivo', labelKey: 'cultivation.strainTabCultivo' },
  { id: 'genetica', labelKey: 'cultivation.strainTabGenetica' },
  { id: 'efectos', labelKey: 'cultivation.strainTabEfectos' },
]

async function fileToOptimizedDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onerror = () => reject(new Error('read_error'))
    r.onload = () => resolve(String(r.result ?? ''))
    r.readAsDataURL(file)
  })

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image()
    el.onload = () => resolve(el)
    el.onerror = () => reject(new Error('image_decode_error'))
    el.src = raw
  })

  const MAX_W = 1400
  const MAX_H = 1400
  const scale = Math.min(1, MAX_W / img.width, MAX_H / img.height)
  const w = Math.max(1, Math.round(img.width * scale))
  const h = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) return raw
  ctx.drawImage(img, 0, 0, w, h)

  // Храним в JPEG, чтобы не раздувать localStorage и не ломать сохранение.
  let quality = 0.86
  let out = canvas.toDataURL('image/jpeg', quality)
  while (out.length > 1_400_000 && quality > 0.56) {
    quality -= 0.08
    out = canvas.toDataURL('image/jpeg', quality)
  }
  return out
}

export function StrainProfileSlideOver({
  initial,
  onClose,
  onSave,
  t,
  locale,
}: {
  initial: GeneticsBankEntry | null
  onClose: () => void
  onSave: (row: Omit<GeneticsBankEntry, 'id'>) => boolean | void
  t: (k: string) => string
  locale: AppLocale
}) {
  const tenantId = 'tenant-default'
  const [tab, setTab] = useState<StrainTab>('general')
  const [draft, setDraft] = useState<Omit<GeneticsBankEntry, 'id'>>(() =>
    initial ? entryToDraft(initial) : emptyDraft(),
  )
  const fileRef = useRef<HTMLInputElement>(null)

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)
  const labelClass = cn('mb-1.5 block text-xs font-medium', C.label)

  const toggleId = (field: keyof Pick<GeneticsBankEntry, 'aromas' | 'efectosPositivos' | 'medicinal' | 'terpenos' | 'efectosNegativos'>, id: string) => {
    setDraft((d) => {
      const cur = d[field] as string[]
      const has = cur.includes(id)
      const next = has ? cur.filter((x) => x !== id) : [...cur, id]
      return { ...d, [field]: next }
    })
  }

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    try {
      const optimized = await fileToOptimizedDataUrl(f)
      setDraft((d) => ({ ...d, imageUrl: optimized }))
    } catch {
      window.alert('No se pudo procesar la imagen.')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  const clearStrainPhoto = () => {
    setDraft((d) => ({ ...d, imageUrl: '' }))
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSave = () => {
    if (!draft.name.trim()) {
      window.alert(t('cultivation.geneticsNameRequired'))
      setTab('general')
      return
    }
    if (draft.imageUrl && draft.imageUrl.length > 1_600_000) {
      window.alert('La imagen es demasiado pesada. Usa una imagen más ligera.')
      setTab('general')
      return
    }
    const cont = onSave({ ...draft, breeder: undefined })
    if (cont !== false) onClose()
  }

  const isNew = !initial

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="strain-slide-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('fixed inset-0 z-[85] p-3 sm:p-5 lg:p-8', C.modalBackdrop)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 20, opacity: 0.98, scale: 0.995 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 14, opacity: 0, scale: 0.995 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={cn(
          'mx-auto flex h-full w-full max-w-[1240px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl',
          C.modalCard,
          'border-gray-200/80 dark:border-zinc-800/80 dark:!bg-[#222222]',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 bg-[#fdfdfd] px-6 pb-3 pt-4 dark:bg-[#222222] lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="strain-slide-title"
                className={cn('text-xl font-semibold tracking-tight lg:text-2xl', C.heading)}
              >
                {isNew ? t('cultivation.strainSlideTitleNew') : (initial?.name ?? t('cultivation.geneticsEdit'))}
              </h2>
              {t('cultivation.strainSlideSubtitle').trim() ? (
                <p className={cn('mt-1 text-sm leading-relaxed', C.muted)}>
                  {t('cultivation.strainSlideSubtitle')}
                </p>
              ) : null}
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
          {/* Дорожка заметно светлее #222222 фона модалки; #252525 от C.segmentedBg почти сливается (Δ≈3). */}
          <div
            className={cn(
              'relative mt-3 flex w-full rounded-full p-1.5 shadow-inner',
              'bg-gray-100/80 dark:bg-[#333333] dark:shadow-none',
            )}
          >
            {TAB_KEYS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex min-h-[42px] flex-1 items-center justify-center rounded-full px-4 py-2 text-sm transition-colors duration-200',
                  tab === id
                    ? 'font-semibold text-white'
                    : 'font-medium text-gray-500 hover:text-green-800 dark:text-[#9a9a9a] dark:hover:text-[#f1f1f1]',
                )}
              >
                {tab === id ? (
                  <motion.span
                    layoutId="strain-profile-tab-pill"
                    className="pointer-events-none absolute inset-0 z-[1] rounded-full"
                    style={{ backgroundColor: BRAND_GREEN }}
                    transition={{ type: 'spring', damping: 28, stiffness: 380 }}
                    aria-hidden
                  />
                ) : null}
                <span className="relative z-[2] leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[#fdfdfd] dark:bg-[#222222]">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className={cn(
                'flex-1 min-h-0 overflow-x-hidden overflow-y-auto py-5 pl-6 pr-0 scrollbar-modern outline-none lg:pl-8 dark:scrollbar-modern-dark',
                tab === 'efectos' && 'py-2.5 lg:py-3',
              )}
            >
              <div
                className={cn(
                  tab === 'efectos' ? 'space-y-3' : 'space-y-5',
                  'w-full max-w-none pr-4 lg:pr-6',
                )}
              >
              {tab === 'general' ? (
                <>
                  <div className="grid min-w-0 gap-4 lg:grid-cols-[11rem_minmax(0,1fr)] lg:items-start">
                    <div className="relative h-44 w-44 shrink-0 justify-self-center lg:justify-self-start">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/*"
                        className="sr-only"
                        onChange={onFile}
                      />
                      <div
                        className={cn(
                          'relative h-full w-full overflow-hidden rounded-2xl ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
                        )}
                      >
                        {draft.imageUrl ? (
                          <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <>
                            <div
                              className={cn('absolute inset-0 bg-gradient-to-br', C.imagePlaceholder)}
                              aria-hidden
                            />
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              className="group absolute inset-0 z-10 flex items-center justify-center"
                              aria-label={t('profileModal.choosePhoto')}
                            >
                              <ImagePlus
                                className="h-14 w-14 text-gray-400 opacity-70 transition-all duration-200 ease-out group-hover:scale-[1.2] group-hover:text-white dark:text-[#8c8c8c] dark:opacity-80 dark:group-hover:text-white"
                                strokeWidth={1.25}
                                aria-hidden
                              />
                            </button>
                          </>
                        )}
                        {draft.imageUrl ? (
                          <AvatarBadge
                            className="h-10 w-10 border-[3px] shadow-md"
                            title={t('profileModal.removePhoto')}
                            aria-label={t('profileModal.removePhoto')}
                            onClick={(e) => {
                              e.stopPropagation()
                              clearStrainPhoto()
                            }}
                          >
                            <X className="h-5 w-5" strokeWidth={2.25} />
                          </AvatarBadge>
                        ) : null}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <label className={labelClass}>{t('cultivation.geneticsName')}</label>
                      <StrainAutocomplete
                        tenantId={tenantId}
                        value={draft.name}
                        onChange={(v) => setDraft((d) => ({ ...d, name: v }))}
                        onSelectRow={(row) => {
                          setDraft((d) => adaptGlobalStrainToGeneticsDraft(row, d))
                        }}
                        className={inputClass}
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldSummary')}</label>
                    <textarea
                      className={cn(inputClass, 'min-h-[88px] resize-y')}
                      value={draft.summary ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                      placeholder={t('cultivation.geneticsNotesPh')}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.geneticsNotes')}</label>
                    <textarea
                      className={cn(inputClass, 'min-h-[72px] resize-y')}
                      value={draft.notes ?? ''}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          notes: e.target.value.trim() ? e.target.value : undefined,
                        }))
                      }
                      placeholder={t('cultivation.strainFieldInternalNotesPh')}
                    />
                  </div>
                </>
              ) : null}

              {tab === 'cultivo' ? (
                <>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldFlowering')}</label>
                    <input
                      className={inputClass}
                      value={draft.floweringWeeks ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, floweringWeeks: e.target.value }))}
                      placeholder={t('cultivation.strainPhWeeks')}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldHarvest')}</label>
                    <input
                      className={inputClass}
                      value={draft.harvestPeriod ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, harvestPeriod: e.target.value }))}
                      placeholder={t('cultivation.strainPhHarvest')}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>{t('cultivation.strainFieldYieldIn')}</label>
                      <input
                        className={inputClass}
                        value={draft.yieldIndoor ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, yieldIndoor: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>{t('cultivation.strainFieldYieldOut')}</label>
                      <input
                        className={inputClass}
                        value={draft.yieldOutdoor ?? ''}
                        onChange={(e) => setDraft((d) => ({ ...d, yieldOutdoor: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldStructure')}</label>
                    <input
                      className={inputClass}
                      value={draft.plantStructure ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, plantStructure: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldGrowNotes')}</label>
                    <textarea
                      className={cn(inputClass, 'min-h-[88px] resize-y')}
                      value={draft.growNotes ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, growNotes: e.target.value }))}
                    />
                  </div>
                </>
              ) : null}

              {tab === 'genetica' ? (
                <>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldLineage')}</label>
                    <textarea
                      className={cn(inputClass, 'min-h-[80px] resize-y')}
                      value={draft.lineage ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, lineage: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldRatio')}</label>
                    <input
                      className={inputClass}
                      value={draft.geneticRatio ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, geneticRatio: e.target.value }))}
                      placeholder={t('cultivation.strainPhRatio')}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t('cultivation.strainFieldParents')}</label>
                    <textarea
                      className={cn(inputClass, 'min-h-[80px] resize-y')}
                      value={draft.parentStrains ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, parentStrains: e.target.value }))}
                    />
                  </div>
                </>
              ) : null}

              {tab === 'efectos' ? (
                <>
                  <section>
                    <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
                      {t('cultivation.strainSectionAromas')}
                    </p>
                    <TagPillGrid
                      tags={STRAIN_TAGS_AROMAS}
                      selected={draft.aromas}
                      onToggle={(id) => toggleId('aromas', id)}
                      locale={locale}
                    />
                  </section>
                  <section>
                    <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
                      {t('cultivation.strainSectionEfectos')}
                    </p>
                    <TagPillGrid
                      tags={STRAIN_TAGS_EFECTOS}
                      selected={draft.efectosPositivos}
                      onToggle={(id) => toggleId('efectosPositivos', id)}
                      locale={locale}
                    />
                  </section>
                  <section>
                    <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
                      {t('cultivation.strainSectionMedicinal')}
                    </p>
                    <TagPillGrid
                      tags={STRAIN_TAGS_MEDICINAL}
                      selected={draft.medicinal}
                      onToggle={(id) => toggleId('medicinal', id)}
                      locale={locale}
                    />
                  </section>
                  <section>
                    <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
                      {t('cultivation.strainSectionTerpenos')}
                    </p>
                    <TagPillGrid
                      tags={STRAIN_TAGS_TERPENOS}
                      selected={draft.terpenos}
                      onToggle={(id) => toggleId('terpenos', id)}
                      locale={locale}
                    />
                  </section>
                  <section>
                    <p className={cn('mb-1 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
                      {t('cultivation.strainSectionNegativos')}
                    </p>
                    <TagPillGrid
                      tags={STRAIN_TAGS_NEGATIVOS}
                      selected={draft.efectosNegativos}
                      onToggle={(id) => toggleId('efectosNegativos', id)}
                      locale={locale}
                    />
                  </section>
                </>
              ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="shrink-0 bg-white/95 px-6 py-3 dark:bg-[#222222] lg:px-8">
          <div className="flex w-full gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 rounded-full border py-3.5 text-sm font-medium', C.btnSecondary)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn('flex-1 rounded-full py-3.5 text-sm font-semibold text-white hover:brightness-110 active:brightness-95')}
              style={{ backgroundColor: BRAND_GREEN }}
            >
              {t('cultivation.strainSave')}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  )
}
