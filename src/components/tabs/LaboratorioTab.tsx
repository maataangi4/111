import { useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { LaboratorioDashboard } from '../laboratorio/LaboratorioDashboard'
import { LaboratorioOnboardingSlider } from '../laboratorio/LaboratorioOnboardingSlider'

export function LaboratorioTab() {
  const { t } = useTranslation()
  void t

  const [sessionDone, setSessionDone] = useState(false)

  return (
    <div className="flex min-h-0 h-full w-full flex-col bg-[#0a0a0a]">
      {/* NOTE: se muestra en cada refresh (no persistimos el estado). */}
      {!sessionDone ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <LaboratorioOnboardingSlider
            onComplete={() => {
              setSessionDone(true)
            }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <LaboratorioDashboard />
        </div>
      )}
    </div>
  )
}

