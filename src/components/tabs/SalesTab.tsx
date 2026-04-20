import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownUp, CalendarRange, Plus, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { paymentMessageKey } from '../../lib/paymentLabel'
import type { PaymentMethod, Sale, SortKey } from '../../store/types'
import { PAYMENT_METHODS } from '../../store/types'
import { useSettingsStore } from '../../store/useSettingsStore'
import { stockLinkedToGenetics } from '../../lib/stockLinkedGenetics'
import { computeSaleTotal, useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'
import { RowActionsMenu } from '../ui/RowActionsMenu'
import { SoftSelect } from '../ui/SoftSelect'

function inDateRange(fecha: string, from: string, to: string) {
  if (!from && !to) return true
  const t = new Date(fecha + 'T12:00:00').getTime()
  if (from && t < new Date(from + 'T12:00:00').getTime()) return false
  if (to && t > new Date(to + 'T12:00:00').getTime()) return false
  return true
}

function SaleSlideOver({
  initial,
  onClose,
  onSave,
}: {
  initial: Sale | null
  onClose: () => void
  onSave: (row: Omit<Sale, 'id' | 'total'> & { total: number }) => void
}) {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const stock = useCrmStore((s) => s.stock)
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)
  const linkedStock = useMemo(
    () => stockLinkedToGenetics(stock, geneticsBank),
    [stock, geneticsBank],
  )

  const [nombre, setNombre] = useState(initial?.nombre ?? '')
  const [fecha, setFecha] = useState(initial?.fecha ?? '')
  const [variedad, setVariedad] = useState(initial?.variedad ?? '')
  const [cantidad, setCantidad] = useState(
    initial?.cantidad != null ? String(initial.cantidad) : '',
  )
  const [metodoPago, setMetodoPago] = useState<PaymentMethod>(
    initial?.metodoPago ?? PAYMENT_METHODS[0],
  )

  const qtyNum = Number(cantidad)
  const total = useMemo(
    () =>
      computeSaleTotal(
        linkedStock,
        variedad,
        Number.isFinite(qtyNum) ? qtyNum : 0,
      ),
    [linkedStock, variedad, qtyNum],
  )

  const variedadOptions = useMemo(
    () => [
      { value: '' as string, label: t('sales.pickStock') },
      ...linkedStock.map((s) => ({
        value: s.tipo,
        label: `${s.tipo} ($${s.precio}/g)`,
      })),
    ],
    [t, linkedStock],
  )

  const variedadChip =
    variedad.trim() === ''
      ? t('sales.pickStock')
      : (() => {
          const s = linkedStock.find((x) => x.tipo === variedad)
          return s ? `${s.tipo} ($${s.precio}/g)` : variedad
        })()

  const paymentOptions = useMemo(
    () =>
      PAYMENT_METHODS.map((m) => ({
        value: m,
        label: t(paymentMessageKey(m)),
      })),
    [t],
  )

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!nombre.trim() || !fecha || !variedad || !Number.isFinite(qtyNum) || qtyNum <= 0)
      return
    onSave({
      nombre: nombre.trim(),
      fecha,
      variedad,
      cantidad: qtyNum,
      metodoPago,
      total,
    })
    onClose()
  }

  const loc = locale === 'ru' ? 'ru-RU' : 'es-AR'

  return (
    <motion.div
      className="fixed inset-0 z-[65]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        type="button"
        aria-label={t('sales.closePanel')}
        className={cn('absolute inset-0 backdrop-blur-[2px]', C.modalBackdrop)}
        onClick={onClose}
      />
      <motion.aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="sale-form-title"
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 340 }}
        className={cn(
          'absolute bottom-0 right-0 top-0 z-[1] flex w-full max-w-md flex-col border-l shadow-[var(--shadow-soft-lg)]',
          'border-gray-200/90 dark:border-zinc-800',
          C.modalCard,
        )}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 id="sale-form-title" className={cn('text-lg font-semibold tracking-tight', C.heading)}>
            {initial ? t('sales.editOrder') : t('sales.newOrderTitle')}
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

        <form
          onSubmit={submit}
          className="flex flex-1 flex-col gap-4 overflow-y-auto p-5"
        >
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('sales.formNombre')}
            </label>
            <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('sales.formFecha')}
            </label>
            <input
              type="date"
              className={inputClass}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('sales.formVariedad')}
            </label>
            <SoftSelect
              value={variedad}
              onChange={setVariedad}
              options={variedadOptions}
              chipText={variedadChip}
              ariaLabel={t('sales.formVariedad')}
              variant="field"
              disabled={linkedStock.length === 0}
              triggerClassName={inputClass}
              warning={variedad.trim() === ''}
            />
            {linkedStock.length === 0 && (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {t('sales.stockFirst')}
              </p>
            )}
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('sales.cantidadG')}
            </label>
            <input
              type="number"
              min={0}
              step="0.01"
              className={inputClass}
              value={cantidad}
              onChange={(e) => setCantidad(e.target.value)}
              required
            />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('sales.metodoPago')}
            </label>
            <SoftSelect
              value={metodoPago}
              onChange={(v) => setMetodoPago(v as PaymentMethod)}
              options={paymentOptions}
              chipText={t(paymentMessageKey(metodoPago))}
              ariaLabel={t('sales.metodoPago')}
              variant="field"
              triggerClassName={inputClass}
            />
          </div>
          <div className={cn('rounded-2xl border px-4 py-3', 'border-gray-200 bg-gray-50/80 dark:border-zinc-800 dark:bg-zinc-950/80')}>
            <p className={cn('text-xs font-medium uppercase tracking-wide', C.subheading)}>
              {t('sales.totalAuto')}
            </p>
            <p className={cn('mt-1 text-2xl font-semibold tabular-nums tracking-tight', C.heading)}>
              ${total.toLocaleString(loc, { maximumFractionDigits: 2 })}
            </p>
            <p className={cn('mt-1 text-xs', C.muted)}>{t('sales.totalHint')}</p>
          </div>

          <div className="mt-auto flex gap-2 border-t border-gray-100 pt-4 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className={cn('flex-1 rounded-2xl border py-3 text-[15px] font-medium', C.btnSecondary)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={linkedStock.length === 0}
              className={cn(
                'flex-1 rounded-2xl py-3 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
                C.btnPrimary,
              )}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </motion.aside>
    </motion.div>
  )
}

const sortKeys: SortKey[] = [
  'nombre',
  'fecha',
  'variedad',
  'cantidad',
  'metodoPago',
  'total',
]

const sortLabelKey: Record<SortKey, string> = {
  numero: 'sales.n',
  nombre: 'sales.nombre',
  fecha: 'sales.fecha',
  variedad: 'sales.variedad',
  cantidad: 'sales.cantidad',
  metodoPago: 'sales.pago',
  total: 'sales.total',
}

export function SalesTab() {
  const { t } = useTranslation()
  const locale = useSettingsStore((s) => s.locale)
  const locCmp = locale === 'ru' ? 'ru' : 'es'
  const locNum = locale === 'ru' ? 'ru-RU' : 'es-AR'

  const sales = useCrmStore((s) => s.sales)
  const addSale = useCrmStore((s) => s.addSale)
  const updateSale = useCrmStore((s) => s.updateSale)
  const removeSale = useCrmStore((s) => s.removeSale)
  const saleFilterFrom = useCrmStore((s) => s.saleFilterFrom)
  const saleFilterTo = useCrmStore((s) => s.saleFilterTo)
  const setSaleFilterFrom = useCrmStore((s) => s.setSaleFilterFrom)
  const setSaleFilterTo = useCrmStore((s) => s.setSaleFilterTo)
  const saleSortKey = useCrmStore((s) => s.saleSortKey)
  const saleSortDir = useCrmStore((s) => s.saleSortDir)
  const setSaleSort = useCrmStore((s) => s.setSaleSort)

  const [filterOpen, setFilterOpen] = useState(false)
  const [salePanel, setSalePanel] = useState<{ mode: 'add' | 'edit'; sale?: Sale } | null>(
    null,
  )

  const filteredSorted = useMemo(() => {
    let rows = sales.filter((s) =>
      inDateRange(s.fecha, saleFilterFrom, saleFilterTo),
    )
    const dir = saleSortDir === 'asc' ? 1 : -1
    const cmp = (a: Sale, b: Sale) => {
      switch (saleSortKey) {
        case 'nombre':
          return `${a.nombre}`.localeCompare(`${b.nombre}`, locCmp) * dir
        case 'fecha':
          return (
            (new Date(a.fecha).getTime() - new Date(b.fecha).getTime()) * dir
          )
        case 'variedad':
          return `${a.variedad}`.localeCompare(`${b.variedad}`, locCmp) * dir
        case 'cantidad':
          return (a.cantidad - b.cantidad) * dir
        case 'metodoPago':
          return `${a.metodoPago}`.localeCompare(`${b.metodoPago}`, locCmp) * dir
        case 'total':
          return (a.total - b.total) * dir
        case 'numero':
        default:
          return 0
      }
    }
    if (saleSortKey !== 'numero') rows = [...rows].sort(cmp)
    return rows
  }, [sales, saleFilterFrom, saleFilterTo, saleSortKey, saleSortDir, locCmp])

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
            {t('sales.title')}
          </h2>
          <p className={cn('mt-1 text-sm', C.muted)}>{t('sales.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              onClick={() => setFilterOpen((v) => !v)}
              className={cn(
                'inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium shadow-sm',
                'border-gray-200/90 bg-white hover:border-gray-300 hover:shadow-[var(--shadow-soft)]',
                'dark:border-zinc-700 dark:bg-zinc-950',
                C.muted,
                filterOpen && 'ring-2 ring-gray-900/10 dark:ring-green-500/20',
                'focus:outline-none focus:ring-2',
                C.ringFocusMenu,
              )}
            >
              <CalendarRange className="h-4 w-4" strokeWidth={1.75} />
              {t('sales.filterSort')}
              <ArrowDownUp className="h-4 w-4 opacity-70" strokeWidth={1.75} />
            </motion.button>

            <AnimatePresence>
              {filterOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className={cn(
                    'absolute right-0 z-30 mt-2 w-[min(100vw-2rem,340px)] rounded-2xl border p-4 shadow-[var(--shadow-soft-lg)]',
                    C.card,
                  )}
                >
                  <p className={cn('mb-3 text-xs font-medium uppercase tracking-wide', C.subheading)}>
                    {t('sales.dateRange')}
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className={cn('mb-1 block text-xs', C.muted)}>
                        {t('sales.from')}
                      </label>
                      <input
                        type="date"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm outline-none',
                          C.input,
                        )}
                        value={saleFilterFrom}
                        onChange={(e) => setSaleFilterFrom(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={cn('mb-1 block text-xs', C.muted)}>
                        {t('sales.to')}
                      </label>
                      <input
                        type="date"
                        className={cn(
                          'w-full rounded-xl border px-3 py-2 text-sm outline-none',
                          C.input,
                        )}
                        value={saleFilterTo}
                        onChange={(e) => setSaleFilterTo(e.target.value)}
                      />
                    </div>
                  </div>
                  <p className={cn('mb-2 mt-4 text-xs font-medium uppercase tracking-wide', C.subheading)}>
                    {t('sales.sortBy')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {sortKeys.map((key) => (
                      <div key={key} className="flex gap-1">
                        <span className="sr-only">{t(sortLabelKey[key])}</span>
                        <button
                          type="button"
                          onClick={() => setSaleSort(key, 'asc')}
                          className={cn(
                            'rounded-xl border px-2.5 py-1 text-xs font-medium transition',
                            saleSortKey === key && saleSortDir === 'asc'
                              ? cn(C.navActive, 'border-transparent')
                              : cn('border-gray-200 dark:border-zinc-700', C.muted, 'hover:bg-gray-50 dark:hover:bg-zinc-800'),
                          )}
                        >
                          {t(sortLabelKey[key])} ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => setSaleSort(key, 'desc')}
                          className={cn(
                            'rounded-xl border px-2.5 py-1 text-xs font-medium transition',
                            saleSortKey === key && saleSortDir === 'desc'
                              ? cn(C.navActive, 'border-transparent')
                              : cn('border-gray-200 dark:border-zinc-700', C.muted, 'hover:bg-gray-50 dark:hover:bg-zinc-800'),
                          )}
                        >
                          {t(sortLabelKey[key])} ↓
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    className={cn('mt-3 w-full rounded-xl py-2 text-xs font-medium hover:bg-gray-50 dark:hover:bg-zinc-800', C.muted)}
                    onClick={() => {
                      setSaleFilterFrom('')
                      setSaleFilterTo('')
                      setSaleSort('fecha', 'desc')
                    }}
                  >
                    {t('sales.clearFilters')}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => setSalePanel({ mode: 'add' })}
            className={cn(
              'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
              C.btnPrimary,
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
            {t('sales.newOrder')}
          </motion.button>
        </div>
      </div>

      <div className={cn('overflow-hidden rounded-2xl border shadow-sm', C.card)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-[15px]">
            <thead>
              <tr className={cn('text-xs font-medium uppercase tracking-wide', C.tableHead)}>
                <th className="w-12 px-4 py-3.5">{t('sales.n')}</th>
                <th className="px-4 py-3.5">{t('sales.nombre')}</th>
                <th className="px-4 py-3.5">{t('sales.fecha')}</th>
                <th className="px-4 py-3.5">{t('sales.variedad')}</th>
                <th className="px-4 py-3.5 text-right">{t('sales.cantidad')}</th>
                <th className="px-4 py-3.5">{t('sales.pago')}</th>
                <th className="px-4 py-3.5 text-right">{t('sales.total')}</th>
                <th className="w-12 px-2 py-3.5" />
              </tr>
            </thead>
            <tbody className={C.tableRow}>
              {filteredSorted.map((row, i) => (
                <motion.tr
                  key={row.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={cn('transition', C.rowHover)}
                >
                  <td className={cn('px-4 py-3.5 tabular-nums', C.muted)}>{i + 1}</td>
                  <td className={cn('px-4 py-3.5 font-medium', C.heading)}>{row.nombre}</td>
                  <td className={cn('px-4 py-3.5', C.muted)}>{row.fecha}</td>
                  <td className={cn('px-4 py-3.5', C.muted)}>{row.variedad}</td>
                  <td className={cn('px-4 py-3.5 text-right tabular-nums', C.heading)}>
                    {row.cantidad}
                  </td>
                  <td className={cn('px-4 py-3.5', C.muted)}>
                    {t(paymentMessageKey(row.metodoPago))}
                  </td>
                  <td className={cn('px-4 py-3.5 text-right font-medium tabular-nums', C.heading)}>
                    ${row.total.toLocaleString(locNum, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-3.5">
                    <RowActionsMenu
                      onEdit={() => setSalePanel({ mode: 'edit', sale: row })}
                      onDelete={() => {
                        if (confirm(t('sales.deleteConfirm'))) removeSale(row.id)
                      }}
                    />
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredSorted.length === 0 && (
          <p className={cn('py-14 text-center text-sm', C.muted)}>{t('sales.empty')}</p>
        )}
      </div>

      <AnimatePresence>
        {salePanel && (
          <SaleSlideOver
            key={
              salePanel.mode === 'edit' && salePanel.sale
                ? salePanel.sale.id
                : 'new-sale'
            }
            initial={salePanel.mode === 'edit' ? salePanel.sale ?? null : null}
            onClose={() => setSalePanel(null)}
            onSave={(r) => {
              if (salePanel.mode === 'edit' && salePanel.sale)
                updateSale(salePanel.sale.id, r)
              else addSale(r)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
