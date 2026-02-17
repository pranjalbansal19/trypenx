import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QRCode from 'qrcode'
import { Lock, ArrowRight, RefreshCcw } from 'lucide-react'
import cybersentryLogo from '../../assets/cybersentry.png'
import { useAdminAuthStore } from '../../state/adminAuthStore'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const redirect = searchParams.get('redirect') || '/admin/portal/customers'

  const {
    login,
    verifyTwoFactor,
    challenge,
    loading,
    error,
    clearError,
  } = useAdminAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [qrUrl, setQrUrl] = useState('')

  const step = useMemo(() => {
    if (!challenge) return 'credentials'
    return challenge.type === '2fa_setup' ? 'setup' : 'verify'
  }, [challenge])

  const stepMeta = useMemo(() => {
    if (step === 'credentials') {
      return { current: 1, total: 2, label: 'Primary sign-in' }
    }
    return {
      current: 2,
      total: 2,
      label: step === 'setup' ? 'Set up 2FA' : 'Verify 2FA',
    }
  }, [step])

  useEffect(() => {
    if (challenge?.type === '2fa_setup') {
      QRCode.toDataURL(challenge.otpauthUrl).then(setQrUrl).catch(() => {
        setQrUrl('')
      })
    } else {
      setQrUrl('')
    }
  }, [challenge])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      const response = await login(email, password)
      if (response.status === 'authenticated') {
        navigate(redirect, { replace: true })
      }
    } catch {
      // handled in store
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    try {
      await verifyTwoFactor(code)
      navigate(redirect, { replace: true })
    } catch {
      // handled in store
    }
  }

  return (
    <div className="min-h-screen bg-[#0b1220] text-white">
      <div className="absolute inset-0 overflow-hidden">
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(79,70,229,0.45),rgba(15,23,42,0)_70%)] blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 right-[-160px] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle,rgba(14,165,233,0.3),rgba(15,23,42,0)_70%)] blur-3xl" />
      </div>

      <div className="relative flex min-h-screen flex-col items-center justify-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="rounded-3xl border border-white/40 bg-white/90 p-4 shadow-[0_20px_50px_-30px_rgba(56,189,248,0.7)]">
            <img
              src={cybersentryLogo}
              alt="Cybersentry"
              className="h-12 w-auto"
            />
          </div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-300">
            Admin Access
          </p>
        </div>

        <div className="w-full max-w-2xl rounded-[32px] border border-white/10 bg-white/10 p-10 shadow-[0_40px_100px_-60px_rgba(15,23,42,0.85)] backdrop-blur">
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-300">
                  Secure Access
                </p>
                <h1 className="text-3xl font-semibold">
                  Cybersentry Admin Control Center
                </h1>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-slate-300">
                Step {stepMeta.current} of {stepMeta.total}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-slate-950/30 p-4">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>{stepMeta.label}</span>
                <span>
                  {stepMeta.current}/{stepMeta.total}
                </span>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 transition-all"
                  style={{ width: `${(stepMeta.current / stepMeta.total) * 100}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-semibold">
                  {step === 'credentials'
                    ? 'Admin Sign In'
                    : step === 'setup'
                    ? 'Set up 2FA'
                    : 'Verify 2FA'}
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  {step === 'credentials'
                    ? 'Use your admin credentials to continue.'
                    : step === 'setup'
                    ? 'Pair your authenticator app to complete secure setup.'
                    : 'Enter the 6-digit code to finish verification.'}
                </p>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                <Lock className="h-5 w-5 text-cyan-300" />
              </div>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {error}
              </div>
            )}

            {step === 'credentials' && (
              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <label className="text-sm text-slate-300">Email</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="you@company.com"
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-4 text-base text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                    placeholder="••••••••"
                  />
                </div>
                <button
                  type="submit"
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-5 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Continue'}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </form>
            )}

            {step === 'verify' && (
              <form onSubmit={handleVerify} className="space-y-5">
                <p className="text-sm text-slate-300">
                  Enter the 6-digit code from your authenticator app to continue.
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-5 text-center text-3xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="••••••"
                  required
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-5 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5"
                  disabled={loading || code.length < 6}
                >
                  {loading ? 'Verifying...' : 'Verify & Enter'}
                </button>
              </form>
            )}

            {step === 'setup' && challenge?.type === '2fa_setup' && (
              <form onSubmit={handleVerify} className="space-y-5">
                <p className="text-sm text-slate-300">
                  Scan this QR code in your authenticator app, then enter the
                  verification code to activate 2FA.
                </p>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center">
                  {qrUrl ? (
                    <img src={qrUrl} alt="2FA QR code" className="mx-auto h-44 w-44" />
                  ) : (
                    <div className="text-sm text-slate-400">QR code loading...</div>
                  )}
                  <div className="mt-4 text-xs text-slate-400">
                    Secret key: {challenge.secret}
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-5 text-center text-3xl tracking-[0.35em] text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
                  placeholder="••••••"
                  required
                />
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 px-5 py-4 text-base font-semibold text-slate-900 shadow-lg shadow-cyan-500/30 transition hover:-translate-y-0.5"
                  disabled={loading || code.length < 6}
                >
                  {loading ? 'Activating...' : 'Activate 2FA'}
                </button>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-transparent px-5 py-4 text-sm font-semibold text-slate-200"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Start over
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
