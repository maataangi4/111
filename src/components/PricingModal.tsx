import { AnimatePresence, motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n/useTranslation'
import { cn } from '../lib/cn'
import { SUBSCRIPTION_STUB } from '../lib/subscriptionStub'

export type PricingModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Демо: пользователь уже на максимальном тарифе — сначала экран сводки, кнопки тарифов только справочно. */
  isMaxPlanStub?: boolean
}

const featureRow = 'flex gap-2 text-sm text-slate-600 dark:text-[#c4c4c4]'

export function PricingModal({ open, onOpenChange, isMaxPlanStub = false }: PricingModalProps) {
  const { t, locale } = useTranslation()
  const [showPlans, setShowPlans] = useState(!isMaxPlanStub)

  useEffect(() => {
    if (!open) return
    setShowPlans(!isMaxPlanStub)
  }, [open, isMaxPlanStub])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const dateLocale = locale === 'ru' ? 'ru-RU' : 'es-AR'
  const renews = new Date(SUBSCRIPTION_STUB.renewsAtIso).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const memberSince = new Date(SUBSCRIPTION_STUB.memberSinceIso).toLocaleDateString(dateLocale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
  const billingLabel =
    SUBSCRIPTION_STUB.billingCycleKey === 'annual'
      ? t('subscriptionOverview.billingAnnual')
      : t('subscriptionOverview.billingMonthly')

  const plansLocked = isMaxPlanStub && showPlans
  const compactOverview = isMaxPlanStub && !showPlans

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="pricing-modal-root"
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px] dark:bg-black/55"
            aria-label={t('common.close')}
            onClick={() => onOpenChange(false)}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pricing-modal-title"
            className={cn(
              'relative z-10 max-h-[min(90vh,920px)] w-full overflow-y-auto overflow-x-hidden rounded-[1.75rem] border border-slate-200/90 bg-white shadow-[0_24px_80px_-12px_rgba(15,23,42,0.25)]',
              compactOverview ? 'max-w-2xl' : 'max-w-5xl',
              'dark:border-[#3d3d3d] dark:bg-[#1c1c1c] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)]',
            )}
            initial={{ opacity: 0, scale: 0.97, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 14 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
              aria-label={t('common.close')}
            >
              <X className="h-5 w-5" strokeWidth={1.75} />
            </button>

            <div
              className={cn(
                'px-6 pb-8 pt-10 sm:px-10 sm:pb-10 sm:pt-12',
                compactOverview && 'sm:px-8 sm:pb-9 sm:pt-11',
              )}
            >
              {isMaxPlanStub && !showPlans ? (
                <>
                  <h2
                    id="pricing-modal-title"
                    className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-[#f1f1f1]"
                  >
                    {t('subscriptionOverview.modalTitle')}
                  </h2>
                  <p className="mb-8 mt-2 text-center text-slate-500 dark:text-[#a3a3a3]">
                    {t('subscriptionOverview.subtitle')}
                  </p>
                  <div
                    className={cn(
                      'mx-auto max-w-lg rounded-2xl border border-slate-200/90 bg-slate-50/80 p-6 dark:border-[#3d3d3d] dark:bg-[#222222]',
                    )}
                  >
                    <dl className="space-y-4 text-sm">
                      <div className="flex justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-[#3d3d3d]">
                        <dt className="text-slate-500 dark:text-[#8c8c8c]">{t('subscriptionOverview.planLabel')}</dt>
                        <dd className="font-semibold text-slate-900 dark:text-[#f1f1f1]">
                          {t('subscriptionOverview.planEnterprise')}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-[#3d3d3d]">
                        <dt className="text-slate-500 dark:text-[#8c8c8c]">{t('subscriptionOverview.statusLabel')}</dt>
                        <dd>
                          <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            {t('subscriptionOverview.statusActive')}
                          </span>
                        </dd>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-[#3d3d3d]">
                        <dt className="text-slate-500 dark:text-[#8c8c8c]">
                          {t('subscriptionOverview.renewsLabel')}
                        </dt>
                        <dd className="tabular-nums text-slate-900 dark:text-[#f1f1f1]">{renews}</dd>
                      </div>
                      <div className="flex justify-between gap-4 border-b border-slate-200/80 pb-3 dark:border-[#3d3d3d]">
                        <dt className="text-slate-500 dark:text-[#8c8c8c]">
                          {t('subscriptionOverview.memberSinceLabel')}
                        </dt>
                        <dd className="tabular-nums text-slate-900 dark:text-[#f1f1f1]">{memberSince}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-slate-500 dark:text-[#8c8c8c]">
                          {t('subscriptionOverview.billingLabel')}
                        </dt>
                        <dd className="text-slate-900 dark:text-[#f1f1f1]">{billingLabel}</dd>
                      </div>
                    </dl>
                    <button
                      type="button"
                      onClick={() => setShowPlans(true)}
                      className="mt-6 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition hover:bg-slate-50 dark:border-[#4a4a4a] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#333]"
                    >
                      {t('subscriptionOverview.comparePlans')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {isMaxPlanStub && showPlans ? (
                    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <button
                        type="button"
                        onClick={() => setShowPlans(false)}
                        className="self-start text-sm font-medium text-slate-600 underline-offset-2 hover:text-slate-900 hover:underline dark:text-[#a3a3a3] dark:hover:text-[#f1f1f1]"
                      >
                        ← {t('subscriptionOverview.backToOverview')}
                      </button>
                    </div>
                  ) : null}
                  <h2
                    id="pricing-modal-title"
                    className="text-center text-2xl font-bold tracking-tight text-slate-900 dark:text-[#f1f1f1]"
                  >
                    {isMaxPlanStub && showPlans
                      ? t('subscriptionOverview.plansHeading')
                      : 'Planes y Facturación'}
                  </h2>
                  <p className="mb-8 mt-2 text-center text-slate-500 dark:text-[#a3a3a3]">
                    {isMaxPlanStub && showPlans
                      ? t('subscriptionOverview.plansNote')
                      : 'Elige el plan que mejor se adapte a tu cultivo.'}
                  </p>

                  <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    {/* Free */}
                    <div
                      className={cn(
                        'flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#3d3d3d] dark:bg-[#222222]',
                      )}
                    >
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f1f1f1]">Free</h3>
                      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900 dark:text-[#f1f1f1]">
                        $0{' '}
                        <span className="text-base font-medium text-slate-500 dark:text-[#8c8c8c]">/ mes</span>
                      </p>
                      <ul className="mt-6 flex flex-1 flex-col gap-3">
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Hasta 2 lotes activos
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Gestión básica de plantas
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Soporte comunitario
                        </li>
                      </ul>
                      <button
                        type="button"
                        disabled={plansLocked}
                        className={cn(
                          'mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-medium',
                          plansLocked
                            ? 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 dark:border-[#3d3d3d] dark:bg-[#2e2e2e] dark:text-[#6b6b6b]'
                            : 'cursor-not-allowed bg-slate-100 text-slate-400 dark:bg-[#2e2e2e] dark:text-[#6b6b6b]',
                        )}
                      >
                        {plansLocked ? t('subscriptionOverview.referenceCta') : 'Plan Actual'}
                      </button>
                    </div>

                    {/* Plus — destacado (sin destacar cuando solo referencia) */}
                    <div
                      className={cn(
                        'relative flex flex-col rounded-2xl border-2 border-blue-500 bg-white p-6 shadow-md',
                        'dark:border-blue-500 dark:bg-[#222222] dark:shadow-lg dark:shadow-blue-950/20',
                        plansLocked && 'opacity-90',
                      )}
                    >
                      <span className="absolute right-4 top-4 rounded-full bg-blue-500 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        Popular
                      </span>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f1f1f1]">Plus</h3>
                      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900 dark:text-[#f1f1f1]">
                        $29{' '}
                        <span className="text-base font-medium text-slate-500 dark:text-[#8c8c8c]">/ mes</span>
                      </p>
                      <ul className="mt-6 flex flex-1 flex-col gap-3">
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Lotes ilimitados
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Trazabilidad completa
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Gestión de clones
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Soporte prioritario
                        </li>
                      </ul>
                      <button
                        type="button"
                        disabled={plansLocked}
                        className={cn(
                          'mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-medium',
                          plansLocked
                            ? 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 dark:border-[#3d3d3d] dark:bg-[#2e2e2e] dark:text-[#6b6b6b]'
                            : 'bg-slate-900 text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 dark:focus:ring-offset-[#1c1c1c]',
                        )}
                      >
                        {plansLocked ? t('subscriptionOverview.referenceCta') : 'Actualizar a Plus'}
                      </button>
                    </div>

                    {/* Pro */}
                    <div
                      className={cn(
                        'flex flex-col rounded-2xl border border-slate-200 bg-white p-6 dark:border-[#3d3d3d] dark:bg-[#222222]',
                        plansLocked && 'opacity-90',
                      )}
                    >
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-[#f1f1f1]">Pro</h3>
                      <p className="mt-3 text-3xl font-bold tabular-nums text-slate-900 dark:text-[#f1f1f1]">
                        $79{' '}
                        <span className="text-base font-medium text-slate-500 dark:text-[#8c8c8c]">/ mes</span>
                      </p>
                      <ul className="mt-6 flex flex-1 flex-col gap-3">
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Todo lo de Plus
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Integración con sensores IoT
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Acceso a API
                        </li>
                        <li className={featureRow}>
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          Múltiples sucursales
                        </li>
                      </ul>
                      <button
                        type="button"
                        disabled={plansLocked}
                        className={cn(
                          'mt-8 w-full rounded-xl px-4 py-2.5 text-sm font-medium',
                          plansLocked
                            ? 'cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400 dark:border-[#3d3d3d] dark:bg-[#2e2e2e] dark:text-[#6b6b6b]'
                            : 'border border-slate-300 bg-white text-slate-900 transition hover:bg-slate-50 dark:border-[#4a4a4a] dark:bg-transparent dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]',
                        )}
                      >
                        {plansLocked ? t('subscriptionOverview.referenceCta') : 'Actualizar a Pro'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
