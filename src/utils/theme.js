// Colour themes. The palette for each lives in index.css under [data-theme='<id>'].
export const THEMES = [
  { id: 'aurora', label: 'Aurora', swatch: ['#7c3aed', '#ec4899'] },
  { id: 'ocean', label: 'Ocean', swatch: ['#2563eb', '#06b6d4'] },
  { id: 'sunset', label: 'Sunset', swatch: ['#f97316', '#e11d48'] },
  { id: 'forest', label: 'Forest', swatch: ['#059669', '#84cc16'] },
  { id: 'midnight', label: 'Midnight', swatch: ['#6366f1', '#22d3ee'], dark: true },
]

const KEY = 'esign_theme'

export function getTheme() {
  try {
    const saved = localStorage.getItem(KEY)
    if (THEMES.some((t) => t.id === saved)) return saved
  } catch {
    // storage unavailable: fall back to default
  }
  return THEMES[0].id
}

export function applyTheme(id) {
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem(KEY, id)
  } catch {
    // theme still applies for this visit
  }
}
