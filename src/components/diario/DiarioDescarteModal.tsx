import { useEffect, useState } from 'react'
import type { PropagacionLogEntry } from '../../store/cultivationTypes'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

export function DiarioDescarteModal({
  open,
  onClose,
  onCommit,
  maxRemovable,
  plantedBaseline,
  batchIds,
  author,
  t,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  maxRemovable: number
  plantedBaseline: number
  batchIds: string[]
  author?: string
  t: TFn
}) {
  const [countStr, setCountStr] = useState('1')
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (!open) return
    setCountStr('1')
    setReason('')
  }, [open])

  if (!open) return null

  const n = Math.floor(Number.parseInt(countStr.replace(/\s/g, ''), 10))
  const count = Number.isFinite(n) ? n : 0
  const valid = count >= 1 && count <= maxRemovable && reason.trim().length > 0 && batchIds.length > 0

  const handleSave = () => {
    if (!valid) return
    onCommit({
      kind: 'diario_descarte',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioDescarte: { count, reason: reason.trim() },
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={t('diario.modalDescarteTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-red-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-red-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={!valid}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <p className="mt-1 text-xs text-gray-600">{t('diario.modalDescarteHint', { planted: String(plantedBaseline) })}</p>
      <p className="mt-2 text-xs font-medium text-amber-800">
        {t('diario.modalDescarteAlive', { n: String(maxRemovable) })}
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.descarteCount')}</label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={Math.max(1, maxRemovable)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm tabular-nums"
            value={countStr}
            onChange={(e) => setCountStr(e.target.value)}
          />
          <p className="mt-1 text-[10px] text-gray-400">
            {t('diario.descarteCountRange', { max: String(Math.max(0, maxRemovable)) })}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.descarteReason')}</label>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={t('diario.descarteReasonPh')}
          />
        </div>
      </div>
    </EnvModalFrame>
  )
}
