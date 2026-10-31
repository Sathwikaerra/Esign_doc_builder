// Public signing API: the token from the emailed link identifies the signer, no login needed.
import { api } from './api'
import { fileNameFrom } from './contractService'

const base = (token) => `/sign/${encodeURIComponent(token)}`

export const getSigning = (token) => api(base(token))

export async function getSigningDocument(token) {
  const res = await api(`${base(token)}/document`, { raw: true })
  return { blob: await res.blob(), fileName: fileNameFrom(res, 'document.pdf') }
}

// Identity check for a signing method: start returns what the method's window shows next
export const startVerification = (token, body) => api(`${base(token)}/verify/start`, { method: 'POST', body })
export const completeVerification = (token, body) => api(`${base(token)}/verify/complete`, { method: 'POST', body })

// signature: PNG data URL; type: 'draw' | 'type' | 'stamp'; method + challengeId from the check (acceptedName for Clickwrap)
export const signDocument = (token, { signature, type, method, challengeId, acceptedName }) =>
  api(`${base(token)}/sign`, { method: 'POST', body: { signature, type, consent: true, method, challengeId, acceptedName } })

// Reviewers only: approves the document (comment is optional); signers are invited once every reviewer approves
export const approveDocument = (token, comment) => api(`${base(token)}/approve`, { method: 'POST', body: { comment } })

// A reviewer's decline is a rejection
export const declineDocument = (token, reason) => api(`${base(token)}/decline`, { method: 'POST', body: { reason } })
