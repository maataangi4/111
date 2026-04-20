import wordmarkSrc from '../../assets/green-luck-wordmark.svg'
import { cn } from '../../lib/cn'

/** Горизонтальный логотип (иконка + «Green Luck») из `asdasdafsd.svg` на рабочем столе. */
export function GreenLuckLogoMark({ className }: { className?: string }) {
  return (
    <img
      src={wordmarkSrc}
      alt=""
      draggable={false}
      className={cn(
        'block h-auto w-full max-w-full object-contain object-left select-none dark:brightness-0 dark:invert',
        className,
      )}
      aria-hidden
    />
  )
}
