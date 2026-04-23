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
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTelegramMessage(event: NotificationEvent): string {
  const t = ts()
  switch (event.type) {
    case 'plant_death':
      return `🔴 *Planta muerta*\nPulsera: \`${event.plantId}\` | ${event.strain}\nMotivo: ${event.reason}\n📍 ${event.location}\n⏱ ${t}`

    case 'plant_quarantine':
      return event.action === 'enter'
        ? `⚠️ *Cuarentena*\nPlanta: \`${event.plantId}\` | ${event.strain} enviada a cuarentena\n⏱ ${t}`
        : `✅ *Fin de cuarentena*\nPlanta: \`${event.plantId}\` | ${event.strain} retirada de cuarentena\n⏱ ${t}`

    case 'seedling_registered':
      return `🌱 *Planta registrada*\nPulsera: \`${event.plantId}\` | ${event.strain}\nOrigen: ${event.seedlingId}\n📍 ${event.location}\n⏱ ${t}`

    case 'flower_move': {
      let msg = `🌸 *Paso a floración*\n${event.strain} · ${event.count} plantas\n📍 ${event.location}\n⏱ ${t}`
      if (event.bajas > 0) msg += `\n⚠️ Bajas: ${event.bajas} — ${event.bajaReason}`
      return msg
    }

    case 'transplant': {
      let msg = `🪴 *Trasplante*\nLote: ${event.batchId} | ${event.strain}\nTransferidas: ${event.transferred} plantas\n⏱ ${t}`
      if (event.losses > 0) msg += `\n⚠️ Pérdidas: ${event.losses} — ${event.lossReason}`
      return msg
    }

    case 'harvest':
      return `🌿 *Cosecha*\nLote: \`${event.batchId}\`\n${event.strain} · ${event.plantCount} plantas\n📍 ${event.location}\n⏱ ${t}`

    case 'dispense':
      return `💊 *Dispensación*\n${event.socioNombre} · ${event.grams}g\nLote: ${event.batchLabel}\n⏱ ${t}`

    case 'dispense_revoke':
      return `↩️ *Operación anulada*\n${event.socioNombre} · ${event.grams}g · ${event.batchLabel}\nMotivo: ${event.reason}\n⏱ ${t}`
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
        ? { title: 'Cuarentena', body: `${event.plantId} · ${event.strain}`, tone: 'amber' }
        : { title: 'Fin de cuarentena', body: `${event.plantId} · ${event.strain}`, tone: 'emerald' }
    case 'seedling_registered':
      return { title: 'Planta registrada', body: `${event.plantId} · ${event.strain} · ${event.location}`, tone: 'emerald' }
    case 'flower_move':
      return { title: 'Paso a floración', body: `${event.strain} · ${event.count} plantas · ${event.location}`, tone: event.bajas > 0 ? 'amber' : 'emerald' }
    case 'transplant':
      return { title: 'Trasplante', body: `${event.batchId} · ${event.strain} · ${event.transferred} transferidas`, tone: event.losses > 0 ? 'amber' : 'emerald' }
    case 'harvest':
      return { title: 'Cosecha', body: `${event.batchId} · ${event.strain} · ${event.plantCount} plantas`, tone: 'emerald' }
    case 'dispense':
      return { title: 'Dispensación registrada', body: `${event.socioNombre} · ${event.grams}g · ${event.batchLabel}`, tone: 'emerald' }
    case 'dispense_revoke':
      return { title: 'Operación anulada', body: `${event.socioNombre} · ${event.batchLabel} · ${event.reason}`, tone: 'amber' }
  }
}
