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
    <div className="flex flex-wrap gap-2">
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
                ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30 dark:bg-emerald-500 dark:ring-emerald-400/25'
                : 'bg-gray-100/90 text-gray-700 ring-1 ring-gray-200/80 hover:bg-gray-100 dark:bg-zinc-800/90 dark:text-zinc-200 dark:ring-zinc-600/60 dark:hover:bg-zinc-800',
            )}
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
    const cont = onSave(draft)
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
          'border-gray-200/80 dark:border-zinc-700/80',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="shrink-0 border-b border-gray-100/90 px-6 pb-4 pt-5 dark:border-zinc-800 lg:px-8">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2
                id="strain-slide-title"
                className={cn('text-xl font-semibold tracking-tight lg:text-2xl', C.heading)}
              >
                {isNew ? t('cultivation.strainSlideTitleNew') : (initial?.name ?? t('cultivation.geneticsEdit'))}
              </h2>
              <p className={cn('mt-1 text-sm leading-relaxed', C.muted)}>
                {t('cultivation.strainSlideSubtitle')}
              </p>
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
          <div
            className={cn(
              'mt-4 flex gap-1 rounded-2xl border p-1 lg:max-w-[760px]',
              'border-gray-200/80 bg-gray-50/80 dark:border-zinc-700 dark:bg-zinc-900/50',
            )}
            role="tablist"
          >
            {TAB_KEYS.map(({ id, labelKey }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'relative flex-1 rounded-xl px-2 py-2.5 text-center text-[12px] font-semibold sm:text-[13px]',
                  tab === id ? C.heading : cn(C.muted, 'hover:text-gray-800 dark:hover:text-zinc-200'),
                )}
              >
                {tab === id && (
                  <motion.span
                    layoutId="strain-profile-tab-bg"
                    className={cn('absolute inset-0 rounded-xl shadow-sm', C.segmentedPill)}
                    transition={{ type: 'spring', damping: 30, stiffness: 350 }}
                  />
                )}
                <span className="relative z-[1] leading-tight">{t(labelKey)}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5 lg:px-8">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              role="tabpanel"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="mx-auto w-full max-w-[1020px] space-y-5"
            >
              {tab === 'general' ? (
                <>
                  <div className="grid gap-4 lg:grid-cols-[300px_1fr] lg:items-start">
                    <div
                      className={cn(
                        'relative mx-auto aspect-[16/10] w-full max-w-[320px] overflow-hidden rounded-2xl',
                        C.imagePlaceholder,
                        'ring-1 ring-black/[0.06] dark:ring-white/[0.08]',
                      )}
                    >
                      {draft.imageUrl ? (
                        <img src={draft.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-gray-400">
                          <ImagePlus className="h-10 w-10 opacity-60" strokeWidth={1.25} />
                        </div>
                      )}
                    </div>
                    <div className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
                        <button
                          type="button"
                          onClick={() => fileRef.current?.click()}
                          className={cn('rounded-2xl px-4 py-2.5 text-sm font-medium', C.btnSecondary)}
                        >
                          {t('stock.upload')}
                        </button>
                        <input
                          className={cn(inputClass, 'min-w-[120px] flex-1')}
                          value={draft.imageUrl}
                          onChange={(e) => setDraft((d) => ({ ...d, imageUrl: e.target.value }))}
                          placeholder={t('stock.imagePh')}
                        />
                      </div>
                      <div>
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
                      <div>
                        <label className={labelClass}>{t('cultivation.strainFieldBreeder')}</label>
                        <input
                          className={inputClass}
                          value={draft.breeder ?? ''}
                          onChange={(e) => setDraft((d) => ({ ...d, breeder: e.target.value }))}
                          placeholder="…"
                        />
                      </div>
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
                    <p className={cn('mb-2 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
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
                    <p className={cn('mb-2 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
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
                    <p className={cn('mb-2 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
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
                    <p className={cn('mb-2 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
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
                    <p className={cn('mb-2 text-[11px] font-semibold uppercase tracking-wide', C.muted)}>
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
            </motion.div>
          </AnimatePresence>
        </div>

        <footer className="shrink-0 border-t border-gray-100 bg-white/95 px-6 py-4 dark:border-zinc-800 dark:bg-zinc-950/95 lg:px-8">
          <div className="mx-auto flex w-full max-w-[1020px] gap-2">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 rounded-2xl border py-3.5 text-sm font-medium', C.btnSecondary)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className={cn('flex-1 rounded-2xl py-3.5 text-sm font-semibold', C.btnPrimary)}
            >
              {t('cultivation.strainSave')}
            </button>
          </div>
        </footer>
      </motion.div>
    </motion.div>
  )
}
