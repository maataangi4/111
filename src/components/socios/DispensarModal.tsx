import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, MessageCircle, Package, X } from 'lucide-react'
import { cn } from '../../lib/cn'
import { buildWhatsAppUrl } from '../../lib/whatsapp'
import { useCultivationStore } from '../../store/useCultivationStore'
import { useSociosStore, deriveSocioView, type MovimientoMetodoPago, type MovimientoTipo, type Socio } from '../../store/useSociosStore'

const MONTHLY_LIMIT_G = 40

function fmtGrams(n: number) {
  const g = Math.round(n * 10) / 10
  return `${String(g).replace('.', ',')}g`
}

export function DispensarModal({
  open,
  onOpenChange,
  socio,
  stockBatches,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  socio: Socio
  stockBatches: { id: string; label: string; availableG: number; premiumG: number }[]
}) {
  const view = useMemo(() => deriveSocioView(socio), [socio])
  const recordDispense = useSociosStore((s) => s.recordDispense)
  const dispenseFromHarvestBatch = useCultivationStore((s) => s.dispenseFromHarvestBatch)

  const remaining = Math.max(0, MONTHLY_LIMIT_G - socio.monthlyDispensedGrams)
  const [grams, setGrams] = useState<number>(Math.min(10, remaining))
  const [batchId, setBatchId] = useState<string>(stockBatches[0]?.id ?? '')
  const [tipo, setTipo] = useState<MovimientoTipo>('legal')
  const [aporteArs, setAporteArs] = useState<number>(0)
  const [metodoPago, setMetodoPago] = useState<MovimientoMetodoPago>('Efectivo')
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState<{ grams: number; batchLabel: string; aporteArs: number; metodoPago: string } | null>(null)

  // Resetea todo solo cuando el modal se abre (no cuando cambia `remaining`)
  useEffect(() => {
    if (!open) return
    setDone(null)
    setError(null)
    setTipo('legal')
    setAporteArs(0)
    setMetodoPago('Efectivo')
    setBatchId(stockBatches[0]?.id ?? '')
    setGrams(Math.min(10, Math.max(0, remaining)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onOpenChange])

  const legalBlocked = view.legalStatus === 'vencido'
  const financialBlocked = socio.financialStatus === 'deuda'
  const consentBlocked = socio.consentStatus !== 'aceptado'
  const blocked = legalBlocked || financialBlocked || consentBlocked

  const selectedBatch = useMemo(() => stockBatches.find((b) => b.id === batchId) ?? null, [stockBatches, batchId])
  const maxByBatch = selectedBatch ? Math.max(0, selectedBatch.premiumG) : 0
  const hardMax = Math.max(0, Math.min(remaining, maxByBatch))

  const canSubmit = !blocked && grams > 0 && grams <= hardMax && Boolean(batchId)

  const submit = () => {
    setError(null)
    if (consentBlocked) {
      setError('El paciente todavía no firmó el consentimiento (Anexo III).')
      return
    }
    if (blocked) {
      setError('Acción bloqueada: Regularizar estado legal o financiero')
      return
    }
    if (!batchId) {
      setError('Seleccioná un lote de origen.')
      return
    }
    if (!Number.isFinite(grams) || grams <= 0) {
      setError('Ingresá un monto válido en gramos.')
      return
    }
    if (grams > remaining + 1e-6) {
      setError('Supera el límite mensual permitido (40g).')
      return
    }
    if (selectedBatch && grams > selectedBatch.premiumG + 1e-6) {
      setError('No hay stock suficiente en ese lote (Premium).')
      return
    }

    const okStock = dispenseFromHarvestBatch ? dispenseFromHarvestBatch({ harvestBatchId: batchId, grams }) : true
    if (!okStock) {
      setError('No se pudo descontar del stock del lote.')
      return
    }
    const selectedLabel = selectedBatch?.label ?? batchId
    const res = recordDispense({
      socioId: socio.id,
      grams,
      harvestBatchId: batchId,
      harvestBatchLabel: selectedLabel,
      tipo,
      aporteArs,
      metodoPago,
    })
    if (!res.ok) {
      setError('No se pudo registrar la dispensación.')
      return
    }
    setDone({ grams, batchLabel: selectedLabel, aporteArs, metodoPago })
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key="dispensar-modal"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            aria-label="Cerrar"
            onClick={() => onOpenChange(false)}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Dispensar"
            initial={{ y: 14, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 10, scale: 0.98, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 380 }}
            className={cn(
              'relative z-10 w-full max-w-lg overflow-hidden rounded-[26px] border border-white/[0.12]',
              'bg-gradient-to-br from-[#06130e]/95 via-[#091524]/92 to-[#0b1730]/95',
              'shadow-[0_26px_90px_rgba(0,0,0,0.75)] backdrop-blur-2xl backdrop-saturate-150',
            )}
          >
            <div className="flex items-start justify-between border-b border-white/[0.08] p-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Dispensación</p>
                <h3 className="mt-1 text-lg font-semibold text-white">Dispensar a {socio.nombre}</h3>
                <p className="mt-1 text-sm text-white/55">
                  Restante del mes: <span className="font-semibold text-white/80">{fmtGrams(remaining)}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-white/45 transition hover:bg-white/[0.06] hover:text-white"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {done ? (
              <div className="flex flex-col items-center gap-5 px-6 py-10 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-400" strokeWidth={1.5} />
                <div>
                  <p className="text-lg font-semibold text-white">Dispensación registrada</p>
                  <p className="mt-1 text-sm text-white/60">
                    {fmtGrams(done.grams)} · {done.batchLabel}
                  </p>
                  {done.aporteArs > 0 && (
                    <p className="mt-0.5 text-sm text-white/50">
                      Aporte: ${done.aporteArs} · {done.metodoPago}
                    </p>
                  )}
                </div>
                <div className="flex w-full flex-col gap-2">
                  {socio.phone ? (
                    <a
                      href={buildWhatsAppUrl(
                        socio.phone,
                        `Hola ${socio.nombre}! Tu dispensación fue registrada exitosamente.\n- Cantidad: ${fmtGrams(done.grams)}\n- Lote: ${done.batchLabel}${done.aporteArs > 0 ? `\n- Aporte: $${done.aporteArs} (${done.metodoPago})` : ''}\n\nCanspace Club`,
                      )}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_30px_rgba(37,211,102,0.25)] transition hover:brightness-110"
                    >
                      <MessageCircle className="h-4 w-4" aria-hidden />
                      Enviar WhatsApp a {socio.nombre}
                    </a>
                  ) : (
                    <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/50">
                      Sin número de WhatsApp. Agregalo en el perfil del paciente para habilitar este botón.
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 ring-1 ring-white/10 transition hover:bg-white/[0.06]"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
            <>
            <div className="space-y-4 p-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Monto (g)</p>
                  <input
                    type="number"
                    min={0}
                    max={hardMax}
                    step={0.5}
                    value={Number.isFinite(grams) ? grams : 0}
                    onChange={(e) => setGrams(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                  />
                  <p className="mt-2 text-[11px] text-white/50">
                    Máximo por lote y mes: <span className="font-semibold text-white/75">{fmtGrams(hardMax)}</span>
                  </p>
                </div>

                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Lote de origen</p>
                  <select
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value)}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm text-white outline-none focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    {stockBatches.length === 0 ? (
                      <option value="">Sin lotes en stock</option>
                    ) : (
                      stockBatches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.label} · Premium {fmtGrams(b.premiumG)}
                        </option>
                      ))
                    )}
                  </select>
                  <p className="mt-2 text-[11px] text-white/50">Se descuenta de Premium (trazabilidad bidireccional).</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Tipo</p>
                  <select
                    value={tipo}
                    onChange={(e) => setTipo((e.target.value as MovimientoTipo) || 'legal')}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm text-white outline-none focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    <option value="legal">Legal (Reprocann)</option>
                    <option value="interno">Interno (excedente)</option>
                  </select>
                </div>

                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Aporte ($)</p>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={Number.isFinite(aporteArs) ? aporteArs : 0}
                    onChange={(e) => setAporteArs(Math.max(0, Number(e.target.value) || 0))}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm font-semibold text-white outline-none focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                  />
                </div>

                <div className="rounded-2xl border border-white/[0.10] bg-white/[0.04] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">Método</p>
                  <select
                    value={metodoPago}
                    onChange={(e) => setMetodoPago((e.target.value as MovimientoMetodoPago) || 'Efectivo')}
                    className="mt-2 h-11 w-full rounded-2xl border border-white/[0.10] bg-white/[0.06] px-3 text-sm text-white outline-none focus:border-emerald-400/35 focus:ring-2 focus:ring-emerald-400/15"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>

              {blocked ? (
                <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 p-3 text-sm text-rose-100">
                  Acción bloqueada: Regularizar estado legal o financiero
                </div>
              ) : null}

              {error ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm text-amber-100">
                  {error}
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-white/[0.08] p-5">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-white/70 ring-1 ring-white/[0.10] transition hover:bg-white/[0.06]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!canSubmit}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-semibold transition',
                  'bg-gradient-to-br from-emerald-300 to-sky-300 text-[#05110c]',
                  'shadow-[0_14px_50px_rgba(16,185,129,0.18)]',
                  'disabled:cursor-not-allowed disabled:opacity-40',
                )}
              >
                <Package className="h-4 w-4" aria-hidden />
                Confirmar dispensación
              </button>
            </div>
            </>
            )}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}

