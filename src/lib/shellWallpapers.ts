/**
 * Обои за панелями интерфейса. Файлы лежат в `public/wallpapers/`
 * (скопированы с рабочего стола «New folder (11)»).
 */
export const SHELL_WALLPAPERS = [
  {
    id: 'and-machines',
    file: 'and-machines-YLplJ9m_RKE-unsplash.jpg',
  },
  {
    id: 'jakub-zerdzicki',
    file: 'jakub-zerdzicki-QGylj777rww-unsplash.jpg',
  },
  {
    id: 'milad-eRbgs',
    file: 'milad-fakurian-eRbgsJ0Ec0o-unsplash.jpg',
  },
  {
    id: 'milad-gJk9',
    file: 'milad-fakurian-gJk9y8zKCyo-unsplash.jpg',
  },
  {
    id: 'nikola-tomasic',
    file: 'nikola-tomasic-n8JJpvT2I-A-unsplash.jpg',
  },
] as const

export type ShellWallpaperId = (typeof SHELL_WALLPAPERS)[number]['id']

export function shellWallpaperSrc(id: ShellWallpaperId): string {
  const row = SHELL_WALLPAPERS.find((w) => w.id === id)
  return row ? `/wallpapers/${row.file}` : ''
}
