export type PaymentMethod = 'USDT' | 'ARS Efectivo' | 'ARS Transferencia'

export const PAYMENT_METHODS: PaymentMethod[] = [
  'USDT',
  'ARS Efectivo',
  'ARS Transferencia',
]

export interface Investment {
  id: string
  item: string
  date: string
  amount: number
}

export interface StockItem {
  id: string
  imageUrl: string
  tipo: string
  precio: number
  /** Gramos acumulados (p. ej. ingreso desde cosecha). */
  inventoryGrams?: number
  /** Id de entrada en banco genético (Agronomía). Sin enlace → no se muestra en almacén si no hay match por nombre. */
  geneticsEntryId?: string
}

export interface Sale {
  id: string
  nombre: string
  fecha: string
  variedad: string
  cantidad: number
  metodoPago: PaymentMethod
  total: number
}

export type SortKey =
  | 'numero'
  | 'nombre'
  | 'fecha'
  | 'variedad'
  | 'cantidad'
  | 'metodoPago'
  | 'total'

export type SortDir = 'asc' | 'desc'

/** Archivo adjunto serialisable (Data URL) para localStorage */
export interface AttachedFile {
  fileName: string
  mime: string
  dataUrl: string
}

export type EmployeeRole = 'manager' | 'operator'

export interface Employee {
  id: string
  name: string
  dni: string
  photo: AttachedFile | null
  reprocan: AttachedFile | null
  telegramChatId?: string
  username: string
  accessCode: string
  role: EmployeeRole
}

export interface VaultDocument {
  id: string
  title: string
  fileName: string
  mime: string
  dataUrl: string
  uploadedAt: string
}
