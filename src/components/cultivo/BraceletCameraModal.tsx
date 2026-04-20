import { useEffect, useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { recognizeBraceletDigitsFromSnapshot } from '../../lib/braceletOcr'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../i18n/useTranslation'

type BraceletCameraModalProps = {
  open: boolean
  onClose: () => void
  /** Распознанная строка цифр с браслета (не QR). */
  onDigits: (digits: string) => void
  title?: string
  subtitle?: string
  captureLabel?: string
  readingLabel?: string
  cancelLabel?: string
  noDigitsError?: string
  cameraError?: string
}

/** Камера + OCR цифр на браслете (без QR). Тексты по умолчанию — из i18n. */
export function BraceletCameraModal({
  open,
  onClose,
  onDigits,
  title,
  subtitle,
  captureLabel,
  readingLabel,
  cancelLabel,
  noDigitsError,
  cameraError,
}: BraceletCameraModalProps) {
  const { t } = useTranslation()
  const titleStr = title ?? t('cameraBracelet.title')
  const subtitleStr = subtitle ?? t('cameraBracelet.subtitle')
  const captureStr = captureLabel ?? t('cameraBracelet.capture')
  const readingStr = readingLabel ?? t('cameraBracelet.reading')
  const cancelStr = cancelLabel ?? t('cameraBracelet.cancel')
  const noDigitsStr = noDigitsError ?? t('cameraBracelet.noDigits')
  const cameraErrStr = cameraError ?? t('cameraBracelet.cameraError')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [streamFailed, setStreamFailed] = useState(false)
  const [flash, setFlash] = useState(false)

  const stopStream = () => {
    const st = streamRef.current
    if (st) {
      for (const tr of st.getTracks()) tr.stop()
      streamRef.current = null
    }
  }

  const handleClose = () => {
    stopStream()
    setErr(null)
    setBusy(false)
    setStreamFailed(false)
    onClose()
  }

  useEffect(() => {
    if (!open) return
    setErr(null)
    setStreamFailed(false)
    let cancelled = false
    ;(async () => {
      try {
        const st = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })
        if (cancelled) {
          for (const tr of st.getTracks()) tr.stop()
          return
        }
        streamRef.current = st
        if (videoRef.current) {
          videoRef.current.srcObject = st
          await videoRef.current.play()
        }
      } catch {
        setStreamFailed(true)
        setErr(cameraErrStr)
      }
    })()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [open, cameraErrStr])

  const waitForVideoFrame = async (video: HTMLVideoElement) => {
    for (let i = 0; i < 50; i++) {
      if (video.videoWidth > 2 && video.videoHeight > 2) {
        if (typeof video.requestVideoFrameCallback === 'function') {
          await new Promise<void>((resolve) => {
            video.requestVideoFrameCallback(() => resolve())
          })
        }
        return
      }
      await new Promise((r) => setTimeout(r, 50))
    }
  }

  const capture = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    setBusy(true)
    setErr(null)
    try {
      await waitForVideoFrame(video)
      const w = video.videoWidth
      const h = video.videoHeight
      if (w < 2 || h < 2) {
        setErr(noDigitsStr)
        setBusy(false)
        return
      }
      setFlash(true)
      window.setTimeout(() => setFlash(false), 120)
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no_ctx')
      ctx.drawImage(video, 0, 0, w, h)
      const digits = await recognizeBraceletDigitsFromSnapshot(canvas)
      if (!digits) {
        setErr(noDigitsStr)
        setBusy(false)
        return
      }
      onDigits(digits)
      handleClose()
    } catch {
      setErr(noDigitsStr)
      setBusy(false)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[95] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleClose()
      }}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={titleStr}
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 p-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-100 text-green-700">
                <Camera className="h-4 w-4" strokeWidth={2} aria-hidden />
              </span>
              <h3 className="text-base font-semibold text-gray-900">{titleStr}</h3>
            </div>
            <p className="mt-2 text-sm text-gray-600">{subtitleStr}</p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100"
            aria-label={cancelStr}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 p-4">
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-black">
            <video ref={videoRef} className="h-auto w-full" playsInline muted />
            {flash ? (
              <div
                className="pointer-events-none absolute inset-0 z-10 bg-white/75"
                aria-hidden
              />
            ) : null}
            <div
              className="pointer-events-none absolute inset-0 flex items-center justify-center p-[8%]"
              aria-hidden
            >
              <div className="h-[42%] w-[86%] max-h-[min(40vw,220px)] rounded-xl border-2 border-emerald-400/85 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
            </div>
          </div>
          <canvas ref={canvasRef} className="hidden" />
          {err ? <p className="text-sm text-red-600">{err}</p> : null}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-800 hover:bg-gray-50"
            >
              {cancelStr}
            </button>
            <button
              type="button"
              disabled={busy || streamFailed}
              onClick={() => void capture()}
              className={cn(
                'flex-1 rounded-xl py-3 text-sm font-semibold text-white',
                busy || streamFailed
                  ? 'cursor-not-allowed bg-gray-300'
                  : 'bg-green-700 hover:bg-green-800',
              )}
            >
              {busy ? readingStr : captureStr}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
