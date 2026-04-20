import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  Camera,
  ClipboardList,
  Sparkles,
  Stethoscope,
  Upload,
  X,
} from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { FITO_SYMPTOM_TAGS, fitoSymptomLabel } from '../../data/fitoSymptoms'
import { useTranslation } from '../../i18n/useTranslation'
import { diagnosePlantIssue } from '../../lib/diagnosePlantIssue'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import type { DiagnoseOutcome, PlantDiagnosisResult } from '../../lib/diagnosePlantIssue'
import type { PlantFitoDiagnostic, PlantRecord } from '../../store/cultivationTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { StrainAutocomplete } from '../ui/StrainAutocomplete'

function daysInQuarantine(p: PlantRecord): number {
  if (!p.quarantineAt) return 0
  const t = Date.parse(p.quarantineAt)
  if (Number.isNaN(t)) return 0
  return Math.max(0, Math.floor((Date.now() - t) / 86_400_000))
}

export function PhytosanitaryClinicTab() {
  const tenantId = 'tenant-default'
  const { t, locale } = useTranslation()
  const plants = useCultivationStore((s) => s.plants)
  const addFitoDiagnostic = useCultivationStore((s) => s.addFitoDiagnostic)
  const [clinicStrainQuery, setClinicStrainQuery] = useState('')

  const quarantinePlants = useMemo(
    () =>
      plants
        .filter((p) => p.status === 'cuarentena')
        .filter((p) =>
          clinicStrainQuery.trim()
            ? p.strain.toLowerCase().includes(clinicStrainQuery.trim().toLowerCase())
            : true,
        )
        .sort((a, b) => (b.quarantineAt ?? '').localeCompare(a.quarantineAt ?? '')),
    [plants, clinicStrainQuery],
  )

  const [selected, setSelected] = useState<PlantRecord | null>(null)
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null)
  const [symptomIds, setSymptomIds] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [outcome, setOutcome] = useState<DiagnoseOutcome | null>(null)
  const result: PlantDiagnosisResult | null = outcome?.result ?? null
  const fileRef = useRef<HTMLInputElement>(null)

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)
  const labelClass = cn('mb-1.5 block text-xs font-medium', C.label)

  const openFicha = (p: PlantRecord) => {
    setSelected(p)
    setImageDataUrl(null)
    setSymptomIds([])
    setNotes('')
    setOutcome(null)
  }

  const closeFicha = () => {
    setSelected(null)
    setBusy(false)
    setOutcome(null)
  }

  const toggleSymptom = (id: string) => {
    setSymptomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    )
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setImageDataUrl(String(r.result ?? ''))
    r.readAsDataURL(f)
  }

  const runDiagnosis = async () => {
    if (!selected) return
    setBusy(true)
    setOutcome(null)
    try {
      const res = await diagnosePlantIssue({
        symptoms: symptomIds,
        notes: notes.trim(),
        imageDataUrl,
        locale,
      })
      setOutcome(res)
    } finally {
      setBusy(false)
    }
  }

  const savePrescription = () => {
    if (!selected || !result) return
    const payload: Omit<PlantFitoDiagnostic, 'id' | 'createdAt'> = {
      symptoms: symptomIds,
      notes: notes.trim() || undefined,
      imageDataUrl: imageDataUrl ?? undefined,
      diagnostico: result.diagnostico,
      certeza: result.certeza,
      tratamiento: result.tratamiento,
      aislamiento: result.aislamiento,
    }
    addFitoDiagnostic(selected.id, payload)
    closeFicha()
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-12 w-12 items-center justify-center rounded-2xl',
                'bg-gradient-to-br from-rose-100 to-orange-100 dark:from-rose-950/70 dark:to-orange-950/50',
                'ring-1 ring-rose-200/70 dark:ring-rose-900/60',
              )}
            >
              <Stethoscope className="h-6 w-6 text-rose-700 dark:text-rose-300" strokeWidth={1.75} />
            </div>
            <div>
              <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
                {t('clinic.title')}
              </h2>
            </div>
          </div>
        </div>
        <div
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm',
            'border-amber-200/90 bg-amber-50/90 text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100',
          )}
        >
          <Activity className="h-4 w-4 shrink-0 opacity-80" />
          {t('clinic.inQuarantine')}:{' '}
          <span className="font-semibold tabular-nums">{quarantinePlants.length}</span>
        </div>
      </div>

      <div className="mb-5 max-w-xl">
        <label className={labelClass}>Buscar variedad (Hospital)</label>
        <StrainAutocomplete
          tenantId={tenantId}
          value={clinicStrainQuery}
          onChange={setClinicStrainQuery}
          className={inputClass}
          placeholder="Tropicana Banana, OG Kush..."
        />
      </div>

      {quarantinePlants.length === 0 ? (
        <div
          className={cn(
            'rounded-3xl border border-dashed px-6 py-20 text-center',
            'border-rose-200/60 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/15',
          )}
        >
          <ClipboardList className="mx-auto mb-4 h-12 w-12 text-rose-300 dark:text-rose-700" />
          <p className={cn('text-sm font-medium', C.heading)}>{t('clinic.emptyTitle')}</p>
          <p className={cn('mx-auto mt-2 max-w-md text-sm', C.muted)}>{t('clinic.emptyHint')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {quarantinePlants.map((p) => (
            <motion.button
              key={p.id}
              type="button"
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => openFicha(p)}
              className={cn(
                'flex w-full flex-col rounded-3xl border p-5 text-left shadow-sm transition',
                'border-rose-100/90 bg-white/95 ring-1 ring-rose-100/60',
                'hover:border-rose-200 hover:shadow-md dark:border-rose-950/50 dark:bg-zinc-950/80 dark:ring-rose-950/40',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn('font-mono text-sm font-semibold', C.heading)}>{p.id}</p>
                  <p className={cn('mt-1 truncate text-sm', C.muted)}>{p.strain || '—'}</p>
                </div>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
                    'bg-orange-100 text-orange-900 dark:bg-orange-950/60 dark:text-orange-200',
                  )}
                >
                  {daysInQuarantine(p)} {t('clinic.days')}
                </span>
              </div>
              <p className={cn('mt-4 text-xs', C.subheading)}>
                {(p.fitoDiagnostics?.length ?? 0) > 0
                  ? t('clinic.recordsCount').replace(
                      '{n}',
                      String(p.fitoDiagnostics!.length),
                    )
                  : t('clinic.noRecords')}
              </p>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selected ? (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ficha-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={cn('fixed inset-0 z-[70] flex items-end justify-center p-4 sm:items-center', C.modalBackdrop)}
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeFicha()
            }}
          >
            <motion.div
              initial={{ y: 28, opacity: 0.96 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
              transition={{ type: 'spring', damping: 30, stiffness: 320 }}
              className={cn(
                'max-h-[min(92vh,760px)] w-full max-w-lg overflow-y-auto rounded-3xl border shadow-2xl',
                C.modalCard,
                'border-rose-100/80 dark:border-rose-950/50',
              )}
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-rose-100/80 bg-white/95 px-5 pb-4 pt-5 dark:border-rose-950/40 dark:bg-zinc-950/98">
                <div className="min-w-0">
                  <p className={cn('text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400')}>
                    {t('clinic.fichaLabel')}
                  </p>
                  <h3 id="ficha-title" className={cn('text-lg font-semibold tracking-tight', C.heading)}>
                    {selected.id}
                  </h3>
                  <p className={cn('mt-0.5 text-sm', C.muted)}>
                    {selected.strain} · {daysInQuarantine(selected)} {t('clinic.daysInQ')}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeFicha}
                  className="rounded-xl p-2 text-gray-400 hover:bg-rose-50 dark:hover:bg-zinc-800"
                  aria-label={t('common.close')}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-5 p-5">
                <div>
                  <label className={labelClass}>{t('clinic.photoLabel')}</label>
                  <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
                  <div
                    className={cn(
                      'relative flex min-h-[160px] flex-col items-center justify-center rounded-2xl border-2 border-dashed',
                      'border-rose-200/80 bg-rose-50/40 dark:border-rose-900/45 dark:bg-rose-950/20',
                    )}
                  >
                    {imageDataUrl ? (
                      <img src={imageDataUrl} alt="" className="max-h-52 w-full rounded-xl object-contain" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 py-8">
                        <Camera className="h-10 w-10 text-rose-300 dark:text-rose-700" />
                        <div className="flex flex-wrap justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => fileRef.current?.click()}
                            className={cn('inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium', C.btnSecondary)}
                          >
                            <Upload className="h-4 w-4" />
                            {t('clinic.uploadPhoto')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('clinic.symptomsLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {FITO_SYMPTOM_TAGS.map((tag) => {
                      const on = symptomIds.includes(tag.id)
                      return (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => toggleSymptom(tag.id)}
                          className={cn(
                            'rounded-full px-3 py-1.5 text-[12px] font-medium transition',
                            on
                              ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-400/35 dark:bg-rose-500'
                              : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-zinc-800 dark:text-zinc-200 dark:ring-zinc-600',
                          )}
                        >
                          {fitoSymptomLabel(tag, locale)}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t('clinic.notesLabel')}</label>
                  <textarea
                    className={cn(inputClass, 'min-h-[88px] resize-y')}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={t('clinic.notesPh')}
                  />
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void runDiagnosis()}
                  className={cn(
                    'flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-[15px] font-semibold',
                    'bg-gradient-to-r from-rose-600 to-orange-500 text-white shadow-lg',
                    'disabled:opacity-60',
                    !busy &&
                      'motion-safe:animate-[clinic-ai-glow_2.4s_ease-in-out_infinite] shadow-[0_0_22px_rgba(244,63,94,0.35)]',
                  )}
                >
                  <Sparkles className="h-5 w-5" strokeWidth={2} />
                  {busy ? t('clinic.diagnosing') : t('clinic.diagnoseAi')}
                </button>

                {result && outcome ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      'rounded-2xl border border-amber-200/90 bg-gradient-to-b from-amber-50/90 to-white p-5',
                      'dark:border-amber-900/50 dark:from-amber-950/40 dark:to-zinc-950',
                    )}
                  >
                    <div
                      className={cn(
                        'mb-3 rounded-xl px-3 py-2.5',
                        outcome.source === 'gemini'
                          ? 'bg-emerald-100/90 text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100'
                          : 'bg-orange-100/95 text-orange-950 dark:bg-orange-950/45 dark:text-orange-100',
                      )}
                    >
                      <p className="text-center text-[12px] font-semibold">
                        {outcome.source === 'gemini' ? t('clinic.sourceGemini') : t('clinic.sourceMock')}
                      </p>
                      {outcome.source === 'mock' ? (
                        <div className="mt-1.5 space-y-1.5">
                          {outcome.mockReason === 'rate_limit' ? (
                            <p className={cn('text-[11px] font-semibold leading-relaxed text-orange-900 dark:text-orange-100')}>
                              {t('clinic.rateLimitTitle')}
                            </p>
                          ) : null}
                          <p className={cn('text-[11px] leading-relaxed opacity-95', C.muted)}>
                            {outcome.mockReason === 'rate_limit'
                              ? t('clinic.rateLimitExplain')
                              : t('clinic.mockExplain')}
                          </p>
                        </div>
                      ) : null}
                    </div>
                    <p className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-200')}>
                      <ClipboardList className="h-4 w-4" />
                      {t('clinic.prescriptionTitle')}
                    </p>
                    <p className={cn('mt-3 text-base font-semibold', C.heading)}>{result.diagnostico}</p>
                    <p className={cn('mt-1 text-sm', C.muted)}>
                      {t('clinic.confidence')}: <span className="font-semibold text-amber-900 dark:text-amber-100">{result.certeza}%</span>
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      {result.aislamiento ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-red-100 px-2 py-1 text-xs font-semibold text-red-900 dark:bg-red-950/50 dark:text-red-200">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          {t('clinic.isolationHigh')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900 dark:bg-emerald-950/45 dark:text-emerald-200">
                          {t('clinic.isolationLow')}
                        </span>
                      )}
                    </div>
                    <ol className={cn('mt-4 list-decimal space-y-2 pl-5 text-sm', C.muted)}>
                      {result.tratamiento.map((step, i) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ol>
                    <button
                      type="button"
                      onClick={savePrescription}
                      className={cn('mt-5 w-full rounded-2xl py-3.5 text-sm font-semibold', C.btnPrimary)}
                    >
                      {t('clinic.savePrescription')}
                    </button>
                  </motion.div>
                ) : null}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
