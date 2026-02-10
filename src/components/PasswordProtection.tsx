import { useState, useEffect } from 'react'
import { ShieldCheck, Lock } from 'lucide-react'

interface PasswordProtectionProps {
  children: React.ReactNode
}

// Password can be set via environment variable or defaults to a secure password
const APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'CyberSentry2024!'

export function PasswordProtection({ children }: PasswordProtectionProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already authenticated (password stored in sessionStorage)
    const storedAuth = sessionStorage.getItem('app_password_auth')
    if (storedAuth === 'true') {
      setIsAuthenticated(true)
    }
    setLoading(false)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === APP_PASSWORD) {
      sessionStorage.setItem('app_password_auth', 'true')
      setIsAuthenticated(true)
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Show password prompt if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f4f6fb] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="glass rounded-xl p-8 space-y-6">
            {/* Logo and Title */}
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-brand/20 rounded-full">
                <ShieldCheck className="text-brand" size={32} />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-bold text-slate-900 mb-2">
                  Password Protected
                </h1>
                <p className="text-sm text-gray-600">
                  This application is password protected. Please enter the password to continue.
                </p>
              </div>
            </div>

            {/* Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={18}
                  />
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value)
                      setError('')
                    }}
                    placeholder="Enter password"
                    className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
                    autoFocus
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600">{error}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full btn btn-primary py-3"
                disabled={!password.trim()}
              >
                Access Application
              </button>
            </form>

            {/* Security Notice */}
            <div className="pt-4 border-t border-slate-200">
              <p className="text-xs text-gray-500 text-center">
                Unauthorized access is prohibited. This system is monitored.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Render protected content
  return <>{children}</>
}



