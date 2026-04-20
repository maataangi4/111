/** Clases compartidas tema claro / oscuro (dark: карточки #181818, фон-канва #333, текст #f1f1f1). */
export const C = {
  page: 'min-h-svh bg-gray-50 text-gray-900 dark:bg-[#333333] dark:text-[#f1f1f1]',
  header:
    'border-gray-200/80 bg-white/85 backdrop-blur-xl dark:border-[#2e2e2e] dark:bg-[#181818]/95',
  sidebar:
    'border-gray-200/90 bg-white shadow-[var(--shadow-soft-lg)] dark:border-[#2e2e2e] dark:bg-[#181818]',
  sidebarOverlay: 'bg-gray-900/20 backdrop-blur-[2px] dark:bg-black/50',
  card: 'bg-[#fdfdfd] shadow-sm dark:bg-[#222222] dark:shadow-black/40',
  cardHover: 'hover:shadow-[var(--shadow-soft)] dark:hover:shadow-black/50',
  cardMuted: 'bg-[#fdfdfd]/65 dark:bg-[#222222]/80',
  dashed: 'border-dashed border-gray-200 dark:border-[#3d3d3d]',
  input:
    'border-gray-200/90 bg-white text-gray-900 transition outline-none placeholder:text-gray-400 focus:border-gray-300 focus:ring-2 focus:ring-gray-900/8 dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#f1f1f1] dark:placeholder:text-[#6b6b6b] dark:focus:border-[#4a4a4a] dark:focus:ring-white/10',
  label: 'text-gray-500 dark:text-[#9a9a9a]',
  heading: 'text-gray-900 dark:text-[#f1f1f1]',
  muted: 'text-gray-500 dark:text-[#a3a3a3]',
  subheading: 'text-gray-400 dark:text-[#8c8c8c]',
  btnPrimary:
    'bg-gray-900 text-white shadow-lg shadow-gray-900/18 hover:bg-gray-800 dark:bg-[#f1f1f1] dark:text-[#181818] dark:shadow-black/30 dark:hover:bg-[#e4e4e4]',
  btnSecondary:
    'border border-gray-200 text-gray-700 hover:bg-gray-50 dark:border-[#3d3d3d] dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]',
  btnMenu:
    'border-gray-200/90 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50 dark:border-[#3d3d3d] dark:bg-[#252525] dark:text-[#f1f1f1] dark:hover:bg-[#2a2a2a]',
  navActive:
    'bg-gray-900 text-white shadow-md shadow-gray-900/18 dark:bg-[#2e2e2e] dark:text-[#f1f1f1] dark:shadow-black/25',
  navInactive:
    'text-gray-600 hover:bg-stone-50 hover:text-gray-900 dark:text-[#a3a3a3] dark:hover:bg-[#252525] dark:hover:text-[#f1f1f1]',
  /** Subtle band on #fdfdfd card surfaces (dashboard / registro). */
  tableHead:
    'bg-[#f5f5f5] text-gray-400 dark:bg-[#2a2a2a] dark:text-[#8c8c8c]',
  /** Row tint on #fdfdfd (very soft, no hairlines) */
  tableRow: 'even:bg-[#f7f7f7] dark:even:bg-[#252525]',
  rowHover: 'hover:bg-gray-50/80 dark:hover:bg-[#2a2a2a]',
  modalBackdrop: 'bg-gray-900/25 backdrop-blur-[3px] dark:bg-black/70',
  modalCard:
    'bg-[#fdfdfd] shadow-[var(--shadow-soft-lg)] dark:bg-[#222222]',
  iconBox: 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-[#b8b8b8]',
  gradientBg:
    'bg-gradient-to-b from-gray-50 to-gray-100/90 dark:from-[#181818] dark:to-[#181818]',
  loginCard: 'border-[#fdfdfd]/60 bg-[#fdfdfd] dark:border-[#2e2e2e] dark:bg-[#222222]',
  loginTitle: 'text-gray-900 dark:text-[#f1f1f1]',
  pill: 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-[#b8b8b8]',
  segmentedBg: 'bg-gray-100/80 dark:bg-[#252525]',
  segmentedPill: 'bg-[#fdfdfd] shadow-sm dark:bg-[#181818] dark:text-[#f1f1f1]',
  kanbanCol: 'bg-[#fdfdfd]/90 shadow-sm dark:bg-[#222222]/95 dark:shadow-black/35',
  imagePlaceholder: 'from-gray-100 to-gray-50 dark:from-[#252525] dark:to-[#1e1e1e]',
  ringFocusMenu: 'focus:ring-gray-900/10 dark:focus:ring-white/15',
} as const
