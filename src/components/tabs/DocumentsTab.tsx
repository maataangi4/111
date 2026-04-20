import { AnimatePresence, motion } from 'framer-motion'
import { FileUp, FileType2, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { readFileAsDataUrl } from '../../lib/readFileAsDataUrl'
import { useCrmStore } from '../../store/useCrmStore'

function badgeForMime(m: string, t: (k: string) => string) {
  if (m.includes('pdf')) return t('documents.badgePdf')
  if (m.includes('word') || m.includes('officedocument')) return t('documents.badgeWord')
  if (m.includes('image')) return t('documents.badgePhoto')
  if (m.includes('sheet') || m.includes('excel')) return t('documents.badgeSheet')
  return t('documents.badgeFile')
}

export function DocumentsTab() {
  const { t } = useTranslation()
  const vaultDocuments = useCrmStore((s) => s.vaultDocuments)
  const addVaultDocument = useCrmStore((s) => s.addVaultDocument)
  const removeVaultDocument = useCrmStore((s) => s.removeVaultDocument)

  const [title, setTitle] = useState('')

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const f of Array.from(files)) {
      const dataUrl = await readFileAsDataUrl(f)
      addVaultDocument({
        title: title.trim() || f.name.replace(/\.[^.]+$/, ''),
        fileName: f.name,
        mime: f.type || 'application/octet-stream',
        dataUrl,
      })
    }
    setTitle('')
  }

  const inputClass = cn('flex-1 rounded-2xl border px-4 py-2.5 text-[15px]', C.input)

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
            {t('documents.title')}
          </h2>
          <p className={cn('mt-1 text-sm', C.muted)}>{t('documents.subtitle')}</p>
        </div>
      </div>

      <div className={cn('mb-6 rounded-2xl border p-4 shadow-sm', C.card)}>
        <p className={cn('mb-3 text-xs font-medium uppercase tracking-wide', C.subheading)}>
          {t('documents.uploadSection')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            className={cn(inputClass, 'bg-gray-50/50 dark:bg-zinc-950/50')}
            placeholder={t('documents.titlePh')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <label
            className={cn(
              'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
              C.btnPrimary,
            )}
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
            {t('documents.pickFiles')}
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,image/*,.xlsx,.xls,.txt"
              onChange={(e) => addFiles(e.target.files)}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <AnimatePresence mode="popLayout">
          {vaultDocuments.map((d) => (
            <motion.div
              layout
              key={d.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className={cn(
                'group relative overflow-hidden rounded-2xl border p-4 shadow-sm transition',
                C.card,
                C.cardHover,
              )}
            >
              <div
                className={cn(
                  'mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-gray-500 dark:text-green-700',
                  C.imagePlaceholder,
                )}
              >
                <FileType2 className="h-7 w-7" strokeWidth={1.5} />
              </div>
              <p className={cn('line-clamp-2 font-medium', C.heading)}>{d.title}</p>
              <p className={cn('mt-1 text-xs', C.muted)}>{d.fileName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide', C.pill)}>
                  {badgeForMime(d.mime, t)}
                </span>
                <span className={cn('text-xs', C.subheading)}>{d.uploadedAt}</span>
              </div>
              <div className="mt-4 flex gap-2">
                <a
                  href={d.dataUrl}
                  download={d.fileName}
                  className={cn(
                    'inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium',
                    C.btnSecondary,
                  )}
                >
                  <FileUp className="h-3.5 w-3.5" />
                  {t('documents.openDownload')}
                </a>
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (confirm(t('documents.deleteDoc'))) removeVaultDocument(d.id)
                  }}
                  className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  aria-label={t('common.delete')}
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {vaultDocuments.length === 0 && (
        <p
          className={cn(
            'mt-6 rounded-2xl border py-14 text-center text-sm',
            C.dashed,
            C.cardMuted,
            C.muted,
          )}
        >
          {t('documents.empty')}
        </p>
      )}
    </div>
  )
}
