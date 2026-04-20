import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from '../../i18n/useTranslation'
import { LocationSelector } from '../location/LocationSelector'
import { SoftSelect } from '../ui/SoftSelect'
import {
  GENETICS_TYPE_OPTIONS,
  type CultivoKanbanTab,
  type GeneticsType,
} from '../../store/cultivationTypes'
import { formatTopologyLabel } from '../../lib/locationTopologyFormat'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useLocationTopologyStore } from '../../store/useLocationTopologyStore'
import type { PlantCardItem } from './PlantCard'

type ColumnId = 'c1' | 'c2' | 'c3'

const STAGE_OPTIONS: ColumnId[] = ['c1', 'c2', 'c3']

type EditCultivoItemModalProps = {
  open: boolean
  tab: CultivoKanbanTab
  item: PlantCardItem | null
  companyId: string
  stageTitles: Record<ColumnId, string>
  onClose: () => void
  onSave: (updated: PlantCardItem) => void
}

export function EditCultivoItemModal({
  open,
  tab,
  item,
  companyId,
  stageTitles,
  onClose,
  onSave,
}: EditCultivoItemModalProps) {
  const { t } = useTranslation()
  const geneticsBank = useCultivationStore((s) => s.geneticsBank)
  const rooms = useLocationTopologyStore((s) => s.rooms)
  const fixtures = useLocationTopologyStore((s) => s.fixtures)
  const levels = useLocationTopologyStore((s) => s.levels)

  const [strain, setStrain] = useState('')
  const [seedType, setSeedType] = useState<'Semilla' | 'Clon'>('Semilla')
  const [geneticsType, setGeneticsType] = useState<GeneticsType>('fotoperiodica')
  const [date, setDate] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [stage, setStage] = useState<ColumnId>('c1')
  const [topology, setTopology] = useState<TopologySelection | null>(null)
  const [braceletId, setBraceletId] = useState('')
  const [motherPlantId, setMotherPlantId] = useState('')
  const [stageTag, setStageTag] = useState('')
  const [ageDays, setAgeDays] = useState('')

  useEffect(() => {
    if (!open || !item) return
    setStrain(item.strain)
    setSeedType(item.seedType)
    setGeneticsType(item.geneticsType ?? 'fotoperiodica')
    setDate(item.date)
    setQuantity(String(item.quantity ?? item.initialQuantity ?? 1))
    setStage((item.stage as ColumnId) || 'c1')
    setTopology(
      item.topologyRoomId
        ? {
            roomId: item.topologyRoomId,
            fixtureId: item.topologyFixtureId,
            levelId: item.topologyLevelId,
          }
        : null,
    )
    setBraceletId(item.braceletId ?? '')
    setMotherPlantId(item.motherPlantId ?? '')
    setStageTag(item.stageTag)
    setAgeDays(item.ageDays != null ? String(item.ageDays) : '')
  }, [open, item])

  const isLote = item?.trackingType !== 'planta'

  const bankImg = useMemo(() => {
    const key = strain.trim().toLowerCase()
    return geneticsBank.find((g) => g.name.trim().toLowerCase() === key)?.imageUrl?.trim() ?? ''
  }, [strain, geneticsBank])

  const seedTypeOptions = useMemo(
    () =>
      [
        { value: 'Semilla' as const, label: t('cultivoBoard.originSeedOption') },
        { value: 'Clon' as const, label: t('cultivoBoard.originCloneOption') },
      ] as const,
    [t],
  )

  const geneticsOptions = useMemo(
    () =>
      GENETICS_TYPE_OPTIONS.map((o) => ({
        value: o.value,
        label: t(`geneticsTypeOption.${o.value}` as 'geneticsTypeOption.fotoperiodica'),
      })),
    [t],
  )

  const stageOptions = useMemo(
    () =>
      STAGE_OPTIONS.map((id) => ({
        value: id,
        label: stageTitles[id],
      })),
    [stageTitles],
  )

  const topologyLocLabels = useMemo(
    () => ({
      room: t('topologyUi.room'),
      fixture: t('topologyUi.fixture'),
      level: t('topologyUi.level'),
      pickRoom: t('topologyUi.pickRoom'),
      pickFixture: t('topologyUi.pickFixture'),
      pickLevel: t('topologyUi.pickLevel'),
      emptyRooms: t('topologyUi.emptyRooms'),
      summary: t('topologyUi.summary'),
    }),
    [t],
  )

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!item) return
    const locLabel = topology?.roomId
      ? formatTopologyLabel(topology, rooms, fixtures, levels)
      : item.location
    const qty = Math.max(1, Math.floor(Number(quantity) || 1))
    const age = ageDays.trim() === '' ? undefined : Number(ageDays.replace(',', '.'))
    const stageOut: ColumnId =
      tab === 'vegetacion' || tab === 'floracion'
        ? ((item.stage as ColumnId) || 'c1')
        : stage

    const updated: PlantCardItem = {
      ...item,
      strain: strain.trim() || item.strain,
      seedType,
      geneticsType,
      date: date.trim() || item.date,
      quantity: isLote ? qty : 1,
      initialQuantity: isLote ? Math.max(qty, item.initialQuantity ?? qty) : 1,
      stage: stageOut,
      stageTag: stageTag.trim() || item.stageTag,
      location: locLabel,
      topologyRoomId: topology?.roomId,
      topologyFixtureId: topology?.fixtureId,
      topologyLevelId: topology?.levelId,
      braceletId: braceletId.trim() || undefined,
      motherPlantId: seedType === 'Clon' ? motherPlantId.trim() || undefined : undefined,
      ageDays: age != null && Number.isFinite(age) ? age : item.ageDays,
      healthStatus: 'ok',
      imageUrl: bankImg || item.imageUrl,
    }
    onSave(updated)
    onClose()
  }

  if (!open || !item) return null

  return (
    <div
      className="fixed inset-0 z-[62] flex items-center justify-center bg-black/35 p-4 dark:bg-black/55"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="max-h-[min(90vh,720px)] w-full max-w-lg overflow-y-auto rounded-3xl border border-white/70 bg-white p-5 shadow-2xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40">
        <div className="mb-4 flex items-start justify-between gap-2">
          <p className="text-lg font-semibold text-gray-900 dark:text-[#f1f1f1]">Editar fila</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:text-[#a3a3a3] dark:hover:bg-[#2e2e2e]"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-xs text-gray-500 dark:text-[#a3a3a3]">
            Tipo:{' '}
            <span className="font-medium text-gray-700 dark:text-[#d4d4d4]">
              {item.trackingType === 'planta' ? 'Planta' : 'Lote'}
            </span>
          </p>

          <label className="block text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Variedad</label>
          <input
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#e8e8e8]"
            value={strain}
            disabled
            readOnly
          />

          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Origen</span>
              <div className="mt-1">
                <SoftSelect
                  value={seedType}
                  onChange={setSeedType}
                  options={[...seedTypeOptions]}
                  chipText={
                    seedType === 'Semilla'
                      ? t('cultivoBoard.originSeedOption')
                      : t('cultivoBoard.originCloneOption')
                  }
                  ariaLabel="Origen"
                  variant="field"
                />
              </div>
            </label>
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Tipo de genética</span>
              <div className="mt-1">
                <SoftSelect
                  value={geneticsType}
                  onChange={(v) => setGeneticsType(v as GeneticsType)}
                  options={geneticsOptions}
                  chipText={t(
                    `geneticsTypeOption.${geneticsType}` as 'geneticsTypeOption.fotoperiodica',
                  )}
                  ariaLabel="Tipo de genética"
                  variant="field"
                />
              </div>
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Fecha (siembra / registro)</span>
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="YYYY-MM-DD"
            />
          </label>

          {isLote ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Cantidad (lote)</span>
              <input
                type="number"
                min={1}
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
              />
            </label>
          ) : null}

          {tab === 'propagacion' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Etapa en columna</span>
              <div className="mt-1">
                <SoftSelect
                  value={stage}
                  onChange={(v) => setStage(v as ColumnId)}
                  options={stageOptions}
                  chipText={stageTitles[stage]}
                  ariaLabel="Etapa en columna"
                  variant="field"
                />
              </div>
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Etiqueta de etapa (texto)</span>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
              value={stageTag}
              onChange={(e) => setStageTag(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Días en etapa (opcional)</span>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
              value={ageDays}
              onChange={(e) => setAgeDays(e.target.value)}
              placeholder="p. ej. 14"
            />
          </label>

          {item.trackingType === 'planta' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">Pulsera / ID visible</span>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                value={braceletId}
                onChange={(e) => setBraceletId(e.target.value)}
              />
            </label>
          ) : null}

          {seedType === 'Clon' ? (
            <label className="block">
              <span className="text-xs font-medium text-gray-600 dark:text-[#b0b0b0]">{t('cultivoBoard.motherIdLabel')}</span>
              <input
                className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 dark:border-[#3d3d3d] dark:bg-[#2a2a2a] dark:text-[#f1f1f1]"
                value={motherPlantId}
                onChange={(e) => setMotherPlantId(e.target.value)}
              />
            </label>
          ) : null}

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3 dark:border-emerald-900/40 dark:bg-emerald-950/30">
            <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
              {t('cultivoBoard.createTopologyTitle')}
            </p>
            <div className="mt-2">
              <LocationSelector
                companyId={companyId}
                value={topology}
                onChange={setTopology}
                labels={topologyLocLabels}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-transparent dark:text-[#e8e8e8] dark:hover:bg-[#2e2e2e]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-xl bg-green-700 px-4 py-2 text-sm font-medium text-white hover:bg-green-800"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
