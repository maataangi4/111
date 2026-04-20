import { useEffect, useMemo, useState } from 'react'
import type { DiarioPropagacionChecklistCode, PropagacionLogEntry } from '../../store/cultivationTypes'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

export function DiarioPropagacionChecklistModal({
  open,
  code,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
}: {
  open: boolean
  code: DiarioPropagacionChecklistCode | null
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
}) {
  const [line, setLine] = useState('')

  useEffect(() => {
    if (!open) return
    setLine('')
  }, [open, code])

  const presets = useMemo((): { key: string; text: string }[] => {
    if (!code) return []
    if (code === 'aclimatacion') {
      return [
        { key: 'v25', text: t('diario.propAclimVent25') },
        { key: 'v50', text: t('diario.propAclimVent50') },
        { key: 'v75', text: t('diario.propAclimVent75') },
        { key: 'v100', text: t('diario.propAclimVent100') },
      ]
    }
    if (code === 'pulverizacion_foliar') {
      return [
        { key: 'water', text: t('diario.propPulvWater') },
        { key: 'stim', text: t('diario.propPulvStim') },
      ]
    }
    return [
      { key: 'r1', text: t('diario.propRootsPreset1') },
      { key: 'r2', text: t('diario.propRootsPreset2') },
      { key: 'r3', text: t('diario.propRootsPreset3') },
    ]
  }, [code, t])

  const title =
    code === 'aclimatacion'
      ? t('diario.modalPropAclimTitle')
      : code === 'pulverizacion_foliar'
        ? t('diario.modalPropPulvTitle')
        : code === 'chequeo_raices'
          ? t('diario.modalPropRootsTitle')
          : ''

  if (!open || !code) return null

  const handleSave = () => {
    const text = line.trim()
    if (!text || batchIds.length === 0) return
    onCommit({
      kind: 'diario_propagacion_checklist',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioPropagacionChecklist: { code, line: text },
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={title}
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
            disabled={batchIds.length === 0 || !line.trim()}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 space-y-4">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">{t('diario.propPresetsHint')}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setLine(p.text)}
                className={`rounded-xl border px-3 py-1.5 text-left text-xs font-medium transition ${
                  line.trim() === p.text
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-gray-200 bg-white text-gray-800 hover:bg-gray-50'
                }`}
              >
                {p.text}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.propCustomLine')}</label>
          <textarea
            className="min-h-[96px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={line}
            onChange={(e) => setLine(e.target.value)}
            placeholder={t('diario.propCustomPlaceholder')}
          />
        </div>
      </div>
    </EnvModalFrame>
  )
}
