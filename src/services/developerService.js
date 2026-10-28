// Developers page: API keys for /api/v1 and the organisation's webhook.
import { api } from './api'

export const listApiKeys = () => api('/developer/api-keys')
// Returns the key itself once, in `key`
export const createApiKey = (name) => api('/developer/api-keys', { method: 'POST', body: { name } })
export const revokeApiKey = (id) => api(`/developer/api-keys/${id}`, { method: 'DELETE' })

// null when no webhook is set up
export const getWebhook = () => api('/developer/webhook')
export const saveWebhook = (url, enabled) => api('/developer/webhook', { method: 'PUT', body: { url, enabled } })
export const deleteWebhook = () => api('/developer/webhook', { method: 'DELETE' })
export const rotateWebhookSecret = () => api('/developer/webhook/secret', { method: 'POST' })
// -> { ok, status, error } from the receiver
export const testWebhook = () => api('/developer/webhook/test', { method: 'POST' })
export const listWebhookDeliveries = () => api('/developer/webhook/deliveries')

// Base URL other systems call, e.g. https://esign.example.com/api/v1
export const publicApiBase = () => {
  const base = import.meta.env.VITE_API_URL || `${window.location.origin}/api`
  return `${base.replace(/\/$/, '')}/v1`
}
