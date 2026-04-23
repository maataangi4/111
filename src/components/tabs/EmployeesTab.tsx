import { AnimatePresence, motion } from 'framer-motion'
import { Eye, FileCheck2, ImagePlus, Link, Link2Off, Plus, Send, Trash2, User } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { readFileAsDataUrl } from '../../lib/readFileAsDataUrl'
import { useCrmStore } from '../../store/useCrmStore'
import { useIntegrationsStore } from '../../store/useIntegrationsStore'
import { AttachmentPreviewModal } from '../ui/AttachmentPreviewModal'

export function EmployeesTab() {
  const { t } = useTranslation()
  const employees = useCrmStore((s) => s.employees)
  const addEmployee = useCrmStore((s) => s.addEmployee)
  const removeEmployee = useCrmStore((s) => s.removeEmployee)
  const setEmployeeReprocan = useCrmStore((s) => s.setEmployeeReprocan)
  const setEmployeePhoto = useCrmStore((s) => s.setEmployeePhoto)

  const setEmployeeTelegramChatId = useCrmStore((s) => s.setEmployeeTelegramChatId)

  const [nameInput, setNameInput] = useState('')
  const [dniInput, setDniInput] = useState('')

  // Telegram linking state
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [manualChatId, setManualChatId] = useState('')
  const [detecting, setDetecting] = useState(false)
  const [detectError, setDetectError] = useState('')

  async function detectChatId() {
    setDetecting(true)
    setDetectError('')
    try {
      const token = useIntegrationsStore.getState().integrations.telegram?.config.botToken ?? ''
      if (!token) { setDetectError('Bot no configurado en Integraciones'); return }
      const r = await fetch(`https://api.telegram.org/bot${token}/getUpdates?limit=20`)
      const data: { ok: boolean; result: Array<{ message?: { chat: { id: number; first_name?: string } } }> } = await r.json()
      if (!data.ok || !data.result.length) {
        setDetectError('Sin mensajes recientes. Abrí @CanspaceBot y mandá cualquier mensaje primero.')
        return
      }
      const last = [...data.result].reverse().find((u) => u.message?.chat?.id)
      if (!last?.message?.chat?.id) { setDetectError('No se encontró Chat ID. Intentá mandar /start al bot.'); return }
      setManualChatId(String(last.message.chat.id))
    } catch {
      setDetectError('Error al conectar con Telegram.')
    } finally {
      setDetecting(false)
    }
  }

  function openLink(id: string, current?: string) {
    setLinkingId(id)
    setManualChatId(current ?? '')
    setDetectError('')
  }

  function saveLink(id: string) {
    const v = manualChatId.trim()
    if (!v) return
    setEmployeeTelegramChatId(id, v)
    setLinkingId(null)
  }
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
                {e.telegramChatId ? (
                  <div className="flex items-center gap-1.5">
                    <span className={cn('flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-medium', 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400')}>
                      <Send className="h-3.5 w-3.5" />
                      Telegram vinculado
                    </span>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => openLink(e.id, e.telegramChatId)}
                      className={cn('rounded-2xl border px-3 py-2 text-sm font-medium', C.btnSecondary)}
                    >
                      Cambiar
                    </motion.button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setEmployeeTelegramChatId(e.id, undefined)}
                      className={cn('rounded-2xl p-2', 'text-gray-400 hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/50 dark:hover:text-amber-400')}
                      title="Desvincular Telegram"
                    >
                      <Link2Off className="h-4 w-4" strokeWidth={1.75} />
                    </motion.button>
                  </div>
                ) : (
                  <motion.button
                    type="button"
                    whileTap={{ scale: 0.97 }}
                    onClick={() => openLink(e.id)}
                    className={cn('inline-flex items-center gap-1.5 rounded-2xl border px-3 py-2 text-sm font-medium', C.btnSecondary)}
                  >
                    <Link className="h-4 w-4" strokeWidth={1.75} />
                    Vincular Telegram
                  </motion.button>
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

              {/* Panel de vinculación */}
              <AnimatePresence>
                {linkingId === e.id && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn('mt-3 overflow-hidden rounded-2xl border p-4', C.card)}
                  >
                    <p className={cn('mb-3 text-sm font-medium', C.heading)}>Vincular Telegram personal</p>
                    <div className={cn('mb-3 rounded-xl border p-3 text-sm', C.cardMuted)}>
                      <p className={cn('mb-1.5 font-medium', C.heading)}>Cómo obtener tu Chat ID:</p>
                      <ol className={cn('space-y-1', C.muted)}>
                        <li>1. Abrí Telegram y buscá <span className="font-semibold text-sky-500">@userinfobot</span></li>
                        <li>2. Mandá <span className="font-mono font-semibold">/start</span></li>
                        <li>3. Te responde con tu ID — copialo y pegalo abajo</li>
                      </ol>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <input
                        className={cn('h-10 w-52 rounded-2xl border px-3 text-sm', C.input)}
                        placeholder="Pegá tu Chat ID aquí"
                        value={manualChatId}
                        onChange={(ev) => setManualChatId(ev.target.value)}
                      />
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        disabled={detecting}
                        onClick={() => void detectChatId()}
                        className={cn('rounded-2xl px-3 py-2 text-sm font-medium', C.btnSecondary)}
                      >
                        {detecting ? 'Buscando…' : 'Detectar con bot'}
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        disabled={!manualChatId.trim()}
                        onClick={() => saveLink(e.id)}
                        className={cn('rounded-2xl px-3 py-2 text-sm font-medium', C.btnPrimary)}
                      >
                        Guardar
                      </motion.button>
                      <motion.button
                        type="button"
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setLinkingId(null)}
                        className={cn('rounded-2xl px-3 py-2 text-sm font-medium', C.btnSecondary)}
                      >
                        Cancelar
                      </motion.button>
                    </div>
                    {detectError && (
                      <p className="mt-2 text-xs text-red-500">{detectError}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
