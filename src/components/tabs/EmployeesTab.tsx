import { AnimatePresence, motion } from 'framer-motion'
import { Eye, FileCheck2, ImagePlus, Plus, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { readFileAsDataUrl } from '../../lib/readFileAsDataUrl'
import { useCrmStore } from '../../store/useCrmStore'
import { AttachmentPreviewModal } from '../ui/AttachmentPreviewModal'

export function EmployeesTab() {
  const { t } = useTranslation()
  const employees = useCrmStore((s) => s.employees)
  const addEmployee = useCrmStore((s) => s.addEmployee)
  const removeEmployee = useCrmStore((s) => s.removeEmployee)
  const setEmployeeReprocan = useCrmStore((s) => s.setEmployeeReprocan)
  const setEmployeePhoto = useCrmStore((s) => s.setEmployeePhoto)

  const [nameInput, setNameInput] = useState('')
  const [dniInput, setDniInput] = useState('')
  const [photoNew, setPhotoNew] = useState<{
    fileName: string
    mime: string
    dataUrl: string
  } | null>(null)
  const [reprocanNew, setReprocanNew] = useState<{
    fileName: string
    mime: string
    dataUrl: string
  } | null>(null)

  const [previewReprocan, setPreviewReprocan] = useState<{
    fileName: string
    mime: string
    dataUrl: string
  } | null>(null)

  const inputClass = cn(
    'flex-1 min-w-[140px] rounded-2xl border px-4 py-2.5 text-[15px]',
    C.input,
  )

  const add = () => {
    const n = nameInput.trim()
    const d = dniInput.trim()
    if (!n || !d) return
    addEmployee({
      name: n,
      dni: d,
      photo: photoNew,
      reprocan: reprocanNew,
    })
    setNameInput('')
    setDniInput('')
    setPhotoNew(null)
    setReprocanNew(null)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
          {t('employees.title')}
        </h2>
        <p className={cn('mt-1 text-sm', C.muted)}>{t('employees.subtitle')}</p>
      </div>

      <div
        className={cn(
          'mb-6 flex flex-col gap-3 rounded-2xl border p-4 shadow-sm lg:flex-row lg:flex-wrap',
          C.card,
        )}
      >
        <input
          className={inputClass}
          placeholder={t('employees.fullName')}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
        />
        <input
          className={inputClass}
          placeholder={t('employees.dniPh')}
          value={dniInput}
          onChange={(e) => setDniInput(e.target.value)}
        />
        <label
          className={cn(
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium',
            C.btnSecondary,
          )}
        >
          <ImagePlus className="h-4 w-4" strokeWidth={1.75} />
          {photoNew ? t('employees.changePhoto') : t('employees.uploadPhoto')}
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={async (ev) => {
              const f = ev.target.files?.[0]
              ev.target.value = ''
              if (!f) return
              setPhotoNew({
                fileName: f.name,
                mime: f.type || 'image/*',
                dataUrl: await readFileAsDataUrl(f),
              })
            }}
          />
        </label>
        <label
          className={cn(
            'inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-medium',
            C.btnSecondary,
          )}
        >
          <FileCheck2 className="h-4 w-4" strokeWidth={1.75} />
          {reprocanNew?.fileName ?? t('employees.reprocanAttach')}
          <input
            type="file"
            className="hidden"
            accept=".pdf,image/*,.doc,.docx"
            onChange={async (ev) => {
              const f = ev.target.files?.[0]
              ev.target.value = ''
              if (!f) return
              const dataUrl = await readFileAsDataUrl(f)
              setReprocanNew({
                fileName: f.name,
                mime: f.type || 'application/octet-stream',
                dataUrl,
              })
            }}
          />
        </label>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={add}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
            C.btnPrimary,
          )}
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          {t('common.add')}
        </motion.button>
      </div>

      <div className="space-y-3">
        <AnimatePresence mode="popLayout">
          {employees.map((e) => (
            <motion.div
              layout
              key={e.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={cn(
                'flex flex-col gap-3 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between',
                C.card,
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 overflow-hidden rounded-2xl',
                    C.iconBox,
                  )}
                >
                  {e.photo?.dataUrl ? (
                    <img
                      src={e.photo.dataUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <User className="h-6 w-6" strokeWidth={1.75} />
                    </div>
                  )}
                </div>
                <div>
                  <p className={cn('font-medium', C.heading)}>{e.name}</p>
                  <p className={cn('text-xs', C.muted)}>
                    {t('employees.dni')}: {e.dni || '—'}
                  </p>
                  <p className={cn('text-xs', C.muted)}>
                    {e.reprocan
                      ? `${t('employees.reprocanLabel')}: ${e.reprocan.fileName}`
                      : t('employees.reprocanNone')}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium',
                    C.btnSecondary,
                  )}
                >
                  {t('employees.changePhoto')}
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0]
                      ev.target.value = ''
                      if (!f) return
                      const dataUrl = await readFileAsDataUrl(f)
                      setEmployeePhoto(e.id, {
                        fileName: f.name,
                        mime: f.type || 'image/*',
                        dataUrl,
                      })
                    }}
                  />
                </label>
                <label
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium',
                    C.btnSecondary,
                  )}
                >
                  <FileCheck2 className="h-4 w-4" strokeWidth={1.75} />
                  {e.reprocan ? t('employees.reprocanChange') : t('employees.reprocanAttach')}
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*,.doc,.docx"
                    onChange={async (ev) => {
                      const f = ev.target.files?.[0]
                      ev.target.value = ''
                      if (!f) return
                      const dataUrl = await readFileAsDataUrl(f)
                      setEmployeeReprocan(e.id, {
                        fileName: f.name,
                        mime: f.type || 'application/octet-stream',
                        dataUrl,
                      })
                    }}
                  />
                </label>
                {e.reprocan && (
                  <>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setPreviewReprocan(e.reprocan)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-medium',
                        C.btnSecondary,
                      )}
                    >
                      <Eye className="h-4 w-4" />
                      {t('employees.previewReprocan')}
                    </motion.button>
                    <a
                      href={e.reprocan.dataUrl}
                      download={e.reprocan.fileName}
                      className={cn(
                        'rounded-2xl px-3 py-2 text-sm font-medium underline-offset-4 hover:underline',
                        C.muted,
                      )}
                    >
                      {t('employees.download')}
                    </a>
                  </>
                )}
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    if (confirm(t('employees.deleteEmployee'))) removeEmployee(e.id)
                  }}
                  className={cn('rounded-2xl p-2', 'text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50 dark:hover:text-red-400')}
                  aria-label={t('employees.ariaDelete')}
                >
                  <Trash2 className="h-5 w-5" strokeWidth={1.75} />
                </motion.button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {employees.length === 0 && (
          <p
            className={cn(
              'rounded-2xl border py-12 text-center text-sm',
              C.dashed,
              C.cardMuted,
              C.muted,
            )}
          >
            {t('employees.empty')}
          </p>
        )}
      </div>

      <AnimatePresence>
        {previewReprocan && (
          <AttachmentPreviewModal
            key={previewReprocan.dataUrl.slice(0, 48)}
            file={previewReprocan}
            title={t('employees.previewTitle')}
            closeAria={t('common.close')}
            downloadLabel={t('common.download')}
            unsupportedPreview={t('employees.unsupportedPreview')}
            onClose={() => setPreviewReprocan(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
