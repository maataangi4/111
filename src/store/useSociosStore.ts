import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { dispatchTelegram } from '../lib/notifications/bus'

export type SocioLegalStatus = 'vigente' | 'expira' | 'vencido'
export type SocioFinancialStatus = 'al_dia' | 'deuda'

export type DispenseRecord = {
  id: string
  date: string // ISO
  grams: number
  harvestBatchId: string
}

export type MovimientoTipo = 'legal' | 'interno'
export type MovimientoMetodoPago = 'Efectivo' | 'Transferencia' | 'Mercado Pago' | 'Otro'

export type MovimientoEntry = {
  id: string
  createdAt: string // ISO
  socioId: string
  socioNombre: string
  socioDni: string
  harvestBatchId: string
  harvestBatchLabel: string
  grams: number
  aporteArs: number
  metodoPago: MovimientoMetodoPago
  tipo: MovimientoTipo
  status?: 'ok' | 'anulado' | 'reversion'
  /** Link original ↔ reversal. */
  relatedMovimientoId?: string
  anulacion?: {
    at: string
    by: string
    motivo: string
  }
}

export type SociosNotification = {
  id: string
  createdAt: string // ISO
  title: string
  body: string
  tone?: 'emerald' | 'amber' | 'rose'
}

export type SocioDocs = {
  dniFront?: string
  dniBack?: string
  reprocannPdf?: string
  recetaMedica?: string
  acuerdoAsociacion?: string
}

export type Socio = {
  id: string
  nombre: string
  dni: string
  reprocannCode: string
  reprocannExpiresOn: string | null // YYYY-MM-DD
  activo: boolean
  financialStatus: SocioFinancialStatus
  monthlyDispensedGrams: number
  dispenseHistory: DispenseRecord[]
  payments: { id: string; date: string; amountArs: number; note?: string }[]
  docs: SocioDocs
}

const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

function legalStatusFromExpires(expiresOn: string | null): SocioLegalStatus {
  if (!expiresOn) return 'vencido'
  const exp = new Date(`${expiresOn}T00:00:00`)
  const now = new Date()
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (exp < now) return 'vencido'
  if (exp <= in30) return 'expira'
  return 'vigente'
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/g).filter(Boolean)
  const a = parts[0]?.[0] ?? '—'
  const b = parts.length > 1 ? parts[1]![0] : parts[0]?.[1] ?? ''
  return `${a}${b}`.toUpperCase()
}

function normalizeSocio(raw: unknown): Socio {
  const x = raw as Partial<Socio>
  const dispenseHistory = Array.isArray(x.dispenseHistory) ? x.dispenseHistory : []
  const payments = Array.isArray(x.payments) ? x.payments : []
  const monthlyDispensedGrams =
    typeof x.monthlyDispensedGrams === 'number' && Number.isFinite(x.monthlyDispensedGrams)
      ? x.monthlyDispensedGrams
      : 0
  return {
    id: String(x.id ?? uid()),
    nombre: String(x.nombre ?? ''),
    dni: String(x.dni ?? ''),
    reprocannCode: String(x.reprocannCode ?? '').padStart(6, '0').slice(0, 6),
    reprocannExpiresOn:
      typeof x.reprocannExpiresOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.reprocannExpiresOn)
        ? x.reprocannExpiresOn
        : null,
    activo: Boolean(x.activo ?? true),
    financialStatus: x.financialStatus === 'deuda' ? 'deuda' : 'al_dia',
    monthlyDispensedGrams: Math.max(0, monthlyDispensedGrams),
    dispenseHistory: dispenseHistory.map((r) => ({
      id: String((r as DispenseRecord).id ?? uid()),
      date: String((r as DispenseRecord).date ?? new Date().toISOString()),
      grams: Math.max(0, Number((r as DispenseRecord).grams ?? 0) || 0),
      harvestBatchId: String((r as DispenseRecord).harvestBatchId ?? ''),
    })),
    payments: payments.map((p) => ({
      id: String((p as any).id ?? uid()),
      date: String((p as any).date ?? new Date().toISOString()),
      amountArs: Math.max(0, Number((p as any).amountArs ?? 0) || 0),
      note: typeof (p as any).note === 'string' ? (p as any).note : undefined,
    })),
    docs:
      x.docs && typeof x.docs === 'object'
        ? {
            dniFront: typeof x.docs.dniFront === 'string' ? x.docs.dniFront : undefined,
            dniBack: typeof x.docs.dniBack === 'string' ? x.docs.dniBack : undefined,
            reprocannPdf: typeof x.docs.reprocannPdf === 'string' ? x.docs.reprocannPdf : undefined,
            recetaMedica: typeof x.docs.recetaMedica === 'string' ? x.docs.recetaMedica : undefined,
            acuerdoAsociacion:
              typeof x.docs.acuerdoAsociacion === 'string' ? x.docs.acuerdoAsociacion : undefined,
          }
        : {},
  }
}

type SociosState = {
  socios: Socio[]
  notifications: SociosNotification[]
  movimientos: MovimientoEntry[]
  pushNotification: (n: Omit<SociosNotification, 'id' | 'createdAt'> & { createdAt?: string }) => void
  clearNotifications: () => void
  upsertSocio: (id: string, patch: Partial<Socio>) => void
  recordDispense: (args: {
    socioId: string
    grams: number
    harvestBatchId: string
    harvestBatchLabel?: string
    tipo: MovimientoTipo
    aporteArs: number
    metodoPago: MovimientoMetodoPago
  }) => { ok: boolean; error?: string }
  anularMovimiento: (args: {
    movimientoId: string
    motivo: string
    actorName?: string
  }) => { ok: boolean; error?: string; reversalId?: string }
  getSocioLegalStatus: (s: Socio) => SocioLegalStatus
  getSocioInitials: (s: Socio) => string
}

const seedSocios: Socio[] = [
  normalizeSocio({
    id: 'socio-1',
    nombre: 'Sofía Martínez',
    dni: '32.441.882',
    reprocannCode: '482193',
    reprocannExpiresOn: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    activo: true,
    financialStatus: 'al_dia',
    monthlyDispensedGrams: 25,
    dispenseHistory: [
      { id: uid(), date: new Date().toISOString(), grams: 10, harvestBatchId: 'Lote-Tropicana-001' },
    ],
  }),
  normalizeSocio({
    id: 'socio-2',
    nombre: 'Matías Gómez',
    dni: '29.113.902',
    reprocannCode: '910552',
    reprocannExpiresOn: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    activo: true,
    financialStatus: 'deuda',
    monthlyDispensedGrams: 0,
    dispenseHistory: [],
  }),
  normalizeSocio({
    id: 'socio-3',
    nombre: 'Valentina Rojas',
    dni: '41.908.221',
    reprocannCode: '133705',
    reprocannExpiresOn: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    activo: true,
    financialStatus: 'al_dia',
    monthlyDispensedGrams: 8,
    dispenseHistory: [],
  }),
]

export const useSociosStore = create<SociosState>()(
  persist(
    (set, get) => ({
      socios: seedSocios,
      notifications: [],
      movimientos: [],

      pushNotification: (payload) => {
        const n: SociosNotification = {
          id: uid(),
          createdAt: payload.createdAt ?? new Date().toISOString(),
          title: String(payload.title ?? '').trim() || 'Notificación',
          body: String(payload.body ?? '').trim(),
          tone: payload.tone,
        }
        set((s) => ({ notifications: [n, ...s.notifications].slice(0, 24) }))
      },

      clearNotifications: () => set({ notifications: [] }),

      upsertSocio: (id, patch) =>
        set((s) => ({
          socios: s.socios.map((x) => (x.id === id ? normalizeSocio({ ...x, ...patch, id }) : x)),
        })),

      getSocioLegalStatus: (socio) => legalStatusFromExpires(socio.reprocannExpiresOn),

      getSocioInitials: (socio) => initialsFromName(socio.nombre),

      recordDispense: ({ socioId, grams, harvestBatchId, harvestBatchLabel, tipo, aporteArs, metodoPago }) => {
        const g = Number(grams)
        if (!Number.isFinite(g) || g <= 0) return { ok: false, error: 'amount' }
        const hb = String(harvestBatchId ?? '').trim()
        if (!hb) return { ok: false, error: 'batch' }
        const socio = get().socios.find((x) => x.id === socioId)
        if (!socio) return { ok: false, error: 'not_found' }
        const legal = legalStatusFromExpires(socio.reprocannExpiresOn)
        if (legal === 'vencido') return { ok: false, error: 'legal' }
        if (socio.financialStatus === 'deuda') return { ok: false, error: 'financial' }
        if (socio.monthlyDispensedGrams + g > 40 + 1e-6) return { ok: false, error: 'limit' }
        const t: MovimientoTipo = tipo === 'interno' ? 'interno' : 'legal'
        const aporte = Math.max(0, Number(aporteArs) || 0)
        const mp: MovimientoMetodoPago =
          metodoPago === 'Transferencia' || metodoPago === 'Mercado Pago' || metodoPago === 'Otro' ? metodoPago : 'Efectivo'
        const label = String(harvestBatchLabel ?? '').trim() || hb

        const rec: DispenseRecord = {
          id: uid(),
          date: new Date().toISOString(),
          grams: Math.round(g * 10) / 10,
          harvestBatchId: hb,
        }
        const movimiento: MovimientoEntry = {
          id: uid(),
          createdAt: rec.date,
          socioId: socio.id,
          socioNombre: socio.nombre,
          socioDni: socio.dni,
          harvestBatchId: hb,
          harvestBatchLabel: label,
          grams: rec.grams,
          aporteArs: Math.round(aporte * 100) / 100,
          metodoPago: mp,
          tipo: t,
          status: 'ok',
        }
        set((s) => ({
          socios: s.socios.map((x) =>
            x.id === socioId
              ? {
                  ...x,
                  monthlyDispensedGrams: Math.round((x.monthlyDispensedGrams + rec.grams) * 10) / 10,
                  dispenseHistory: [rec, ...x.dispenseHistory],
                }
              : x,
          ),
          movimientos: [movimiento, ...s.movimientos],
        }))

        get().pushNotification({
          title: 'Dispensación registrada',
          body: `${socio.nombre} · ${Math.round(rec.grams * 10) / 10}g · ${t === 'legal' ? 'Legal' : 'Interno'} · ${label}`,
          tone: 'emerald',
        })
        dispatchTelegram({
          type: 'dispense',
          socioNombre: socio.nombre,
          grams: rec.grams,
          batchLabel: label,
        })
        return { ok: true }
      },

      anularMovimiento: ({ movimientoId, motivo, actorName }) => {
        const id = String(movimientoId ?? '').trim()
        const reason = String(motivo ?? '').trim()
        const actor = String(actorName ?? 'Admin').trim() || 'Admin'
        if (!id) return { ok: false, error: 'id' }
        if (!reason) return { ok: false, error: 'motivo' }

        const s0 = get()
        const orig = s0.movimientos.find((m) => m.id === id)
        if (!orig) return { ok: false, error: 'not_found' }
        if (orig.status === 'anulado') return { ok: false, error: 'already' }
        if (orig.status === 'reversion') return { ok: false, error: 'reversion' }

        const at = new Date().toISOString()
        const reversalId = uid()
        const reversal: MovimientoEntry = {
          ...orig,
          id: reversalId,
          createdAt: at,
          grams: Math.round(-Math.abs(orig.grams) * 10) / 10,
          aporteArs: Math.round(-Math.abs(orig.aporteArs) * 100) / 100,
          status: 'reversion' as const,
          relatedMovimientoId: orig.id,
        }

        set((st) => {
          const nextSocios = st.socios.map((x) =>
            x.id === orig.socioId
              ? {
                  ...x,
                  monthlyDispensedGrams: Math.max(
                    0,
                    Math.round((x.monthlyDispensedGrams - Math.abs(orig.grams)) * 10) / 10,
                  ),
                }
              : x,
          )
          const nextMovimientos: MovimientoEntry[] = [
            reversal,
            ...st.movimientos.map((m): MovimientoEntry => {
              if (m.id !== orig.id) return m
              return {
                ...m,
                status: 'anulado' as const,
                relatedMovimientoId: reversalId,
                anulacion: { at, by: actor, motivo: reason },
              }
            }),
          ]
          return { socios: nextSocios, movimientos: nextMovimientos }
        })

        get().pushNotification({
          title: 'Operación anulada',
          body: `${orig.socioNombre} · ${Math.abs(orig.grams)}g · ${orig.harvestBatchLabel || orig.harvestBatchId} · ${reason}`,
          tone: 'amber',
        })
        dispatchTelegram({
          type: 'dispense_revoke',
          socioNombre: orig.socioNombre,
          grams: Math.abs(orig.grams),
          batchLabel: orig.harvestBatchLabel || orig.harvestBatchId,
          reason,
        })
        return { ok: true, reversalId }
      },
    }),
    {
      name: 'green-luck-socios',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ socios: s.socios, notifications: s.notifications, movimientos: s.movimientos }),
      merge: (persisted, current) => {
        const p = persisted as Partial<SociosState> | undefined
        const c = current as SociosState
        if (!p || typeof p !== 'object') return c
        const rawSocios = Array.isArray((p as any).socios) ? (p as any).socios : c.socios
        const rawNotifs = Array.isArray((p as any).notifications) ? (p as any).notifications : []
        const rawMovs = Array.isArray((p as any).movimientos) ? (p as any).movimientos : []
        const notifications = rawNotifs
          .map((n: any) => ({
            id: String(n?.id ?? uid()),
            createdAt: String(n?.createdAt ?? new Date().toISOString()),
            title: String(n?.title ?? 'Notificación'),
            body: String(n?.body ?? ''),
            tone: n?.tone === 'amber' || n?.tone === 'rose' || n?.tone === 'emerald' ? n.tone : undefined,
          }))
          .slice(0, 24)
        const movimientos: MovimientoEntry[] = rawMovs
          .map((m: any) => ({
            id: String(m?.id ?? uid()),
            createdAt: String(m?.createdAt ?? new Date().toISOString()),
            socioId: String(m?.socioId ?? ''),
            socioNombre: String(m?.socioNombre ?? ''),
            socioDni: String(m?.socioDni ?? ''),
            harvestBatchId: String(m?.harvestBatchId ?? ''),
            harvestBatchLabel: String(m?.harvestBatchLabel ?? m?.harvestBatchId ?? ''),
            grams: Number(m?.grams ?? 0) || 0,
            aporteArs: Number(m?.aporteArs ?? 0) || 0,
            metodoPago:
              m?.metodoPago === 'Transferencia' || m?.metodoPago === 'Mercado Pago' || m?.metodoPago === 'Otro'
                ? m.metodoPago
                : 'Efectivo',
            tipo: m?.tipo === 'interno' ? 'interno' : 'legal',
            status: m?.status === 'anulado' || m?.status === 'reversion' ? m.status : 'ok',
            relatedMovimientoId: typeof m?.relatedMovimientoId === 'string' ? m.relatedMovimientoId : undefined,
            anulacion:
              m?.anulacion && typeof m.anulacion === 'object'
                ? {
                    at: String(m.anulacion.at ?? new Date().toISOString()),
                    by: String(m.anulacion.by ?? 'Admin'),
                    motivo: String(m.anulacion.motivo ?? ''),
                  }
                : undefined,
          }))
          .slice(0, 5000)
        return { ...c, socios: rawSocios.map(normalizeSocio), notifications, movimientos }
      },
    },
  ),
)

export function deriveSocioView(s: Socio) {
  const legalStatus = legalStatusFromExpires(s.reprocannExpiresOn)
  const initials = initialsFromName(s.nombre)
  return { legalStatus, initials }
}

