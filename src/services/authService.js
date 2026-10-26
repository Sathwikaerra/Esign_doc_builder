// Auth against the backend API, with an emailed one-time code as the second step.
// The session (token + user) is kept in localStorage once the code is verified.
import { SESSION_KEY, api, getStoredSession } from './api'

// Step 1: both return a challenge { challengeId, email (masked), expiresInSeconds, resendInSeconds }
export const startLogin = (email, password) => api('/auth/login', { method: 'POST', body: { email: email.trim(), password } })

export const startSignup = ({ name, organisationName, email, password }) =>
  api('/auth/signup', { method: 'POST', body: { name: name.trim(), organisationName: organisationName?.trim() || undefined, email: email.trim(), password } })

// Step 2: the code from the email -> { token, user }. Not stored yet, see saveSession.
export const verifyOtp = (challengeId, code) => api('/auth/verify-otp', { method: 'POST', body: { challengeId, code } })

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export const resendOtp = (challengeId) => api('/auth/resend-otp', { method: 'POST', body: { challengeId } })

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession() {
  return getStoredSession()
}
