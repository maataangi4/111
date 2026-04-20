import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { AttachedFile } from '../../store/types'
import { cn } from '../../lib/cn'
import { C } from '../../lib/crmUi'

type Props = {
  file: AttachedFile | null
  title: string
  closeAria: string
  downloadLabel: string
  unsupportedPreview: string
  onClose: () => void
}

export function AttachmentPreviewModal({
  file,
  title,
  closeAria,
  downloadLabel,
  unsupportedPreview,
  onClose,
}: Props) {
  if (!file) return null

  const isPdf = file.mime.includes('pdf') || file.fileName.toLowerCase().endsWith('.pdf')
  const isImage = file.mime.startsWith('image/')

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn('fixed inset-0 z-[90] flex items-center justify-center p-4', C.modalBackdrop)}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.98, y: 8 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, y: 8 }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className={cn(
          'flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border shadow-2xl',
          C.modalCard,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 dark:text-green-700">
              {title}
            </p>
            <p className="truncate text-sm font-medium text-gray-800 dark:text-green-400">
              {file.fileName}
            </p>
          </div>
          <a
            href={file.dataUrl}
            download={file.fileName}
            className={cn(
              'hidden shrink-0 rounded-xl px-3 py-2 text-sm font-medium sm:inline',
              C.btnSecondary,
            )}
          >
            {downloadLabel}
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800"
            aria-label={closeAria}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-[200px] flex-1 overflow-auto bg-gray-100 dark:bg-zinc-950">
          {isImage && (
            <img
              src={file.dataUrl}
              alt=""
              className="mx-auto max-h-[75vh] w-auto max-w-full object-contain"
            />
          )}
          {isPdf && (
            <iframe
              title={file.fileName}
              src={file.dataUrl}
              className="h-[min(75vh,800px)] w-full border-0 bg-white dark:bg-zinc-900"
            />
          )}
          {!isImage && !isPdf && (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-gray-600 dark:text-green-600">
                {unsupportedPreview}
              </p>
              <a
                href={file.dataUrl}
                download={file.fileName}
                className={cn('rounded-2xl px-5 py-2.5 text-sm font-medium', C.btnPrimary)}
              >
                {downloadLabel}
              </a>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
