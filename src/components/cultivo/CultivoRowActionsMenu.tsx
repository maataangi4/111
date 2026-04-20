import { useEffect, useRef, useState } from 'react'
import { GitBranch, MoreVertical, Pencil, Trash2 } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../i18n/useTranslation'

export function CultivoRowActionsMenu({
  onEdit,
  onDelete,
  onSplit,
  splitLabel,
  className,
  /** `start`: ancla el menú a la izquierda (se abre hacia la derecha). `end`: a la derecha (por defecto). */
  menuAlign = 'end',
}: {
  onEdit: () => void
  onDelete: () => void
  onSplit?: () => void
  /** Solo cuando `onSplit` está definido; por defecto i18n `loteSplit.menu`. */
  splitLabel?: string
  className?: string
  menuAlign?: 'start' | 'end'
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  return (
    <div className={cn('relative shrink-0', className)} ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((v) => !v)
        }}
        className="rounded-full p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:text-[#9a9a9a] dark:hover:bg-[#2a2a2a]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t('rowActions.menu')}
      >
        <MoreVertical className="h-5 w-5" strokeWidth={2} />
      </button>
      {open ? (
        <div
          className={cn(
            'absolute top-full z-[200] mt-1 min-w-[168px] rounded-xl border border-gray-200 bg-white py-1 shadow-xl ring-1 ring-black/10 dark:border-[#3d3d3d] dark:bg-[#252525] dark:ring-white/10',
            menuAlign === 'start' ? 'left-0' : 'right-0',
          )}
          role="menu"
        >
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onEdit()
            }}
          >
            <Pencil className="h-4 w-4 shrink-0 text-gray-500 dark:text-[#9a9a9a]" />
            {t('common.edit')}
          </button>
          {onSplit ? (
            <button
              type="button"
              role="menuitem"
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]"
              onClick={(e) => {
                e.stopPropagation()
                setOpen(false)
                onSplit()
              }}
            >
              <GitBranch className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-400" strokeWidth={2} />
              {splitLabel ?? t('loteSplit.menu')}
            </button>
          ) : null}
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
            onClick={(e) => {
              e.stopPropagation()
              setOpen(false)
              onDelete()
            }}
          >
            <Trash2 className="h-4 w-4 shrink-0" />
            {t('common.delete')}
          </button>
        </div>
      ) : null}
    </div>
  )
}
