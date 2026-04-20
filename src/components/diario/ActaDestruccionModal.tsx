import type { DiarioBajaPlantaData, CultivoLateBajaReasonCode, CultivoDestruccionMethodCode } from '../../store/cultivationTypes'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'

type TFn = (k: string, vars?: Record<string, string | number>) => string

const REASON_KEYS: Record<CultivoLateBajaReasonCode, string> = {
  plagas: 'diario.lateBaja.plagas',
  hongos: 'diario.lateBaja.hongos',
  hermafroditismo: 'diario.lateBaja.hermafroditismo',
  accidente: 'diario.lateBaja.accidente',
  crecimiento_debil: 'diario.lateBaja.crecimiento_debil',
}

const METHOD_KEYS: Record<CultivoDestruccionMethodCode, string> = {
  compost: 'diario.destruccion.compost',
  quimicos: 'diario.destruccion.quimicos',
  trituracion: 'diario.destruccion.trituracion',
  otro: 'diario.destruccion.otro',
}

export function ActaDestruccionModal({
  open,
  onClose,
  strain,
  data,
  braceletLines,
  atIso,
  author,
  t,
}: {
  open: boolean
  onClose: () => void
  strain: string
  data: DiarioBajaPlantaData
  /** Misma longitud y orden que `data.plantIds`. */
  braceletLines: string[]
  atIso: string
  author?: string
  t: TFn
}) {
  if (!open) return null

  const reasonLabel = t(REASON_KEYS[data.reasonCode] as 'diario.lateBaja.plagas')
  let methodLabel = t(METHOD_KEYS[data.destructionMethodCode] as 'diario.destruccion.compost')
  if (data.destructionMethodCode === 'otro' && data.destructionMethodNotes?.trim()) {
    methodLabel = `${methodLabel}: ${data.destructionMethodNotes.trim()}`
  }

  const print = () => window.print()

  return (
    <EnvModalFrame
      title={t('diario.actaTitle')}
      onClose={onClose}
      footer={
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" className="rounded-xl border border-gray-200 px-3 py-2 text-sm" onClick={onClose}>
            {t('common.close')}
          </button>
          <button
            type="button"
            className="rounded-full bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-md transition hover:bg-gray-800"
            onClick={print}
          >
            {t('diario.actaPrint')}
          </button>
        </div>
      }
    >
      <div
        id="acta-destruccion-print"
        className="mt-2 space-y-4 text-sm text-gray-800 print:text-black"
      >
        <p className="text-center text-xs font-bold uppercase tracking-widest text-gray-500 print:text-gray-800">
          {t('diario.actaSubtitle')}
        </p>
        <dl className="grid gap-2 border-y border-gray-100 py-3 print:border-gray-300">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t('diario.actaId')}</dt>
            <dd className="font-mono text-xs">{data.actaId}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t('diario.actaFecha')}</dt>
            <dd>{atIso.slice(0, 19).replace('T', ' ')}</dd>
          </div>
          {author ? (
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">{t('diario.actaOperador')}</dt>
              <dd>{author}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">{t('diario.actaVariedad')}</dt>
            <dd className="font-semibold">{strain}</dd>
          </div>
        </dl>

        <div>
          <p className="text-xs font-semibold uppercase text-gray-500">{t('diario.actaPlantas')}</p>
          <ul className="mt-2 list-inside list-decimal space-y-1">
            {data.plantIds.map((id, i) => (
              <li key={id} className="tabular-nums">
                <span className="font-medium">{braceletLines[i] ?? id}</span>
              </li>
            ))}
          </ul>
        </div>

        <dl className="space-y-2">
          <div>
            <dt className="text-xs font-semibold text-gray-500">{t('diario.bajaMotivo')}</dt>
            <dd className="mt-0.5">{reasonLabel}</dd>
          </div>
          {data.weightGrams != null ? (
            <div>
              <dt className="text-xs font-semibold text-gray-500">{t('diario.bajaPeso')}</dt>
              <dd className="mt-0.5">
                {t('diario.actaPesoValue', { g: String(data.weightGrams) })}
              </dd>
            </div>
          ) : null}
          <div>
            <dt className="text-xs font-semibold text-gray-500">{t('diario.bajaMetodo')}</dt>
            <dd className="mt-0.5">{methodLabel}</dd>
          </div>
          {data.notes?.trim() ? (
            <div>
              <dt className="text-xs font-semibold text-gray-500">{t('diario.notes')}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap">{data.notes.trim()}</dd>
            </div>
          ) : null}
        </dl>

        <p className="border-t border-gray-100 pt-3 text-[11px] leading-relaxed text-gray-500 print:border-gray-300 print:text-gray-700">
          {t('diario.actaLegalNote')}
        </p>
      </div>
    </EnvModalFrame>
  )
}
