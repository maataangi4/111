import type { CultivoKanbanState, PropagacionLogEntry } from '../../store/cultivationTypes'
import type { TopologySelection } from '../../store/locationTopologyTypes'
import { sortPlantsInBatchOrder } from './groupPlantsBySourceBatch'

function makeSplitLogEntry(
  id: string,
  at: string,
  data: { movedCount: number; newBatchId: string; fromBatchId: string; locationLabel: string },
): PropagacionLogEntry {
  return {
    id,
    at,
    kind: 'system',
    systemKey: 'lote_split',
    splitLote: data,
  }
}

/**
 * Divide un lote en veg/flor: las últimas `moveCount` plantas activas (por orden de pulsera)
 * pasan a `newBatchId`, nueva topología y etiqueta `-B`/`-C`…; el resto queda con sufijo `-A` si era la primera división.
 */
export function applyLoteSplit(args: {
  board: CultivoKanbanState
  tab: 'vegetacion' | 'floracion'
  batchPlantIds: Set<string>
  moveCount: number
  topology: TopologySelection
  locationLabel: string
  makeId: () => string
}): CultivoKanbanState {
  const { board, tab, batchPlantIds, moveCount, topology, locationLabel, makeId } = args
  const column = board[tab]
  const batchPlants = column.filter((p) => batchPlantIds.has(p.id))
  if (batchPlants.length === 0) return board

  const alive = batchPlants.filter((p) => p.cultivoUnitStatus !== 'baja')
  const sorted = [...alive].sort(sortPlantsInBatchOrder)
  if (moveCount < 1 || moveCount >= sorted.length) return board

  const movers = sorted.slice(-moveCount)
  const stayers = sorted.slice(0, sorted.length - moveCount)
  const moverIds = new Set(movers.map((m) => m.id))
  const stayerIds = new Set(stayers.map((s) => s.id))

  const rep = batchPlants[0]!
  const oldBatchId = rep.sourceBatchId?.trim() || rep.id
  const newBatchId = `L${makeId().replace(/-/g, '').slice(0, 10)}`

  const stayerSuffix0 = stayers[0]!.lotSegmentSuffix?.trim()
  const moverSuffix = stayerSuffix0
    ? String.fromCharCode(stayerSuffix0.codePointAt(0)! + 1)
    : 'B'
  const defaultStayerSuffix = 'A'

  const at = new Date().toISOString()
  const splitPayload = {
    movedCount: moveCount,
    newBatchId,
    fromBatchId: oldBatchId,
    locationLabel,
  }

  const nextColumn = column.map((p) => {
    if (!batchPlantIds.has(p.id)) return p

    const logEntry = makeSplitLogEntry(makeId(), at, splitPayload)

    if (p.cultivoUnitStatus === 'baja') {
      return {
        ...p,
        propagacionLog: [...(p.propagacionLog ?? []), logEntry],
      }
    }

    if (moverIds.has(p.id)) {
      return {
        ...p,
        sourceBatchId: newBatchId,
        splitFromSourceBatchId: oldBatchId,
        lotSegmentSuffix: moverSuffix,
        topologyRoomId: topology.roomId,
        topologyFixtureId: topology.fixtureId,
        topologyLevelId: topology.levelId,
        location: locationLabel,
        propagacionLog: [...(p.propagacionLog ?? []), logEntry],
      }
    }

    if (stayerIds.has(p.id)) {
      const keepSuf = p.lotSegmentSuffix?.trim()
      return {
        ...p,
        lotSegmentSuffix: keepSuf || defaultStayerSuffix,
        propagacionLog: [...(p.propagacionLog ?? []), logEntry],
      }
    }

    return p
  })

  return { ...board, [tab]: nextColumn }
}
