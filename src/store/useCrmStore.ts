import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type {
  Employee,
  EmployeeRole,
  Investment,
  Sale,
  SortDir,
  SortKey,
  StockItem,
  VaultDocument,
  AttachedFile,
} from './types'
import { SEED_GENETICS_IDS } from './cultivationTypes'

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

function genAccessCode(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase()
}

function normalizeEmployee(raw: unknown): Employee {
  const x = raw as Partial<Employee>
  return {
    id: String(x.id ?? uid()),
    name: String(x.name ?? ''),
    dni: typeof x.dni === 'string' ? x.dni : '',
    photo:
      x.photo &&
      typeof x.photo === 'object' &&
      'dataUrl' in x.photo &&
      typeof (x.photo as AttachedFile).dataUrl === 'string'
        ? (x.photo as AttachedFile)
        : null,
    reprocan:
      x.reprocan &&
      typeof x.reprocan === 'object' &&
      'dataUrl' in x.reprocan
        ? (x.reprocan as AttachedFile)
        : null,
    telegramChatId: typeof x.telegramChatId === 'string' ? x.telegramChatId : undefined,
    username: typeof x.username === 'string' && x.username ? x.username : String(x.name ?? '').toLowerCase().replace(/\s+/g, '') || 'user',
    accessCode: typeof x.accessCode === 'string' && x.accessCode ? x.accessCode : genAccessCode(),
    role: x.role === 'manager' || x.role === 'operator' ? x.role : 'operator',
  }
}

function normalizeEmployees(raw: unknown): Employee[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeEmployee)
}

function normalizeStockItem(raw: unknown): StockItem {
  const x = raw as Partial<StockItem>
  const ig = x.inventoryGrams
  const gid = x.geneticsEntryId
  return {
    id: String(x.id ?? uid()),
    tipo: String(x.tipo ?? ''),
    precio: typeof x.precio === 'number' && Number.isFinite(x.precio) ? x.precio : 0,
    imageUrl: String(x.imageUrl ?? ''),
    inventoryGrams:
      typeof ig === 'number' && Number.isFinite(ig) && ig >= 0 ? ig : undefined,
    geneticsEntryId:
      typeof gid === 'string' && gid.trim() ? gid.trim() : undefined,
  }
}

function normalizeStockList(raw: unknown): StockItem[] {
  if (!Array.isArray(raw)) return []
  return raw.map(normalizeStockItem)
}

interface CrmState {
  authenticated: boolean
  /** Último usuario de sesión (para firmar entradas del Diario). */
  currentUserName: string
  investments: Investment[]
  stock: StockItem[]
  sales: Sale[]
  saleFilterFrom: string
  saleFilterTo: string
  saleSortKey: SortKey
  saleSortDir: SortDir
  employees: Employee[]
  vaultDocuments: VaultDocument[]

  login: (username: string, password: string) => boolean
  logout: () => void

  addInvestment: (row: Omit<Investment, 'id'>) => void
  updateInvestment: (id: string, row: Omit<Investment, 'id'>) => void
  removeInvestment: (id: string) => void

  addStock: (row: Omit<StockItem, 'id'>) => void
  updateStock: (id: string, row: Omit<StockItem, 'id'>) => void
  removeStock: (id: string) => void
  /** Suma gramos a la fila enlazada al banco genético (o crea fila con ese id). */
  mergeStockFromHarvest: (args: {
    geneticsEntryId: string
    tipo: string
    imageUrl?: string
    addGrams: number
    precioPerGram: number
  }) => void

  addSale: (row: Omit<Sale, 'id' | 'total'> & { total: number }) => void
  updateSale: (
    id: string,
    row: Omit<Sale, 'id' | 'total'> & { total: number },
  ) => void
  removeSale: (id: string) => void

  setSaleFilterFrom: (v: string) => void
  setSaleFilterTo: (v: string) => void
  setSaleSort: (key: SortKey, dir: SortDir) => void

  addEmployee: (row: {
    name: string
    dni: string
    photo: AttachedFile | null
    reprocan: AttachedFile | null
    role?: EmployeeRole
  }) => void
  removeEmployee: (id: string) => void
  setEmployeeReprocan: (id: string, file: AttachedFile | null) => void
  setEmployeePhoto: (id: string, file: AttachedFile | null) => void
  setEmployeeTelegramChatId: (id: string, chatId: string | undefined) => void
  setEmployeeRole: (id: string, role: EmployeeRole) => void
  regenerateAccessCode: (id: string) => void

  addVaultDocument: (doc: Omit<VaultDocument, 'id' | 'uploadedAt'> & { uploadedAt?: string }) => void
  removeVaultDocument: (id: string) => void
}

const mockStock: StockItem[] = [
  {
    id: uid(),
    geneticsEntryId: SEED_GENETICS_IDS.florPremium,
    imageUrl: '',
    tipo: 'Flor Premium',
    precio: 1850,
  },
  {
    id: uid(),
    geneticsEntryId: SEED_GENETICS_IDS.shakeSeco,
    imageUrl: '',
    tipo: 'Shake Seco',
    precio: 920,
  },
  {
    id: uid(),
    geneticsEntryId: SEED_GENETICS_IDS.extraccion,
    imageUrl: '',
    tipo: 'Extracción',
    precio: 2400,
  },
]

const mockInvestments: Investment[] = [
  {
    id: uid(),
    item: 'Contrato Alquiler',
    date: '2025-01-12',
    amount: 420000,
  },
  {
    id: uid(),
    item: 'Equipamiento secado',
    date: '2025-02-03',
    amount: 178500,
  },
]

const mockSales: Sale[] = [
  {
    id: uid(),
    nombre: 'Cliente Demo',
    fecha: '2025-03-01',
    variedad: 'Flor Premium',
    cantidad: 50,
    metodoPago: 'USDT',
    total: 50 * 1850,
  },
]

const buildInitial = (): Omit<
  CrmState,
  | 'login'
  | 'logout'
  | 'addInvestment'
  | 'updateInvestment'
  | 'removeInvestment'
  | 'addStock'
  | 'updateStock'
  | 'removeStock'
  | 'mergeStockFromHarvest'
  | 'addSale'
  | 'updateSale'
  | 'removeSale'
  | 'setSaleFilterFrom'
  | 'setSaleFilterTo'
  | 'setSaleSort'
  | 'addEmployee'
  | 'removeEmployee'
  | 'setEmployeeReprocan'
  | 'setEmployeePhoto'
  | 'setEmployeeTelegramChatId'
  | 'setEmployeeRole'
  | 'regenerateAccessCode'
  | 'addVaultDocument'
  | 'removeVaultDocument'
> => ({
  /** Временно true: экран логина отключён, удобнее тестировать. */
  authenticated: true,
  currentUserName: '',
  investments: mockInvestments,
  stock: mockStock,
  sales: mockSales,
  saleFilterFrom: '',
  saleFilterTo: '',
  saleSortKey: 'fecha',
  saleSortDir: 'desc',
  employees: [],
  vaultDocuments: [],
})

export const useCrmStore = create<CrmState>()(
  persist(
    (set) => ({
      ...buildInitial(),

      login: (username, password) => {
        const ok = username === 'admin' && password === 'admin'
        if (ok)
          set({
            authenticated: true,
            currentUserName: username.trim() || 'admin',
          })
        return ok
      },
      logout: () => set({ authenticated: false, currentUserName: '' }),

      addInvestment: (row) =>
        set((s) => ({ investments: [...s.investments, { ...row, id: uid() }] })),
      updateInvestment: (id, row) =>
        set((s) => ({
          investments: s.investments.map((i) =>
            i.id === id ? { ...row, id } : i,
          ),
        })),
      removeInvestment: (id) =>
        set((s) => ({
          investments: s.investments.filter((i) => i.id !== id),
        })),

      addStock: (row) =>
        set((s) => ({ stock: [...s.stock, { ...row, id: uid() }] })),
      updateStock: (id, row) =>
        set((s) => ({
          stock: s.stock.map((i) => (i.id === id ? { ...row, id } : i)),
        })),
      removeStock: (id) =>
        set((s) => ({ stock: s.stock.filter((i) => i.id !== id) })),

      mergeStockFromHarvest: (args) =>
        set((s) => {
          const gid = args.geneticsEntryId.trim()
          const tipo = args.tipo.trim()
          const img = String(args.imageUrl ?? '').trim()
          const g = Math.round(args.addGrams * 100) / 100
          const p = Math.max(0, args.precioPerGram)
          if (!gid || !tipo || !Number.isFinite(g) || g <= 0) return s
          let idx = s.stock.findIndex((i) => i.geneticsEntryId === gid)
          if (idx < 0) {
            const tn = tipo.toLowerCase()
            idx = s.stock.findIndex(
              (i) =>
                !i.geneticsEntryId && i.tipo.trim().toLowerCase() === tn,
            )
          }
          if (idx >= 0) {
            const cur = s.stock[idx]!
            const prev = cur.inventoryGrams ?? 0
            return {
              stock: s.stock.map((i, j) =>
                j === idx
                  ? {
                      ...i,
                      geneticsEntryId: gid,
                      tipo,
                      imageUrl: img || i.imageUrl,
                      precio: p > 0 ? p : i.precio,
                      inventoryGrams: Math.round((prev + g) * 100) / 100,
                    }
                  : i,
              ),
            }
          }
          return {
            stock: [
              ...s.stock,
              {
                id: uid(),
                geneticsEntryId: gid,
                tipo,
                precio: p > 0 ? p : 0,
                imageUrl: img,
                inventoryGrams: g,
              },
            ],
          }
        }),

      addSale: (row) =>
        set((s) => ({ sales: [...s.sales, { ...row, id: uid() }] })),
      updateSale: (id, row) =>
        set((s) => ({
          sales: s.sales.map((i) => (i.id === id ? { ...row, id } : i)),
        })),
      removeSale: (id) =>
        set((s) => ({ sales: s.sales.filter((i) => i.id !== id) })),

      setSaleFilterFrom: (v) => set({ saleFilterFrom: v }),
      setSaleFilterTo: (v) => set({ saleFilterTo: v }),
      setSaleSort: (key, dir) => set({ saleSortKey: key, saleSortDir: dir }),

      addEmployee: (row) =>
        set((s) => {
          const name = row.name.trim()
          return {
            employees: [
              ...s.employees,
              {
                id: uid(),
                name,
                dni: row.dni.trim(),
                photo: row.photo,
                reprocan: row.reprocan,
                username: name.toLowerCase().replace(/\s+/g, '') || 'user',
                accessCode: genAccessCode(),
                role: row.role ?? 'operator',
              },
            ],
          }
        }),
      removeEmployee: (id) =>
        set((s) => ({
          employees: s.employees.filter((e) => e.id !== id),
        })),
      setEmployeeReprocan: (id, file) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, reprocan: file } : e,
          ),
        })),
      setEmployeePhoto: (id, file) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, photo: file } : e,
          ),
        })),
      setEmployeeTelegramChatId: (id, chatId) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, telegramChatId: chatId } : e,
          ),
        })),
      setEmployeeRole: (id, role) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, role } : e,
          ),
        })),
      regenerateAccessCode: (id) =>
        set((s) => ({
          employees: s.employees.map((e) =>
            e.id === id ? { ...e, accessCode: genAccessCode() } : e,
          ),
        })),

      addVaultDocument: (doc) =>
        set((s) => ({
          vaultDocuments: [
            ...s.vaultDocuments,
            {
              ...doc,
              id: uid(),
              uploadedAt: doc.uploadedAt ?? new Date().toISOString().slice(0, 10),
            },
          ],
        })),
      removeVaultDocument: (id) =>
        set((s) => ({
          vaultDocuments: s.vaultDocuments.filter((d) => d.id !== id),
        })),
    }),
    {
      name: 'green-luck-crm-data',
      storage: createJSONStorage(() => localStorage),
      merge: (persisted, current) => {
        const p = persisted as Partial<CrmState> | undefined
        const c = current as CrmState
        if (!p || typeof p !== 'object') return c
        return {
          ...c,
          ...p,
          employees: normalizeEmployees(
            p.employees != null ? p.employees : c.employees,
          ),
          stock: normalizeStockList(
            p.stock != null ? p.stock : c.stock,
          ),
        }
      },
      partialize: (s) => ({
        investments: s.investments,
        stock: s.stock,
        sales: s.sales,
        saleFilterFrom: s.saleFilterFrom,
        saleFilterTo: s.saleFilterTo,
        saleSortKey: s.saleSortKey,
        saleSortDir: s.saleSortDir,
        employees: s.employees,
        vaultDocuments: s.vaultDocuments,
      }),
    },
  ),
)

export function computeSaleTotal(
  stock: StockItem[],
  variedad: string,
  cantidad: number,
): number {
  const item = stock.find((s) => s.tipo === variedad)
  if (!item || cantidad <= 0) return 0
  return Math.round(item.precio * cantidad * 100) / 100
}
