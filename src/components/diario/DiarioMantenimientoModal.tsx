import { useEffect, useState } from 'react'
import type {
  DiarioFlorMantenimientoTag,
  DiarioVegMantenimientoTag,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'
import { cn } from '../../lib/cn'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

const VEG_FORMATION_TAGS: DiarioVegMantenimientoTag[] = ['topping', 'defoliacion', 'lst', 'transplante']
const VEG_SCROG_TAGS: DiarioVegMantenimientoTag[] = ['scrog_net', 'scrog_weave', 'lollipop_lower']
const VEG_TAG_ORDER: DiarioVegMantenimientoTag[] = [...VEG_FORMATION_TAGS, ...VEG_SCROG_TAGS]

const FLOR_TAGS: DiarioFlorMantenimientoTag[] = ['flor_schwazz', 'flor_second_net']

export function DiarioMantenimientoModal({
  open,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
  vegetacionMode,
  floracionMode,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
  /** Formación de copa + SCROG (vegetación). */
  vegetacionMode?: boolean
  /** Defoliación floración / soporte cogollos (sin topping ni supercropping en menú). */
  floracionMode?: boolean
}) {
  const [notes, setNotes] = useState('')
  const [vegTags, setVegTags] = useState<Set<DiarioVegMantenimientoTag>>(new Set())
  const [florTags, setFlorTags] = useState<Set<DiarioFlorMantenimientoTag>>(new Set())

  useEffect(() => {
    if (!open) return
    setNotes('')
    setVegTags(new Set())
    setFlorTags(new Set())
  }, [open])

  if (!open) return null

  const toggleVeg = (id: DiarioVegMantenimientoTag) => {
    setVegTags((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleFlor = (id: DiarioFlorMantenimientoTag) => {
    setFlorTags((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleSave = () => {
    const n = notes.trim()
    if (batchIds.length === 0) return
    if (floracionMode) {
      const ft = FLOR_TAGS.filter((id) => florTags.has(id))
      if (!n && ft.length === 0) return
      onCommit({
        kind: 'diario_mantenimiento',
        at: new Date().toISOString(),
        author: author?.trim() || undefined,
        diarioMantenimiento: { notes: n, florTags: ft.length ? ft : undefined },
      })
    } else if (vegetacionMode) {
      const vt = VEG_TAG_ORDER.filter((id) => vegTags.has(id))
      if (!n && vt.length === 0) return
      onCommit({
        kind: 'diario_mantenimiento',
        at: new Date().toISOString(),
        author: author?.trim() || undefined,
        diarioMantenimiento: { notes: n, vegTags: vt.length ? vt : undefined },
      })
    } else {
      if (!n) return
      onCommit({
        kind: 'diario_mantenimiento',
        at: new Date().toISOString(),
        author: author?.trim() || undefined,
        diarioMantenimiento: { notes: n },
      })
    }
    onClose()
  }

  const canSave = floracionMode
    ? notes.trim().length > 0 || florTags.size > 0
    : vegetacionMode
      ? notes.trim().length > 0 || vegTags.size > 0
      : notes.trim().length > 0

  const showOptionalNotes = vegetacionMode || floracionMode

  return (
    <EnvModalFrame
      title={t('diario.modalMantenimientoTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={batchIds.length === 0 || !canSave}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 space-y-4">
        {vegetacionMode ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-gray-600">{t('diario.vegMantenimientoFormationTitle')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {VEG_FORMATION_TAGS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleVeg(id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      vegTags.has(id)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {t(`diario.vegTag_${id}` as 'diario.vegTag_topping')}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600">{t('diario.vegMantenimientoScrogTitle')}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {VEG_SCROG_TAGS.map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => toggleVeg(id)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                      vegTags.has(id)
                        ? 'border-teal-500 bg-teal-50 text-teal-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                    )}
                  >
                    {t(`diario.vegTag_${id}` as 'diario.vegTag_topping')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}
        {floracionMode ? (
          <div>
            <p className="text-xs font-semibold text-gray-600">{t('diario.florMantenimientoTitle')}</p>
            <p className="mt-1 text-[11px] text-gray-500">{t('diario.florMantenimientoHint')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {FLOR_TAGS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleFlor(id)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                    florTags.has(id)
                      ? 'border-purple-500 bg-purple-50 text-purple-900'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300',
                  )}
                >
                  {t(`diario.florTag_${id}` as 'diario.florTag_flor_schwazz')}
                </button>
              ))}
            </div>
          </div>
        ) : null}
        <div>
          {showOptionalNotes ? (
            <label className="block text-xs font-semibold text-gray-600">{t('diario.mantenimientoNotesOptional')}</label>
          ) : null}
          <textarea
            className={cn(
              'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm',
              showOptionalNotes ? 'mt-1.5 min-h-[88px]' : 'min-h-[120px]',
            )}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              floracionMode ? t('diario.mantenimientoPlaceholderFlor') : t('diario.mantenimientoPlaceholder')
            }
          />
        </div>
      </div>
    </EnvModalFrame>
  )
}
