// Template API calls. A template is a document (HTML from the Word-style editor +
// page setup) plus reusable workflow settings (signers, methods, signing order).
import { api } from './api'
import { emptyDraft } from '../constants/workflow'
import { STARTER_DOCS } from '../constants/docTemplates'
import { DEFAULT_PAGE_SETUP } from '../components/editor/pageSetup'
import { shortId } from '../utils/format'

const signer = (name, methods, extra = {}) => ({ id: shortId(), kind: 'signer', name, methods, signatureType: 'individual', ...extra })

export const listTemplates = () => api('/templates')

export async function getTemplate(id) {
  try {
    return await api(`/templates/${encodeURIComponent(id)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

export function saveTemplate(data) {
  const { id, createdAt, updatedAt, ...body } = data
  return id ? api(`/templates/${encodeURIComponent(id)}`, { method: 'PUT', body }) : api('/templates', { method: 'POST', body })
}

export const deleteTemplate = (id) => api(`/templates/${encodeURIComponent(id)}`, { method: 'DELETE' })

// A new template, optionally started from one of the starter documents.
export function emptyTemplate(starterId = 'blank') {
  const starter = STARTER_DOCS.find((d) => d.id === starterId) ?? STARTER_DOCS[0]
  return {
    name: starter.id === 'blank' ? '' : starter.name,
    description: starter.id === 'blank' ? '' : starter.description,
    signingMethod: 'sequential',
    stampingMethod: '',
    expiryValue: 14,
    expiryUnit: 'days',
    participants: starter.parties.map((p) => signer(p, [])),
    content: starter.html,
    pageSetup: DEFAULT_PAGE_SETUP,
  }
}

// Turns a template into a pre-filled workflow draft for the create wizard.
export function draftFromTemplate(tpl) {
  const draft = emptyDraft()
  return {
    ...draft,
    name: tpl.name,
    basic: {
      ...draft.basic,
      contractName: tpl.name,
      signingMethod: tpl.signingMethod,
      stampingMethod: tpl.stampingMethod ?? '',
      expiryValue: tpl.expiryValue ?? 14,
      expiryUnit: tpl.expiryUnit ?? 'days',
    },
    participants: tpl.participants.map((p) => ({
      id: shortId(),
      kind: p.kind,
      name: p.name,
      signatureType: p.signatureType ?? 'individual',
      exposure: 'sequential',
      methods: p.methods ?? [],
      preMethods: [],
      postMethods: [],
      autoSource: p.kind === 'auto' ? 'seal' : undefined,
    })),
  }
}
