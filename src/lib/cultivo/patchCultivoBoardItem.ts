import type {
  CultivoKanbanState,
  CultivoKanbanTab,
  PlantCardItem,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'

export function patchCultivoBoardItem(
  prev: CultivoKanbanState,
  tab: CultivoKanbanTab,
  itemId: string,
  patch: Partial<PlantCardItem>,
  log?: PropagacionLogEntry,
): CultivoKanbanState {
  return {
    ...prev,
    [tab]: prev[tab].map((p) => {
      if (p.id !== itemId) return p
      const next = { ...p, ...patch }
      if (log) {
        next.propagacionLog = [...(p.propagacionLog ?? []), log]
      }
      return next
    }),
  }
}
