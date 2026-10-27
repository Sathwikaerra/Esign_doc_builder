// Public signing API: the token from the emailed link identifies the signer, no login needed.
import { api } from './api'
import { fileNameFrom } from './contractService'

const base = (token) => `/sign/${encodeURIComponent(token)}`

export const getSigning = (token) => api(base(token))

export async function getSigningDocument(token) {
  const res = await api(`${base(token)}/document`, { raw: true })
  return { blob: await res.blob(), fileName: fileNameFrom(res, 'document.pdf') }
}

// signature: PNG data URL; type: 'draw' | 'type'
export const signDocument = (token, { signature, type }) =>
  api(`${base(token)}/sign`, { method: 'POST', body: { signature, type, consent: true } })

// Reviewers only: approves the document (comment is optional); signers are invited once every reviewer approves
export const approveDocument = (token, comment) => api(`${base(token)}/approve`, { method: 'POST', body: { comment } })

// A reviewer's decline is a rejection
export const declineDocument = (token, reason) => api(`${base(token)}/decline`, { method: 'POST', body: { reason } })
