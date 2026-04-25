/**
 * OCR helpers for short numeric bracelet IDs: preprocess frame + Tesseract tuned for digits.
 */

function otsuThreshold(hist: Uint32Array, total: number): number {
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * hist[i]
  let sumB = 0
  let wB = 0
  let maxVar = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = total - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between >= maxVar) {
      maxVar = between
      threshold = t
    }
  }
  return threshold
}

function downscaleToMaxWidth(src: HTMLCanvasElement, maxW: number): HTMLCanvasElement {
  const sw = src.width
  const sh = src.height
  if (sw <= maxW || sw < 2 || sh < 2) return src
  const tw = maxW
  const th = Math.max(1, Math.round((sh * tw) / sw))
  const c = document.createElement('canvas')
  c.width = tw
  c.height = th
  const ctx = c.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, tw, th)
  return c
}

function cropCenterRegion(
  src: HTMLCanvasElement,
  fracW: number,
  fracH: number,
): HTMLCanvasElement {
  const sw = src.width
  const sh = src.height
  const cw = Math.floor(sw * fracW)
  const ch = Math.floor(sh * fracH)
  const sx = Math.floor((sw - cw) / 2)
  const sy = Math.floor((sh - ch) / 2)
  const scale = Math.max(1400 / cw, 2.0)
  const targetW = Math.min(2600, Math.floor(cw * scale))
  const targetH = Math.floor(ch * (targetW / cw))
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, sx, sy, cw, ch, 0, 0, targetW, targetH)
  return canvas
}

function grayscaleProcess(
  src: HTMLCanvasElement,
  mode: 'stretch' | 'otsu',
  contrastBoost = 1.45,
): HTMLCanvasElement {
  const ctx0 = src.getContext('2d')
  if (!ctx0) return src
  const w = src.width
  const h = src.height
  const img = ctx0.getImageData(0, 0, w, h)
  const d = img.data
  const n = w * h
  const gray = new Float64Array(n)
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    gray[i] = 0.299 * d[p] + 0.587 * d[p + 1] + 0.114 * d[p + 2]
  }
  let min = 255
  let max = 0
  for (let i = 0; i < n; i++) {
    if (gray[i] < min) min = gray[i]
    if (gray[i] > max) max = gray[i]
  }
  const range = max - min || 1
  const hist = new Uint32Array(256)
  for (let i = 0, p = 0; i < n; i++, p += 4) {
    const vNorm = Math.min(255, Math.max(0, Math.round(((gray[i] - min) / range) * 255)))
    hist[vNorm]++
    if (mode === 'stretch') {
      let v = (vNorm - 128) * contrastBoost + 128
      v = Math.max(0, Math.min(255, v))
      d[p] = d[p + 1] = d[p + 2] = v
      d[p + 3] = 255
    }
  }
  if (mode === 'otsu') {
    const t = otsuThreshold(hist, n)
    for (let i = 0, p = 0; i < n; i++, p += 4) {
      const vNorm = Math.min(255, Math.max(0, Math.round(((gray[i] - min) / range) * 255)))
      const b = vNorm > t ? 255 : 0
      d[p] = d[p + 1] = d[p + 2] = b
      d[p + 3] = 255
    }
  }
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  if (!octx) return src
  octx.putImageData(img, 0, 0)
  return out
}

/** Light-on-dark браслеты: инверсия после grayscale даёт тёмные цифры на светлом фоне для Tesseract. */
function invertCanvas(src: HTMLCanvasElement): HTMLCanvasElement {
  const ctx0 = src.getContext('2d')
  if (!ctx0) return src
  const w = src.width
  const h = src.height
  const img = ctx0.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const v = 255 - d[i]
    d[i] = d[i + 1] = d[i + 2] = v
    d[i + 3] = 255
  }
  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  if (!octx) return src
  octx.putImageData(img, 0, 0)
  return out
}

/** Same as green overlay in the UI: only this region is sent to OCR (no full frame). */
const FRAME_FRAC_W = 0.9
const FRAME_FRAC_H = 0.46

function buildVariants(fullFrame: HTMLCanvasElement): HTMLCanvasElement[] {
  const out: HTMLCanvasElement[] = []
  const c1 = cropCenterRegion(fullFrame, FRAME_FRAC_W, FRAME_FRAC_H)
  const sHigh = grayscaleProcess(c1, 'stretch', 1.55)
  const sMid = grayscaleProcess(c1, 'stretch', 1.28)
  const sLow = grayscaleProcess(c1, 'stretch', 1.12)
  const ots = grayscaleProcess(c1, 'otsu')
  out.push(sHigh, sMid, sLow, ots)
  out.push(invertCanvas(sHigh), invertCanvas(sMid), invertCanvas(ots))
  const c2 = cropCenterRegion(fullFrame, 0.68, 0.38)
  out.push(grayscaleProcess(c2, 'stretch', 1.38))
  const c3 = cropCenterRegion(fullFrame, 0.58, 0.32)
  out.push(grayscaleProcess(c3, 'stretch', 1.32))
  const cWide = cropCenterRegion(fullFrame, 0.96, 0.52)
  out.push(grayscaleProcess(cWide, 'stretch', 1.25))
  return out
}

/** Лёгкий кроп для снимка с камеры: без экстремального апскейла (быстрее OCR). */
function cropCenterRegionLite(
  src: HTMLCanvasElement,
  fracW: number,
  fracH: number,
): HTMLCanvasElement {
  const sw = src.width
  const sh = src.height
  const cw = Math.floor(sw * fracW)
  const ch = Math.floor(sh * fracH)
  const sx = Math.floor((sw - cw) / 2)
  const sy = Math.floor((sh - ch) / 2)
  const scale = Math.min(2.25, Math.max(1.25, 960 / Math.max(1, cw)))
  const targetW = Math.min(1400, Math.floor(cw * scale))
  const targetH = Math.max(1, Math.floor(ch * (targetW / cw)))
  const canvas = document.createElement('canvas')
  canvas.width = targetW
  canvas.height = targetH
  const ctx = canvas.getContext('2d')
  if (!ctx) return src
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, sx, sy, cw, ch, 0, 0, targetW, targetH)
  return canvas
}

/** 4 варианта изображения — достаточно для кнопки «Снять», без десятков проходов Tesseract. */
function buildSnapshotVariants(fullFrame: HTMLCanvasElement): HTMLCanvasElement[] {
  const scaled = downscaleToMaxWidth(fullFrame, 1120)
  const c1 = cropCenterRegionLite(scaled, FRAME_FRAC_W, FRAME_FRAC_H)
  const sHigh = grayscaleProcess(c1, 'stretch', 1.48)
  const sMid = grayscaleProcess(c1, 'stretch', 1.2)
  const ots = grayscaleProcess(c1, 'otsu')
  return [sHigh, sMid, ots, invertCanvas(sHigh)]
}

type OcrTextChunk = { raw: string; confidence: number }

/** Собираем все строки из иерархии страницы — часто цифры только в words, а data.text пустой. */
function appendTextsFromPage(page: {
  text?: string
  confidence?: number
  blocks?: Array<{
    text?: string
    confidence?: number
    paragraphs?: Array<{
      text?: string
      confidence?: number
      lines?: Array<{
        text?: string
        confidence?: number
        words?: Array<{ text?: string; confidence?: number }>
      }>
    }>
  }> | null
} | null, sink: OcrTextChunk[]): void {
  if (!page) return
  const pageConf =
    typeof page.confidence === 'number' && !Number.isNaN(page.confidence)
      ? page.confidence
      : 0
  const top = (page.text ?? '').trim()
  if (top) sink.push({ raw: top, confidence: pageConf })

  for (const b of page.blocks ?? []) {
    const bc =
      typeof b.confidence === 'number' && !Number.isNaN(b.confidence)
        ? b.confidence
        : pageConf
    const bt = (b.text ?? '').trim()
    if (bt) sink.push({ raw: bt, confidence: bc })
    for (const para of b.paragraphs ?? []) {
      const pc =
        typeof para.confidence === 'number' && !Number.isNaN(para.confidence)
          ? para.confidence
          : bc
      const pt = (para.text ?? '').trim()
      if (pt) sink.push({ raw: pt, confidence: pc })
      for (const line of para.lines ?? []) {
        const lc =
          typeof line.confidence === 'number' && !Number.isNaN(line.confidence)
            ? line.confidence
            : pc
        const lt = (line.text ?? '').trim()
        if (lt) sink.push({ raw: lt, confidence: lc })
        for (const w of line.words ?? []) {
          const wc =
            typeof w.confidence === 'number' && !Number.isNaN(w.confidence)
              ? w.confidence
              : lc
          const wt = (w.text ?? '').trim()
          if (wt) sink.push({ raw: wt, confidence: wc })
        }
      }
    }
  }
}

/** Голосование по всем кускам текста: снижает ошибки «123455 → 123456» (один «уверенный» ложный проход). */
function pickDigitsByConsensus(texts: OcrTextChunk[]): string | null {
  const acc = new Map<string, { hits: number; wsum: number }>()
  const bump = (s: string, w: number) => {
    if (!s) return
    const v = acc.get(s) ?? { hits: 0, wsum: 0 }
    v.hits += 1
    v.wsum += w
    acc.set(s, v)
  }

  for (const { raw, confidence } of texts) {
    const base =
      typeof confidence === 'number' && Number.isFinite(confidence) && confidence > 0
        ? Math.max(8, Math.min(100, confidence)) / 100
        : 0.4
    const seen = new Set<string>()
    const cleaned = raw.replace(/\D/g, '')
    if (cleaned.length > 0) {
      seen.add(cleaned)
      bump(cleaned, base * 1.35)
    }
    for (const run of raw.match(/\d+/g) ?? []) {
      if (run.length === 0 || seen.has(run)) continue
      seen.add(run)
      bump(run, base)
    }
  }

  if (acc.size === 0) return null

  const ranked = [...acc.entries()].sort((a, b) => {
    const da = a[1]
    const db = b[1]
    if (db.hits !== da.hits) return db.hits - da.hits
    if (Math.abs(db.wsum - da.wsum) > 1e-6) return db.wsum - da.wsum
    if (a[0].length !== b[0].length) return a[0].length - b[0].length
    return a[0].localeCompare(b[0])
  })

  return ranked[0]![0]
}

/** Самый частый run в объединённом тексте; при равном числе голосов — более короткий (меньше «лишней» цифры). */
function bestDigitRunByFrequency(texts: OcrTextChunk[]): string | null {
  const mega = texts.map((t) => t.raw).join(' ')
  const runs = mega.match(/\d+/g)
  if (!runs?.length) return null
  const freq = new Map<string, number>()
  for (const r of runs) freq.set(r, (freq.get(r) ?? 0) + 1)
  let bestRun = ''
  let bestN = 0
  for (const [run, n] of freq) {
    if (
      n > bestN ||
      (n === bestN && bestRun && run.length < bestRun.length) ||
      (n === bestN && run.length === bestRun.length && run < bestRun)
    ) {
      bestN = n
      bestRun = run
    }
  }
  return bestRun.length > 0 ? bestRun : null
}

function dedupeDigitsMaxConf(
  items: { digits: string; confidence: number }[],
): { digits: string; confidence: number }[] {
  const m = new Map<string, number>()
  for (const { digits, confidence } of items) {
    if (!digits) continue
    m.set(digits, Math.max(m.get(digits) ?? 0, confidence))
  }
  return [...m.entries()].map(([digits, confidence]) => ({ digits, confidence }))
}

/** Drop "200" if "2000" also appears — avoids truncated reads winning on confidence. */
function dropStrictPrefixShorterReads(
  items: { digits: string; confidence: number }[],
): { digits: string; confidence: number }[] {
  return items.filter(
    (item) =>
      !items.some(
        (o) =>
          o.digits.length > item.digits.length &&
          o.digits.startsWith(item.digits),
      ),
  )
}

function pickBestDigits(texts: OcrTextChunk[]): string | null {
  const consensus = pickDigitsByConsensus(texts)
  if (consensus) return consensus

  const parsed = texts
    .map(({ raw, confidence }) => ({
      digits: raw.replace(/\D/g, ''),
      confidence,
    }))
    .filter((x) => x.digits.length > 0)

  let candidates = dedupeDigitsMaxConf(parsed)
  candidates = dropStrictPrefixShorterReads(candidates)

  let best = ''
  let bestScore = -1
  for (const { digits, confidence } of candidates) {
    const score = confidence * 0.6 + digits.length * 4
    if (score > bestScore) {
      bestScore = score
      best = digits
    }
  }
  if (best) return best

  return bestDigitRunByFrequency(texts)
}

const LOOSE_WHITELIST =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ#-.,:/ '

async function recognizePageInto(
  worker: {
    recognize: (
      image: HTMLCanvasElement,
      opts?: object,
      output?: { blocks?: boolean },
    ) => Promise<{ data: Parameters<typeof appendTextsFromPage>[0] }>
  },
  canvas: HTMLCanvasElement,
  sink: OcrTextChunk[],
): Promise<void> {
  const { data } = await worker.recognize(canvas, {}, { blocks: true })
  appendTextsFromPage(data, sink)
}

/**
 * Один кадр с кнопки «Снять» — мало проходов Tesseract (~10–15), чтобы не «висеть» минутами.
 * Для максимального качества на загруженном файле можно использовать `recognizeBraceletDigitsFromFrame`.
 */
export async function recognizeBraceletDigitsFromSnapshot(
  fullFrame: HTMLCanvasElement,
): Promise<string | null> {
  const variants = buildSnapshotVariants(fullFrame)
  const { createWorker, OEM, PSM } = await import('tesseract.js')
  const collected: OcrTextChunk[] = []

  const worker = await createWorker('eng', OEM.LSTM_ONLY)
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      user_defined_dpi: '240',
    })
    for (const c of variants) {
      await recognizePageInto(worker, c, collected)
    }
    let best = pickBestDigits(collected)
    if (best) return best

    await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
    for (const c of variants.slice(0, 3)) {
      await recognizePageInto(worker, c, collected)
    }
    best = pickBestDigits(collected)
    if (best) return best

    await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
    for (const c of variants.slice(0, 2)) {
      await recognizePageInto(worker, c, collected)
    }
    best = pickBestDigits(collected)
    if (best) return best

    await worker.setParameters({
      tessedit_char_whitelist: LOOSE_WHITELIST,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })
    await recognizePageInto(worker, variants[0]!, collected)
    await recognizePageInto(worker, variants[3]!, collected)
    return pickBestDigits(collected)
  } finally {
    await worker.terminate()
  }
}

export async function recognizeBraceletDigitsFromFrame(
  fullFrame: HTMLCanvasElement,
): Promise<string | null> {
  const variants = buildVariants(fullFrame)
  const { createWorker, OEM, PSM } = await import('tesseract.js')

  const collected: OcrTextChunk[] = []

  const runLstmPasses = async () => {
    const worker = await createWorker('eng', OEM.LSTM_ONLY)
    try {
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
        user_defined_dpi: '300',
      })
      for (const canvas of variants) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_WORD })
      for (const canvas of variants.slice(0, 4)) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      for (const canvas of variants.slice(0, 6)) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.SPARSE_TEXT })
      for (const canvas of variants.slice(0, 5)) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      for (const canvas of variants.slice(0, 4)) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({
        tessedit_char_whitelist: LOOSE_WHITELIST,
        tessedit_pageseg_mode: PSM.SINGLE_LINE,
      })
      for (const canvas of variants.slice(0, 6)) {
        await recognizePageInto(worker, canvas, collected)
      }

      await worker.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
      const primary = variants[0]
      const invPrimary = variants[4]
      if (primary) await recognizePageInto(worker, primary, collected)
      if (invPrimary) await recognizePageInto(worker, invPrimary, collected)
    } finally {
      await worker.terminate()
    }
  }

  await runLstmPasses()
  const best = pickBestDigits(collected)
  if (best) return best

  const worker2 = await createWorker('eng', OEM.TESSERACT_LSTM_COMBINED)
  try {
    await worker2.setParameters({
      tessedit_char_whitelist: '0123456789',
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
      user_defined_dpi: '300',
    })
    for (const canvas of variants.slice(0, 7)) {
      await recognizePageInto(worker2, canvas, collected)
    }
    await worker2.setParameters({ tessedit_pageseg_mode: PSM.AUTO })
    for (const canvas of variants.slice(0, 4)) {
      await recognizePageInto(worker2, canvas, collected)
    }
    await worker2.setParameters({
      tessedit_char_whitelist: LOOSE_WHITELIST,
      tessedit_pageseg_mode: PSM.SINGLE_LINE,
    })
    for (const canvas of variants.slice(0, 4)) {
      await recognizePageInto(worker2, canvas, collected)
    }
  } finally {
    await worker2.terminate()
  }

  return pickBestDigits(collected)
}
