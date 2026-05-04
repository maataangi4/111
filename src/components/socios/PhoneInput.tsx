import { useEffect, useState } from 'react'
import { cn } from '../../lib/cn'

const COUNTRIES = [
  { code: '54',  flag: '🇦🇷', name: 'Argentina' },
  { code: '598', flag: '🇺🇾', name: 'Uruguay' },
  { code: '55',  flag: '🇧🇷', name: 'Brasil' },
  { code: '56',  flag: '🇨🇱', name: 'Chile' },
  { code: '591', flag: '🇧🇴', name: 'Bolivia' },
  { code: '595', flag: '🇵🇾', name: 'Paraguay' },
  { code: '51',  flag: '🇵🇪', name: 'Perú' },
  { code: '57',  flag: '🇨🇴', name: 'Colombia' },
  { code: '58',  flag: '🇻🇪', name: 'Venezuela' },
  { code: '52',  flag: '🇲🇽', name: 'México' },
  { code: '593', flag: '🇪🇨', name: 'Ecuador' },
  { code: '1',   flag: '🇺🇸', name: 'USA / Canadá' },
  { code: '34',  flag: '🇪🇸', name: 'España' },
  { code: '7',   flag: '🇷🇺', name: 'Rusia' },
  { code: '86',  flag: '🇨🇳', name: 'China' },
]

function parsePhone(value: string): { countryCode: string; local: string } {
  if (!value) return { countryCode: '54', local: '' }
  const digits = value.replace(/^\+/, '')
  for (const c of COUNTRIES.sort((a, b) => b.code.length - a.code.length)) {
    if (digits.startsWith(c.code)) {
      return { countryCode: c.code, local: digits.slice(c.code.length) }
    }
  }
  return { countryCode: '54', local: digits }
}

export function PhoneInput({
  value,
  onChange,
  inputClass,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  inputClass?: string
  autoFocus?: boolean
}) {
  const parsed = parsePhone(value)
  const [countryCode, setCountryCode] = useState(parsed.countryCode)
  const [local, setLocal] = useState(parsed.local)

  useEffect(() => {
    const p = parsePhone(value)
    setCountryCode(p.countryCode)
    setLocal(p.local)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleCountry(code: string) {
    setCountryCode(code)
    onChange(local ? `+${code}${local.replace(/\D/g, '')}` : '')
  }

  function handleLocal(raw: string) {
    const digits = raw.replace(/\D/g, '')
    setLocal(digits)
    onChange(digits ? `+${countryCode}${digits}` : '')
  }

  const country = COUNTRIES.find((c) => c.code === countryCode) ?? COUNTRIES[0]!

  return (
    <div className="flex gap-1.5">
      <select
        value={countryCode}
        onChange={(e) => handleCountry(e.target.value)}
        className={cn(
          'h-9 rounded-xl border px-2 text-sm',
          inputClass,
        )}
        style={{ minWidth: '5.5rem' }}
      >
        {COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.code}
          </option>
        ))}
      </select>
      <input
        type="tel"
        autoFocus={autoFocus}
        value={local}
        onChange={(e) => handleLocal(e.target.value)}
        placeholder={country.code === '54' ? 'Ej. 1155554444' : 'Número local'}
        className={cn('h-9 flex-1 rounded-xl border px-3 text-sm', inputClass)}
      />
    </div>
  )
}
