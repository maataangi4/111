import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function EnvModalFrame({
  title,
  onClose,
  children,
  footer,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
      <div className="absolute inset-0" role="presentation" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-2">
          <p className="text-lg font-semibold text-gray-900">{title}</p>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
        {footer}
      </div>
    </div>
  )
}
