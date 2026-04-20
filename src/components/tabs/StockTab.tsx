import { AnimatePresence, motion } from 'framer-motion'
import { ImagePlus, Plus, X } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import {
  geneticsWithoutStockRow,
  stockLinkedToGenetics,
} from '../../lib/stockLinkedGenetics'
import type { GeneticsBankEntry } from '../../store/cultivationTypes'
import type { StockItem } from '../../store/types'
import { useCrmStore } from '../../store/useCrmStore'
import { useCultivationStore } from '../../store/useCultivationStore'
import { RowActionsMenu } from '../ui/RowActionsMenu'
import { SoftSelect } from '../ui/SoftSelect'

function StockForm({
  mode,
  initial,
  geneticsBank,
  stock,
  onSave,
  onClose,
}: {
  mode: 'add' | 'edit'
  initial: StockItem | null
  geneticsBank: GeneticsBankEntry[]
  stock: StockItem[]
  onSave: (row: Omit<StockItem, 'id'>) => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const available = useMemo(
    () => geneticsWithoutStockRow(stock, geneticsBank),
    [stock, geneticsBank],
  )
  const defaultGeneticsId =
    mode === 'add' ? available[0]?.id ?? '' : initial?.geneticsEntryId ?? ''
  const [geneticsId, setGeneticsId] = useState(defaultGeneticsId)
  const [precio, setPrecio] = useState(
    initial?.precio != null ? String(initial.precio) : '',
  )
  const [imageUrl, setImageUrl] = useState(initial?.imageUrl ?? '')
  const fileRef = useRef<HTMLInputElement>(null)
  const effectiveGeneticsId = geneticsId || (mode === 'add' ? available[0]?.id ?? '' : '')

  const selectedEntry =
    mode === 'add'
      ? geneticsBank.find((g) => g.id === effectiveGeneticsId)
      : geneticsBank.find((g) => g.id === initial?.geneticsEntryId)

  const strainLabel =
    selectedEntry?.name ??
    initial?.tipo ??
    ''

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = () => setImageUrl(String(r.result ?? ''))
    r.readAsDataURL(f)
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = Number(precio.replace(',', '.'))
    if (!Number.isFinite(p) || p < 0) return
    if (mode === 'add') {
      const entry = geneticsBank.find((g) => g.id === effectiveGeneticsId)
      if (!entry) return
      onSave({
        geneticsEntryId: entry.id,
        tipo: entry.name,
        precio: p,
        imageUrl: imageUrl.trim() || entry.imageUrl,
      })
    } else if (initial) {
      const gid =
        initial.geneticsEntryId ??
        geneticsBank.find(
          (g) =>
            g.name.trim().toLowerCase() === initial.tipo.trim().toLowerCase(),
        )?.id
      onSave({
        geneticsEntryId: gid,
        tipo: initial.tipo,
        precio: p,
        imageUrl: imageUrl.trim(),
        ...(initial.inventoryGrams != null
          ? { inventoryGrams: initial.inventoryGrams }
          : {}),
      })
    }
    onClose()
  }

  const inputClass = cn('w-full rounded-2xl border px-4 py-3 text-[15px]', C.input)

  const geneticsOptions = useMemo(
    () => [
      { value: '' as string, label: t('stock.geneticsPick') },
      ...available.map((g) => ({ value: g.id, label: g.name })),
    ],
    [t, available],
  )

  const geneticsChip =
    effectiveGeneticsId === ''
      ? t('stock.geneticsPick')
      : available.find((g) => g.id === effectiveGeneticsId)?.name ??
        geneticsBank.find((g) => g.id === effectiveGeneticsId)?.name ??
        t('stock.geneticsPick')

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-form-title"
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
          <div>
            <h2 id="stock-form-title" className={cn('text-lg font-semibold tracking-tight', C.heading)}>
              {mode === 'edit' ? t('stock.editProduct') : t('stock.newProductTitle')}
            </h2>
            <p className={cn('mt-0.5 text-sm', C.muted)}>{t('stock.hint')}</p>
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

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('stock.imageLabel')}
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className={cn(
                  'flex flex-1 items-center justify-center gap-2 rounded-2xl border border-dashed py-3 text-sm font-medium',
                  'border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50',
                  'dark:border-zinc-700 dark:text-green-500 dark:hover:bg-zinc-800/80',
                )}
              >
                <ImagePlus className="h-5 w-5" strokeWidth={1.75} />
                {t('stock.upload')}
              </button>
            </div>
            <input
              className={cn(inputClass, 'mt-2')}
              placeholder={t('stock.imagePh')}
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
            />
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('stock.geneticsLabel')}
            </label>
            {mode === 'edit' ? (
              <div
                className={cn(
                  inputClass,
                  'cursor-not-allowed bg-gray-50/90 dark:bg-zinc-900/60',
                )}
              >
                {strainLabel}
              </div>
            ) : (
              <SoftSelect
                value={effectiveGeneticsId}
                onChange={(v) => setGeneticsId(v)}
                options={geneticsOptions}
                chipText={geneticsChip}
                ariaLabel={t('stock.geneticsLabel')}
                variant="field"
                disabled={available.length === 0}
                triggerClassName={inputClass}
                warning={mode === 'add' && effectiveGeneticsId === ''}
              />
            )}
            {mode === 'add' && available.length === 0 ? (
              <p className="mt-1.5 text-xs text-amber-600 dark:text-amber-400">
                {t('stock.allStrainsLinked')}
              </p>
            ) : null}
          </div>
          <div>
            <label className={cn('mb-1.5 block text-xs font-medium', C.label)}>
              {t('stock.precio')}
            </label>
            <input
              className={inputClass}
              type="number"
              min={0}
              step="0.01"
              placeholder="0"
              value={precio}
              onChange={(e) => setPrecio(e.target.value)}
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
              disabled={mode === 'add' && available.length === 0}
              className={cn(
                'flex-1 rounded-2xl py-3 text-[15px] font-medium disabled:cursor-not-allowed disabled:opacity-40',
                C.btnPrimary,
              )}
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

export function StockTab() {
  const { t } = useTranslation()
  const stock = useCrmStore((s) => s.stock)
  const addStock = useCrmStore((s) => s.addStock)
  const updateStock = useCrmStore((s) => s.updateStock)
  const removeStock = useCrmStore((s) => s.removeStock)
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)

  const visibleStock = useMemo(
    () => stockLinkedToGenetics(stock, geneticsBank),
    [stock, geneticsBank],
  )

  const canAddStock = useMemo(
    () => geneticsWithoutStockRow(stock, geneticsBank).length > 0,
    [stock, geneticsBank],
  )

  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; item?: StockItem } | null>(null)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
            {t('stock.title')}
          </h2>
          <p className={cn('mt-1 text-sm', C.muted)}>{t('stock.subtitle')}</p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setModal({ mode: 'add' })}
          disabled={!canAddStock}
          title={!canAddStock ? t('stock.allStrainsLinked') : undefined}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
            C.btnPrimary,
            !canAddStock && 'cursor-not-allowed opacity-50',
          )}
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          {t('stock.newProduct')}
        </motion.button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStock.map((item) => (
          <motion.article
            layout
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              'group relative overflow-hidden rounded-2xl border shadow-sm transition',
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
              <div className="absolute right-2 top-2">
                <RowActionsMenu
                  onEdit={() => setModal({ mode: 'edit', item })}
                  onDelete={() => {
                    if (confirm(t('stock.deleteConfirm'))) removeStock(item.id)
                  }}
                />
              </div>
            </div>
            <div className="p-4">
              <h3 className={cn('font-semibold', C.heading)}>{item.tipo}</h3>
              <p className={cn('mt-1 text-sm', C.muted)}>
                <span className={cn('font-medium', C.heading)}>${item.precio}</span>
                {t('stock.perGram')}
              </p>
              {item.inventoryGrams != null && item.inventoryGrams > 0 && (
                <p className={cn('mt-1 text-xs', C.subheading)}>
                  {t('stock.inventoryGrams')}:{' '}
                  <span className={cn('font-medium', C.heading)}>
                    {item.inventoryGrams} g
                  </span>
                </p>
              )}
            </div>
          </motion.article>
        ))}
      </div>

      {visibleStock.length === 0 && (
        <div
          className={cn(
            'rounded-2xl border py-16 text-center text-sm',
            C.dashed,
            C.cardMuted,
            C.muted,
          )}
        >
          {geneticsBank.length === 0 ? t('stock.emptyGeneticsFirst') : t('stock.empty')}
        </div>
      )}

      <AnimatePresence>
        {modal && (
          <StockForm
            key={modal.mode === 'edit' && modal.item ? modal.item.id : 'new-stock'}
            mode={modal.mode}
            geneticsBank={geneticsBank}
            stock={stock}
            initial={modal.mode === 'edit' && modal.item ? modal.item : null}
            onClose={() => setModal(null)}
            onSave={(row) => {
              if (modal.mode === 'edit' && modal.item)
                updateStock(modal.item.id, row)
              else addStock(row)
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
