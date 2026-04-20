import type {
  CultivoLateBajaReasonCode,
  DiarioClimaData,
  DiarioDiseaseCode,
  DiarioFlorMantenimientoTag,
  DiarioInspeccionData,
  DiarioPestCode,
  DiarioTrichomeStage,
  DiarioVegMantenimientoTag,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'

type DiarioTFn = (k: string, vars?: Record<string, string | number>) => string

const VEG_MANT_TAG_ORDER: DiarioVegMantenimientoTag[] = [
  'topping',
  'defoliacion',
  'lst',
  'transplante',
  'scrog_net',
  'scrog_weave',
  'lollipop_lower',
]

function sortVegMantTags(tags: DiarioVegMantenimientoTag[]): DiarioVegMantenimientoTag[] {
  const rank = (x: DiarioVegMantenimientoTag) => {
    const i = VEG_MANT_TAG_ORDER.indexOf(x)
    return i === -1 ? 999 : i
  }
  return [...tags].sort((a, b) => rank(a) - rank(b))
}

const FLOR_MANT_TAG_ORDER: DiarioFlorMantenimientoTag[] = ['flor_schwazz', 'flor_second_net']

function sortFlorMantTags(tags: DiarioFlorMantenimientoTag[]): DiarioFlorMantenimientoTag[] {
  const rank = (x: DiarioFlorMantenimientoTag) => {
    const i = FLOR_MANT_TAG_ORDER.indexOf(x)
    return i === -1 ? 999 : i
  }
  return [...tags].sort((a, b) => rank(a) - rank(b))
}

function formatVol(v: number, unit: 'L' | 'gal'): string {
  const u = unit === 'gal' ? 'gal' : 'L'
  return `${v} ${u}`
}

function pestLabel(c: DiarioPestCode, t: DiarioTFn): string {
  const keys: Record<DiarioPestCode, string> = {
    thrips: 'diario.pestThrips',
    spider_mite: 'diario.pestSpider',
    aphid: 'diario.pestAphid',
    none: 'diario.pestNone',
  }
  return t(keys[c])
}

function diseaseLabel(c: DiarioDiseaseCode, t: DiarioTFn): string {
  const keys: Record<DiarioDiseaseCode, string> = {
    oidium: 'diario.disOidium',
    botrytis: 'diario.disBotrytis',
    def_n: 'diario.disDefN',
    none: 'diario.disNone',
  }
  return t(keys[c])
}

function healthLabel(score: number, t: DiarioTFn): string {
  const keys = ['', 'diario.health1', 'diario.health2', 'diario.health3', 'diario.health4', 'diario.health5'] as const
  return t(keys[score] ?? 'diario.health3')
}

/** Línea timeline tipo: 24°C / 60% HR · VPD … (PPFD no se muestra en el resumen) */
function formatDiarioClimaTimelineLine(c: DiarioClimaData, t: DiarioTFn): string {
  const slash: string[] = []
  if (c.tempC != null && Number.isFinite(c.tempC)) slash.push(`${Number(c.tempC)}°C`)
  if (c.rhPct != null && Number.isFinite(c.rhPct))
    slash.push(t('diario.timelineRh', { n: String(Math.round(c.rhPct)) }))
  const rest: string[] = []
  if (c.vpdKpa != null && Number.isFinite(c.vpdKpa))
    rest.push(t('diario.summaryVpd', { n: String(c.vpdKpa) }))
  if (c.co2Ppm != null && Number.isFinite(c.co2Ppm))
    rest.push(t('diario.summaryCo2', { n: String(Math.round(c.co2Ppm)) }))
  if (c.dli != null && Number.isFinite(c.dli)) rest.push(t('diario.summaryDli', { n: String(c.dli) }))
  const head = slash.join(' / ')
  const tail = rest.join(' · ')
  if (head && tail) return `${head} · ${tail}`
  return head || tail || '—'
}

/** Resumen compacto para tarjeta del timeline (ReactNode opcional para foto). */
export function formatDiarioLogSummaryLine(e: PropagacionLogEntry, t: DiarioTFn): string {
  if (e.kind === 'diario_riego_nutricion' && e.diarioRiegoNutricion) {
    const d = e.diarioRiegoNutricion
    const vol = formatVol(d.volumeValue, d.volumeUnit)
    const parts: string[] = []
    parts.push(t('diario.summaryApplied', { recipe: d.recipeLabel, vol }))
    const inlet: string[] = []
    if (d.inletPh != null) inlet.push(`pH ${d.inletPh.toFixed(1)}`)
    if (d.inletEc != null) inlet.push(`EC ${d.inletEc.toFixed(2)}`)
    const drain: string[] = []
    if (d.drainPh != null) drain.push(`pH ${d.drainPh.toFixed(1)}`)
    if (d.drainEc != null) drain.push(`EC ${d.drainEc.toFixed(2)}`)
    if (inlet.length)
      parts.push(t('diario.summaryInlet', { values: inlet.join(' | ') }))
    if (drain.length)
      parts.push(t('diario.summaryDrain', { values: drain.join(' | ') }))
    let line = parts.join(' — ')
    if (d.flushStarted) line = `${line} · ${t('diario.summaryFlush')}`
    return line
  }
  if (e.kind === 'diario_inspeccion' && e.diarioInspeccion) {
    return formatInspeccionSummary(e.diarioInspeccion, t)
  }
  if (e.kind === 'diario_clima' && e.diarioClima) {
    return formatDiarioClimaTimelineLine(e.diarioClima, t)
  }
  if (e.kind === 'diario_mantenimiento' && e.diarioMantenimiento) {
    const d = e.diarioMantenimiento
    const tagKeys: Record<string, string> = {
      topping: 'diario.vegTag_topping',
      defoliacion: 'diario.vegTag_defoliacion',
      lst: 'diario.vegTag_lst',
      transplante: 'diario.vegTag_transplante',
      scrog_net: 'diario.vegTag_scrog_net',
      scrog_weave: 'diario.vegTag_scrog_weave',
      lollipop_lower: 'diario.vegTag_lollipop_lower',
    }
    const florKeys: Record<string, string> = {
      flor_schwazz: 'diario.florTag_flor_schwazz',
      flor_second_net: 'diario.florTag_flor_second_net',
    }
    const vegOrdered = d.vegTags?.length ? sortVegMantTags(d.vegTags) : []
    const vegPart = vegOrdered.map((tag) => t(tagKeys[tag] ?? 'diario.vegTag_topping')).join(', ')
    const florOrdered = d.florTags?.length ? sortFlorMantTags(d.florTags) : []
    const florPart = florOrdered
      .map((tag) => t(florKeys[tag] ?? 'diario.florTag_flor_schwazz'))
      .join(', ')
    const tagPart = [vegPart, florPart].filter(Boolean).join(', ')
    const notePart = d.notes?.trim() ?? ''
    let body: string
    if (tagPart && notePart) body = `${tagPart} — ${notePart}`
    else body = tagPart || notePart || '—'
    if (body === '—') return '—'
    return `${t('diario.mantenimientoLogPrefix')}${body}`
  }
  if (e.kind === 'diario_altura_canopy' && e.diarioAlturaCanopy) {
    return t('diario.summaryAlturaCanopy', { n: String(e.diarioAlturaCanopy.heightCm) })
  }
  if (e.kind === 'diario_propagacion_checklist' && e.diarioPropagacionChecklist) {
    return e.diarioPropagacionChecklist.line
  }
  if (e.kind === 'diario_descarte' && e.diarioDescarte) {
    const d = e.diarioDescarte
    return t('diario.summaryDescarte', { n: String(d.count), reason: d.reason })
  }
  if (e.kind === 'diario_baja_planta' && e.diarioBajaPlanta) {
    const d = e.diarioBajaPlanta
    const rk: Record<CultivoLateBajaReasonCode, string> = {
      plagas: 'diario.lateBaja.plagas',
      hongos: 'diario.lateBaja.hongos',
      hermafroditismo: 'diario.lateBaja.hermafroditismo',
      accidente: 'diario.lateBaja.accidente',
      crecimiento_debil: 'diario.lateBaja.crecimiento_debil',
    }
    const reasonLabel = t(rk[d.reasonCode])
    const w =
      d.weightGrams != null && Number.isFinite(d.weightGrams)
        ? t('diario.summaryBajaWeight', { g: String(d.weightGrams) })
        : ''
    const base = t('diario.summaryBajaPlanta', { n: String(d.plantIds.length), reason: reasonLabel })
    return w ? `${base} · ${w}` : base
  }
  if (e.kind === 'diario_cuarentena' && e.diarioCuarentena) {
    const d = e.diarioCuarentena
    return t('diario.summaryCuarentena', {
      n: String(d.plantIds.length),
      loc: d.locationLabel,
    })
  }
  if (e.kind === 'diario_reubicacion' && e.diarioReubicacion) {
    const d = e.diarioReubicacion
    return t('diario.summaryReubicacion', {
      n: String(d.movedCount),
      loc: d.locationLabel,
    })
  }
  if (e.kind === 'system' && e.systemKey === 'lote_split' && e.splitLote) {
    const s = e.splitLote
    return t('diario.summaryLoteSplit', {
      n: String(s.movedCount),
      loc: s.locationLabel,
      newId: s.newBatchId,
      fromId: s.fromBatchId,
    })
  }
  if (e.kind === 'system' && e.systemKey) {
    const keys: Record<NonNullable<PropagacionLogEntry['systemKey']>, string> = {
      batch_created: 'germinacionDetail.logBatchCreated',
      moved_to_vegetacion: 'germinacionDetail.logMovedToVegetacion',
      moved_to_floracion: 'germinacionDetail.logMovedToFloracion',
      moved_to_cosecha: 'germinacionDetail.logMovedToCosecha',
      lote_split: 'germinacionDetail.logLoteSplitFallback',
    }
    return t(keys[e.systemKey] ?? 'germinacionDetail.logBatchCreated')
  }
  return '—'
}

function trichomeSummaryLabel(stage: DiarioTrichomeStage, t: DiarioTFn): string {
  const keys: Record<DiarioTrichomeStage, string> = {
    clear: 'diario.trichome_clear',
    milky: 'diario.trichome_milky',
    amber: 'diario.trichome_amber',
  }
  return t(keys[stage])
}

export function formatInspeccionSummary(d: DiarioInspeccionData, t: DiarioTFn): string {
  const estado = healthLabel(d.healthScore, t)
  const pests =
    d.pests.length === 0
      ? t('diario.pestNone')
      : [...new Set(d.pests)]
          .map((x) => pestLabel(x, t))
          .join(', ')
  const diseases =
    d.diseases.length === 0
      ? t('diario.disNone')
      : [...new Set(d.diseases)]
          .map((x) => diseaseLabel(x, t))
          .join(', ')
  let s = t('diario.summaryInspection', { estado, pests, diseases })
  if (d.trichomeStage) {
    s += ` · ${t('diario.summaryTrichome', { stage: trichomeSummaryLabel(d.trichomeStage, t) })}`
  }
  if (d.notes?.trim()) s += ` — ${d.notes.trim()}`
  return s
}
