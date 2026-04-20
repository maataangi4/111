import { useEffect, useMemo, useState } from 'react'
import type {
  DiarioDiseaseCode,
  DiarioInspeccionData,
  DiarioPestCode,
  DiarioTrichomeStage,
  PropagacionLogEntry,
} from '../../store/cultivationTypes'
import { EnvModalFrame } from '../cultivo/envFieldModals/EnvModalFrame'
import { SoftSelect } from '../ui/SoftSelect'
import { ImageIcon } from 'lucide-react'

type TFn = (k: string, vars?: Record<string, string | number>) => string

const PESTS: DiarioPestCode[] = ['thrips', 'spider_mite', 'aphid', 'none']
const DISEASES: DiarioDiseaseCode[] = ['oidium', 'botrytis', 'def_n', 'none']

const TRICHOME_STAGES: DiarioTrichomeStage[] = ['clear', 'milky', 'amber']

const HEALTH_KEYS: Record<1 | 2 | 3 | 4 | 5, string> = {
  1: 'diario.health1',
  2: 'diario.health2',
  3: 'diario.health3',
  4: 'diario.health4',
  5: 'diario.health5',
}

function pestLabel(c: DiarioPestCode, t: TFn) {
  const keys: Record<DiarioPestCode, string> = {
    thrips: 'diario.pestThrips',
    spider_mite: 'diario.pestSpider',
    aphid: 'diario.pestAphid',
    none: 'diario.pestNone',
  }
  return t(keys[c])
}

function diseaseLabel(c: DiarioDiseaseCode, t: TFn) {
  const keys: Record<DiarioDiseaseCode, string> = {
    oidium: 'diario.disOidium',
    botrytis: 'diario.disBotrytis',
    def_n: 'diario.disDefN',
    none: 'diario.disNone',
  }
  return t(keys[c])
}

export function DiarioInspeccionModal({
  open,
  onClose,
  onCommit,
  batchIds,
  author,
  t,
  floracionMode,
}: {
  open: boolean
  onClose: () => void
  onCommit: (entry: Omit<PropagacionLogEntry, 'id'>) => void
  batchIds: string[]
  author?: string
  t: TFn
  floracionMode?: boolean
}) {
  const [health, setHealth] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [pests, setPests] = useState<DiarioPestCode[]>(['none'])
  const [diseases, setDiseases] = useState<DiarioDiseaseCode[]>(['none'])
  const [trichome, setTrichome] = useState<DiarioTrichomeStage | ''>('')
  const [photo, setPhoto] = useState<string | undefined>(undefined)
  const [notes, setNotes] = useState('')

  useEffect(() => {
    if (!open) return
    setHealth(3)
    setPests(['none'])
    setDiseases(['none'])
    setTrichome('')
    setPhoto(undefined)
    setNotes('')
  }, [open])

  const trichomeOptions = useMemo(
    () => [
      { value: '' as const, label: t('diario.trichomePick') },
      ...TRICHOME_STAGES.map((v) => ({
        value: v,
        label: t(`diario.trichome_${v}` as 'diario.trichome_clear'),
      })),
    ],
    [t],
  )
  const trichomeChip =
    trichomeOptions.find((o) => o.value === trichome)?.label ?? t('diario.trichomePick')

  const togglePest = (c: DiarioPestCode) => {
    if (c === 'none') {
      setPests(['none'])
      return
    }
    setPests((prev) => {
      const withoutNone = prev.filter((x) => x !== 'none')
      const has = withoutNone.includes(c)
      const next = has ? withoutNone.filter((x) => x !== c) : [...withoutNone, c]
      return next.length === 0 ? ['none'] : next
    })
  }

  const toggleDisease = (c: DiarioDiseaseCode) => {
    if (c === 'none') {
      setDiseases(['none'])
      return
    }
    setDiseases((prev) => {
      const withoutNone = prev.filter((x) => x !== 'none')
      const has = withoutNone.includes(c)
      const next = has ? withoutNone.filter((x) => x !== c) : [...withoutNone, c]
      return next.length === 0 ? ['none'] : next
    })
  }

  const onPhoto = (f: File | null) => {
    if (!f || !f.type.startsWith('image/')) {
      setPhoto(undefined)
      return
    }
    const r = new FileReader()
    r.onload = () => setPhoto(typeof r.result === 'string' ? r.result : undefined)
    r.readAsDataURL(f)
  }

  if (!open) return null

  const handleSave = () => {
    if (batchIds.length === 0) return
    const data: DiarioInspeccionData = {
      healthScore: health,
      pests,
      diseases,
      trichomeStage: trichome || undefined,
      photoDataUrl: photo,
      notes: notes.trim() || undefined,
    }
    onCommit({
      kind: 'diario_inspeccion',
      at: new Date().toISOString(),
      author: author?.trim() || undefined,
      diarioInspeccion: data,
    })
    onClose()
  }

  return (
    <EnvModalFrame
      title={t('diario.modalInspeccionTitle')}
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
            disabled={batchIds.length === 0}
          >
            {t('common.save')}
          </button>
        </div>
      }
    >
      <div className="mt-4 max-h-[min(70vh,520px)] space-y-4 overflow-y-auto pr-1">
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">{t('diario.healthLabel')}</p>
          <div className="flex flex-wrap gap-1">
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setHealth(n)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${
                  health === n ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {n} — {t(HEALTH_KEYS[n])}
              </button>
            ))}
          </div>
        </div>
        {floracionMode ? (
          <div className="rounded-xl border border-purple-100 bg-purple-50/50 px-3 py-2.5">
            <p className="text-xs font-semibold text-purple-900">{t('diario.trichomeSectionTitle')}</p>
            <p className="mt-1 text-[11px] text-purple-900/80">{t('diario.trichomeSectionHint')}</p>
            <div className="mt-2">
              <SoftSelect
                value={trichome}
                onChange={(v) => setTrichome((v || '') as DiarioTrichomeStage | '')}
                options={trichomeOptions}
                chipText={trichomeChip}
                ariaLabel={t('diario.trichomeSectionTitle')}
                variant="field"
              />
            </div>
          </div>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">{t('diario.pestsLabel')}</p>
          {floracionMode ? (
            <p className="mb-2 text-[11px] text-gray-500">{t('diario.inspeccionPestsHintFlor')}</p>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {PESTS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => togglePest(c)}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  pests.includes(c) ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}
              >
                {pestLabel(c, t)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-gray-600">{t('diario.diseasesLabel')}</p>
          {floracionMode ? (
            <p className="mb-2 text-[11px] font-medium text-red-800/90">{t('diario.inspeccionDiseasesHintFlor')}</p>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {DISEASES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => toggleDisease(c)}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  diseases.includes(c) ? 'border-green-600 bg-green-50' : 'border-gray-200'
                }`}
              >
                {diseaseLabel(c, t)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs font-medium text-gray-600">{t('diario.evidencePhoto')}</p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 hover:bg-gray-100">
            <ImageIcon className="h-8 w-8 text-gray-400" />
            <span className="mt-2 text-xs text-gray-600">{t('diario.pickPhoto')}</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => onPhoto(e.target.files?.[0] ?? null)}
            />
          </label>
          {photo ? (
            <img src={photo} alt="" className="mt-2 max-h-32 rounded-lg border object-contain" />
          ) : null}
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600">{t('diario.notes')}</label>
          <textarea
            className="min-h-[80px] w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
    </EnvModalFrame>
  )
}
