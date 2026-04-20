/**
 * Diagnóstico fitosanitario (cannabis). Con `VITE_GEMINI_API_KEY` llama a Gemini con visión.
 * Si la API falla o el JSON no parsea, cae en simulación local (es distinto del texto típico de Gemini).
 */
import {
  FITO_PHYTOPATH_SYSTEM_PROMPT,
  buildFitoUserContentText,
} from './fitoPhytopathPrompt'

export type PlantDiagnosisResult = {
  diagnostico: string
  certeza: number
  tratamiento: string[]
  aislamiento: boolean
}

export type DiagnoseInput = {
  symptoms: string[]
  notes: string
  imageDataUrl: string | null
  locale: 'es' | 'ru'
}

export type DiagnoseMockReason =
  | 'no_key'
  | 'rate_limit'
  | 'http_error'
  | 'parse_error'
  | 'blocked'
  | 'unknown'

export type DiagnoseOutcome = {
  result: PlantDiagnosisResult
  /** `mock` = respuesta generada en el navegador; la IA no intervino (revisá clave/modelo/consola). */
  source: 'gemini' | 'mock'
  /** Si `source === 'mock'` después de llamar a la API */
  mockReason?: DiagnoseMockReason
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function geminiModel(): string {
  const fromEnv = (import.meta.env.VITE_GEMINI_MODEL as string | undefined)?.trim()
  /** 2.5 Flash-Lite: más barato y alto volumen en tier gratuito; 2.0 está deprecado. */
  return fromEnv || 'gemini-2.5-flash-lite'
}

function apiKey(): string | undefined {
  const raw = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!raw?.trim()) return undefined
  return raw.trim().replace(/^\uFEFF/, '')
}

function parseDataUrl(
  dataUrl: string | null,
): { mimeType: string; data: string } | null {
  if (!dataUrl?.startsWith('data:')) return null
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/s)
  if (!m) return null
  return { mimeType: m[1] || 'image/jpeg', data: m[2].replace(/\s/g, '') }
}

/** Evita rechazos 413 / payload enorme en móvil. */
function downscaleDataUrlIfHuge(dataUrl: string): Promise<string> {
  const maxChars = 1_400_000
  if (dataUrl.length <= maxChars) return Promise.resolve(dataUrl)
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const maxW = 1600
        let w = img.naturalWidth
        let h = img.naturalHeight
        if (w > maxW) {
          h = Math.round((h * maxW) / w)
          w = maxW
        }
        const c = document.createElement('canvas')
        c.width = w
        c.height = h
        const ctx = c.getContext('2d')
        if (!ctx) {
          resolve(dataUrl)
          return
        }
        ctx.drawImage(img, 0, 0, w, h)
        resolve(c.toDataURL('image/jpeg', 0.82))
      } catch {
        resolve(dataUrl)
      }
    }
    img.onerror = () => resolve(dataUrl)
    img.src = dataUrl
  })
}

function stripJsonFence(text: string): string {
  let t = text.trim()
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')
  }
  return t.trim()
}

function toCerteza(v: unknown): number {
  if (typeof v === 'number' && !Number.isNaN(v)) return Math.max(0, Math.min(100, Math.round(v)))
  if (typeof v === 'string') {
    const n = Number.parseFloat(v.replace(',', '.'))
    if (!Number.isNaN(n)) return Math.max(0, Math.min(100, Math.round(n)))
  }
  return 0
}

function toBool(v: unknown): boolean {
  if (v === true) return true
  if (v === false) return false
  if (typeof v === 'string') return /^true|1|sí|si$/i.test(v.trim())
  return false
}

function normalizeTratamiento(tr: unknown): string[] {
  if (Array.isArray(tr)) {
    return tr
      .map((x) => String(x).trim())
      .filter((s) => s.length > 0)
  }
  if (typeof tr === 'string') {
    return tr
      .split(/\n+/)
      .map((s) => s.replace(/^[-*•]\s*/, '').replace(/^\d+[).\s]+/, '').trim())
      .filter((s) => s.length > 0)
  }
  if (tr && typeof tr === 'object' && !Array.isArray(tr)) {
    return Object.values(tr as Record<string, unknown>).flatMap((x) => normalizeTratamiento(x))
  }
  return []
}

function parsePlantDiagnosisJson(raw: string): PlantDiagnosisResult | null {
  try {
    const t = stripJsonFence(raw)
    const o = JSON.parse(t) as Record<string, unknown>
    const diagnostico = typeof o.diagnostico === 'string' ? o.diagnostico.trim() : ''
    const certeza = toCerteza(o.certeza)
    const aislamiento = toBool(o.aislamiento)
    let tratamiento = normalizeTratamiento(o.tratamiento)
    if (tratamiento.length === 0 && typeof o.tratamiento === 'string' && o.tratamiento.includes(';')) {
      tratamiento = o.tratamiento
        .split(/;\s*/)
        .map((s) => s.trim())
        .filter(Boolean)
    }
    if (!diagnostico || tratamiento.length === 0) return null
    const certezaFinal = certeza > 0 ? certeza : 70
    return { diagnostico, certeza: certezaFinal, tratamiento, aislamiento }
  } catch {
    return null
  }
}

type GeminiGenResponse = {
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string }
  candidates?: Array<{
    finishReason?: string
    content?: { parts?: Array<{ text?: string }> }
  }>
}

function extractTextFromResponse(data: GeminiGenResponse): string | null {
  const parts = data.candidates?.[0]?.content?.parts
  if (!parts?.length) return null
  const text = parts.map((p) => p.text ?? '').join('')
  return text.length > 0 ? text : null
}

/**
 * `gemini-1.5-flash` ya no existe en v1beta (404). Orden: lite → flash → 2.0 por si lite no está en tu región.
 * @see https://ai.google.dev/gemini-api/docs/models
 */
function modelCandidates(): string[] {
  const primary = geminiModel()
  const pool = ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash'] as const
  const rest = pool.filter((m) => m !== primary)
  return [...new Set([primary, ...rest])]
}

/** El texto de error de Gemini suele incluir "Please retry in 35.2s". */
function geminiRetryDelayMs(payload: GeminiGenResponse | undefined): number | null {
  const msg = payload?.error?.message ?? ''
  const m = /retry in ([\d.]+)\s*s/i.exec(msg)
  if (!m) return null
  const sec = Math.min(120, parseFloat(m[1]) + 0.75)
  return Math.round(sec * 1000)
}

type SingleCallResult =
  | { kind: 'ok'; result: PlantDiagnosisResult }
  | { kind: 'http'; status: number; errorPayload?: GeminiGenResponse }
  | { kind: 'parse' }
  | { kind: 'blocked' }

async function callGeminiOnce(
  input: DiagnoseInput,
  model: string,
  key: string,
): Promise<SingleCallResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`

  let imageDataUrl = input.imageDataUrl
  if (imageDataUrl) {
    imageDataUrl = await downscaleDataUrlIfHuge(imageDataUrl)
  }

  const text = buildFitoUserContentText({
    locale: input.locale,
    symptoms: input.symptoms,
    notes: input.notes,
    hasImage: Boolean(parseDataUrl(imageDataUrl)),
  })

  const reqParts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text },
  ]

  const img = parseDataUrl(imageDataUrl)
  if (img) {
    reqParts.push({ inlineData: { mimeType: img.mimeType, data: img.data } })
  }

  const body = {
    systemInstruction: { parts: [{ text: FITO_PHYTOPATH_SYSTEM_PROMPT }] },
    contents: [{ role: 'user', parts: reqParts }],
    generationConfig: {
      temperature: 0.04,
      topP: 0.75,
      responseMimeType: 'application/json',
    },
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (e) {
    if (import.meta.env.DEV) console.warn('[fito] fetch error', e)
    return { kind: 'http', status: 0 }
  }

  let data: GeminiGenResponse
  try {
    data = (await res.json()) as GeminiGenResponse
  } catch {
    if (import.meta.env.DEV) console.warn('[fito] respuesta no JSON', res.status)
    return { kind: 'http', status: res.status }
  }

  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn('[fito] Gemini HTTP', res.status, model, data.error ?? data)
    }
    return { kind: 'http', status: res.status, errorPayload: data }
  }

  if (data.promptFeedback?.blockReason) {
    if (import.meta.env.DEV) console.warn('[fito] prompt bloqueado', data.promptFeedback.blockReason)
    return { kind: 'blocked' }
  }

  const fr = data.candidates?.[0]?.finishReason
  if (fr && fr !== 'STOP' && import.meta.env.DEV) {
    console.warn('[fito] finishReason', fr)
  }

  const raw = extractTextFromResponse(data)
  if (!raw) {
    if (import.meta.env.DEV) console.warn('[fito] Sin texto en candidates', data)
    return { kind: 'parse' }
  }

  const parsed = parsePlantDiagnosisJson(raw)
  if (!parsed) {
    if (import.meta.env.DEV) {
      console.warn('[fito] JSON no parseable, primeros 400 chars:', raw.slice(0, 400))
    }
    return { kind: 'parse' }
  }
  return { kind: 'ok', result: parsed }
}

async function callGeminiWithRetries(input: DiagnoseInput): Promise<{
  result: PlantDiagnosisResult | null
  mockReason?: DiagnoseMockReason
}> {
  const key = apiKey()
  if (!key) {
    if (import.meta.env.DEV) console.warn('[fito] Sin VITE_GEMINI_API_KEY')
    return { result: null, mockReason: 'no_key' }
  }

  let saw429 = false
  let sawHttpError = false
  let sawParse = false
  let sawBlocked = false

  for (const model of modelCandidates()) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const out = await callGeminiOnce(input, model, key)
      if (out.kind === 'ok') {
        return { result: out.result }
      }
      if (out.kind === 'blocked') {
        sawBlocked = true
        break
      }
      if (out.kind === 'parse') {
        sawParse = true
        break
      }
      if (out.kind === 'http') {
        if (out.status === 429) {
          saw429 = true
          if (attempt === 0) {
            const wait = geminiRetryDelayMs(out.errorPayload) ?? 3200
            await sleep(wait)
            continue
          }
          break
        }
        if (out.status !== 0) sawHttpError = true
        break
      }
    }
  }

  const mockReason: DiagnoseMockReason = sawBlocked
    ? 'blocked'
    : saw429
      ? 'rate_limit'
      : sawParse
        ? 'parse_error'
        : sawHttpError
          ? 'http_error'
          : 'unknown'

  return { result: null, mockReason }
}

/** Fallback local — NO es Gemini; el texto con «38%» y checklist fijo viene de aquí. */
function mockDiagnose(input: DiagnoseInput): PlantDiagnosisResult {
  const { symptoms, notes, locale } = input
  const sym = new Set(symptoms)
  const text = `${notes} ${symptoms.join(' ')}`.toLowerCase()
  const es = locale === 'es'

  const isolateFirstStep = es
    ? 'Separación inmediata del resto del cultivo y desinfección de herramientas (protocolo comercial).'
    : 'Немедленная изоляция от остальных растений и стерилизация инструментов (коммерческий протокол).'

  if (sym.has('insects') || sym.has('webbing') || /spider|paut|arañ|клещ|паутин|трипс|тля/i.test(text)) {
    return {
      diagnostico: es
        ? 'Daño biótico prioritario: ácaros / plagas chupadoras (descartar primero patógeno visible)'
        : 'Приоритет биотического фактора: клещи / сосущие вредители (первично исключить видимый патоген)',
      certeza: 76,
      tratamiento: es
        ? [
            isolateFirstStep,
            'Inspección del envés foliar con lupa 60× / microscopio; buscar huevos y movimiento.',
            'Tratamiento autorizado a escala (acaricida biocontrol o químico según registro local) en ventilación controlada.',
            'Registrar foco y no rotar personal/herramientas entre zonas sin desinfección.',
          ]
        : [
            isolateFirstStep,
            'Осмотр нижней стороны листа под лупой ×60 / микроскопом; яйца и движение.',
            'Обработка по допускам в хозяйстве (акарицид / БЗР) с учётом вентиляции и сроков.',
            'Фиксация очага; без ротации инструментов и людей между зонами без дезинфекции.',
          ],
      aislamiento: true,
    }
  }

  if (
    sym.has('mold') ||
    sym.has('root_smell') ||
    /moho|oidio|botryt|плесен|мучнист|фусари|питиум|septoria|корнев.*ни|gnil/i.test(text)
  ) {
    return {
      diagnostico: es
        ? 'Sospecha fitopatológica alta: oidio / Botrytis / podredumbre u hongo foliar (Septoria según patrón)'
        : 'Высокая подозрительность на гризок: мучнистая роса / Botrytis / корневые гнили или Septoria по картине',
      certeza: 71,
      tratamiento: es
        ? [
            isolateFirstStep,
            'Retirar tejido necrosado con herramienta estéril; bolsa sellada fuera del cuarto.',
            'Fungicida o programa biocontrol homologado para cannabis comercial; repetición según FI.',
            'Bajar HR solo donde sea seguro para floración; evitar nebulización sobre cogollos húmedos.',
          ]
        : [
            isolateFirstStep,
            'Удаление некроза стерильным инструментом; герметичная утилизация вне зала.',
            'Фунгицид / биопрограмма по регистру для коммерческого каннабиса; кратность по КРС.',
            'Снижать влажность точечно; не увлажнять соцветия в опасной фазе.',
          ],
      aislamiento: true,
    }
  }

  if (
    /vascular|wilting|marchite|fusarium|pythium|вилт|увяда|прикорнев|stem brown|корневая/i.test(
      text,
    ) ||
    sym.has('weak_stem') ||
    sym.has('drooping')
  ) {
    return {
      diagnostico: es
        ? 'Alerta vascular: posible Fusarium / Pythium / marchitamiento por patógeno (prioridad aislamiento)'
        : 'Сосудистый риск: возможны Fusarium / Pythium / увядание от патогена (в приоритет изоляция)',
      certeza: 62,
      tratamiento: es
        ? [
            isolateFirstStep,
            'Inspeccionar cuello radicular y primeros cm de tallo; fotografiar para registro.',
            'No regar en exceso; revisar drenaje y esterilidad del sustrato próximo al foco.',
            'Derivar muestra a laboratorio / asesor para confirmación (cultivo o PCR).',
          ]
        : [
            isolateFirstStep,
            'Осмотр корневой шейки и нижней части стебля; фото для журнала.',
            'Исключить перелив; дренаж и стерильность субстрата у очага.',
            'Направить пробу в лабораторию / консультанту (культура или ПЦР).',
          ],
      aislamiento: true,
    }
  }

  if (sym.has('brown_spots') || sym.has('necrosis') || sym.has('stunted')) {
    return {
      diagnostico: es
        ? 'Lesiones foliares o marchitamiento localizado: descartar Septoria, Botrytis foliar, trips o virus antes de nutrición'
        : 'Листовые поражения или локальное увядание: исключить Septoria, листовой Botrytis, трипс или вирус до версии про питание',
      certeza: 54,
      tratamiento: es
        ? [
            isolateFirstStep,
            'Lupa/microscopio: presencia de esporas, excrementos de trips, patrones de anillos o mosaico.',
            'Muestra a asesor o laboratorio si hay múltiples plantas afectadas en el mismo sector.',
          ]
        : [
            isolateFirstStep,
            'Лупа/микроскоп: споры, следы трипса, кольца или мозаика (вирусная картина).',
            'При поражении нескольких растений в секторе — очная экспертиза или лаборатория.',
          ],
      aislamiento: true,
    }
  }

  if (sym.has('yellow_spots') || sym.has('yellow_leaves') || sym.has('curling')) {
    const nutrientHint = /magnes|cal.?mag|магни|кальци|дефицит|pH|EC|блокир/i.test(text)
    if (!nutrientHint) {
      return {
        diagnostico: es
          ? 'Síntomas inespecíficos: virus/TMV, HLVd, ácaros iniciales u hongo foliar deben descartarse antes que estrés abiótico'
          : 'Неспецифическая симптоматика: до исключения вирус/TMV, HLVd, ранние клещи или листовой гриб — не трактовать как дефицит',
        certeza: 48,
        tratamiento: es
          ? [
              isolateFirstStep,
              'Microscopía y revisión sistemática de patógenos y plagas según protocolo del manual.',
              'Si tras 48–72h no hay pruebas de patógeno y notas indican solo nutrición, repetir análisis con pH/EC.',
            ]
          : [
              isolateFirstStep,
              'Микроскопия и проход по чек-листу патогенов/вредителей из протокола.',
              'Если через 48–72 ч нет признаков патогена и в журнале только питание — тогда pH/EC и дифференциация дефицита.',
            ],
        aislamiento: true,
      }
    }

    return {
      diagnostico: es
        ? 'Posible componente abiótico (Mg/Ca o bloqueo) solo si el patógeno fue descartado en inspección; riesgo residual — aislar hasta confirmar'
        : 'Возможен абиотический компонент (Mg/Ca или блокировка) только после снятия с патогена при осмотре; остаточный риск — карантин до подтверждения',
      certeza: 44,
      tratamiento: es
        ? [
            isolateFirstStep,
            'Inspección microscópica obligatoria antes de corregir fertilización.',
            'Tras descarte documentado: Cal-Mag según ficha del producto y riego sin estrés hídrico.',
            'Reevaluar en 5–7 días; si progresa, tratar como brote infeccioso.',
          ]
        : [
            isolateFirstStep,
            'Обязательная микроскопия до коррекции подкормок.',
            'После зафиксированного снятия с патогена: Cal-Mag по этикетке и полив без пересушки/перелива.',
            'Через 5–7 дней пересмотр; при прогрессии — как инфекционный очаг.',
          ],
      aislamiento: true,
    }
  }

  return {
    diagnostico: es
      ? 'Causa no confirmada: aplicar máxima cautela fitosanitaria hasta laboratorio o inspección experta'
      : 'Причина не подтверждена: максимальные меры фитосанитарной осторожности до лаборатории или очного осмотра',
    certeza: 38,
    tratamiento: es
      ? [
          isolateFirstStep,
          'Checklist: oidio, Botrytis, Fusarium/Pythium, Septoria, TMV, HLVd, ácaros/trips/pulgones.',
          'Documentar con fotos FECHA/HORA y no mezclar plantas entre salas.',
        ]
      : [
          isolateFirstStep,
          'Чек-лист: мучнистая роса, Botrytis, Fusarium/Pythium, Septoria, TMV, HLVd, клещ/трипс/тля.',
          'Фото с датой/временем; не смешивать растения между залами.',
        ],
    aislamiento: true,
  }
}

export async function diagnosePlantIssue(input: DiagnoseInput): Promise<DiagnoseOutcome> {
  const { result: apiResult, mockReason } = await callGeminiWithRetries(input).catch((e) => {
    if (import.meta.env.DEV) console.warn('[fito] Gemini error', e)
    return { result: null as PlantDiagnosisResult | null, mockReason: 'unknown' as DiagnoseMockReason }
  })
  if (apiResult) {
    return { result: apiResult, source: 'gemini' }
  }

  await sleep(450)
  return { result: mockDiagnose(input), source: 'mock', mockReason }
}
