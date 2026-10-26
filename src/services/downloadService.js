// Tracks exported files for the header "Downloads" drawer. Exports expire after 24 hours.
import { downloadJson } from '../utils/format'

const KEY = 'esign_downloads'
const TTL = 24 * 3600 * 1000

export function listDownloads() {
  try {
    const list = JSON.parse(localStorage.getItem(KEY)) ?? []
    return list.filter((d) => Date.now() - new Date(d.createdAt).getTime() < TTL)
  } catch {
    return []
  }
}

export function exportJson(filename, data) {
  downloadJson(filename, data)
  const entry = { id: Math.random().toString(36).slice(2), filename, createdAt: new Date().toISOString(), data }
  try {
    localStorage.setItem(KEY, JSON.stringify([entry, ...listDownloads()].slice(0, 20)))
  } catch {
    // storage full: the file was still downloaded
  }
}
