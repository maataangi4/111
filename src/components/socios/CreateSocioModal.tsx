import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { createPortal } from 'react-dom'
import { Download, X } from 'lucide-react'
import {
  CONSENTIMIENTO_ANEXO_III_FILENAME,
  getConsentimientoAnexoIIIPublicUrl,
} from '../../data/consentimientoAnexoIII'
import { cn } from '../../lib/cn'
import { useSociosStore, type SocioFinancialStatus } from '../../store/useSociosStore'

function localIsoDate(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function defaultExpiryOneYear(): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return localIsoDate(d)
}

export type CreateSocioModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Called after a successful create (modal already closing). */
  onCreated?: (socioId: string) => void
}

function CreateSocioModalInner({ open, onOpenChange, onCreated }: CreateSocioModalProps) {
  const consentTemplateHref = useMemo(() => getConsentimientoAnexoIIIPublicUrl(), [])

  const [nombre, setNombre] = useState('')
  const [dni, setDni] = useState('')
  const [reprocannCode, setReprocannCode] = useState('')
  const [reprocannExpiresOn, setReprocannExpiresOn] = useState('')
  const [activo, setActivo] = useState(true)
  const [financialStatus, setFinancialStatus] = useState<SocioFinancialStatus>('al_dia')
  const [consentTemplateDownloaded, setConsentTemplateDownloaded] = useState(false)
  const [consentDeliveredAck, setConsentDeliveredAck] = useState(false)
  const [consentSignedOnFile, setConsentSignedOnFile] = useState(false)

  const resetForm = useCallback(() => {
    setNombre('')
    setDni('')
    setReprocannCode('')
    setReprocannExpiresOn(defaultExpiryOneYear())
    setActivo(true)
    setFinancialStatus('al_dia')
    setConsentTemplateDownloaded(false)
    setConsentDeliveredAck(false)
    setConsentSignedOnFile(false)
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    resetForm()
  }, [open, resetForm])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const submit = () => {
    if (!consentTemplateDownloaded) {
      window.alert(
        'Descargá la plantilla del Anexo III (consentimiento informado bilateral) para entregarla al paciente antes de crear el alta.',
      )
      return
    }
    if (!consentDeliveredAck) {
      window.alert('Marcá la confirmación de que el paciente recibirá el documento para su firma.')
      return
    }

    const digits = reprocannCode.replace(/\D/g, '').slice(0, 6)
    const expires =
      reprocannExpiresOn.trim() && /^\d{4}-\d{2}-\d{2}$/.test(reprocannExpiresOn.trim())
        ? reprocannExpiresOn.trim()
        : null

    const res = useSociosStore.getState().addSocio({
      nombre,
      dni,
      reprocannCode: digits,
      reprocannExpiresOn: expires,
      activo,
      financialStatus,
      consentimientoSignedOnFile: consentSignedOnFile,
    })

    if (!res.ok) {
      if (res.error === 'club_cap') {
        window.alert('El cupo de socios activos de la ONG está completo (150). Desactivá “Activo” o liberá cupos.')
        return
      }
      if (res.error === 'dup_dni') {
        window.alert('Ya existe un socio con ese DNI.')
        return
      }
      window.alert('Completá nombre, DNI y un código Reprocann de 6 dígitos.')
      return
    }

    onOpenChange(false)
    onCreated?.(res.id)
  }

  const fieldClass =
    'mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500/25 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b]'

  return (
    <>
      {typeof document !== 'undefined'
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  key="create-socio-modal"
                  className="fixed inset-0 z-[125] flex items-center justify-center p-4 sm:p-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <button
                    type="button"
                    className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] dark:bg-black/55"
                    aria-label="Cerrar"
                    onClick={() => onOpenChange(false)}
                  />
                  <motion.div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="create-socio-title"
                    className={cn(
                      'relative z-10 w-full max-w-md overflow-hidden rounded-3xl border shadow-xl',
                      'border-slate-200/90 bg-white dark:border-[#3d3d3d] dark:bg-[#1c1c1c]',
                      'shadow-[0_24px_80px_-12px_rgba(15,23,42,0.25)] dark:shadow-[0_24px_80px_-12px_rgba(0,0,0,0.5)]',
                    )}
                    initial={{ opacity: 0, scale: 0.97, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: 12 }}
                    transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
                      aria-label="Cerrar"
                    >
                      <X className="h-5 w-5" strokeWidth={1.75} />
                    </button>

                    <div className="max-h-[min(90dvh,calc(100vh-2rem))] overflow-y-auto overscroll-contain p-5 pt-12">
                      <h2
                        id="create-socio-title"
                        className="text-lg font-semibold tracking-tight text-slate-900 dark:text-[#f1f1f1]"
                      >
                        Nuevo paciente
                      </h2>
                      <p className="mt-1 text-xs text-slate-500 dark:text-[#8c8c8c]">
                        Alta de socio con datos mínimos. El consentimiento Anexo III es obligatorio; la copia firmada
                        podés marcarla en el perfil (Documentos).
                      </p>

                      <div className="mt-4 rounded-2xl border border-slate-200/90 bg-slate-50/80 p-3.5 dark:border-[#3d3d3d] dark:bg-[#232323]">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-[#8c8c8c]">
                          Consentimiento informado — Anexo III
                        </p>
                        <p className="mt-1.5 text-xs leading-snug text-slate-600 dark:text-[#b0b0b0]">
                          La plantilla está en la carpeta{' '}
                          <code className="rounded bg-slate-200/80 px-1 py-0.5 text-[10px] text-slate-800 dark:bg-black/30 dark:text-[#c4c4c4]">
                            public/templates/
                          </code>{' '}
                          del proyecto y se sirve en la web como archivo .txt. Descargá o abrila en una pestaña,
                          completá en consulta con el/la profesional y hacé firmar al paciente. El PDF o escaneo
                          firmado cargalo desde el perfil →{' '}
                          <span className="font-medium text-slate-800 dark:text-[#e5e5e5]">Documentos</span> → «Anexo
                          III — consentimiento informado (firmado)».
                        </p>
                        <div className="mt-3 flex flex-col gap-2">
                          <a
                            href={consentTemplateHref}
                            download={CONSENTIMIENTO_ANEXO_III_FILENAME}
                            onClick={() => setConsentTemplateDownloaded(true)}
                            className={cn(
                              'inline-flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition no-underline',
                              'border-slate-200 bg-white text-slate-800 hover:bg-slate-50',
                              'dark:border-[#454545] dark:bg-[#2a2a2a] dark:text-[#f1f1f1] dark:hover:bg-[#323232]',
                            )}
                          >
                            <Download className="h-4 w-4 shrink-0" aria-hidden />
                            Descargar plantilla (.txt)
                          </a>
                          <a
                            href={consentTemplateHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={() => setConsentTemplateDownloaded(true)}
                            className="text-center text-xs font-medium text-emerald-700 underline-offset-2 hover:underline dark:text-emerald-400/90"
                          >
                            Abrir en pestaña nueva (si no baja el archivo)
                          </a>
                        </div>
                        <label className="mt-3 flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={consentDeliveredAck}
                            onChange={(e) => setConsentDeliveredAck(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 dark:border-[#555] dark:bg-[#2a2a2a]"
                          />
                          <span className="text-xs leading-snug text-slate-700 dark:text-[#d4d4d4]">
                            Confirmo que el paciente recibirá esta plantilla para lectura y firma, conforme Ley 26.529 y
                            normativa vigente (Ley 27.350 / Dec. 883/2020).
                          </span>
                        </label>
                        <label className="mt-2 flex cursor-pointer items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={consentSignedOnFile}
                            onChange={(e) => setConsentSignedOnFile(e.target.checked)}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 dark:border-[#555] dark:bg-[#2a2a2a]"
                          />
                          <span className="text-xs leading-snug text-slate-600 dark:text-[#a3a3a3]">
                            Opcional: ya tengo el ejemplar firmado en el expediente (se marca como cargado al crear).
                          </span>
                        </label>
                      </div>

                      <div className="mt-5 space-y-4">
                        <label className="block">
                          <span className="text-xs font-medium text-slate-600 dark:text-[#a3a3a3]">
                            Nombre completo <span className="text-rose-500">*</span>
                          </span>
                          <input
                            type="text"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className={fieldClass}
                            placeholder="Ej. Ana García"
                            autoComplete="name"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-slate-600 dark:text-[#a3a3a3]">
                            DNI <span className="text-rose-500">*</span>
                          </span>
                          <input
                            type="text"
                            value={dni}
                            onChange={(e) => setDni(e.target.value)}
                            className={fieldClass}
                            placeholder="Ej. 32.441.882"
                            autoComplete="off"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-slate-600 dark:text-[#a3a3a3]">
                            Código Reprocann (6 dígitos) <span className="text-rose-500">*</span>
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            maxLength={12}
                            value={reprocannCode}
                            onChange={(e) => setReprocannCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={cn(fieldClass, 'font-mono tabular-nums tracking-wide')}
                            placeholder="000000"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-slate-600 dark:text-[#a3a3a3]">
                            Vencimiento licencia
                          </span>
                          <input
                            type="date"
                            value={reprocannExpiresOn}
                            onChange={(e) => setReprocannExpiresOn(e.target.value)}
                            className={cn(
                              fieldClass,
                              '[color-scheme:dark] dark:[color-scheme:dark]',
                            )}
                          />
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-[#6b6b6b]">
                            Vacío = sin fecha (estado legal vencido hasta cargar una).
                          </p>
                        </label>

                        <label className="flex cursor-pointer items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={activo}
                            onChange={(e) => setActivo(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/30 dark:border-[#555] dark:bg-[#2a2a2a]"
                          />
                          <span className="text-sm text-slate-700 dark:text-[#d4d4d4]">Socio activo (cupo ONG)</span>
                        </label>

                        <div>
                          <span className="text-xs font-medium text-slate-600 dark:text-[#a3a3a3]">Cuota / finanzas</span>
                          <select
                            value={financialStatus}
                            onChange={(e) => setFinancialStatus(e.target.value as SocioFinancialStatus)}
                            className={cn(fieldClass, 'cursor-pointer')}
                          >
                            <option value="al_dia">Al día</option>
                            <option value="deuda">Deuda</option>
                          </select>
                        </div>
                      </div>

                      <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-[#2f2f2f]">
                        <button
                          type="button"
                          onClick={() => onOpenChange(false)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-[#3d3d3d] dark:text-[#e5e5e5] dark:hover:bg-[#2a2a2a]"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={submit}
                          className="rounded-xl bg-[#06663F] px-3 py-2 text-sm font-semibold text-white hover:brightness-110 active:brightness-95"
                        >
                          Crear paciente
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  )
}

export const CreateSocioModal = memo(CreateSocioModalInner)
