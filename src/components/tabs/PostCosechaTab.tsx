import { useMemo, useState } from 'react'
import { Sun, Package, Warehouse, GitBranch } from 'lucide-react'
import { cn } from '../../lib/cn'
import { useTranslation } from '../../i18n/useTranslation'
import type { HarvestBatch } from '../../store/cultivationTypes'
import { useCultivationStore } from '../../store/useCultivationStore'
import { SoftSelect } from '../ui/SoftSelect'

function daysSinceCalendarDate(ymd: string): number {
  const part = ymd.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(part)) return 0
  const [y, m, d] = part.split('-').map(Number)
  const t0 = Date.UTC(y!, m! - 1, d!)
  const now = new Date()
  const t1 = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return Math.max(0, Math.floor((t1 - t0) / 86400000))
}

function daysSinceIso(iso: string): number {
  return daysSinceCalendarDate(iso.slice(0, 10))
}

function parseNumInput(s: string): number | null {
  const t = s.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function PostCosechaTab() {
  const { t } = useTranslation()
  const harvestBatches = useCultivationStore((s) => s.harvestBatches)
  const rooms = useCultivationStore((s) => s.rooms)
  const updateHarvest = useCultivationStore((s) => s.updateHarvest)
  const moveHarvestBatchToCuring = useCultivationStore((s) => s.moveHarvestBatchToCuring)
  const moveHarvestBatchToStock = useCultivationStore((s) => s.moveHarvestBatchToStock)

  const active = useMemo(
    () => harvestBatches.filter((b) => !b.archived),
    [harvestBatches],
  )
  const drying = useMemo(
    () => active.filter((b) => b.postHarvestStatus === 'DRYING'),
    [active],
  )
  const curing = useMemo(
    () => active.filter((b) => b.postHarvestStatus === 'CURING'),
    [active],
  )
  const stock = useMemo(
    () => active.filter((b) => b.postHarvestStatus === 'STOCK'),
    [active],
  )

  const [curingModal, setCuringModal] = useState<HarvestBatch | null>(null)
  const [dryTotalStr, setDryTotalStr] = useState('')
  const [trimStr, setTrimStr] = useState('')
  const [curingError, setCuringError] = useState('')

  const [stockModal, setStockModal] = useState<HarvestBatch | null>(null)
  const [premStr, setPremStr] = useState('')
  const [popStr, setPopStr] = useState('')
  const [bioStr, setBioStr] = useState('')
  const [vaultSelect, setVaultSelect] = useState('')
  const [vaultCustom, setVaultCustom] = useState('')
  const [stockError, setStockError] = useState('')

  const openCuring = (b: HarvestBatch) => {
    setCuringModal(b)
    setDryTotalStr(b.dryWeight != null ? String(b.dryWeight) : '')
    setTrimStr(b.trimWasteWeight != null ? String(b.trimWasteWeight) : '')
    setCuringError('')
  }

  const openStock = (b: HarvestBatch) => {
    setStockModal(b)
    setPremStr(b.stockGradePremiumG != null ? String(b.stockGradePremiumG) : '')
    setPopStr(b.stockGradePopcornG != null ? String(b.stockGradePopcornG) : '')
    setBioStr(b.stockGradeBiomassG != null ? String(b.stockGradeBiomassG) : '')
    setVaultSelect(rooms[0]?.id ?? '')
    setVaultCustom('')
    setStockError('')
  }

  const submitCuring = () => {
    if (!curingModal) return
    const totalDry = parseNumInput(dryTotalStr)
    const trim = parseNumInput(trimStr) ?? 0
    if (totalDry == null || totalDry < 0) {
      setCuringError(t('postHarvest.errDryInvalid'))
      return
    }
    if (trim < 0) {
      setCuringError(t('postHarvest.errTrimNeg'))
      return
    }
    if (curingModal.wetWeight != null && totalDry > curingModal.wetWeight) {
      setCuringError(t('postHarvest.errDryGtWet'))
      return
    }
    const ok = moveHarvestBatchToCuring(curingModal.id, {
      totalDryWeight: totalDry,
      trimWasteWeight: trim,
    })
    if (!ok) {
      setCuringError(t('postHarvest.errCureSubmit'))
      return
    }
    setCuringModal(null)
  }

  const submitStock = () => {
    if (!stockModal) return
    const p = parseNumInput(premStr) ?? 0
    const pc = parseNumInput(popStr) ?? 0
    const bio = parseNumInput(bioStr) ?? 0
    const vaultFromRoom = rooms.find((r) => r.id === vaultSelect)
    const vault = vaultCustom.trim() || vaultFromRoom?.label.trim() || ''
    if (!vault) {
      setStockError(t('postHarvest.errVault'))
      return
    }
    if (p + pc + bio <= 0) {
      setStockError(t('postHarvest.errSumZero'))
      return
    }
    const ok = moveHarvestBatchToStock(stockModal.id, {
      premiumG: p,
      popcornG: pc,
      biomassG: bio,
      vaultLocationLabel: vault,
    })
    if (!ok) {
      setStockError(
        stockModal.dryWeight != null
          ? t('postHarvest.errSumVsDry', { dry: stockModal.dryWeight })
          : t('postHarvest.errStockSubmit'),
      )
      return
    }
    setStockModal(null)
  }

  const inputCls =
    'mt-1 w-full rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm tabular-nums outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/25'

  const labelCls = 'text-xs font-medium text-amber-900/80'
  const g = t('postHarvest.grams')

  const openTrazabilidad = (id: string) => {
    window.dispatchEvent(new CustomEvent('traceability:open', { detail: { harvestBatchId: id } }))
  }

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50 via-amber-50/80 to-orange-50/40 px-5 py-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-800/70">
          {t('postHarvest.pageKicker')}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-tight text-amber-950">
          {t('postHarvest.pageTitle')}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-amber-900/75">{t('postHarvest.pageIntro')}</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <section
          className={cn(
            'flex min-h-[280px] flex-col rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm',
          )}
        >
          <div className="mb-3 flex items-center gap-2 border-b border-amber-200/60 pb-2">
            <Sun className="h-4 w-4 text-amber-700" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-amber-950">{t('postHarvest.colDrying')}</h3>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {drying.length === 0 ? (
              <p className="text-sm text-amber-800/60">{t('postHarvest.emptyDrying')}</p>
            ) : (
              drying.map((b) => (
                <article
                  key={b.id}
                  className="rounded-xl border border-amber-200/70 bg-white/90 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-amber-950">{b.strain}</p>
                    <button
                      type="button"
                      onClick={() => openTrazabilidad(b.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-900/15"
                      title="Ver trazabilidad"
                    >
                      <GitBranch className="h-3.5 w-3.5" aria-hidden />
                      Ver trazabilidad
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-amber-800/75">
                    {t('postHarvest.daysDrying')}:{' '}
                    <span className="font-medium tabular-nums text-amber-900">
                      {daysSinceCalendarDate(b.harvestDate)}
                    </span>
                  </p>
                  <p className="text-xs text-amber-800/75">
                    {t('postHarvest.cutDate')}: <span className="tabular-nums">{b.harvestDate}</span>
                  </p>
                  <p className="mt-1 text-xs text-amber-800/75">
                    {t('postHarvest.dryingRoom')}: {b.roomLabel}
                    {b.tableLabel ? ` · ${b.tableLabel}` : ''}
                  </p>
                  <label className={cn('mt-2 block', labelCls)}>{t('postHarvest.wetWeight')}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={b.wetWeight != null ? String(b.wetWeight) : ''}
                    onChange={(e) => {
                      const v = e.target.value.trim()
                      updateHarvest(b.id, {
                        wetWeight: v === '' ? null : Number(v.replace(',', '.')),
                      })
                    }}
                    className={inputCls}
                    placeholder="—"
                  />
                  <button
                    type="button"
                    onClick={() => openCuring(b)}
                    className="mt-3 w-full rounded-xl bg-amber-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    {t('postHarvest.passToCure')}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-[280px] flex-col rounded-2xl border border-amber-200/80 bg-amber-50/40 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-amber-200/60 pb-2">
            <Package className="h-4 w-4 text-amber-700" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-amber-950">{t('postHarvest.colCuring')}</h3>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {curing.length === 0 ? (
              <p className="text-sm text-amber-800/60">{t('postHarvest.emptyCuring')}</p>
            ) : (
              curing.map((b) => (
                <article
                  key={b.id}
                  className="rounded-xl border border-amber-200/70 bg-white/90 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-semibold text-amber-950">{b.strain}</p>
                    <button
                      type="button"
                      onClick={() => openTrazabilidad(b.id)}
                      className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-900/15"
                      title="Ver trazabilidad"
                    >
                      <GitBranch className="h-3.5 w-3.5" aria-hidden />
                      Ver trazabilidad
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-amber-800/75">
                    {t('cultivation.dryWeight')}:{' '}
                    <span className="font-medium tabular-nums">
                      {b.dryWeight != null ? `${b.dryWeight} ${g}` : '—'}
                    </span>
                  </p>
                  {b.trimWasteWeight != null && b.trimWasteWeight > 0 ? (
                    <p className="text-xs text-amber-800/75">
                      {t('postHarvest.trimLine')}:{' '}
                      <span className="tabular-nums">
                        {b.trimWasteWeight} {g}
                      </span>
                    </p>
                  ) : null}
                  <p className="mt-1 text-xs text-amber-800/75">
                    {t('postHarvest.daysCuring')}:{' '}
                    <span className="font-medium tabular-nums text-amber-900">
                      {b.curingStartedAt ? daysSinceIso(b.curingStartedAt) : '—'}
                    </span>
                  </p>
                  <button
                    type="button"
                    onClick={() => openStock(b)}
                    className="mt-3 w-full rounded-xl bg-amber-700 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
                  >
                    {t('postHarvest.registerStock')}
                  </button>
                </article>
              ))
            )}
          </div>
        </section>

        <section className="flex min-h-[280px] flex-col rounded-2xl border border-amber-200/80 bg-amber-50/30 p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b border-amber-200/60 pb-2">
            <Warehouse className="h-4 w-4 text-amber-700" strokeWidth={1.75} />
            <h3 className="text-sm font-semibold text-amber-950">{t('postHarvest.colStock')}</h3>
          </div>
          <div className="flex flex-1 flex-col gap-3">
            {stock.length === 0 ? (
              <p className="text-sm text-amber-800/60">{t('postHarvest.emptyStock')}</p>
            ) : (
              stock.map((b) => {
                const a = b.stockGradePremiumG ?? 0
                const c = b.stockGradePopcornG ?? 0
                const bm = b.stockGradeBiomassG ?? 0
                const sum = a + c + bm
                return (
                  <article
                    key={b.id}
                    className="rounded-xl border border-amber-200/70 bg-white/90 p-3 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-amber-950">{b.strain}</p>
                      <button
                        type="button"
                        onClick={() => openTrazabilidad(b.id)}
                        className="inline-flex items-center gap-1 rounded-full bg-amber-900/10 px-2.5 py-1 text-[11px] font-semibold text-amber-900 transition hover:bg-amber-900/15"
                        title="Ver trazabilidad"
                      >
                        <GitBranch className="h-3.5 w-3.5" aria-hidden />
                        Ver trazabilidad
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-amber-800/75">
                      {t('postHarvest.location')}:{' '}
                      <span className="font-medium">{b.vaultLocationLabel ?? '—'}</span>
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-amber-900">
                      <li className="flex justify-between gap-2">
                        <span className="text-amber-800/80">{t('postHarvest.gradePremiumShort')}</span>
                        <span className="tabular-nums font-medium">
                          {a} {g}
                        </span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-amber-800/80">{t('postHarvest.gradePopcornShort')}</span>
                        <span className="tabular-nums font-medium">
                          {c} {g}
                        </span>
                      </li>
                      <li className="flex justify-between gap-2">
                        <span className="text-amber-800/80">{t('postHarvest.gradeBiomassShort')}</span>
                        <span className="tabular-nums font-medium">
                          {bm} {g}
                        </span>
                      </li>
                    </ul>
                    <p className="mt-2 border-t border-amber-100 pt-2 text-sm font-semibold text-amber-950">
                      {t('postHarvest.totalClassified')}:{' '}
                      <span className="tabular-nums">
                        {sum} {g}
                      </span>
                    </p>
                  </article>
                )
              })
            )}
          </div>
        </section>
      </div>

      {curingModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setCuringModal(null)}
        >
          <div
            role="dialog"
            aria-labelledby="curing-modal-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="curing-modal-title" className="text-lg font-semibold text-amber-950">
              {t('postHarvest.modalCureTitle')}
            </h4>
            <p className="mt-1 text-sm text-amber-800/80">{curingModal.strain}</p>
            {curingModal.wetWeight != null ? (
              <p className="mt-2 text-xs text-amber-800/70">
                {t('postHarvest.wetRef')}:{' '}
                <span className="font-semibold tabular-nums">
                  {curingModal.wetWeight} {g}
                </span>
              </p>
            ) : null}
            <label className={cn('mt-4 block', labelCls)}>{t('postHarvest.dryTotal')}</label>
            <input
              className={inputCls}
              value={dryTotalStr}
              onChange={(e) => setDryTotalStr(e.target.value)}
              inputMode="decimal"
              placeholder={t('postHarvest.placeholderDry')}
            />
            <label className={cn('mt-3 block', labelCls)}>{t('postHarvest.trimMerma')}</label>
            <input
              className={inputCls}
              value={trimStr}
              onChange={(e) => setTrimStr(e.target.value)}
              inputMode="decimal"
              placeholder="0"
            />
            {curingError ? (
              <p className="mt-3 text-sm text-red-700">{curingError}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setCuringModal(null)}
                className="flex-1 rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-medium text-amber-900"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitCuring}
                className="flex-1 rounded-xl bg-amber-600 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {stockModal ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onClick={() => setStockModal(null)}
        >
          <div
            role="dialog"
            aria-labelledby="stock-modal-title"
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 id="stock-modal-title" className="text-lg font-semibold text-amber-950">
              {t('postHarvest.modalStockTitle')}
            </h4>
            <p className="mt-1 text-sm text-amber-800/80">{stockModal.strain}</p>
            {stockModal.dryWeight != null ? (
              <p className="mt-2 text-xs text-amber-800/70">
                {t('postHarvest.dryCap')}:{' '}
                <span className="font-semibold tabular-nums">
                  {stockModal.dryWeight} {g}
                </span>
              </p>
            ) : null}
            <label className={cn('mt-4 block', labelCls)}>{t('postHarvest.gradePremium')}</label>
            <input
              className={inputCls}
              value={premStr}
              onChange={(e) => setPremStr(e.target.value)}
              inputMode="decimal"
            />
            <label className={cn('mt-3 block', labelCls)}>{t('postHarvest.gradePopcorn')}</label>
            <input
              className={inputCls}
              value={popStr}
              onChange={(e) => setPopStr(e.target.value)}
              inputMode="decimal"
            />
            <label className={cn('mt-3 block', labelCls)}>{t('postHarvest.gradeBiomass')}</label>
            <input
              className={inputCls}
              value={bioStr}
              onChange={(e) => setBioStr(e.target.value)}
              inputMode="decimal"
            />
            <label className={cn('mt-4 block', labelCls)}>{t('postHarvest.vault')}</label>
            {rooms.length > 0 ? (
              <div className="mt-1">
                <SoftSelect
                  value={vaultSelect}
                  onChange={setVaultSelect}
                  options={rooms.map((r) => ({ value: r.id, label: r.label }))}
                  chipText={
                    rooms.find((r) => r.id === vaultSelect)?.label ?? rooms[0]?.label ?? ''
                  }
                  ariaLabel={t('postHarvest.vault')}
                  variant="field"
                  triggerClassName="w-full rounded-xl border border-amber-200/80 bg-white px-3 py-2 text-sm tabular-nums outline-none focus-visible:ring-amber-500/25"
                />
              </div>
            ) : null}
            <input
              className={cn(inputCls, rooms.length > 0 ? 'mt-2' : '')}
              value={vaultCustom}
              onChange={(e) => setVaultCustom(e.target.value)}
              placeholder={
                rooms.length > 0 ? t('postHarvest.vaultCustomPh') : t('postHarvest.vaultManualPh')
              }
            />
            {stockError ? (
              <p className="mt-3 text-sm text-red-700">{stockError}</p>
            ) : null}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setStockModal(null)}
                className="flex-1 rounded-xl border border-amber-300 bg-white py-2.5 text-sm font-medium text-amber-900"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitStock}
                className="flex-1 rounded-xl bg-amber-700 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-amber-800"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
