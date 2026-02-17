import { useEffect, useMemo, useState } from 'react'
import { ShieldPlus, Copy, RefreshCcw, UserPlus } from 'lucide-react'
import { useAdminAuthStore } from '../../state/adminAuthStore'
import type { AdminRole, AdminUser } from '../../services/adminAuthApi'
import { createAdminUser, deleteAdminUser, listAdminUsers } from '../../services/adminAuthApi'

const roleOptions: { value: AdminRole; label: string; description: string }[] = [
  {
    value: 'SuperAdmin',
    label: 'Super Admin',
    description: 'Full access, can manage admin users and permissions.',
  },
  {
    value: 'SD',
    label: 'SD',
    description: 'Security Director access to operations and reports.',
  },
  {
    value: 'ITMS',
    label: 'ITMS',
    description: 'IT Management access with operational controls.',
  },
]

function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#'
  const segments = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)])
  return segments.join('')
}

export function AdminUsersPage() {
  const { user } = useAdminAuthStore()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<AdminRole>('SD')
  const [password, setPassword] = useState(generateTempPassword())
  const [creating, setCreating] = useState(false)
  const [created, setCreated] = useState<AdminUser | null>(null)
  const [issuedPassword, setIssuedPassword] = useState<string | null>(null)

  const canManage = user?.role === 'SuperAdmin'

  useEffect(() => {
    if (!canManage) return
    setLoading(true)
    listAdminUsers()
      .then((response) => setUsers(response.users))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [canManage])

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setCreating(true)
    try {
      const response = await createAdminUser({
        email,
        name: name || undefined,
        password,
        role,
      })
      setUsers((prev) => [response.user, ...prev])
      setCreated(response.user)
      setIssuedPassword(password)
      setEmail('')
      setName('')
      setPassword(generateTempPassword())
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (target: AdminUser) => {
    if (target.id === user?.id) return
    if (!confirm(`Remove ${target.email}? This cannot be undone.`)) return
    setError('')
    try {
      await deleteAdminUser(target.id)
      setUsers((prev) => prev.filter((item) => item.id !== target.id))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  const summary = useMemo(() => {
    const active = users.filter((u) => u.isActive).length
    const totp = users.filter((u) => u.totpEnabled).length
    return { active, totp }
  }, [users])

  if (!canManage) {
    return (
      <div className="px-8 py-16">
        <div className="rounded-3xl border border-slate-200 bg-white/80 p-10 text-slate-600 shadow-sm">
          Only Super Admins can manage admin users.
        </div>
      </div>
    )
  }

  return (
    <div className="relative px-8 py-10 page-fade">
      <div className="pointer-events-none absolute right-6 top-10 h-32 w-32 rounded-full bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.35),rgba(59,130,246,0)_70%)] blur-3xl" />

      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">Access control</div>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">Admin Users</h1>
          <p className="mt-2 text-base text-slate-600">
            Invite teammates, assign roles, and track 2FA adoption in real-time.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            Active: <span className="font-semibold text-slate-900">{summary.active}</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            2FA enabled: <span className="font-semibold text-slate-900">{summary.totp}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Invite admin</div>
              <h2 className="text-xl font-semibold text-slate-900">Create User</h2>
            </div>
          </div>

          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Name</label>
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Role</label>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as AdminRole)}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
              >
                {roleOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">
                {roleOptions.find((option) => option.value === role)?.description}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Temporary password</label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-300"
                />
                <button
                  type="button"
                  onClick={() => setPassword(generateTempPassword())}
                  className="rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-600 hover:border-slate-300"
                >
                  <RefreshCcw className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Share this password securely. The user will be asked to set up 2FA on first login.
              </p>
            </div>

            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={creating}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-700 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/25"
            >
              <ShieldPlus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Invite Admin'}
            </button>

            {created && issuedPassword && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                <div className="font-semibold">User created</div>
                <div className="mt-1 flex items-center justify-between">
                  <span>{created.email}</span>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(issuedPassword)}
                    className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    <Copy className="h-3 w-3" />
                    Copy temp password
                  </button>
                </div>
                <div className="mt-2 text-[11px] text-emerald-700/80">
                  Temporary password: <span className="font-semibold">{issuedPassword}</span>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white/90 p-6 shadow-[0_20px_50px_-40px_rgba(15,23,42,0.35)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Directory</div>
              <h2 className="text-xl font-semibold text-slate-900">Active Admins</h2>
            </div>
            <div className="text-xs text-slate-500">
              {loading ? 'Loading...' : `${users.length} total`}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-6 text-sm text-slate-500">
                Loading admin users...
              </div>
            ) : (
              users.map((admin) => (
                <div
                  key={admin.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div>
                    <div className="text-sm font-semibold text-slate-900">
                      {admin.name || admin.email}
                    </div>
                    <div className="text-xs text-slate-500">{admin.email}</div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="rounded-full bg-slate-900 px-3 py-1 font-semibold text-white">
                      {admin.role}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        admin.totpEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      {admin.totpEnabled ? '2FA enabled' : '2FA pending'}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${
                        admin.isActive ? 'bg-slate-100 text-slate-600' : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {admin.isActive ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      type="button"
                      disabled={admin.id === user?.id}
                      onClick={() => handleDelete(admin)}
                      className={`rounded-full px-3 py-1 font-semibold ${
                        admin.id === user?.id
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                      }`}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
