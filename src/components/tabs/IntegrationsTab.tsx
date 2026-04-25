import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CreditCard,
  Droplets,
  Eye,
  EyeOff,
  Home,
  Loader2,
  MessageSquare,
  Plug,
  Send,
  Table,
  Thermometer,
  Unplug,
  X,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { cn } from '../../lib/cn'
import { C } from '../../lib/crmUi'
import {
  telegramGetMe,
  telegramSendMessage,
} from '../../lib/integrations/telegram'
import {
  INTEGRATION_DEFAULT,
  type IntegrationEntry,
  type IntegrationId,
  useIntegrationsStore,
} from '../../store/useIntegrationsStore'

// ─── Types ───────────────────────────────────────────────────────────────────

type FieldType = 'text' | 'password' | 'url'
type IntegrationCategory = 'iot' | 'comunicacion' | 'finanzas' | 'almacenamiento'

interface FieldDef {
  key: string
  label: string
  placeholder: string
  type: FieldType
  hint?: string
}

interface VerifyResult {
  ok: boolean
  info?: Record<string, string>
  error?: string
}

interface IntegrationMeta {
  id: IntegrationId
  name: string
  description: string
  longDescription: string
  icon: ComponentType<{ className?: string; strokeWidth?: number }>
  iconBg: string
  category: IntegrationCategory
  categoryLabel: string
  isPlaceholder: boolean
  fields: FieldDef[]
  verify?: (config: Record<string, string>) => Promise<VerifyResult>
  ConnectedExtra?: ComponentType<{ entry: IntegrationEntry }>
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const CATEGORY_CHIP: Record<IntegrationCategory, string> = {
  iot: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
  comunicacion: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  finanzas: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-400',
  almacenamiento: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400',
}

// ─── Telegram ConnectedExtra ──────────────────────────────────────────────────

function TelegramConnectedExtra({ entry }: { entry: IntegrationEntry }) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)

  const handleTest = async () => {
    setSending(true)
    setSent(false)
    setSendError(null)
    try {
      await telegramSendMessage(
        entry.config.botToken ?? '',
        entry.config.chatId ?? '',
        '✅ Canspace conectado correctamente. Las notificaciones del cultivo llegarán aquí.',
      )
      setSent(true)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Error al enviar')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mt-1 space-y-2">
      {(entry.info.firstName || entry.info.username) && (
        <div className="rounded-xl bg-sky-50 px-3 py-2 dark:bg-sky-950/20">
          <p className="text-xs font-medium text-sky-700 dark:text-sky-400">
            Bot: <span className="font-semibold">{entry.info.firstName}</span>
            {entry.info.username ? (
              <span className="font-normal opacity-70"> · @{entry.info.username}</span>
            ) : null}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-sky-600/80 dark:text-sky-500/70">
            Las alertas van al grupo (chatId arriba) y también directo a cada empleado si vinculás su Telegram en{' '}
            <span className="font-semibold">Configuración → Equipo</span>.
          </p>
        </div>
      )}

      <button
        type="button"
        onClick={handleTest}
        disabled={sending || sent}
        className={cn(
          'flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition',
          sent
            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800/40 dark:bg-emerald-950/25 dark:text-emerald-400'
            : 'border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800/40 dark:text-sky-400 dark:hover:bg-sky-950/20',
          sending && 'opacity-60 cursor-not-allowed',
        )}
      >
        {sending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />
        ) : (
          <Send className="h-3.5 w-3.5" strokeWidth={2} />
        )}
        {sending ? 'Enviando...' : sent ? '✓ Mensaje enviado' : 'Enviar mensaje de prueba'}
      </button>

      {sendError && (
        <p className="text-[11px] text-red-600 dark:text-red-400">{sendError}</p>
      )}
    </div>
  )
}

// ─── INTEGRATIONS data ────────────────────────────────────────────────────────

const INTEGRATIONS: IntegrationMeta[] = [
  {
    id: 'telegram',
    name: 'Telegram Bot',
    description: 'Notificaciones del cultivo en tiempo real.',
    longDescription:
      'Recibí alertas automáticas sobre cambios de fase, vencimientos y eventos del cultivo directamente en tu chat de Telegram.',
    icon: Send,
    iconBg: 'bg-sky-500',
    category: 'comunicacion',
    categoryLabel: 'Comunicación',
    isPlaceholder: false,
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: '123456789:ABCDefGhIJKlmNoPQRsTUVwxyZ',
        type: 'password',
        hint: 'Obtenelo hablando con @BotFather en Telegram.',
      },
      {
        key: 'chatId',
        label: 'Chat ID del grupo',
        placeholder: '-1001234567890',
        type: 'text',
        hint: 'Creá un grupo en Telegram, añadí el bot como administrador y escribí /start en el grupo. Luego agregá @RawDataBot al grupo — te mandará el chat_id (número negativo, ej: -1001234567890). Sacá a @RawDataBot después.',
      },
    ],
    verify: async (config) => {
      try {
        const bot = await telegramGetMe(config.botToken ?? '')
        return {
          ok: true,
          info: {
            firstName: bot.first_name,
            username: bot.username ?? '',
            botId: String(bot.id),
          },
        }
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Token inválido' }
      }
    },
    ConnectedExtra: TelegramConnectedExtra,
  },
  {
    id: 'homeAssistant',
    name: 'Home Assistant',
    description: 'Sensores IoT: temperatura, humedad y CO₂.',
    longDescription:
      'Conectá tu instancia de Home Assistant para monitorear condiciones ambientales de los grow rooms en tiempo real desde Canspace.',
    icon: Home,
    iconBg: 'bg-blue-600',
    category: 'iot',
    categoryLabel: 'IoT / Cultivo',
    isPlaceholder: false,
    fields: [
      {
        key: 'url',
        label: 'URL del servidor',
        placeholder: 'http://192.168.1.100:8123',
        type: 'url',
        hint: 'URL local o remota de tu instancia de Home Assistant.',
      },
      {
        key: 'token',
        label: 'Long-Lived Access Token',
        placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        type: 'password',
        hint: 'Generalo en Perfil → Tokens de acceso de larga duración en tu HA.',
      },
    ],
    verify: async () => ({ ok: true }),
  },
  {
    id: 'googleSheets',
    name: 'Google Sheets',
    description: 'Exportá reportes y logs de cultivo automáticamente.',
    longDescription:
      'Volcá automáticamente datos de cosecha, movimientos y socios en una hoja de cálculo de Google para análisis y reportes.',
    icon: Table,
    iconBg: 'bg-emerald-600',
    category: 'almacenamiento',
    categoryLabel: 'Almacenamiento',
    isPlaceholder: false,
    fields: [
      {
        key: 'clientId',
        label: 'OAuth Client ID',
        placeholder: '123456789-abc.apps.googleusercontent.com',
        type: 'text',
        hint: 'Crealo en Google Cloud Console → APIs → Credenciales.',
      },
      {
        key: 'clientSecret',
        label: 'OAuth Client Secret',
        placeholder: 'GOCSPX-...',
        type: 'password',
      },
      {
        key: 'spreadsheetId',
        label: 'Spreadsheet ID',
        placeholder: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms',
        type: 'text',
        hint: 'El ID está en la URL de tu Google Sheet.',
      },
    ],
    verify: async () => ({ ok: true }),
  },
  {
    id: 'googleDrive',
    name: 'Google Drive',
    description: 'Respaldos automáticos y documentos en la nube.',
    longDescription:
      'Guardá respaldos del sistema, actas de destrucción y documentos legales automáticamente en una carpeta de Google Drive.',
    icon: Cloud,
    iconBg: 'bg-blue-500',
    category: 'almacenamiento',
    categoryLabel: 'Almacenamiento',
    isPlaceholder: false,
    fields: [
      {
        key: 'clientId',
        label: 'OAuth Client ID',
        placeholder: '123456789-abc.apps.googleusercontent.com',
        type: 'text',
        hint: 'Podés reusar el mismo proyecto de Google que para Sheets.',
      },
      {
        key: 'clientSecret',
        label: 'OAuth Client Secret',
        placeholder: 'GOCSPX-...',
        type: 'password',
      },
      {
        key: 'folderId',
        label: 'Folder ID',
        placeholder: '1aBcDeFgHiJkLmNoPqRsTuVwXyZ',
        type: 'text',
        hint: 'ID de la carpeta de destino, visible en la URL de Drive.',
      },
    ],
    verify: async () => ({ ok: true }),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp API',
    description: 'Mensajería con socios y equipo vía WhatsApp Business.',
    longDescription:
      'Integración con WhatsApp Business API (Meta). Requiere aprobación de Meta y cuenta de negocio verificada.',
    icon: MessageSquare,
    iconBg: 'bg-green-500',
    category: 'comunicacion',
    categoryLabel: 'Comunicación',
    isPlaceholder: true,
    fields: [],
  },
  {
    id: 'mercadopago',
    name: 'Mercado Pago',
    description: 'Procesá cuotas y aportes solidarios de socios.',
    longDescription:
      'Integración con la API de Mercado Pago para gestionar cuotas sociales. Requiere cuenta verificada y manejo de webhooks.',
    icon: CreditCard,
    iconBg: 'bg-cyan-500',
    category: 'finanzas',
    categoryLabel: 'Finanzas',
    isPlaceholder: true,
    fields: [],
  },
  {
    id: 'bluelab',
    name: 'Bluelab',
    description: 'pH, EC y temperatura de solución nutritiva.',
    longDescription:
      'Monitoreo de parámetros de solución nutritiva con dispositivos Bluelab. La API es propietaria con acceso limitado.',
    icon: Droplets,
    iconBg: 'bg-indigo-700',
    category: 'iot',
    categoryLabel: 'IoT / Cultivo',
    isPlaceholder: true,
    fields: [],
  },
  {
    id: 'trolmaster',
    name: 'TrolMaster',
    description: 'Control ambiental inteligente de grow rooms.',
    longDescription:
      'Sistema de control ambiental inteligente para grow rooms. Integración propietaria en desarrollo.',
    icon: Thermometer,
    iconBg: 'bg-orange-600',
    category: 'iot',
    categoryLabel: 'IoT / Cultivo',
    isPlaceholder: true,
    fields: [],
  },
]

// ─── FieldInput ───────────────────────────────────────────────────────────────

function FieldInput({
  def,
  value,
  onChange,
}: {
  def: FieldDef
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  const isSecret = def.type === 'password'

  return (
    <label className="block">
      <span className={cn('text-xs font-medium', C.muted)}>{def.label}</span>
      <div className="relative mt-1">
        <input
          type={isSecret && !show ? 'password' : 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={def.placeholder}
          autoComplete="off"
          spellCheck={false}
          className={cn(
            'w-full rounded-xl border px-3 py-2 text-sm',
            isSecret ? 'pr-9' : '',
            C.input,
          )}
        />
        {isSecret && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Ocultar' : 'Mostrar'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-[#6b6b6b] dark:hover:text-[#a3a3a3]"
          >
            {show ? (
              <EyeOff className="h-4 w-4" strokeWidth={1.75} />
            ) : (
              <Eye className="h-4 w-4" strokeWidth={1.75} />
            )}
          </button>
        )}
      </div>
      {def.hint && (
        <p className="mt-1 text-[11px] leading-relaxed text-gray-400 dark:text-[#6b6b6b]">
          {def.hint}
        </p>
      )}
    </label>
  )
}

// ─── ConfigPanel ──────────────────────────────────────────────────────────────

function ConfigPanel({ meta, onClose }: { meta: IntegrationMeta; onClose: () => void }) {
  const entry = useIntegrationsStore(
    (s) => s.integrations[meta.id] ?? INTEGRATION_DEFAULT(meta.id),
  )
  const patchConfig = useIntegrationsStore((s) => s.patchConfig)
  const setConnected = useIntegrationsStore((s) => s.setConnected)
  const setInfo = useIntegrationsStore((s) => s.setInfo)
  const disconnect = useIntegrationsStore((s) => s.disconnect)

  const [draft, setDraft] = useState<Record<string, string>>(() => ({ ...entry.config }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const Icon = meta.icon
  const allFilled = meta.fields.every((f) => (draft[f.key] ?? '').trim().length > 0)

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    try {
      if (meta.verify) {
        const result = await meta.verify(draft)
        if (!result.ok) {
          setError(result.error ?? 'Error al verificar la integración')
          return
        }
        patchConfig(meta.id, draft)
        if (result.info) setInfo(meta.id, result.info)
      } else {
        patchConfig(meta.id, draft)
      }
      setConnected(meta.id, true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const handleDisconnect = () => {
    disconnect(meta.id)
    setDraft({})
    setError(null)
  }

  const { ConnectedExtra } = meta

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-gray-200/70 bg-[#fdfdfd] shadow-sm dark:border-[#2f2f2f] dark:bg-[#222222]">
      {/* Header */}
      <div className="flex items-start gap-3 border-b border-gray-200/70 p-5 dark:border-[#2f2f2f]">
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
            meta.iconBg,
          )}
        >
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className={cn('text-sm font-semibold', C.heading)}>{meta.name}</h3>
            {entry.connected && !meta.isPlaceholder && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Activo
              </span>
            )}
          </div>
          <p className={cn('mt-0.5 text-xs leading-relaxed', C.muted)}>{meta.longDescription}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-[#6b6b6b] dark:hover:bg-[#2a2a2a] dark:hover:text-[#a3a3a3]"
        >
          <X className="h-4 w-4" strokeWidth={2} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 p-5">
        {meta.isPlaceholder ? (
          <div className="flex flex-col items-center py-8 text-center">
            <span className={cn('mb-3 flex h-12 w-12 items-center justify-center rounded-2xl', meta.iconBg)}>
              <Icon className="h-6 w-6 text-white" strokeWidth={1.5} />
            </span>
            <p className={cn('text-sm font-semibold', C.heading)}>Próximamente</p>
            <p className={cn('mt-1.5 max-w-[220px] text-xs leading-relaxed', C.muted)}>
              Esta integración está en desarrollo y estará disponible en una próxima actualización.
            </p>
            <span className="mt-4 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
              En desarrollo
            </span>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Integración activa */}
            {entry.connected && (
              <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/25">
                <div className="flex items-start gap-2">
                  <CheckCircle2
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={2}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      Integración activa
                    </p>
                    {entry.lastConnectedAt && (
                      <p className="text-[11px] text-emerald-600/70 dark:text-emerald-500/60">
                        Conectado el{' '}
                        {new Date(entry.lastConnectedAt).toLocaleDateString('es-AR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    )}
                  </div>
                </div>

                {/* Contenido extra específico de cada integración */}
                {ConnectedExtra && <ConnectedExtra entry={entry} />}
              </div>
            )}

            {/* Campos de configuración */}
            {meta.fields.map((field) => (
              <FieldInput
                key={field.key}
                def={field}
                value={draft[field.key] ?? ''}
                onChange={(v) => setDraft((d) => ({ ...d, [field.key]: v }))}
              />
            ))}

            {/* Error de verificación */}
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 dark:border-red-900/40 dark:bg-red-950/20">
                <AlertCircle
                  className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                  strokeWidth={2}
                />
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              </div>
            )}

            {meta.fields.length > 0 && !allFilled && !error && (
              <p className={cn('text-[11px]', C.subheading)}>
                Completá todos los campos para conectar.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {!meta.isPlaceholder && (
        <div className="shrink-0 border-t border-gray-200/70 p-4 dark:border-[#2f2f2f]">
          {entry.connected ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSave}
                disabled={!allFilled || saving}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium transition',
                  allFilled && !saving
                    ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-[#f1f1f1] dark:text-[#181818] dark:hover:bg-[#e4e4e4]'
                    : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#2a2a2a] dark:text-[#6b6b6b]',
                )}
              >
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} />}
                {saving ? 'Verificando...' : 'Actualizar'}
              </button>
              <button
                type="button"
                onClick={handleDisconnect}
                className="flex items-center gap-1.5 rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 dark:hover:bg-red-950/25"
              >
                <Unplug className="h-3.5 w-3.5" strokeWidth={2} />
                Desconectar
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={!allFilled || saving}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition',
                allFilled && !saving
                  ? 'bg-gray-900 text-white hover:bg-gray-800 dark:bg-[#f1f1f1] dark:text-[#181818] dark:hover:bg-[#e4e4e4]'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400 dark:bg-[#2a2a2a] dark:text-[#6b6b6b]',
              )}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />
              ) : (
                <Plug className="h-4 w-4" strokeWidth={2} />
              )}
              {saving ? 'Verificando...' : 'Conectar'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── IntegrationCard ──────────────────────────────────────────────────────────

function IntegrationCard({
  meta,
  active,
  onClick,
}: {
  meta: IntegrationMeta
  active: boolean
  onClick: () => void
}) {
  const connected = useIntegrationsStore(
    (s) => (s.integrations[meta.id] ?? INTEGRATION_DEFAULT(meta.id)).connected,
  )
  const Icon = meta.icon

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex w-full flex-col gap-3 rounded-2xl border p-4 text-left transition',
        active
          ? 'border-emerald-500/40 bg-emerald-50/50 ring-1 ring-emerald-500/20 dark:border-emerald-500/30 dark:bg-emerald-950/20'
          : 'border-gray-200/70 bg-[#fdfdfd] shadow-sm hover:shadow-md dark:border-[#2f2f2f] dark:bg-[#222222] dark:hover:shadow-black/50',
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', meta.iconBg)}>
          <Icon className="h-5 w-5 text-white" strokeWidth={1.75} />
        </span>

        <div className="min-w-0 flex-1">
          <p className={cn('text-sm font-semibold leading-tight', C.heading)}>{meta.name}</p>
          <span className={cn('mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium', CATEGORY_CHIP[meta.category])}>
            {meta.categoryLabel}
          </span>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {meta.isPlaceholder ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
              Pronto
            </span>
          ) : connected ? (
            <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Activo
            </span>
          ) : (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500 dark:bg-[#2a2a2a] dark:text-[#8c8c8c]">
              Inactivo
            </span>
          )}
          <ChevronRight
            className={cn(
              'h-4 w-4 transition-colors',
              active ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-[#6b6b6b]',
            )}
            strokeWidth={1.75}
          />
        </div>
      </div>

      <p className={cn('text-xs leading-relaxed', C.muted)}>{meta.description}</p>
    </motion.button>
  )
}

// ─── IntegrationsTab ──────────────────────────────────────────────────────────

export function IntegrationsTab() {
  const [selected, setSelected] = useState<IntegrationId | null>(null)

  const connectedCount = useIntegrationsStore((s) =>
    Object.values(s.integrations).filter((e) => e.connected).length,
  )

  const selectedMeta = selected ? (INTEGRATIONS.find((m) => m.id === selected) ?? null) : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className={cn('text-2xl font-semibold tracking-tight', C.heading)}>
            Integraciones
          </h2>
          <p className={cn('mt-1 text-sm', C.muted)}>
            Conectá herramientas externas a Canspace para automatizar reportes, notificaciones y
            monitoreo ambiental.
          </p>
        </div>
        {connectedCount > 0 && (
          <span className="shrink-0 self-start rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
            {connectedCount} activa{connectedCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Grid + Panel */}
      <div className="flex items-start gap-5">
        <div
          className={cn(
            'grid gap-3',
            selectedMeta
              ? 'flex-1 grid-cols-1 sm:grid-cols-2'
              : 'w-full grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          )}
        >
          {INTEGRATIONS.map((meta) => (
            <IntegrationCard
              key={meta.id}
              meta={meta}
              active={selected === meta.id}
              onClick={() => setSelected((prev) => (prev === meta.id ? null : meta.id))}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          {selectedMeta && (
            <motion.div
              key={selectedMeta.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="w-[320px] shrink-0"
            >
              <ConfigPanel meta={selectedMeta} onClose={() => setSelected(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
