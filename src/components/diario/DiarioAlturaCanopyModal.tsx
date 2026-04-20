import { useEffect, useState } from 'react'
import type { PropagacionLogEntry } from '../../store/cultivationTypes'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

export function DiarioAlturaCanopyModal({
  open,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
}) {
  const [cm, setCm] = useState('')

  useEffect(() => {
    if (!open) return
    setCm('')
  }, [open])

  if (!open) return null

  const handleSave = () => {
    const raw = cm.trim().replace(',', '.')
    const n = Number(raw)
    if (!Number.isFinite(n) || n <= 0 || n > 500 || batchIds.length === 0) return
    onCommit({
      kind: 'diario_altura_canopy',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioAlturaCanopy: { heightCm: Math.round(n * 10) / 10 },
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={t('diario.modalAlturaTitle')}
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
            disabled={batchIds.length === 0 || !cm.trim()}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4">
        <label className="block text-xs font-medium text-gray-600">{t('diario.alturaLabel')}</label>
        <input
          className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
          value={cm}
          onChange={(e) => setCm(e.target.value)}
          placeholder={t('diario.alturaPlaceholder')}
          inputMode="decimal"
        />
      </div>
    </EnvModalFrame>
  )
}
