import { useEffect, useState } from 'react'
import type { DiarioClimaData, PropagacionLogEntry } from '../../store/cultivationTypes'
import { computeVpdKpa } from '../../lib/diario/vpd'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

export function DiarioClimaModal({
  open,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
}) {
  const [temp, setTemp] = useState('')
  const [rh, setRh] = useState('')
  const [vpd, setVpd] = useState('')
  const [co2, setCo2] = useState('')
  const [ppfd, setPpfd] = useState('')
  const [dli, setDli] = useState('')
  const [vpdAuto, setVpdAuto] = useState(true)

  useEffect(() => {
    if (!open) return
    setTemp('')
    setRh('')
    setVpd('')
    setCo2('')
    setPpfd('')
    setDli('')
    setVpdAuto(true)
  }, [open])

  useEffect(() => {
    if (!open || !vpdAuto) return
    const tN = temp.trim() === '' ? NaN : Number(temp.replace(',', '.'))
    const rhN = rh.trim() === '' ? NaN : Number(rh.replace(',', '.'))
    const v = computeVpdKpa(tN, rhN)
    setVpd(v != null ? String(v) : '')
  }, [open, vpdAuto, temp, rh])

  if (!open) return null

  const parseOpt = (s: string) => {
    const n = s.trim() === '' ? NaN : Number(s.replace(',', '.'))
    return Number.isFinite(n) ? n : undefined
  }

  const handleSave = () => {
    if (batchIds.length === 0) return
    const data: DiarioClimaData = {
      tempC: parseOpt(temp),
      rhPct: parseOpt(rh),
      vpdKpa: parseOpt(vpd),
      co2Ppm: parseOpt(co2),
      ppfd: parseOpt(ppfd),
      dli: parseOpt(dli),
    }
    if (
      data.tempC == null &&
      data.rhPct == null &&
      data.vpdKpa == null &&
      data.co2Ppm == null &&
      data.ppfd == null &&
      data.dli == null
    )
      return
    onCommit({
      kind: 'diario_clima',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioClima: data,
    })
    onClose()
  }

  const hasAny =
    temp.trim() ||
    rh.trim() ||
    vpd.trim() ||
    co2.trim() ||
    ppfd.trim() ||
    dli.trim()

  return (
    <EnvModalFrame
      title={t('diario.modalClimaTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="rounded-full bg-green-700 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-green-800 disabled:opacity-50"
            onClick={handleSave}
            disabled={batchIds.length === 0 || !hasAny}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 grid gap-3">
        <label className="flex items-center gap-2 text-xs text-gray-600">
          <input type="checkbox" checked={vpdAuto} onChange={(e) => setVpdAuto(e.target.checked)} />
          {t('diario.vpdAuto')}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">{t('diario.tempC')}</label>
            <input
              className="mt-0.5 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm"
              value={temp}
              onChange={(e) => setTemp(e.target.value)}
              inputMode="decimal"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">{t('diario.rh')}</label>
            <input
              className="mt-0.5 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm"
              value={rh}
              onChange={(e) => setRh(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>
        <div>
          <label className="text-[10px] text-gray-500">{t('diario.ppfdIntensity')}</label>
          <div className="relative mt-0.5">
            <input
              className="w-full rounded-xl border border-gray-200 py-1.5 pl-2 pr-11 text-sm tabular-nums"
              value={ppfd}
              onChange={(e) => setPpfd(e.target.value)}
              inputMode="numeric"
              aria-describedby="diario-clima-ppfd-hint"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-medium text-gray-400">
              PPFD
            </span>
          </div>
          <p id="diario-clima-ppfd-hint" className="mt-0.5 text-[10px] leading-snug text-gray-400">
            {t('diario.ppfdCanopyHint')}
          </p>
        </div>
        <div>
          <label className="text-[10px] text-gray-500">{t('diario.vpd')}</label>
          <input
            className="mt-0.5 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm"
            value={vpd}
            onChange={(e) => {
              setVpdAuto(false)
              setVpd(e.target.value)
            }}
            inputMode="decimal"
            readOnly={vpdAuto}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500">{t('diario.co2')}</label>
            <input
              className="mt-0.5 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm"
              value={co2}
              onChange={(e) => setCo2(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="text-[10px] text-gray-500">{t('diario.dli')}</label>
            <input
              className="mt-0.5 w-full rounded-xl border border-gray-200 px-2 py-1.5 text-sm"
              value={dli}
              onChange={(e) => setDli(e.target.value)}
              inputMode="decimal"
            />
          </div>
        </div>
      </div>
    </EnvModalFrame>
  )
}
