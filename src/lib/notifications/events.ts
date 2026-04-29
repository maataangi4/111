import type { UserRole } from '../supabase.types'

/** Roles que reciben cada tipo de evento en su chat personal.
 *  El grupo siempre recibe todo. El owner está incluido en todos. */
export const EVENT_ROLES: Record<NotificationEvent['type'], UserRole[]> = {
  // Cultivo → growers (operator) + managers + owner
  plant_death:         ['operator', 'manager', 'owner'],
  plant_quarantine:    ['operator', 'manager', 'owner'],
  seedling_registered: ['operator', 'manager', 'owner'],
  flower_move:         ['operator', 'manager', 'owner'],
  transplant:          ['operator', 'manager', 'owner'],
  harvest:             ['operator', 'manager', 'owner'],
  // Ventas / socios → managers + owner + medical (consultas de pacientes)
  dispense:            ['manager', 'owner', 'medical'],
  dispense_revoke:     ['manager', 'owner', 'medical'],
}

export type NotificationEvent =
  | { type: 'plant_death'; plantId: string; strain: string; reason: string; location: string }
  | { type: 'plant_quarantine'; plantId: string; strain: string; action: 'enter' | 'exit' }
  | { type: 'seedling_registered'; plantId: string; strain: string; seedlingId: string; location: string }
  | { type: 'flower_move'; strain: string; count: number; bajas: number; bajaReason: string; location: string }
  | { type: 'transplant'; batchId: string; strain: string; transferred: number; losses: number; lossReason: string }
  | { type: 'harvest'; batchId: string; strain: string; plantCount: number; location: string }
  | { type: 'dispense'; socioNombre: string; grams: number; batchLabel: string }
  | { type: 'dispense_revoke'; socioNombre: string; grams: number; batchLabel: string; reason: string }

function ts(): string {
  return new Date().toLocaleString('es-AR', {
    day: 'numeric',
    month: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTelegramMessage(event: NotificationEvent): string {
  const t = ts()
  switch (event.type) {
    case 'plant_death':
      return [
        `🔴 *Planta muerta*`,
        ``,
        `Pulsera: \`${event.plantId}\``,
        `Variedad: ${event.strain}`,
        `Motivo: ${event.reason}`,
        `📍 ${event.location}`,
        ``,
        `⏱️ ${t}`,
      ].join('\n')

    case 'plant_quarantine':
      return event.action === 'enter'
        ? [
            `⚠️ *Planta en cuarentena*`,
            ``,
            `Pulsera: \`${event.plantId}\``,
            `Variedad: ${event.strain}`,
            ``,
            `⏱️ ${t}`,
          ].join('\n')
        : [
            `✅ *Planta liberada de cuarentena*`,
            ``,
            `Pulsera: \`${event.plantId}\``,
            `Variedad: ${event.strain}`,
            ``,
            `⏱️ ${t}`,
          ].join('\n')

    case 'seedling_registered':
      return [
        `🌱 *Planta registrada*`,
        ``,
        `Pulsera: \`${event.plantId}\``,
        `Variedad: ${event.strain}`,
        `Origen: ${event.seedlingId}`,
        `📍 ${event.location}`,
        ``,
        `⏱️ ${t}`,
      ].join('\n')

    case 'flower_move': {
      const lines = [
        `🌸 *Paso a floración*`,
        ``,
        `Variedad: ${event.strain}`,
        `Plantas: ${event.count}`,
        `📍 ${event.location}`,
      ]
      if (event.bajas > 0) lines.push(`⚠️ Bajas: ${event.bajas} · ${event.bajaReason}`)
      lines.push(``, `⏱️ ${t}`)
      return lines.join('\n')
    }

    case 'transplant': {
      const lines = [
        `🪴 *Trasplante completado*`,
        ``,
        `Lote: \`${event.batchId}\``,
        `Variedad: ${event.strain}`,
        `Transferidas: ${event.transferred} plantas`,
      ]
      if (event.losses > 0) lines.push(`⚠️ Pérdidas: ${event.losses} · ${event.lossReason}`)
      lines.push(``, `⏱️ ${t}`)
      return lines.join('\n')
    }

    case 'harvest':
      return [
        `🌿 *Cosecha registrada*`,
        ``,
        `Lote: \`${event.batchId}\``,
        `Variedad: ${event.strain}`,
        `Plantas: ${event.plantCount}`,
        `📍 ${event.location}`,
        ``,
        `⏱️ ${t}`,
      ].join('\n')

    case 'dispense':
      return [
        `💊 *Dispensación registrada*`,
        ``,
        `Socio: ${event.socioNombre}`,
        `Cantidad: ${event.grams}g`,
        `Lote: ${event.batchLabel}`,
        ``,
        `⏱️ ${t}`,
      ].join('\n')

    case 'dispense_revoke':
      return [
        `↩️ *Dispensación anulada*`,
        ``,
        `Socio: ${event.socioNombre}`,
        `Cantidad: ${event.grams}g`,
        `Lote: ${event.batchLabel}`,
        `Motivo: ${event.reason}`,
        ``,
        `⏱️ ${t}`,
      ].join('\n')
  }
}

export function toUINotification(event: NotificationEvent): {
  title: string
  body: string
  tone?: 'emerald' | 'amber' | 'rose'
} {
  switch (event.type) {
    case 'plant_death':
      return { title: 'Planta muerta', body: `${event.plantId} · ${event.strain} · ${event.reason}`, tone: 'rose' }
    case 'plant_quarantine':
      return event.action === 'enter'
        ? { title: 'Planta en cuarentena', body: `${event.plantId} · ${event.strain}`, tone: 'amber' }
        : { title: 'Fin de cuarentena', body: `${event.plantId} · ${event.strain}`, tone: 'emerald' }
    case 'seedling_registered':
      return { title: 'Planta registrada', body: `${event.plantId} · ${event.strain} · ${event.location}`, tone: 'emerald' }
    case 'flower_move':
      return { title: 'Paso a floración', body: `${event.strain} · ${event.count} plantas · ${event.location}`, tone: event.bajas > 0 ? 'amber' : 'emerald' }
    case 'transplant':
      return { title: 'Trasplante completado', body: `${event.batchId} · ${event.strain} · ${event.transferred} transferidas`, tone: event.losses > 0 ? 'amber' : 'emerald' }
    case 'harvest':
      return { title: 'Cosecha registrada', body: `${event.batchId} · ${event.strain} · ${event.plantCount} plantas`, tone: 'emerald' }
    case 'dispense':
      return { title: 'Dispensación registrada', body: `${event.socioNombre} · ${event.grams}g · ${event.batchLabel}`, tone: 'emerald' }
    case 'dispense_revoke':
      return { title: 'Dispensación anulada', body: `${event.socioNombre} · ${event.batchLabel} · ${event.reason}`, tone: 'amber' }
  }
}
