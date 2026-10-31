// Contract API calls. "expired" status is computed by the server.
import { api } from './api'

export const listContracts = () => api('/contracts')
export const getContract = (id) => api(`/contracts/${id}`)

// signers / reviewers: [{ name, email }] in the workflow's order. Emails the first invitation(s):
// reviewers first, signers once every reviewer has approved.
const people = (list = []) => list.map(({ name, email }) => ({ name, email }))
export const initiateContract = (workflow, signers, reviewers = []) =>
  api('/contracts', {
    method: 'POST',
    body: { workflowId: workflow.id, signers: people(signers), reviewers: people(reviewers) },
  })

// Emails the signer a fresh link (their previous link stops working) and returns { link, emailed, error }
export const resendInvite = (id, order) => api(`/contracts/${id}/signers/${order}/resend`, { method: 'POST' })

export const cancelContract = (id) => api(`/contracts/${id}/cancel`, { method: 'POST' })

// The signed PDF once completed, otherwise the original
export async function downloadContractDocument(id, kind) {
  const res = await api(`/contracts/${id}/document${kind ? `?kind=${kind}` : ''}`, { raw: true })
  return { blob: await res.blob(), fileName: fileNameFrom(res) }
}

// Live photo a signer took while signing, as an image blob
export async function getSignerPhoto(id, order) {
  const res = await api(`/contracts/${id}/signers/${order}/photo`, { raw: true })
  return res.blob()
}

export function fileNameFrom(res, fallback = 'contract.pdf') {
  const header = res.headers.get('content-disposition') || ''
  const m = /filename\*=UTF-8''([^;]+)/i.exec(header)
  return m ? decodeURIComponent(m[1]) : fallback
}

export function saveBlob(blob, fileName) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
