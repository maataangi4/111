import { motion } from 'framer-motion'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'

type Props = {
  onEdit: () => void
  onDelete: () => void
}

export function RowActionsMenu({ onEdit, onDelete }: Props) {
  const { t } = useTranslation()
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
    <div className="relative flex justify-end" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'rounded-xl p-2 transition',
          'text-gray-500 hover:bg-gray-100 hover:text-gray-800',
          'dark:text-green-600 dark:hover:bg-zinc-800 dark:hover:text-green-400',
          'focus:outline-none focus:ring-2',
          C.ringFocusMenu,
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
          transition={{ duration: 0.15 }}
          className={cn(
            'absolute right-0 top-full z-20 mt-1 min-w-[148px] overflow-hidden rounded-2xl border py-1 shadow-[var(--shadow-soft-lg)]',
            'border-gray-200/90 bg-white dark:border-zinc-700 dark:bg-zinc-900',
          )}
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onEdit()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 dark:text-green-400 dark:hover:bg-zinc-800"
          >
            <Pencil className="h-4 w-4 text-gray-400 dark:text-green-700" />
            {t('common.edit')}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              onDelete()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            <Trash2 className="h-4 w-4 opacity-80" />
            {t('common.delete')}
          </button>
        </motion.div>
      )}
    </div>
  )
}
