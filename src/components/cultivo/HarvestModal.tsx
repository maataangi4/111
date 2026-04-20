import { Scissors, X } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import type { PlantCardItem } from './PlantCard'

type HarvestModalProps = {
  open: boolean
  item: PlantCardItem | null
  /** Si hay varias tarjetas en el mismo lote (cosecha masiva). */
  batchPlantTotal?: number
  onClose: () => void
  onConfirm: () => void
}

export function HarvestModal({ open, item, batchPlantTotal, onClose, onConfirm }: HarvestModalProps) {
  const { t } = useTranslation()
  if (!open || !item) return null

  const pulsera = item.braceletId?.trim() || `#${item.id}`
  const isBatchHarvest = batchPlantTotal != null && batchPlantTotal > 1

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className="w-full max-w-md rounded-3xl border border-white/60 bg-white/95 p-6 shadow-2xl backdrop-blur-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="harvest-title"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-700">
              <Scissors className="h-5 w-5" strokeWidth={2} />
            </div>
            <div>
              <h2 id="harvest-title" className="text-lg font-semibold text-gray-900">
                {t('harvestCultivo.title')}
              </h2>
              <p className="text-sm text-gray-500">{t('harvestCultivo.subtitle')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-100 bg-gray-50/80 p-4 text-sm">
          <p className="font-semibold text-gray-900">{item.strain}</p>
          {isBatchHarvest ? (
            <p className="mt-1 font-medium text-gray-700">{t('harvestCultivo.batchLine', { n: batchPlantTotal! })}</p>
          ) : (
            <p className="mt-1 text-gray-600">{pulsera}</p>
          )}
          {item.location?.trim() ? (
            <p className="mt-2 text-xs text-gray-500">{item.location}</p>
          ) : null}
        </div>

        <p className="mt-4 text-sm text-gray-600">{t('harvestCultivo.body')}</p>

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {t('harvestCultivo.cancel')}
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-800"
          >
            {t('harvestCultivo.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}
