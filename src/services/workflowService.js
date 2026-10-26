// Workflow API calls. PDFs are uploaded with the workflow as multipart form data.
import { api } from './api'

export const listWorkflows = () => api('/workflows')

export async function getWorkflow(id) {
  try {
    return await api(`/workflows/${encodeURIComponent(id)}`)
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}

// Creates (no data.id) or updates a workflow. `file` is the PDF Blob/File (optional on update).
export async function saveWorkflow(data, { status, file } = {}) {
  // Server-owned fields are not sent back
  const { id, versions, createdAt, updatedAt, hasFile, type, status: _ignored, ...workflow } = data
  const form = new FormData()
  form.append('data', JSON.stringify(workflow))
  if (status) form.append('status', status)
  if (file) form.append('file', file, file.name || workflow.documentName || 'document.pdf')
  return id
    ? api(`/workflows/${encodeURIComponent(id)}`, { method: 'PUT', form })
    : api('/workflows', { method: 'POST', form })
}

export const setWorkflowStatus = (id, status) =>
  api(`/workflows/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: { status } })

export const deleteWorkflow = (id) => api(`/workflows/${encodeURIComponent(id)}`, { method: 'DELETE' })

export const importWorkflow = (json) => api('/workflows/import', { method: 'POST', body: json })

// The workflow's PDF as a Blob, or null when none was uploaded.
export async function getWorkflowFile(id) {
  try {
    const res = await api(`/workflows/${encodeURIComponent(id)}/file`, { raw: true })
    return await res.blob()
  } catch (err) {
    if (err.status === 404) return null
    throw err
  }
}
