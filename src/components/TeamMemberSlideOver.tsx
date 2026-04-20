import { AnimatePresence, motion } from 'framer-motion'
import { Send, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { cn } from '../lib/cn'

export type TeamMemberId = 'eddie' | 'elian'

type ZoneBadge = {
  label: string
  tone: 'emerald' | 'blue' | 'amber'
}

type ActivityItem = {
  title: string
  sub: string
}

export type TeamMemberProfile = {
  name: string
  initials: string
  role: string
  assignments: string
  zones: ZoneBadge[]
  activities: ActivityItem[]
}

const PROFILES: Record<TeamMemberId, TeamMemberProfile> = {
  eddie: {
    name: 'Eddie',
    initials: 'ED',
    role: 'Master Grower',
    assignments: 'Responsable de Sala B · Supervisión Lote M-3B',
    zones: [
      { label: 'Sala de Floración A', tone: 'emerald' },
      { label: 'Invernadero Sur', tone: 'blue' },
    ],
    activities: [
      { title: 'Registró riego (Lote M-3B)', sub: 'Hace 2 horas' },
      { title: 'Actualizó VPD en Sala A', sub: 'Hace 4 horas' },
      { title: 'Aprobó transición de 10 clones a vegetación', sub: 'Hace 6 horas' },
    ],
  },
  elian: {
    name: 'Elian',
    initials: 'EL',
    role: 'Pasante',
    assignments: 'Apoyo en Germinación · Inventario de esquejes',
    zones: [
      { label: 'Cuarto de Germinación', tone: 'amber' },
      { label: 'Sala Veg. 2', tone: 'emerald' },
    ],
    activities: [
      { title: 'Etiquetó nuevos clones (lote P-12)', sub: 'Hace 1 hora' },
      { title: 'Registró temperatura en germinación', sub: 'Hace 3 horas' },
      { title: 'Actualizó stock de sustrato', sub: 'Ayer · 17:45' },
    ],
  },
}

const badgeTone: Record<ZoneBadge['tone'], string> = {
  emerald:
    'text-emerald-700 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60',
  blue: 'text-blue-700 bg-blue-50 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60',
  amber:
    'text-amber-800 bg-amber-50 border-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60',
}

export type TeamMemberSlideOverProps = {
  memberId: TeamMemberId | null
  onClose: () => void
}

export function TeamMemberSlideOver({ memberId, onClose }: TeamMemberSlideOverProps) {
  const open = memberId !== null
  const profile = memberId ? PROFILES[memberId] : null
  const [now, setNow] = useState(() => new Date())
  const [quickNote, setQuickNote] = useState('')

  useEffect(() => {
    if (!open) return
    const id = window.setInterval(() => setNow(new Date()), 30_000)
    return () => window.clearInterval(id)
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuickNote('')
      return
    }
    setNow(new Date())
  }, [open, memberId])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  const localTime = now.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  })

  const sendQuickPing = () => {
    const t = quickNote.trim()
    if (!t || !profile) return
    setQuickNote('')
  }

  return (
    <AnimatePresence>
      {open && profile ? (
        <motion.div
          key="team-slide-root"
          className="fixed inset-0 z-[90] flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm transition-opacity dark:bg-black/35"
            aria-label="Cerrar panel"
            onClick={onClose}
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-slide-title"
            className={cn(
              'relative z-10 flex h-full w-full max-w-sm transform flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform',
              'dark:border-[#3d3d3d] dark:bg-[#1a1a1a]',
            )}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 32, stiffness: 360 }}
          >
            <div className="flex items-start justify-between border-b border-slate-100 p-6 dark:border-[#2e2e2e]">
              <div className="flex min-w-0 items-center gap-4">
                <div className="relative shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-medium text-slate-700 dark:bg-[#2e2e2e] dark:text-[#e5e5e5]">
                    {profile.initials}
                  </div>
                  <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-[#1a1a1a]" />
                </div>
                <div className="min-w-0">
                  <h2
                    id="team-slide-title"
                    className="text-lg font-semibold text-slate-900 dark:text-[#f1f1f1]"
                  >
                    {profile.name}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-[#a3a3a3]">{profile.role}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      En línea
                    </span>
                    <span className="text-xs text-slate-500 dark:text-[#8c8c8c]">
                      Hora local · {localTime}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:text-[#8c8c8c] dark:hover:bg-[#2a2a2a] dark:hover:text-[#f1f1f1]"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto p-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8c8c8c]">
                  Tareas asignadas
                </h3>
                <p className="text-sm text-slate-700 dark:text-[#d4d4d4]">{profile.assignments}</p>
              </div>

              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8c8c8c]">
                  Zonas asignadas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.zones.map((z) => (
                    <span
                      key={z.label}
                      className={cn(
                        'rounded-md border px-2.5 py-1 text-xs font-medium',
                        badgeTone[z.tone],
                      )}
                    >
                      {z.label}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#8c8c8c]">
                  Última actividad
                </h3>
                <div className="relative space-y-6 border-l-2 border-slate-100 pl-4 dark:border-[#2e2e2e]">
                  {profile.activities.map((a) => (
                    <div key={`${a.title}-${a.sub}`} className="relative">
                      <div
                        className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-slate-300 ring-4 ring-white dark:bg-[#525252] dark:ring-[#1a1a1a]"
                        aria-hidden
                      />
                      <p className="text-sm font-medium text-slate-900 dark:text-[#f1f1f1]">
                        {a.title}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500 dark:text-[#8c8c8c]">{a.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-[#2e2e2e] dark:bg-[#222222]">
              <div className="relative">
                <input
                  type="text"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      sendQuickPing()
                    }
                  }}
                  placeholder="Enviar mensaje rápido..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-4 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-slate-900 dark:border-[#3d3d3d] dark:bg-[#1a1a1a] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b] dark:focus:ring-[#f1f1f1]"
                />
                <button
                  type="button"
                  onClick={sendQuickPing}
                  className="absolute right-2 top-1.5 p-1 text-slate-400 transition-colors hover:text-slate-900 dark:text-[#8c8c8c] dark:hover:text-[#f1f1f1]"
                  aria-label="Enviar"
                >
                  <Send className="h-4 w-4" strokeWidth={2} />
                </button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
