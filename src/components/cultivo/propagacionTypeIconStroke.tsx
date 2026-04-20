/** Общая «обводка» для семечка и клона: одинаковая толщина на экране (nonScalingStroke). */
export const PROPAGACION_TYPE_ICON_STROKE = {
  stroke: 'currentColor',
  strokeWidth: 1,
  vectorEffect: 'nonScalingStroke' as const,
  strokeLinejoin: 'round' as const,
  strokeLinecap: 'round' as const,
  paintOrder: 'stroke fill' as const,
} as const

/** Единый размер и оттенок в строке пропагатора (как у Calendar в той же строке). */
export const PROPAGACION_TYPE_ICON_CLASS = 'h-4 w-4 shrink-0 text-gray-400'
