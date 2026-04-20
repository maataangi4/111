import type {
  CultivoKanbanState,
  DiarioBajaPlantaData,
  DiarioCuarentenaData,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'

type LateTab = 'vegetacion' | 'floracion' | 'cosecha'

function entryBaja(
  atIso: string,
  author: string | undefined,
  data: DiarioBajaPlantaData,
  entryId: string,
): PropagacionLogEntry {
  return {
    id: entryId,
    at: atIso,
    kind: 'diario_baja_planta',
    author,
    diarioBajaPlanta: data,
  }
}

function entryCuarentena(
  atIso: string,
  author: string | undefined,
  data: DiarioCuarentenaData,
  entryId: string,
): PropagacionLogEntry {
  return {
    id: entryId,
    at: atIso,
    kind: 'diario_cuarentena',
    author,
    diarioCuarentena: data,
  }
}

export function applyDiarioBajaPlantaToBoard(
  prev: CultivoKanbanState,
  tab: LateTab,
  data: DiarioBajaPlantaData,
  atIso: string,
  author: string | undefined,
  idFactory: () => string,
): CultivoKanbanState {
  const sel = new Set(data.plantIds)
  return {
    ...prev,
    [tab]: prev[tab].map((p) => {
      if (!sel.has(p.id)) return p
      const logEntry = entryBaja(atIso, author, data, idFactory())
      return {
        ...p,
        cultivoUnitStatus: 'baja',
        propagacionLog: [...(p.propagacionLog ?? []), logEntry],
      }
    }),
  }
}

export function applyDiarioCuarentenaToBoard(
  prev: CultivoKanbanState,
  tab: LateTab,
  data: DiarioCuarentenaData,
  atIso: string,
  author: string | undefined,
  idFactory: () => string,
): CultivoKanbanState {
  const sel = new Set(data.plantIds)
  return {
    ...prev,
    [tab]: prev[tab].map((p) => {
      if (!sel.has(p.id)) return p
      const logEntry = entryCuarentena(atIso, author, data, idFactory())
      return {
        ...p,
        cultivoUnitStatus: 'quarantine',
        quarantineReason: data.reason.trim() || undefined,
        quarantineSinceAt: atIso,
        topologyRoomId: data.topologyRoomId,
        topologyFixtureId: data.topologyFixtureId,
        topologyLevelId: data.topologyLevelId,
        location: data.locationLabel,
        propagacionLog: [...(p.propagacionLog ?? []), logEntry],
      }
    }),
  }
}
