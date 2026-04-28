import { motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useMemo, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'

type ProductCategory = 'aceites' | 'topicos' | 'resinas'

export type ActiveProcessForFinish = {
  id: string
  name: string
  originLotId: string
  originStrain: string
  plannedUnits: number
  category: ProductCategory
}

type FinishForm = {
  obtainedUnits: number
  mermaReason: 'tech' | 'filter' | 'sample' | ''
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

export function FinalizarProcesoModal({
  process,
  onClose,
  onFinalize,
}: {
  process: ActiveProcessForFinish
  onClose: () => void
  onFinalize: (obtainedUnits: number, mermaReason?: string) => void
}) {
  const { t } = useTranslation()
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FinishForm>({
    defaultValues: { obtainedUnits: process.plannedUnits, mermaReason: '' },
    mode: 'onChange',
  })

  const obtained = watch('obtainedUnits')
  const planned = process.plannedUnits
  const needsMerma = Number.isFinite(obtained) && obtained < planned

  const title = useMemo(
    () => `${t('lab.modalFinishTitle')} · ${process.id}`,
    [process.id, t],
  )

  const submit = handleSubmit((v) => {
    const reason =
      needsMerma && v.mermaReason
        ? v.mermaReason === 'tech'
          ? t('lab.mermaTech')
          : v.mermaReason === 'filter'
            ? t('lab.mermaFilter')
            : t('lab.mermaSample')
        : undefined
    onFinalize(Number(v.obtainedUnits), reason)
  })

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="lab-finish-title"
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
          'mx-auto flex max-h-[min(92vh,820px)] w-full max-w-[640px] flex-col overflow-hidden rounded-[2rem] border shadow-2xl',
          'border-white/[0.08] bg-[#0b0b0b] text-slate-200',
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-white/[0.06] px-6 pb-4 pt-5">
          <div className="min-w-0">
            <h2 id="lab-finish-title" className="text-xl font-semibold tracking-tight text-slate-200">
              {title}
            </h2>
            <p className="mt-1 text-sm text-white/45">
              Confirme el rendimiento final para el proceso <span className="font-semibold text-slate-200">{process.name}</span>.
            </p>
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
          <div className="rounded-[24px] border border-white/[0.06] bg-white/[0.03] p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/45">Origen</p>
            <p className="mt-2 text-sm text-white/65">
              Lote Origen: <span className="font-semibold text-slate-200">#{process.originLotId}</span> ({process.originStrain})
            </p>
            <p className="mt-1 text-sm text-white/65">
              Plan: <span className="font-semibold text-slate-200 tabular-nums">{planned}</span> unidades
            </p>
          </div>

          <label className="mt-6 block">
            <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{t('lab.obtainedUnits')}</span>
            <InputBase
              type="number"
              min={0}
              step={1}
              {...register('obtainedUnits', { required: true, valueAsNumber: true, min: 0 })}
            />
            {errors.obtainedUnits ? (
              <p className="mt-2 text-xs text-rose-300">Ingresá un valor válido.</p>
            ) : null}
          </label>

          {needsMerma ? (
            <div className="mt-6 rounded-[24px] border border-amber-400/20 bg-amber-400/5 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-400/15 text-amber-200">
                  <AlertTriangle className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-200">{t('lab.mermaTitle')}</p>
                  <p className="mt-1 text-sm text-white/55">
                    Si el resultado es menor al plan, la justificación queda registrada para auditoría.
                  </p>
                </div>
              </div>

              <label className="mt-4 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-white/50">{t('lab.mermaReason')}</span>
                <SelectBase {...register('mermaReason', { required: true })} defaultValue="">
                  <option value="" disabled>
                    —
                  </option>
                  <option value="tech">{t('lab.mermaTech')}</option>
                  <option value="filter">{t('lab.mermaFilter')}</option>
                  <option value="sample">{t('lab.mermaSample')}</option>
                </SelectBase>
              </label>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-white/[0.06] px-6 py-4">
          <button
            type="button"
            onClick={submit}
            className="rounded-xl px-4 py-2 text-sm font-semibold text-black transition hover:brightness-110 active:brightness-95"
            style={{
              backgroundImage: 'linear-gradient(90deg, #11caa0, #00ff88)',
              boxShadow: '0 0 18px rgba(17,202,160,0.18)',
            }}
          >
            {t('lab.wizardSave')}
          </button>
        </footer>
      </motion.div>
    </motion.div>
  )
}

