export function formatDateTime(value) {
  if (!value) return '—'
  const d = new Date(value)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  return `${date} ${time}`
}

export const randomHexId = (len = 24) =>
  Array.from(crypto.getRandomValues(new Uint8Array(len / 2)), (b) => b.toString(16).padStart(2, '0')).join('')

export const shortId = () => Math.random().toString(36).slice(2, 10)

export function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Parses "1, 3-5, 8" into [1, 3, 4, 5, 8], keeping only pages within 1..max.
export function parsePageList(text, max) {
  const pages = new Set()
  for (const part of text.split(',')) {
    const [a, b] = part.split('-').map((s) => parseInt(s.trim(), 10))
    if (Number.isNaN(a)) continue
    const end = Number.isNaN(b) ? a : b
    for (let p = Math.min(a, end); p <= Math.max(a, end); p++) if (p >= 1 && p <= max) pages.add(p)
  }
  return [...pages].sort((x, y) => x - y)
}
