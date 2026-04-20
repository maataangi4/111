export type ToolCategory = 'substrate' | 'fertilizer' | 'lighting' | 'pot' | 'general'

export type ToolInventoryItem = {
  id: string
  name: string
  category: ToolCategory
  notes?: string
  createdAt: string
}
