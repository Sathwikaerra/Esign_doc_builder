import { createContext, useContext, useState } from 'react'
import * as authService from '../services/authService'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => authService.getSession())

  // Called after the emailed code is verified (and the "Verified" confirmation has shown)
  const completeSignIn = (s) => {
    authService.saveSession(s)
    setSession(s)
  }

  const logout = () => {
    authService.logout()
    setSession(null)
  }

  const value = {
    user: session?.user ?? null,
    isAuthenticated: !!session,
    startLogin: authService.startLogin,
    startSignup: authService.startSignup,
    verifyOtp: authService.verifyOtp,
    completeSignIn,
    resendOtp: authService.resendOtp,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
