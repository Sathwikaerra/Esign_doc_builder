// Small fetch wrapper for the backend API (see /backend).
// In development Vite forwards /api to http://localhost:4000 (vite.config.js).
// For a deployed API set VITE_API_URL, e.g. https://api.example.com/api
const BASE = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '')
export const SESSION_KEY = 'esign_session'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function getStoredSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY))
  } catch {
    return null
  }
}

/*
 * api('/workflows')                         GET, returns parsed JSON
 * api('/templates', { method: 'POST', body })  JSON body
 * api('/workflows', { method: 'POST', form })  FormData body (file uploads)
 * api('/workflows/1/file', { raw: true })      returns the Response (e.g. for blobs)
 */
export async function api(path, { method = 'GET', body, form, raw = false } = {}) {
  const headers = {}
  const token = getStoredSession()?.token
  if (token) headers.Authorization = `Bearer ${token}`
  let payload
  if (form) payload = form
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let res
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: payload })
  } catch {
    throw new ApiError('Cannot reach the server. Make sure the backend is running.', 0)
  }

  // Expired or invalid token: drop the session and send the user to the login page
  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem(SESSION_KEY)
    window.location.assign('/login')
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      message = (await res.json()).error || message
    } catch {
      // response had no JSON body
    }
    throw new ApiError(message, res.status)
  }

  if (raw) return res
  if (res.status === 204) return null
  return res.json()
}
