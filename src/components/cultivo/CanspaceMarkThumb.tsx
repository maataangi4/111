import markGreenSrc from '../../assets/gfjhdg.svg'
import markWhiteSrc from '../../assets/plant-placeholder-white.svg'
import { cn } from '../../lib/cn'

const imgCls = 'object-contain object-center select-none'

/** Маркер Canspace без текста — для миниатюр сорта, если нет фото. */
export function CanspaceMarkThumb({
  className,
  /** Заглушка в карточке: светлая тема — зелёный маркер, тёмная — белый лист с рабочего стола. */
  emptyThumb = false,
}: {
  className?: string
  emptyThumb?: boolean
}) {
  if (emptyThumb) {
    return (
      <>
        <img
          src={markGreenSrc}
          alt=""
          draggable={false}
          className={cn(imgCls, 'dark:hidden', className)}
          aria-hidden
        />
        <img
          src={markWhiteSrc}
          alt=""
          draggable={false}
          className={cn(imgCls, 'hidden dark:block opacity-70', className)}
          aria-hidden
        />
      </>
    )
  }

  return (
    <img
      src={markGreenSrc}
      alt=""
      draggable={false}
      className={cn(imgCls, className)}
      aria-hidden
    />
  )
}
