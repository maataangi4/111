import { ChevronDown, Plus } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { DiarioPropagacionChecklistCode } from '../../store/cultivationTypes'
import { cn } from '../../lib/cn'

export type DiarioQuickAction =
  | 'riego'
  | 'nutricion'
  | 'inspeccion'
  | 'clima'
  | 'mantenimiento'
  | 'altura'

type TFn = (k: string, vars?: Record<string, string | number>) => string

const MENU_Z = 10040

export function DiarioActionMenu({
  t,
  disabled,
  onPick,
  className,
  propagacionChecklists,
  menuVariant = 'default',
  lateStageCompliance,
}: {
  t: TFn
  disabled?: boolean
  onPick: (action: DiarioQuickAction) => void
  className?: string
  /** Solo etapa germinación: esquejes y semillas (Propagador). */
  propagacionChecklists?: {
    onPick: (code: DiarioPropagacionChecklistCode) => void
    onDescarte?: () => void
  } | null
  /** Vegetación: prioridad en mantenimiento y altura. */
  /** Floración: sin altura; sin checklist de propagador (no cortar esquejes). */
  menuVariant?: 'default' | 'vegetacion' | 'floracion'
  lateStageCompliance?: {
    onRegistrarBaja: () => void
    onCuarentena: () => void
    onReubicar?: () => void
  } | null
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [open])

  const pick = useCallback(
    (a: DiarioQuickAction) => {
      setOpen(false)
      onPick(a)
    },
    [onPick],
  )

  const pickProp = useCallback(
    (code: DiarioPropagacionChecklistCode) => {
      setOpen(false)
      propagacionChecklists?.onPick(code)
    },
    [propagacionChecklists],
  )

  const propItems: { id: DiarioPropagacionChecklistCode; label: string }[] = [
    { id: 'aclimatacion', label: t('diario.actionPropAclimatacion') },
    { id: 'pulverizacion_foliar', label: t('diario.actionPropPulverizacion') },
    { id: 'chequeo_raices', label: t('diario.actionPropRaices') },
  ]

  const itemsDefault: { id: DiarioQuickAction; label: string }[] = [
    { id: 'riego', label: t('diario.actionRiego') },
    { id: 'nutricion', label: t('diario.actionNutricion') },
    { id: 'inspeccion', label: t('diario.actionInspeccion') },
    { id: 'mantenimiento', label: t('diario.actionMantenimiento') },
    { id: 'clima', label: t('diario.actionClima') },
  ]

  const itemsVegetacion: { id: DiarioQuickAction; label: string }[] = [
    { id: 'mantenimiento', label: t('diario.actionMantenimiento') },
    { id: 'altura', label: t('diario.actionAltura') },
    { id: 'riego', label: t('diario.actionRiego') },
    { id: 'nutricion', label: t('diario.actionNutricion') },
    { id: 'inspeccion', label: t('diario.actionInspeccion') },
    { id: 'clima', label: t('diario.actionClima') },
  ]

  const itemsFloracion: { id: DiarioQuickAction; label: string }[] = [
    { id: 'mantenimiento', label: t('diario.actionMantenimiento') },
    { id: 'riego', label: t('diario.actionRiego') },
    { id: 'nutricion', label: t('diario.actionNutricion') },
    { id: 'inspeccion', label: t('diario.actionInspeccion') },
    { id: 'clima', label: t('diario.actionClima') },
  ]

  const items =
    menuVariant === 'vegetacion' ? itemsVegetacion : menuVariant === 'floracion' ? itemsFloracion : itemsDefault

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-green-700 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-green-800 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        {t('diario.addToJournal')}
        <ChevronDown className={cn('h-4 w-4 opacity-80 transition', open && 'rotate-180')} />
      </button>
      {open ? (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[min(70vh,520px)] overflow-y-auto rounded-2xl border border-gray-200 bg-white py-1 shadow-xl dark:border-[#3d3d3d] dark:bg-[#252525] dark:shadow-black/40"
          style={{ zIndex: MENU_Z }}
        >
          {propagacionChecklists ? (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8c8c8c]">
                {t('diario.propCheckSection')}
              </p>
              {propItems.map((it) => (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => pickProp(it.id)}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-emerald-50/80 dark:text-[#e8e8e8] dark:hover:bg-emerald-950/40"
                >
                  {it.label}
                </button>
              ))}
              {propagacionChecklists.onDescarte ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    propagacionChecklists.onDescarte?.()
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-800 hover:bg-red-50/90 dark:text-red-200 dark:hover:bg-red-950/40"
                >
                  {t('diario.actionDescarte')}
                </button>
              ) : null}
              <div className="my-1 border-t border-gray-100 dark:border-[#3d3d3d]" />
            </>
          ) : null}
          {lateStageCompliance ? (
            <>
              <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-[#8c8c8c]">
                {t('diario.lateComplianceSection')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  lateStageCompliance.onRegistrarBaja()
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-900 hover:bg-red-50/90 dark:text-red-200 dark:hover:bg-red-950/40"
              >
                {t('diario.actionRegistrarBaja')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  lateStageCompliance.onCuarentena()
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-amber-900 hover:bg-amber-50/90 dark:text-amber-200 dark:hover:bg-amber-950/40"
              >
                {t('diario.actionCuarentena')}
              </button>
              {lateStageCompliance.onReubicar ? (
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    lateStageCompliance.onReubicar?.()
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-sky-900 hover:bg-sky-50/90 dark:text-sky-200 dark:hover:bg-sky-950/40"
                >
                  {t('diario.actionReubicar')}
                </button>
              ) : null}
              <div className="my-1 border-t border-gray-100 dark:border-[#3d3d3d]" />
            </>
          ) : null}
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => pick(it.id)}
              className="w-full px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50 dark:text-[#e8e8e8] dark:hover:bg-[#2e2e2e]"
            >
              {it.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
