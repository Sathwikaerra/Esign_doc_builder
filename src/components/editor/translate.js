import { Mark } from '@tiptap/pm/model'
import { api } from '../../services/api'

// Languages offered in Review > Translate (Google Translate codes)
export const TRANSLATE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi (हिन्दी)' },
  { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'ta', label: 'Tamil (தமிழ்)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml', label: 'Malayalam (മലയാളം)' },
  { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'ur', label: 'Urdu (اردو)' },
  { code: 'as', label: 'Assamese (অসমীয়া)' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
  { code: 'de', label: 'German' },
  { code: 'ar', label: 'Arabic' },
  { code: 'zh-CN', label: 'Chinese (Simplified)' },
  { code: 'ja', label: 'Japanese' },
]

const HAS_LETTERS = /\p{L}/u

/*
 * Collects the text to translate between `from` and `to`. Consecutive text with the same
 * formatting becomes one piece, so sentences translate with their context; differently
 * formatted runs (a bold word, a link) are translated separately so their formatting stays.
 * Merge fields and signature blocks are not text, so they are never touched.
 */
function collectPieces(doc, from, to) {
  const pieces = []
  doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isTextblock) return true
    let run = []
    const flush = () => {
      if (!run.length) return
      const sameMarks = run.every((r) => Mark.sameSet(r.marks, run[0].marks))
      const groups = sameMarks ? [run] : run.map((r) => [r])
      for (const g of groups) {
        const text = g.map((r) => r.text).join('')
        if (HAS_LETTERS.test(text)) pieces.push({ from: g[0].from, to: g.at(-1).to, text, marks: g[0].marks })
      }
      run = []
    }
    node.forEach((child, offset) => {
      const start = pos + 1 + offset
      const end = start + child.nodeSize
      if (!child.isText || end <= from || start >= to) return flush()
      const a = Math.max(start, from)
      const b = Math.min(end, to)
      run.push({ from: a, to: b, text: child.text.slice(a - start, b - start), marks: child.marks })
    })
    flush()
    return false
  })
  return pieces
}

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms))])

// Chrome's built-in translator uses plain language codes
const deviceCode = (code) => (code === 'zh-CN' ? 'zh' : code)

async function detectLanguage(sample) {
  try {
    if (!('LanguageDetector' in self)) return 'en'
    const detector = await withTimeout(self.LanguageDetector.create(), 15000)
    const [best] = await withTimeout(detector.detect(sample), 5000)
    detector.destroy?.()
    return best && best.confidence > 0.5 ? best.detectedLanguage : 'en'
  } catch {
    return 'en'
  }
}

/*
 * Chrome's on-device translator: free, private and not rate-limited. Returns null when the browser
 * doesn't have it or can't translate this language pair, so the caller falls back to the server.
 */
async function translateOnDevice(texts, target, onStatus) {
  if (!('Translator' in self)) return null
  const targetLanguage = deviceCode(target)
  try {
    // Quick probe first: some Chromium builds expose the API but never answer
    await withTimeout(self.Translator.availability({ sourceLanguage: 'en', targetLanguage }), 3000)
  } catch {
    return null
  }
  const sourceLanguage = await detectLanguage(texts.join(' ').slice(0, 2000))
  if (sourceLanguage === targetLanguage) return texts
  try {
    const status = await withTimeout(self.Translator.availability({ sourceLanguage, targetLanguage }), 3000)
    if (status === 'unavailable') return null
    if (status !== 'available') onStatus?.('Downloading the language pack (first time only)…')
    const translator = await withTimeout(
      self.Translator.create({
        sourceLanguage,
        targetLanguage,
        monitor: (m) => m.addEventListener('downloadprogress', (e) => onStatus?.(`Downloading the language pack… ${Math.round(e.loaded * 100)}%`)),
      }),
      180000,
    )
    onStatus?.('Translating…')
    const out = []
    for (const text of texts) out.push(await translator.translate(text))
    translator.destroy?.()
    return out
  } catch {
    return null
  }
}

// Google drops leading/trailing spaces; put them back so words don't run together
function keepSpacing(original, translated) {
  const lead = original.match(/^\s*/)[0]
  const trail = original.match(/\s*$/)[0]
  return lead + translated.trim() + trail
}

/*
 * Translates the selection, or the whole document when nothing is selected, in one undoable step.
 * Tries Chrome's on-device translator first, then the server (Google Translate).
 * Returns { pieces, scope, provider: 'device' | 'server' }.
 */
export async function translateDocument(editor, target, onStatus) {
  const { state } = editor
  const { from, to, empty } = state.selection
  const scope = empty ? 'document' : 'selection'
  const range = empty ? [0, state.doc.content.size] : [from, to]
  const pieces = collectPieces(state.doc, ...range)
  if (!pieces.length) return { pieces: 0, scope }

  const docBefore = state.doc
  const texts = pieces.map((p) => p.text)
  editor.setEditable(false)
  let translations
  let provider = 'device'
  try {
    translations = await translateOnDevice(texts, target, onStatus)
    if (!translations) {
      provider = 'server'
      onStatus?.('Translating…')
      ;({ translations } = await api('/translate', { method: 'POST', body: { texts, target } }))
    }
  } finally {
    editor.setEditable(true)
  }
  if (editor.state.doc !== docBefore) throw new Error('The document changed while translating. Please try again.')

  // Replace from the end backwards so earlier positions stay valid
  const tr = editor.state.tr
  const { schema } = editor.state
  pieces
    .map((p, i) => ({ ...p, text: keepSpacing(p.text, translations[i] ?? '') }))
    .filter((p) => p.text.trim())
    .sort((a, b) => b.from - a.from)
    .forEach((p) => tr.replaceWith(p.from, p.to, schema.text(p.text, p.marks)))
  editor.view.dispatch(tr)
  return { pieces: pieces.length, scope, provider }
}
