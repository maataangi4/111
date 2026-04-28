import { AnimatePresence, motion } from 'framer-motion'
import { Droplet, Sparkles, X } from 'lucide-react'
import {
  useMemo,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'

const ACCENT = '#11caa0'
const ACCENT_2 = '#00ff88'

type RawLot = {
  id: string
  strain: string
  harvestedAt: string
  availableGrams: number
}

type ProductCategory = 'aceites' | 'topicos' | 'resinas'

type FormValues = {
  originLotId: string
  grams: number
  category: ProductCategory
  plannedUnits: number
  volPerUnit: number
  formula?: string
}

function GlassCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-white/[0.06] bg-white/[0.03] backdrop-blur-[12px]',
        'shadow-[0_20px_70px_rgba(0,0,0,0.45)]',
        className,
      )}
    >
      {children}
    </div>
  )
}

function StepHeader({ title }: { title: string }) {
  return <h3 className="text-lg font-semibold tracking-tight text-slate-200">{title}</h3>
}

function FieldLabel({ children }: { children: string }) {
  return <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{children}</span>
}

function InputBase(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      {...rest}
      className={cn(
        'mt-2 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-slate-200 outline-none',
        'placeholder:text-white/35 focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/15',
        className,
      )}
    />
  )
}

function SelectBase(props: SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, ...rest } = props
  return (
    <select
      {...rest}
      className={cn(
        'mt-2 w-full rounded-2xl border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-slate-200 outline-none',
        'focus:border-emerald-400/30 focus:ring-2 focus:ring-emerald-400/15',
        className,
      )}
    />
  )
}

function RadioCard({
  on,
  title,
  subtitle,
  icon: Icon,
  onClick,
}: {
  on: boolean
  title: string
  subtitle: string
  icon: typeof Droplet
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-[24px] border px-5 py-5 text-left transition',
        on
          ? 'border-emerald-400/35 bg-emerald-400/10 shadow-[0_0_0_5px_rgba(17,202,160,0.10)]'
          : 'border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.04]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-200">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-200">{title}</p>
          <p className="mt-1 truncate text-sm text-white/45">{subtitle}</p>
        </div>
      </div>
    </button>
  )
}

export function NuevaElaboracionModal({
  open,
  onClose,
  lots,
  onCreate,
}: {
  open: boolean
  onClose: () => void
  lots: RawLot[]
  onCreate: (payload: {
    originLotId: string
    originStrain: string
    grams: number
    category: ProductCategory
    plannedUnits: number
    volPerUnit: number
    formula?: string
  }) => void
}) {
  const { t } = useTranslation()
  const [step, setStep] = useState(0)

  const sortedLots = useMemo(() => [...lots].sort((a, b) => b.harvestedAt.localeCompare(a.harvestedAt)), [lots])
  const defaultLot = sortedLots[0]?.id ?? ''

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      originLotId: defaultLot,
      grams: 100,
      category: 'aceites',
      plannedUnits: 20,
      volPerUnit: 30,
      formula: '',
    },
    mode: 'onChange',
  })

  const originLotId = watch('originLotId')
  const category = watch('category')

  const goNext = () => setStep((s) => Math.min(2, s + 1))
  const goBack = () => setStep((s) => Math.max(0, s - 1))

  const onSubmit = handleSubmit((v) => {
    const lot = sortedLots.find((x) => x.id === v.originLotId)
    if (!lot) return
    onCreate({
      originLotId: v.originLotId,
      originStrain: lot.strain,
      grams: Number(v.grams),
      category: v.category,
      plannedUnits: Number(v.plannedUnits),
      volPerUnit: Number(v.volPerUnit),
      formula: v.formula?.trim() || undefined,
    })
  })

  if (!open) return null

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-new-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('fixed inset-0 z-[92] p-3 sm:p-5 lg:p-8', C.modalBackdrop)}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <motion.div
        initial={{ y: 18, opacity: 0.98, scale: 0.995 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        exit={{ y: 12, opacity: 0, scale: 0.995 }}
        transition={{ type: 'spring', damping: 30, stiffness: 320 }}
        className={cn(
          'mx-auto flex max-h-[min(92vh,860px)] w-full max-w-[720px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl',
          'border-white/[0.08] bg-[#0b0b0b] text-slate-200',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="lab-new-title" className="text-xl font-semibold tracking-tight text-slate-200">
              {t('lab.modalNewTitle')}
            </h2>
            <p className="mt-1 text-sm text-white/45">3 pasos: materia prima → formato → plan.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/45 hover:bg-white/[0.06] hover:text-white/80"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          <AnimatePresence mode="wait">
            {step === 0 ? (
              <motion.div
                key="step-1"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepHeader title={t('lab.step1Title')} />
                <div className="mt-5 grid gap-4">
                  <label>
                    <FieldLabel>{t('lab.fieldOriginLot')}</FieldLabel>
                    <SelectBase {...register('originLotId', { required: true })}>
                      {sortedLots.map((l) => (
                        <option key={l.id} value={l.id}>
                          #{l.id} · {l.strain} · {l.availableGrams} g
                        </option>
                      ))}
                    </SelectBase>
                  </label>
                  <label>
                    <FieldLabel>{t('lab.fieldQtyExtract')}</FieldLabel>
                    <InputBase
                      type="number"
                      step="1"
                      min={1}
                      {...register('grams', { required: true, valueAsNumber: true, min: 1 })}
                      placeholder="100"
                    />
                    {errors.grams ? <p className="mt-2 text-xs text-rose-300">Ingresá un valor válido.</p> : null}
                  </label>

                  <GlassCard className="p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Contexto</p>
                    <p className="mt-2 text-sm text-white/65">
                      Lote seleccionado: <span className="font-semibold text-slate-200">#{originLotId || '—'}</span>
                    </p>
                  </GlassCard>
                </div>
              </motion.div>
            ) : null}

            {step === 1 ? (
              <motion.div
                key="step-2"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepHeader title={t('lab.step2Title')} />
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <RadioCard
                    on={category === 'aceites'}
                    title="💧 Aceites y Tinturas"
                    subtitle="Viales / gotas"
                    icon={Droplet}
                    onClick={() => {
                      setValue('category', 'aceites', { shouldValidate: true })
                      setValue('volPerUnit', 30)
                    }}
                  />
                  <RadioCard
                    on={category === 'topicos'}
                    title="🧴 Tópicos y Cremas"
                    subtitle="Bálsamos / ungüentos"
                    icon={Sparkles}
                    onClick={() => {
                      setValue('category', 'topicos', { shouldValidate: true })
                      setValue('volPerUnit', 50)
                    }}
                  />
                  <RadioCard
                    on={category === 'resinas'}
                    title="💎 Resinas y Extractos"
                    subtitle="Rosin / BHO"
                    icon={Sparkles}
                    onClick={() => {
                      setValue('category', 'resinas', { shouldValidate: true })
                      setValue('volPerUnit', 1)
                    }}
                  />
                </div>
              </motion.div>
            ) : null}

            {step === 2 ? (
              <motion.div
                key="step-3"
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -18 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <StepHeader title={t('lab.step3Title')} />
                <div className="mt-5 grid gap-4">
                  <label>
                    <FieldLabel>{t('lab.fieldQtyUnits')}</FieldLabel>
                    <InputBase
                      type="number"
                      step="1"
                      min={1}
                      {...register('plannedUnits', { required: true, valueAsNumber: true, min: 1 })}
                      placeholder="20"
                    />
                  </label>
                  <label>
                    <FieldLabel>{t('lab.fieldVolPerUnit')}</FieldLabel>
                    <InputBase
                      type="number"
                      step="0.1"
                      min={0.1}
                      {...register('volPerUnit', { required: true, valueAsNumber: true, min: 0.1 })}
                      placeholder="30"
                    />
                  </label>
                  <label>
                    <FieldLabel>{t('lab.fieldFormula')}</FieldLabel>
                    <InputBase {...register('formula')} placeholder="Ej.: 10% Full Spectrum" />
                  </label>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={goBack}
            disabled={step === 0}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition',
              step === 0 ? 'cursor-not-allowed bg-white/[0.03] text-white/25' : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.10] hover:text-white',
            )}
          >
            {t('lab.wizardBack')}
          </button>
          {step < 2 ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:brightness-95"
              style={{ backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})` }}
            >
              {t('lab.wizardNext')}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSubmit}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:brightness-95"
              style={{ backgroundImage: `linear-gradient(90deg, ${ACCENT}, ${ACCENT_2})`, boxShadow: '0 0 18px rgba(17,202,160,0.18)' }}
            >
              {t('lab.wizardStart')}
            </button>
          )}
        </footer>
      </motion.div>
    </motion.div>
  )
}

