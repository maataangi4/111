import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import {
  CheckCircle2,
  FileText,
  FileUp,
  Landmark,
  Leaf,
  Plus,
  Trash2,
  Users,
  XCircle,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { C } from '../../lib/crmUi'
import { cn } from '../../lib/cn'
import { readFileAsDataUrl } from '../../lib/readFileAsDataUrl'
import { useCrmStore } from '../../store/useCrmStore'
import type { VaultDocCategory } from '../../store/types'

const BRAND_GREEN = '#06663F'

type RequiredDoc = { key: string; name: string; hint: string }

const SECTIONS: {
  id: VaultDocCategory
  labelKey: string
  hintKey: string
  icon: typeof FileText
  iconColor: string
  requiredDocs: RequiredDoc[]
}[] = [
  {
    id: 'plantillas',
    labelKey: 'documents.secPlantillas',
    hintKey: 'documents.secPlantillasHint',
    icon: FileText,
    iconColor: 'text-violet-600 dark:text-violet-400',
    requiredDocs: [
      {
        key: 'tpl_consentimiento',
        name: 'Consentimiento informado bilateral',
        hint: 'Formulario de consentimiento entre paciente, médico y club (Res. 782/22).',
      },
      {
        key: 'tpl_solicitud',
        name: 'Solicitud de ingreso / baja',
        hint: 'Formulario estándar de alta y baja de membresía.',
      },
      {
        key: 'tpl_acuerdo',
        name: 'Acuerdo de vinculación',
        hint: 'Contrato interno sobre condiciones de participación y cuotas.',
      },
      {
        key: 'tpl_acta_destruccion',
        name: 'Acta de baja / destrucción',
        hint: 'Registro de eliminación de semillas o plantas.',
      },
    ],
  },
  {
    id: 'socios',
    labelKey: 'documents.secSocios',
    hintKey: 'documents.secSociosHint',
    icon: Users,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    requiredDocs: [
      {
        key: 'soc_consentimiento',
        name: 'Consentimiento informado (firmado)',
        hint: 'Firmado por socio, médico y club — Res. 782/22.',
      },
      {
        key: 'soc_solicitud',
        name: 'Solicitud de ingreso firmada',
        hint: 'Formulario original de alta de membresía.',
      },
      {
        key: 'soc_acuerdo',
        name: 'Acuerdo de vinculación firmado',
        hint: 'Contrato interno de condiciones y cuotas.',
      },
      {
        key: 'soc_reprocann',
        name: 'Certificado REPROCANN vigente',
        hint: 'Copia de la autorización del Ministerio de Salud.',
      },
      {
        key: 'soc_dni',
        name: 'Copia de DNI del socio',
        hint: 'Frente y dorso del documento de identidad.',
      },
    ],
  },
  {
    id: 'cultivo',
    labelKey: 'documents.secCultivo',
    hintKey: 'documents.secCultivoHint',
    icon: Leaf,
    iconColor: 'text-green-600 dark:text-green-400',
    requiredDocs: [
      {
        key: 'cul_facturas',
        name: 'Facturas y estampillas INASE',
        hint: 'Comprobantes de compra de semillas y sellos oficiales de seguridad.',
      },
      {
        key: 'cul_actas_baja',
        name: 'Actas de baja / destrucción',
        hint: 'Prueba de que los residuos no fueron desviados al mercado ilegal.',
      },
      {
        key: 'cul_informes_me',
        name: 'Informes de evaluación — Grupo ME',
        hint: 'Registros de pruebas de variedades: altura, rendimiento y tiempos.',
      },
      {
        key: 'cul_cert_lab',
        name: 'Certificados de análisis (laboratorio)',
        hint: 'Resultados oficiales de THC/CBD.',
      },
    ],
  },
  {
    id: 'legal',
    labelKey: 'documents.secLegal',
    hintKey: 'documents.secLegalHint',
    icon: Landmark,
    iconColor: 'text-amber-600 dark:text-amber-400',
    requiredDocs: [
      {
        key: 'leg_personeria',
        name: 'Personería jurídica',
        hint: 'Certificado de registro de la ONG ante Inspección General.',
      },
      {
        key: 'leg_rncyfs',
        name: 'Constancia de RNCyFS',
        hint: 'Registro del club en el sistema nacional de fiscalización de semillas.',
      },
      {
        key: 'leg_alquiler',
        name: 'Contrato de alquiler / comodato',
        hint: 'Contrato del espacio físico donde se realiza el cultivo.',
      },
    ],
  },
]

export function DocumentsTab() {
  const { t } = useTranslation()
  const vaultDocuments = useCrmStore((s) => s.vaultDocuments)
  const addVaultDocument = useCrmStore((s) => s.addVaultDocument)
  const removeVaultDocument = useCrmStore((s) => s.removeVaultDocument)

  const [activeSection, setActiveSection] = useState<VaultDocCategory>('plantillas')
  const [uploadTitle, setUploadTitle] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const section = SECTIONS.find((s) => s.id === activeSection)!
  const sectionDocs = vaultDocuments.filter((d) => d.category === activeSection)
  const coverage = Math.min(100, Math.round((sectionDocs.length / Math.max(1, section.requiredDocs.length)) * 100))

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    for (const f of Array.from(files)) {
      const dataUrl = await readFileAsDataUrl(f)
      addVaultDocument({
        title: uploadTitle.trim() || f.name.replace(/\.[^.]+$/, ''),
        fileName: f.name,
        mime: f.type || 'application/octet-stream',
        dataUrl,
        category: activeSection,
      })
    }
    setUploadTitle('')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="min-h-0 w-full overflow-x-hidden px-6 pb-8 pt-6 md:px-8 md:pb-10 md:pt-8">
      <header className="mb-6">
        <h1 className="text-4xl font-semibold tracking-tight text-gray-900 dark:text-[#f1f1f1]">
          {t('documents.title')}
        </h1>
        <p className={cn('mt-1 text-sm', C.muted)}>{t('documents.tabSubtitle')}</p>
      </header>

      <LayoutGroup id="docs-sidebar-layout">
        <div className="flex min-h-0 flex-col gap-6 md:flex-row">
          {/* Sidebar */}
          <aside className="shrink-0 md:w-[220px]">
            <nav className="space-y-1">
              {SECTIONS.map(({ id, labelKey, icon: Icon }) => {
                const active = activeSection === id
                const count = vaultDocuments.filter((d) => d.category === id).length
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={cn(
                      'relative flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-left text-sm font-medium transition',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/60 focus-visible:ring-offset-2 dark:focus-visible:ring-emerald-400/50 dark:focus-visible:ring-offset-[#222222]',
                      active
                        ? 'text-slate-900 dark:text-[#f1f1f1]'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#a3a3a3] dark:hover:bg-white/5 dark:hover:text-[#f1f1f1]',
                    )}
                    style={active ? { color: BRAND_GREEN } : undefined}
                  >
                    {active && (
                      <motion.span
                        layoutId="docs-sidebar-active"
                        className="pointer-events-none absolute inset-0 rounded-full bg-emerald-50 dark:bg-emerald-500/10"
                        transition={{ type: 'spring', damping: 26, stiffness: 340 }}
                        aria-hidden
                      />
                    )}
                    <Icon className="relative h-4 w-4 shrink-0" strokeWidth={1.75} />
                    <span className="relative flex-1 truncate">{t(labelKey)}</span>
                    {count > 0 && (
                      <span
                        className={cn(
                          'relative rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums',
                          active
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-white/50',
                        )}
                      >
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </nav>
          </aside>

          {/* Main content */}
          <div className="min-w-0 flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.14 }}
              >
                {/* Section header */}
                <div className="mb-5 flex flex-wrap items-center gap-3">
                  <section.icon className={cn('h-5 w-5 shrink-0', section.iconColor)} strokeWidth={1.75} />
                  <div className="flex-1">
                    <h2 className={cn('text-xl font-semibold leading-tight', C.heading)}>
                      {t(section.labelKey)}
                    </h2>
                    <p className={cn('mt-0.5 text-xs', C.muted)}>{t(section.hintKey)}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className={C.muted}>
                      {sectionDocs.length}/{section.requiredDocs.length} {t('documents.coverage')}
                    </span>
                    <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          coverage >= 100 ? 'bg-emerald-500' : coverage >= 50 ? 'bg-amber-400' : 'bg-rose-400',
                        )}
                        style={{ width: `${coverage}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Required docs checklist */}
                <div className={cn('mb-4 rounded-2xl border p-4 shadow-sm', C.card)}>
                  <p className={cn('mb-3 text-xs font-medium uppercase tracking-wide', C.subheading)}>
                    {t('documents.required')}
                  </p>
                  <div className="space-y-3">
                    {section.requiredDocs.map((doc) => {
                      const uploaded = sectionDocs.length > 0
                        && sectionDocs.some((d) =>
                          d.title.toLowerCase().includes(doc.name.split(' ')[0].toLowerCase()),
                        )
                      return (
                        <div key={doc.key} className="flex items-start gap-3">
                          {uploaded ? (
                            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" strokeWidth={2} />
                          ) : (
                            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 dark:text-white/20" strokeWidth={2} />
                          )}
                          <div>
                            <p
                              className={cn(
                                'text-sm font-medium leading-snug',
                                uploaded
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : 'text-slate-700 dark:text-[#d4d4d4]',
                              )}
                            >
                              {doc.name}
                            </p>
                            <p className={cn('text-xs leading-relaxed', C.muted)}>{doc.hint}</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Upload area */}
                <div className={cn('mb-5 rounded-2xl border p-4 shadow-sm', C.card)}>
                  <p className={cn('mb-3 text-xs font-medium uppercase tracking-wide', C.subheading)}>
                    {t('documents.uploadSection')}
                  </p>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <input
                      className={cn(
                        'flex-1 rounded-2xl border px-4 py-2.5 text-[15px]',
                        C.input,
                        'bg-gray-50/50 dark:bg-zinc-950/50',
                      )}
                      placeholder={t('documents.titlePh')}
                      value={uploadTitle}
                      onChange={(e) => setUploadTitle(e.target.value)}
                    />
                    <label
                      className={cn(
                        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-medium',
                        C.btnPrimary,
                      )}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2} />
                      {t('documents.pickFiles')}
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept=".pdf,.doc,.docx,image/*,.xlsx,.xls,.txt"
                        onChange={(e) => addFiles(e.target.files)}
                      />
                    </label>
                  </div>
                </div>

                {/* Uploaded docs grid */}
                {sectionDocs.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <AnimatePresence mode="popLayout">
                      {sectionDocs.map((d) => (
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
                              'mb-3 flex h-12 w-12 items-center justify-center rounded-xl',
                              C.imagePlaceholder,
                            )}
                          >
                            <FileText
                              className="h-6 w-6 text-slate-500 dark:text-emerald-700"
                              strokeWidth={1.5}
                            />
                          </div>
                          <p className={cn('line-clamp-2 text-sm font-medium', C.heading)}>{d.title}</p>
                          <p className={cn('mt-0.5 text-xs', C.muted)}>{d.fileName}</p>
                          <p className={cn('text-xs', C.muted)}>{d.uploadedAt}</p>
                          <div className="mt-3 flex gap-2">
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
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(t('documents.deleteDoc'))) removeVaultDocument(d.id)
                              }}
                              className="rounded-xl p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                              aria-label={t('common.delete')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                ) : (
                  <p
                    className={cn(
                      'rounded-2xl border py-14 text-center text-sm',
                      C.dashed,
                      C.cardMuted,
                      C.muted,
                    )}
                  >
                    {t('documents.empty')}
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </LayoutGroup>
    </div>
  )
}
