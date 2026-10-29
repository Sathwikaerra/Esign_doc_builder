// Templates from / to files on the user's computer.
//   Import: Word (.docx), HTML, plain text, or a template exported from this app (.json).
//   Export: .json with the document and the workflow settings, to re-import here or in another account.
// In imported documents {{Field name}} becomes a merge field and a paragraph that is only
// {{Signature: Party}} becomes a signature block for that party.
import { DEFAULT_PAGE_SETUP } from '../components/editor/pageSetup'
import { shortId } from './format'

export const IMPORT_ACCEPT = '.docx,.html,.htm,.txt,.md,.json'
const MAX_BYTES = 15 * 1024 * 1024
const FORMAT = 'esign-template'

const PLACEHOLDER = /\{\{\s*([^{}]{1,60}?)\s*\}\}/g
const HAS_PLACEHOLDER = new RegExp(PLACEHOLDER.source)
const SIGNATURE = /^\{\{\s*signature\s*:\s*([^{}]{1,40}?)\s*\}\}$/i

const baseName = (file) => file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
const escapeHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

const signer = (name) => ({ id: shortId(), kind: 'signer', name, methods: [], signatureType: 'individual' })

// Turns {{...}} placeholders into the editor's field and signature nodes; returns the parties found.
function convertPlaceholders(doc) {
  const parties = []
  for (const p of [...doc.body.querySelectorAll('p, h1, h2, h3, h4, h5, h6')]) {
    const m = p.textContent.trim().match(SIGNATURE)
    if (!m) continue
    const block = doc.createElement('div')
    block.setAttribute('data-signature', m[1])
    p.replaceWith(block)
    if (!parties.includes(m[1])) parties.push(m[1])
  }
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT)
  const texts = []
  while (walker.nextNode()) if (HAS_PLACEHOLDER.test(walker.currentNode.nodeValue)) texts.push(walker.currentNode)
  for (const node of texts) {
    const frag = doc.createDocumentFragment()
    let last = 0
    node.nodeValue.replace(PLACEHOLDER, (match, label, at) => {
      frag.append(node.nodeValue.slice(last, at))
      const field = doc.createElement('span')
      field.setAttribute('data-field', label)
      frag.append(field)
      last = at + match.length
    })
    frag.append(node.nodeValue.slice(last))
    node.replaceWith(frag)
  }
  return parties
}

function documentTemplate(html, name) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, link, meta, iframe, object, embed').forEach((el) => el.remove())
  const parties = convertPlaceholders(doc)
  const content = doc.body.innerHTML.trim()
  if (!doc.body.textContent.trim() && !doc.body.querySelector('img, table, [data-signature]')) throw new Error('The file has no content to import')
  return { name, content, parties }
}

async function fromDocx(file) {
  const mammoth = (await import('mammoth/mammoth.browser')).default
  const { value } = await mammoth.convertToHtml(
    { arrayBuffer: await file.arrayBuffer() },
    { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Subtitle'] => h2:fresh"] },
  )
  return documentTemplate(value, baseName(file))
}

async function fromText(file) {
  const paragraphs = (await file.text()).split(/\r?\n\s*\r?\n/).map((p) => p.trim()).filter(Boolean)
  return documentTemplate(paragraphs.map((p) => `<p>${escapeHtml(p).replace(/\r?\n/g, '<br>')}</p>`).join(''), baseName(file))
}

async function fromHtml(file) {
  const text = await file.text()
  const title = new DOMParser().parseFromString(text, 'text/html').title.trim()
  return documentTemplate(text, title || baseName(file))
}

async function fromJson(file) {
  let data
  try {
    data = JSON.parse(await file.text())
  } catch {
    throw new Error('This .json file is not a template exported from eSign')
  }
  const t = data?.format === FORMAT ? data.template : null
  if (!t || typeof t.content !== 'string') throw new Error('This .json file is not a template exported from eSign')
  return {
    name: String(t.name ?? baseName(file)),
    description: String(t.description ?? ''),
    signingMethod: t.signingMethod === 'parallel' ? 'parallel' : 'sequential',
    stampingMethod: t.stampingMethod ?? '',
    expiryValue: Number(t.expiryValue) > 0 ? Number(t.expiryValue) : 14,
    expiryUnit: t.expiryUnit ?? 'days',
    participants: (Array.isArray(t.participants) ? t.participants : [])
      .filter((p) => p && typeof p.name === 'string')
      .map((p) => ({ id: shortId(), kind: p.kind ?? 'signer', name: p.name, methods: Array.isArray(p.methods) ? p.methods : [], signatureType: p.signatureType ?? 'individual' })),
    content: t.content,
    pageSetup: t.pageSetup ?? DEFAULT_PAGE_SETUP,
  }
}

// Reads a file into the fields of a new template (merge over emptyTemplate()).
export async function readTemplateFile(file) {
  if (file.size > MAX_BYTES) throw new Error('The file is larger than 15 MB')
  const ext = file.name.split('.').pop().toLowerCase()
  if (ext === 'json') return fromJson(file)
  let doc
  if (ext === 'docx') doc = await fromDocx(file)
  else if (ext === 'html' || ext === 'htm') doc = await fromHtml(file)
  else if (ext === 'txt' || ext === 'md') doc = await fromText(file)
  else if (ext === 'doc') throw new Error('Old .doc files are not supported. Open it in Word and save as .docx')
  else if (ext === 'pdf') throw new Error('PDFs cannot be edited as templates. Upload the PDF when creating a workflow instead')
  else throw new Error('Choose a .docx, .html, .txt or exported .json file')
  return {
    name: doc.name,
    description: `Imported from ${file.name}`,
    content: doc.content,
    participants: (doc.parties.length ? doc.parties : ['Signer 1']).map(signer),
  }
}

export function exportTemplate(tpl) {
  const { id, createdAt, updatedAt, organisationId, createdBy, ...template } = tpl
  const blob = new Blob([JSON.stringify({ format: FORMAT, version: 1, exportedAt: new Date().toISOString(), template }, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${(tpl.name || 'template').replace(/[^\w.-]+/g, '_')}.template.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
