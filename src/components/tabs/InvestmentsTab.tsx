import { AnimatePresence, motion } from 'framer-motion'
import { Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import type { Investment } from '../../store/types'
import { useSettingsStore } from '../../store/useSettingsStore'
import { useCrmStore } from '../../store/useCrmStore'
import { RowActionsMenu } from '../ui/RowActionsMenu'

function InvestmentForm({
  initial,
  onSave,
  onClose,
}: {
  initial: Investment | null
  onSave: (row: Omit<Investment, 'id'>) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [item, setItem] = useState(initial?.item ?? '')
  const [date, setDate] = useState(initial?.date ?? '')
  const [amount, setAmount] = useState(
    initial?.amount != null ? String(initial.amount) : '',
  )

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const a = Number(amount)
    if (!item.trim() || !date || !Number.isFinite(a)) return
    onSave({ item: item.trim(), date, amount: a })
    onClose()
  }

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'fixed inset-0 z-[60] flex items-end justify-center p-4 sm:items-center',
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
        className={cn('w-full max-w-md rounded-2xl border p-6', C.modalCard)}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-3">
          <h2 className={cn('text-lg font-semibold tracking-tight', C.heading)}>
            {initial ? t('investments.edit') : t('investments.new')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('investments.item')}
            </label>
            <input
              className={inputClass}
              placeholder={t('investments.itemPh')}
              value={item}
              onChange={(e) => setItem(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('investments.date')}
            </label>
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('investments.amount')}
            </label>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 rounded-2xl border py-3 text-[15px] font-medium', C.btnSecondary)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={cn('flex-1 rounded-2xl py-3 text-[15px] font-medium', C.btnPrimary)}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

function formatMoney(n: number, locale: string) {
  return n.toLocaleString(locale === 'ru' ? 'ru-RU' : 'es-AR', {
    maximumFractionDigits: 2,
  })
}

export function InvestmentsTab() {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const investments = useCrmStore((s) => s.investments)
  const addInvestment = useCrmStore((s) => s.addInvestment)
  const updateInvestment = useCrmStore((s) => s.updateInvestment)
  const removeInvestment = useCrmStore((s) => s.removeInvestment)

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; row?: Investment } | null>(
    null,
  )

  const sorted = [...investments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
            {t('investments.title')}
          </h2>
          <p className={cn('mt-1 text-sm', C.muted)}>{t('investments.subtitle')}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setModal({ mode: 'add' })}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
            C.btnPrimary,
          )}
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          {t('investments.add')}
        </motion.button>
      </div>

      <div className={cn('overflow-hidden rounded-2xl border shadow-sm', C.card)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead>
              <tr className={cn('text-xs font-medium uppercase tracking-wide', C.tableHead)}>
                <th className="px-5 py-3.5">{t('investments.colItem')}</th>
                <th className="px-5 py-3.5">{t('investments.colDate')}</th>
                <th className="px-5 py-3.5 text-right">{t('investments.colAmount')}</th>
                <th className="w-14 px-3 py-3.5" />
              </tr>
            </thead>
            <tbody className={C.tableRow}>
              {sorted.map((row) => (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn('transition', C.rowHover)}
                >
                  <td className={cn('px-5 py-4 font-medium', C.heading)}>{row.item}</td>
                  <td className={cn('px-5 py-4', C.muted)}>{row.date}</td>
                  <td className={cn('px-5 py-4 text-right tabular-nums', C.heading)}>
                    ${formatMoney(row.amount, locale)}
                  </td>
                  <td className="px-3 py-4">
                    <RowActionsMenu
                      onEdit={() => setModal({ mode: 'edit', row })}
                      onDelete={() => {
                        if (confirm(t('investments.deleteConfirm')))
                          removeInvestment(row.id)
                      }}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {sorted.length === 0 && (
          <p className={cn('py-14 text-center text-sm', C.muted)}>{t('investments.empty')}</p>
        )}
      </div>

      <AnimatePresence>
        {modal && (
          <InvestmentForm
            initial={modal.mode === 'edit' ? modal.row ?? null : null}
            onClose={() => setModal(null)}
            onSave={(r) => {
              if (modal.mode === 'edit' && modal.row)
                updateInvestment(modal.row.id, r)
              else addInvestment(r)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
