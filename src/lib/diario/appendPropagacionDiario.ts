import type {
  CultivoKanbanState,
  CultivoKanbanTab,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'

/**
 * Añade la misma entrada al journal de partidas en un tab del tablero (germinación / vegetación / floración).
 */
export function appendDiarioToBoard(
  prev: CultivoKanbanState,
  boardTab: CultivoKanbanTab,
  batchIds: string[],
  makeEntry: () => Omit<PropagacionLogEntry, 'id'>,
  idFactory: () => string,
): CultivoKanbanState {
  const idSet = new Set(batchIds.filter(Boolean))
  if (idSet.size === 0) return prev
  return {
    ...prev,
    [boardTab]: prev[boardTab].map((p) => {
      if (!idSet.has(p.id)) return p
      const base = makeEntry()
      const entry: PropagacionLogEntry = { ...base, id: idFactory() }
      return {
        ...p,
        propagacionLog: [...(p.propagacionLog ?? []), entry],
      }
    }),
  }
}

/**
 * @deprecated Usar `appendDiarioToBoard(prev, 'propagacion', ...)`.
 */
export function appendPropagacionDiarioLog(
  prev: CultivoKanbanState,
  batchIds: string[],
  makeEntry: () => Omit<PropagacionLogEntry, 'id'>,
  idFactory: () => string,
): CultivoKanbanState {
  return appendDiarioToBoard(prev, 'propagacion', batchIds, makeEntry, idFactory)
}
