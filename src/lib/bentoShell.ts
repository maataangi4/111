import { cn } from './cn'

/** Скругление панелей (кроме верхнего бара — он фиксируется отдельно). */
export const bentoPanelRadius = 'rounded-[2rem] sm:rounded-[2.25rem]'

/** То же для блоков в dark-слое. */
export const bentoPanelRadiusDark =
  'dark:rounded-[2rem] sm:dark:rounded-[2.25rem]'

/** Светлая тема: отдельные «окна» шелла (как в dark-слое на #333). Фон как у старого монолитного шелла. */
export const bentoChromeLightBody = cn(
  bentoPanelRadius,
  'border border-gray-200/75 bg-[#f1f1f1] shadow-[0_12px_40px_rgba(15,23,42,0.075)]',
)

export const bentoChromeLightHeader = cn(
  'rounded-[3rem] sm:rounded-[3.5rem]',
  'border border-gray-200/75 bg-[#f1f1f1] shadow-[0_12px_40px_rgba(15,23,42,0.055)]',
)

/** Cards inside white app shell: soft shadow only (no hairline borders). */
export const bentoShell = cn(
  bentoPanelRadius,
  'bg-[#fdfdfd] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:bg-[#222222] dark:shadow-black/40',
)
