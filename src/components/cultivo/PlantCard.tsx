import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ArrowRight, MapPin, Scissors, Sprout } from 'lucide-react'
import type { PlantCardItem } from '../../store/cultivationTypes'
import { cn } from '../../lib/cn'

export type { PlantCardItem }

type PlantTheme = 'propagacion' | 'vegetacion' | 'floracion'

const badgeTone: Record<PlantTheme, string> = {
  propagacion: 'bg-teal-50 text-teal-700 border border-teal-100',
  vegetacion: 'bg-green-50 text-green-700 border border-green-100',
  floracion: 'bg-purple-50 text-purple-700 border border-purple-100',
}

const buttonTone: Record<PlantTheme, string> = {
  propagacion:
    'bg-gradient-to-r from-teal-500 to-teal-600 shadow-[0_4px_14px_rgba(20,184,166,0.3)] border-teal-400/30',
  vegetacion:
    'bg-gradient-to-r from-green-500 to-green-600 shadow-[0_4px_14px_rgba(34,197,94,0.3)] border-green-400/30',
  floracion:
    'bg-gradient-to-r from-purple-500 to-purple-600 shadow-[0_4px_14px_rgba(168,85,247,0.3)] border-purple-400/30',
}

/** Misma píldora que «Transplantar a vegetación» en la tarjeta de lote (germinación). */
const transplantToFlorPillClass = cn(
  'inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-white/60 px-4 py-2 text-sm font-semibold text-green-700 backdrop-blur-md',
  'transition-colors duration-200 hover:border-green-700 hover:bg-green-700 hover:text-white',
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 focus-visible:ring-offset-2',
)

export function PlantCard({
  item,
  columnIndex,
  actionLabel,
  theme,
  selected,
  hasAnySelection,
  onToggleSelected,
  onActionClick,
}: {
  item: PlantCardItem
  columnIndex: number
  actionLabel: string
  theme: PlantTheme
  selected: boolean
  hasAnySelection: boolean
  onToggleSelected: () => void
  onActionClick?: () => void
}) {
  const [imgFailed, setImgFailed] = useState(false)
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { stage: item.stage },
  })

  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
      className={cn(
        'group relative bg-[#fdfdfd]/90 backdrop-blur-xl border border-[#fdfdfd] rounded-3xl p-4 flex flex-col gap-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(21,128,60,0.08)] transition-all duration-300 cursor-grab',
        selected ? 'ring-2 ring-green-300' : '',
        isDragging ? 'opacity-85 rotate-[1deg] shadow-xl z-20' : '',
      )}
      {...attributes}
      {...listeners}
    >
      <label
        className={cn(
          'absolute left-2 top-2 z-10 transition-opacity',
          hasAnySelection || selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100',
        )}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
      >
        <input type="checkbox" className="h-4 w-4 accent-green-700" checked={selected} onChange={onToggleSelected} />
      </label>
      <div className="flex gap-4">
        <div className="w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-green-50 to-gray-50 border border-green-100/50 shadow-inner flex items-center justify-center shrink-0 overflow-hidden">
          {!item.imageUrl || imgFailed ? (
            <Sprout className="h-7 w-7 text-green-700/80" />
          ) : (
            <img
              src={item.imageUrl}
              alt={item.strain}
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
          )}
        </div>
        <div className="flex flex-col flex-1 relative">
          <p className="font-bold text-gray-900">{item.strain}</p>
          <p className="text-xs text-gray-500">{item.seedType}</p>
          <p className="text-xs text-gray-500">Fecha Sembrado: {item.date}</p>
          <span className={cn('absolute right-0 bottom-0 text-[10px] px-2 py-0.5 rounded-full', badgeTone[theme])}>
            {item.stageTag}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="inline-flex w-fit items-center gap-1 text-xs text-gray-400 font-medium">
          <MapPin className="h-3.5 w-3.5" />
          {item.location}
        </span>
      </div>

      {theme === 'vegetacion' ? (
        <div className="mt-2 flex w-full justify-end pl-8">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onActionClick?.()
            }}
            className={transplantToFlorPillClass}
          >
            <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} aria-hidden />
            Transplantar a Floración
          </button>
        </div>
      ) : columnIndex === 2 ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onActionClick?.()
          }}
          className={cn(
            'w-full text-white rounded-2xl py-2.5 mt-2 font-medium flex items-center justify-center gap-2 border hover:-translate-y-0.5 transition-all',
            buttonTone[theme],
          )}
        >
          {actionLabel.toLowerCase().includes('cosechar') ? (
            <Scissors className="h-4 w-4" />
          ) : (
            <Sprout className="h-4 w-4" />
          )}
          {actionLabel}
        </button>
      ) : null}
    </article>
  )
}

