// Contract API calls. "expired" status is computed by the server.
import { api } from './api'

export const listContracts = () => api('/contracts')

// signers: [{ name, email }] in the workflow's signing order
export const initiateContract = (workflow, signers) =>
  api('/contracts', {
    method: 'POST',
    body: { workflowId: workflow.id, signers: signers.map(({ name, email }) => ({ name, email })) },
  })
