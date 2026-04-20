import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from '../../i18n/useTranslation'
import { cn } from '../../lib/cn'
import type { ToolCategory } from '../../store/toolsTypes'
import { useToolsStore } from '../../store/useToolsStore'
import { SoftSelect } from '../ui/SoftSelect'

export function ToolsTab() {
  const { t } = useTranslation()
  const items = useToolsStore((s) => s.items)
  const addItem = useToolsStore((s) => s.addItem)
  const removeItem = useToolsStore((s) => s.removeItem)

  const [name, setName] = useState('')
  const [category, setCategory] = useState<ToolCategory>('substrate')
  const [q, setQ] = useState('')

  const catOptions = useMemo(
    () =>
      [
        { value: 'substrate' as const, label: t('tools.catSubstrate') },
        { value: 'fertilizer' as const, label: t('tools.catFertilizer') },
        { value: 'lighting' as const, label: t('tools.catLighting') },
        { value: 'pot' as const, label: t('tools.catPot') },
        { value: 'general' as const, label: t('tools.catGeneral') },
      ],
    [t],
  )

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase()
    const sorted = [...items].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!qq) return sorted
    return sorted.filter((i) => i.name.toLowerCase().includes(qq))
  }, [items, q])

  const chipCat =
    catOptions.find((o) => o.value === category)?.label ?? t('tools.catGeneral')

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-gray-900">{t('tools.title')}</h2>
        <p className="mt-1 text-sm text-gray-600">{t('tools.subtitle')}</p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-[#fdfdfd] p-5 shadow-sm">
        <p className="text-sm font-semibold text-gray-900">{t('tools.addTitle')}</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="block flex-1">
            <span className="text-xs font-medium text-gray-600">{t('tools.fieldName')}</span>
            <input
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('tools.namePlaceholder')}
            />
          </label>
          <div className="w-full sm:w-56">
            <span className="text-xs font-medium text-gray-600">{t('tools.fieldCategory')}</span>
            <div className="mt-1">
              <SoftSelect
                value={category}
                onChange={(v) => setCategory(v as ToolCategory)}
                options={catOptions}
                chipText={chipCat}
                ariaLabel={t('tools.fieldCategory')}
                variant="field"
              />
            </div>
          </div>
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800"
            onClick={() => {
              addItem({ name, category })
              setName('')
            }}
          >
            <Plus className="h-4 w-4" />
            {t('tools.addBtn')}
          </button>
        </div>
      </div>

      <div>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-gray-900">{t('tools.listTitle')}</p>
          <input
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm sm:max-w-xs"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('tools.searchPh')}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="rounded-xl bg-gray-50/70 py-10 text-center text-sm text-gray-500">
            {t('tools.empty')}
          </p>
        ) : (
          <ul className="overflow-hidden rounded-2xl bg-[#fdfdfd] shadow-sm">
            {filtered.map((row, i) => (
              <li
                key={row.id}
                className={cn(
                  'flex items-center justify-between gap-3 px-4 py-3 text-sm first:rounded-t-2xl last:rounded-b-2xl',
                  i % 2 === 1 && 'bg-gray-50/40',
                )}
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-gray-900">{row.name}</p>
                  <p className="text-xs text-gray-500">
                    {catOptions.find((c) => c.value === row.category)?.label ?? row.category}
                  </p>
                </div>
                <button
                  type="button"
                  className="shrink-0 rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  aria-label={t('common.delete')}
                  onClick={() => removeItem(row.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
