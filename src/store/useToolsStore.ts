import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { ToolCategory, ToolInventoryItem } from './toolsTypes'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

export type ToolsState = {
  items: ToolInventoryItem[]
  addItem: (row: { name: string; category: ToolCategory; notes?: string }) => void
  removeItem: (id: string) => void
  updateItem: (
    id: string,
    row: Partial<Pick<ToolInventoryItem, 'name' | 'category' | 'notes'>>,
  ) => void
}

function normalizeItem(x: Partial<ToolInventoryItem> & Record<string, unknown>): ToolInventoryItem {
  return {
    id: String(x.id ?? uid()),
    name: String(x.name ?? '').trim(),
    category:
      x.category === 'substrate' ||
      x.category === 'fertilizer' ||
      x.category === 'lighting' ||
      x.category === 'pot' ||
      x.category === 'general'
        ? x.category
        : 'general',
    notes: typeof x.notes === 'string' && x.notes.trim() ? x.notes.trim() : undefined,
    createdAt: String(x.createdAt ?? new Date().toISOString()),
  }
}

export const useToolsStore = create<ToolsState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (row) => {
        const name = row.name.trim()
        if (!name) return
        set((s) => ({
          items: [
            normalizeItem({
              name,
              category: row.category,
              notes: row.notes,
              createdAt: new Date().toISOString(),
            }),
            ...s.items,
          ],
        }))
      },
      removeItem: (id) =>
        set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      updateItem: (id, row) =>
        set((s) => ({
          items: s.items.map((i) => {
            if (i.id !== id) return i
            return normalizeItem({
              ...i,
              name: row.name != null ? row.name : i.name,
              category: row.category ?? i.category,
              notes: row.notes !== undefined ? row.notes : i.notes,
            })
          }),
        })),
    }),
    {
      name: 'green-luck-tools-inventory',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<Pick<ToolsState, 'items'>> | undefined
        const raw = p?.items
        return {
          ...current,
          items: Array.isArray(raw) ? raw.map((x) => normalizeItem(x as Record<string, unknown>)) : [],
        }
      },
    },
  ),
)
