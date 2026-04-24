import type { PlantCardItem } from '../../store/cultivationTypes'

/** Nombre de variedad INASE para título corto (p. ej. «CHEM FELIX»). */
export function inaseVarietyDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

/** Mismo nombre en MAYÚS con espacios (segmento dentro del código de lote). */
export function inaseVarietyDisplayUpper(name: string): string {
  return inaseVarietyDisplayName(name).toUpperCase()
}

/** Solo dígitos del N° RNCyFS (p. ej. «RN-CYFS-433532» → «433532»). */
export function digitsTokenFromRncyfs(provider: string, maxLen = 12): string {
  const d = provider.replace(/\D/g, '')
  if (!d) return '0'
  return d.slice(0, maxLen)
}

/** Clave sin prefijo «LOTE»: «CHEM FELIX-2024-433532». */
export function buildInaseLotBaseKey(params: {
  varietyName: string
  harvestYear: number
  providerRncyfs: string
}): string {
  const v = inaseVarietyDisplayUpper(params.varietyName)
  const y = Math.round(params.harvestYear)
  const r = digitsTokenFromRncyfs(params.providerRncyfs)
  return `${v}-${y}-${r}`
}

/** Etiqueta legal completa: «LOTE CHEM FELIX-2024-433532-001». */
export function formatInaseLegalLotLabel(baseKey: string, seq: number): string {
  const n = Math.max(1, Math.min(999, Math.floor(seq)))
  return `LOTE ${baseKey}-${String(n).padStart(3, '0')}`
}

/** Siguiente correlativo …-001, …-002 para la misma base (todas las columnas). */
export function nextInaseLegalLotSequence(items: PlantCardItem[], baseKey: string): number {
  const prefix = `LOTE ${baseKey}-`
  let max = 0
  for (const p of items) {
    if (p.seedType !== 'Semilla' || p.seedComplianceType !== 'certificada') continue
    const lab = p.inaseLegalLotLabel?.trim() ?? ''
    if (!lab.startsWith(prefix)) continue
    const tail = lab.slice(prefix.length)
    if (!/^\d{3}$/.test(tail)) continue
    const n = parseInt(tail, 10)
    if (Number.isFinite(n)) max = Math.max(max, n)
  }
  return max + 1
}
