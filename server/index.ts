import 'dotenv/config'
import cors from 'cors'
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express'
import fs from 'fs'
import multer, { MulterError } from 'multer'
import { authenticator } from 'otplib'
import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'
import {
  ContractType,
  CustomerStatus,
  Frequency,
  AdminRole,
  AdminSessionStatus,
  Prisma,
  PrismaClient,
  ReportStatus,
  ScopeType,
  TestRunStatus,
  TestType,
} from '@prisma/client'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
const prisma = new PrismaClient()

const port = Number(process.env.PORT || 4000)
const apiBaseUrl = (process.env.PUBLIC_API_BASE_URL || '').replace(/\/$/, '')
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim())
  : true
const adminIpAllowlist = (process.env.ADMIN_IP_ALLOWLIST || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean)
const allowlistEnabled = adminIpAllowlist.length > 0
const allowlistDebug = (process.env.ALLOWLIST_DEBUG || '') === '1'
const sessionTtlHours = Number(process.env.ADMIN_SESSION_TTL_HOURS || 1)
const maxLoginAttempts = Number(process.env.ADMIN_MAX_LOGIN_ATTEMPTS || 5)
const lockMinutes = Number(process.env.ADMIN_LOCK_MINUTES || 15)
const maxIpAttempts = Number(process.env.ADMIN_MAX_IP_ATTEMPTS || 20)
const ipWindowMinutes = Number(process.env.ADMIN_IP_WINDOW_MINUTES || 10)

authenticator.options = { window: 1 }

type AdminUserSafe = {
  id: string
  email: string
  name: string | null
  role: AdminRole
  totpEnabled: boolean
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

type AuthedRequest = Request & {
  adminUser?: AdminUserSafe
  adminSessionId?: string
  adminSessionExpiresAt?: Date
}

const ipAttemptTracker = new Map<
  string,
  { count: number; resetAt: number }
>()

app.set('trust proxy', true)
app.use(
  cors({
    origin: corsOrigins,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)
app.use(express.json({ limit: '2mb' }))

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '../dist')
const adminUiEnabled = fs.existsSync(path.join(distDir, 'index.html'))

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set([
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ])
    if (!allowed.has(file.mimetype)) {
      cb(new Error('Unsupported file type. Please upload a PDF or DOC/DOCX.'))
      return
    }
    cb(null, true)
  },
})

function toIso(date: Date | null): string | null {
  return date ? date.toISOString() : null
}

function parseDateOnly(value?: string | null): Date | null {
  if (!value) return null
  return new Date(`${value}T00:00:00.000Z`)
}

function serializeAdminUser(user: {
  id: string
  email: string
  name: string | null
  role: AdminRole
  totpEnabled: boolean
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
}): AdminUserSafe {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? null,
    role: user.role,
    totpEnabled: user.totpEnabled,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
    createdAt: user.createdAt.toISOString(),
  }
}

function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function nowPlusHours(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000)
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice('Bearer '.length).trim() || null
}

function recordIpAttempt(ip: string): { limited: boolean; remaining: number } {
  const now = Date.now()
  const windowMs = ipWindowMinutes * 60 * 1000
  const entry = ipAttemptTracker.get(ip)
  if (!entry || entry.resetAt < now) {
    ipAttemptTracker.set(ip, { count: 1, resetAt: now + windowMs })
    return { limited: false, remaining: maxIpAttempts - 1 }
  }
  entry.count += 1
  if (entry.count > maxIpAttempts) {
    return { limited: true, remaining: 0 }
  }
  return { limited: false, remaining: maxIpAttempts - entry.count }
}

async function logAdminAudit(params: {
  userId?: string | null
  email?: string | null
  action: string
  success: boolean
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: Prisma.InputJsonValue
}) {
  await prisma.adminAuditLog.create({
    data: {
      userId: params.userId ?? null,
      email: params.email ?? null,
      action: params.action,
      success: params.success,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      metadata: params.metadata ?? undefined,
    },
  })
}

async function createAdminSession(params: {
  userId: string
  status: AdminSessionStatus
  ipAddress?: string | null
  userAgent?: string | null
}) {
  const token = randomBytes(32).toString('hex')
  const tokenHash = hashSessionToken(token)
  const session = await prisma.adminSession.create({
    data: {
      userId: params.userId,
      tokenHash,
      status: params.status,
      ipAddress: params.ipAddress ?? null,
      userAgent: params.userAgent ?? null,
      expiresAt: nowPlusHours(sessionTtlHours),
    },
  })
  return { token, session }
}

function normalizeAddOnsInput(
  value: unknown
): Prisma.InputJsonValue | Prisma.NullTypes.DbNull | undefined {
  if (value === undefined) return undefined
  if (value === null) return Prisma.DbNull
  if (!Array.isArray(value)) return undefined

  const sanitized = value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const record = entry as Record<string, unknown>
      const code = typeof record.code === 'string' ? record.code.trim() : ''
      const label = typeof record.label === 'string' ? record.label.trim() : ''
      const category =
        record.category === 'recurring' || record.category === 'one_off'
          ? record.category
          : null
      if (!code || !label || !category) return null
      return { code, label, category }
    })
    .filter(Boolean)

  return sanitized
}

function isNotFoundError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  )
}

function consentDownloadUrl(id: string): string {
  return `${apiBaseUrl}/api/consents/${id}/download`
}

function normalizeIp(ip: string): string {
  return ip.replace('::ffff:', '').trim()
}

function extractIps(value: string | string[] | undefined | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      entry.split(',').map((item) => normalizeIp(item))
    )
  }
  return value.split(',').map((item) => normalizeIp(item))
}

function getRequestIps(req: Request): string[] {
  const forwardedFor = extractIps(req.headers['x-forwarded-for'])
  const realIp = extractIps(req.headers['x-real-ip'])
  const cfConnectingIp = extractIps(req.headers['cf-connecting-ip'])
  const trueClientIp = extractIps(req.headers['true-client-ip'])
  const netlifyClientIp = extractIps(req.headers['x-nf-client-connection-ip'])
  const socketIp = req.socket?.remoteAddress
    ? [normalizeIp(req.socket.remoteAddress)]
    : []
  const expressIp = req.ip ? [normalizeIp(req.ip)] : []

  return Array.from(
    new Set(
      [
        ...forwardedFor,
        ...realIp,
        ...cfConnectingIp,
        ...trueClientIp,
        ...netlifyClientIp,
        ...expressIp,
        ...socketIp,
      ].filter(Boolean)
    )
  )
}

async function requireAdminAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (req.method === 'OPTIONS') {
    next()
    return
  }

  const token = readBearerToken(req)
  if (!token) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }

  const tokenHash = hashSessionToken(token)
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session || session.status !== AdminSessionStatus.Active) {
    res.status(401).json({ error: 'Session expired or invalid' })
    return
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { status: AdminSessionStatus.Revoked },
    })
    res.status(401).json({ error: 'Session expired' })
    return
  }

  if (!session.user.isActive) {
    res.status(403).json({ error: 'User account disabled' })
    return
  }

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { lastUsedAt: new Date() },
  })

  req.adminUser = serializeAdminUser(session.user)
  req.adminSessionId = session.id
  req.adminSessionExpiresAt = session.expiresAt
  next()
}

function renderForbiddenPage(options: {
  title: string
  message: string
  debug?: { ips: string[]; headers: Record<string, unknown> }
}): string {
  const { title, message, debug } = options
  const debugBlock = debug
    ? `<details class="debug"><summary>Debug details</summary><pre>${JSON.stringify(
        debug,
        null,
        2
      )}</pre></details>`
    : ''

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      :root {
        color-scheme: light;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(88, 107, 255, 0.18), transparent 55%),
          radial-gradient(circle at 30% 120%, rgba(12, 174, 255, 0.16), transparent 50%),
          #f5f7fb;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 32px;
        color: #0f172a;
      }
      .card {
        width: min(720px, 96vw);
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(148, 163, 184, 0.25);
        border-radius: 24px;
        padding: 40px;
        box-shadow:
          0 24px 60px rgba(15, 23, 42, 0.12),
          0 2px 8px rgba(15, 23, 42, 0.06);
        backdrop-filter: blur(10px);
      }
      .badge {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.12em;
        color: #334155;
        background: rgba(15, 23, 42, 0.06);
        padding: 8px 14px;
        border-radius: 999px;
      }
      h1 {
        margin: 16px 0 12px;
        font-size: clamp(28px, 4vw, 40px);
      }
      p {
        margin: 0 0 20px;
        color: #475569;
        font-size: 16px;
        line-height: 1.6;
      }
      .actions {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }
      .btn {
        border: 0;
        padding: 12px 18px;
        border-radius: 12px;
        font-weight: 600;
        font-size: 14px;
        background: #0f172a;
        color: #fff;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .hint {
        font-size: 13px;
        color: #64748b;
        margin-top: 14px;
      }
      .debug {
        margin-top: 18px;
        background: #0f172a;
        color: #e2e8f0;
        padding: 16px;
        border-radius: 12px;
        font-size: 12px;
      }
      .debug summary {
        cursor: pointer;
        font-weight: 600;
        margin-bottom: 8px;
      }
      pre {
        margin: 0;
        white-space: pre-wrap;
        word-break: break-word;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <span class="badge">Access Restricted</span>
      <h1>${title}</h1>
      <p>${message}</p>
      <div class="actions">
        <a class="btn" href="mailto:security@cybersentry.local">Request Access</a>
      </div>
      <div class="hint">Your network is not on the approved access list for this portal.</div>
      ${debugBlock}
    </div>
  </body>
</html>`
}

const enforceAllowlist: RequestHandler = (req, res, next) => {
  if (!allowlistEnabled) {
    next()
    return
  }
  const ips = getRequestIps(req)
  const allowed = ips.some((ip) => adminIpAllowlist.includes(ip))
  if (allowed) {
    next()
    return
  }
  const accepts = req.headers.accept || ''
  const wantsJson =
    req.path.startsWith('/api') || accepts.includes('application/json')
  const debugPayload = allowlistDebug
    ? {
        ips,
        headers: {
          'x-nf-client-connection-ip':
            req.headers['x-nf-client-connection-ip'],
          'x-forwarded-for': req.headers['x-forwarded-for'],
          'x-real-ip': req.headers['x-real-ip'],
          'cf-connecting-ip': req.headers['cf-connecting-ip'],
          'true-client-ip': req.headers['true-client-ip'],
        },
      }
    : undefined

  if (wantsJson) {
    res.status(403).json(
      allowlistDebug
        ? { error: 'Forbidden', detectedIps: ips, headers: debugPayload?.headers }
        : { error: 'Forbidden' }
    )
    return
  }

  res
    .status(403)
    .type('html')
    .send(
      renderForbiddenPage({
        title: 'Portal Access Denied',
        message:
          'This portal is protected and can only be accessed from approved IP addresses. If you believe this is an error, request access from your security administrator.',
        debug: allowlistDebug && debugPayload
          ? { ips: debugPayload.ips, headers: debugPayload.headers }
          : undefined,
      })
    )
}

app.use(enforceAllowlist)

const adminAuthOpenPaths = new Set([
  '/api/health',
  '/api/admin/login',
  '/api/admin/bootstrap',
  '/api/admin/2fa/verify',
])

app.use(async (req, res, next) => {
  if (!req.path.startsWith('/api')) {
    next()
    return
  }
  if (req.method === 'OPTIONS') {
    next()
    return
  }
  if (adminAuthOpenPaths.has(req.path)) {
    next()
    return
  }
  await requireAdminAuth(req as AuthedRequest, res, next)
})

function serializeTestRun(
  run: {
    id: string
    customerId: string
    startTime: Date | null
    endTime: Date | null
    scheduledTime: Date
    status: TestRunStatus
    engineOutputReference: string | null
    errorMessage: string | null
    createdAt: Date
    scopes: { scopeId: string }[]
    report?: { id: string } | null
  }
) {
  return {
    id: run.id,
    customerId: run.customerId,
    scopeIds: run.scopes.map((scope) => scope.scopeId),
    startTime: toIso(run.startTime),
    endTime: toIso(run.endTime),
    scheduledTime: run.scheduledTime.toISOString(),
    status: run.status,
    engineOutputReference: run.engineOutputReference,
    reportId: run.report?.id ?? null,
    errorMessage: run.errorMessage,
    createdAt: run.createdAt.toISOString(),
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

// Admin authentication
app.post('/api/admin/bootstrap', async (req, res) => {
  const { email, password, name, role } = req.body as Record<string, unknown>
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const existingCount = await prisma.adminUser.count()
  if (existingCount > 0) {
    res.status(403).json({ error: 'Bootstrap already completed' })
    return
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const hashed = await bcrypt.hash(String(password), 12)
  const created = await prisma.adminUser.create({
    data: {
      email: normalizedEmail,
      name: name ? String(name) : null,
      role: (role as AdminRole) || AdminRole.SuperAdmin,
      passwordHash: hashed,
      totpEnabled: false,
    },
  })

  await logAdminAudit({
    userId: created.id,
    email: created.email,
    action: 'bootstrap',
    success: true,
    ipAddress: getRequestIps(req)[0] || null,
    userAgent: req.headers['user-agent'] || null,
  })

  res.status(201).json({ user: serializeAdminUser(created) })
})

app.post('/api/admin/login', async (req, res) => {
  const { email, password } = req.body as Record<string, unknown>
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const ip = getRequestIps(req)[0] || null
  if (ip) {
    const ipState = recordIpAttempt(ip)
    if (ipState.limited) {
      await logAdminAudit({
        email: String(email).trim().toLowerCase(),
        action: 'login_rate_limited',
        success: false,
        ipAddress: ip,
        userAgent: req.headers['user-agent'] || null,
      })
      res.status(429).json({ error: 'Too many login attempts' })
      return
    }
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const user = await prisma.adminUser.findUnique({
    where: { email: normalizedEmail },
  })

  if (!user) {
    await logAdminAudit({
      email: normalizedEmail,
      action: 'login_failed',
      success: false,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
    })
    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (!user.isActive) {
    await logAdminAudit({
      userId: user.id,
      email: user.email,
      action: 'login_blocked',
      success: false,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
      metadata: { reason: 'disabled' },
    })
    res.status(403).json({ error: 'Account disabled' })
    return
  }

  if (user.lockUntil && user.lockUntil.getTime() > Date.now()) {
    await logAdminAudit({
      userId: user.id,
      email: user.email,
      action: 'login_locked',
      success: false,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
      metadata: { lockUntil: user.lockUntil.toISOString() },
    })
    res.status(429).json({ error: 'Account temporarily locked' })
    return
  }

  const passwordValid = await bcrypt.compare(String(password), user.passwordHash)
  if (!passwordValid) {
    const failedCount = user.failedLoginCount + 1
    const shouldLock = failedCount >= maxLoginAttempts
    const lockUntil = shouldLock
      ? new Date(Date.now() + lockMinutes * 60 * 1000)
      : null

    await prisma.adminUser.update({
      where: { id: user.id },
      data: {
        failedLoginCount: failedCount,
        lockUntil,
      },
    })

    await logAdminAudit({
      userId: user.id,
      email: user.email,
      action: 'login_failed',
      success: false,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
      metadata: {
        failedCount,
        locked: shouldLock,
      },
    })

    res.status(401).json({ error: 'Invalid credentials' })
    return
  }

  if (user.failedLoginCount > 0 || user.lockUntil) {
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { failedLoginCount: 0, lockUntil: null },
    })
  }

  let totpSecret = user.totpSecret
  const needsSetup = !user.totpEnabled || !totpSecret

  if (!totpSecret) {
    totpSecret = authenticator.generateSecret()
    await prisma.adminUser.update({
      where: { id: user.id },
      data: { totpSecret },
    })
  }

  const { token, session } = await createAdminSession({
    userId: user.id,
    status: AdminSessionStatus.Pending2FA,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || null,
  })

  await logAdminAudit({
    userId: user.id,
    email: user.email,
    action: needsSetup ? 'login_2fa_setup_required' : 'login_2fa_required',
    success: true,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || null,
  })

  if (needsSetup) {
    const otpauthUrl = authenticator.keyuri(
      user.email,
      'Cybersentry Admin',
      totpSecret
    )
    res.json({
      status: '2fa_setup',
      sessionToken: token,
      sessionExpiresAt: session.expiresAt.toISOString(),
      otpauthUrl,
      secret: totpSecret,
      user: serializeAdminUser(user),
    })
    return
  }

  res.json({
    status: '2fa_required',
    sessionToken: token,
    sessionExpiresAt: session.expiresAt.toISOString(),
    user: serializeAdminUser(user),
  })
})

app.post('/api/admin/2fa/verify', async (req, res) => {
  const { code } = req.body as Record<string, unknown>
  const token = readBearerToken(req)

  if (!token || !code) {
    res.status(400).json({ error: 'Verification code required' })
    return
  }

  const tokenHash = hashSessionToken(token)
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { user: true },
  })

  if (!session || session.status !== AdminSessionStatus.Pending2FA) {
    res.status(401).json({ error: 'Invalid session' })
    return
  }

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.adminSession.update({
      where: { id: session.id },
      data: { status: AdminSessionStatus.Revoked },
    })
    res.status(401).json({ error: 'Session expired' })
    return
  }

  const ip = getRequestIps(req)[0] || null
  const user = session.user
  if (!user.totpSecret) {
    res.status(400).json({ error: '2FA is not configured' })
    return
  }

  const valid = authenticator.check(String(code).replace(/\s+/g, ''), user.totpSecret)
  if (!valid) {
    await logAdminAudit({
      userId: user.id,
      email: user.email,
      action: '2fa_failed',
      success: false,
      ipAddress: ip,
      userAgent: req.headers['user-agent'] || null,
    })
    res.status(401).json({ error: 'Invalid verification code' })
    return
  }

  const updatedUser = await prisma.adminUser.update({
    where: { id: user.id },
    data: {
      totpEnabled: true,
      lastLoginAt: new Date(),
      failedLoginCount: 0,
      lockUntil: null,
    },
  })

  await prisma.adminSession.update({
    where: { id: session.id },
    data: { status: AdminSessionStatus.Active, lastUsedAt: new Date() },
  })

  await logAdminAudit({
    userId: user.id,
    email: user.email,
    action: '2fa_verified',
    success: true,
    ipAddress: ip,
    userAgent: req.headers['user-agent'] || null,
  })

  res.json({
    status: 'authenticated',
    sessionToken: token,
    sessionExpiresAt: session.expiresAt.toISOString(),
    user: serializeAdminUser(updatedUser),
  })
})

app.get('/api/admin/me', async (req, res) => {
  const authedReq = req as AuthedRequest
  if (!authedReq.adminUser) {
    res.status(401).json({ error: 'Not authenticated' })
    return
  }
  res.json({
    user: authedReq.adminUser,
    sessionExpiresAt: authedReq.adminSessionExpiresAt
      ? authedReq.adminSessionExpiresAt.toISOString()
      : null,
  })
})

app.post('/api/admin/logout', async (req, res) => {
  const authedReq = req as AuthedRequest
  if (authedReq.adminSessionId) {
    await prisma.adminSession.update({
      where: { id: authedReq.adminSessionId },
      data: { status: AdminSessionStatus.Revoked },
    })
  }
  res.status(204).send()
})

app.post('/api/admin/users', async (req, res) => {
  const authedReq = req as AuthedRequest
  if (!authedReq.adminUser || authedReq.adminUser.role !== AdminRole.SuperAdmin) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return
  }

  const { email, password, name, role } = req.body as Record<string, unknown>
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' })
    return
  }

  const normalizedEmail = String(email).trim().toLowerCase()
  const hashed = await bcrypt.hash(String(password), 12)
  try {
    const created = await prisma.adminUser.create({
      data: {
        email: normalizedEmail,
        name: name ? String(name) : null,
        role: (role as AdminRole) || AdminRole.SD,
        passwordHash: hashed,
        totpEnabled: false,
      },
    })

    await logAdminAudit({
      userId: authedReq.adminUser.id,
      email: authedReq.adminUser.email,
      action: 'create_admin_user',
      success: true,
      ipAddress: getRequestIps(req)[0] || null,
      userAgent: req.headers['user-agent'] || null,
      metadata: { createdUserId: created.id, role: created.role },
    })

    res.status(201).json({ user: serializeAdminUser(created) })
  } catch (error) {
    await logAdminAudit({
      userId: authedReq.adminUser.id,
      email: authedReq.adminUser.email,
      action: 'create_admin_user',
      success: false,
      ipAddress: getRequestIps(req)[0] || null,
      userAgent: req.headers['user-agent'] || null,
      metadata: { reason: 'email_in_use' },
    })
    res.status(409).json({ error: 'User already exists' })
  }
})

app.get('/api/admin/users', async (req, res) => {
  const authedReq = req as AuthedRequest
  if (!authedReq.adminUser || authedReq.adminUser.role !== AdminRole.SuperAdmin) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return
  }

  const users = await prisma.adminUser.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json({
    users: users.map((user) => serializeAdminUser(user)),
  })
})

app.delete('/api/admin/users/:id', async (req, res) => {
  const authedReq = req as AuthedRequest
  if (!authedReq.adminUser || authedReq.adminUser.role !== AdminRole.SuperAdmin) {
    res.status(403).json({ error: 'Insufficient permissions' })
    return
  }

  if (req.params.id === authedReq.adminUser.id) {
    res.status(400).json({ error: 'You cannot delete your own account.' })
    return
  }

  try {
    const deleted = await prisma.adminUser.delete({
      where: { id: req.params.id },
    })

    await logAdminAudit({
      userId: authedReq.adminUser.id,
      email: authedReq.adminUser.email,
      action: 'delete_admin_user',
      success: true,
      ipAddress: getRequestIps(req)[0] || null,
      userAgent: req.headers['user-agent'] || null,
      metadata: { deletedUserId: deleted.id, deletedEmail: deleted.email },
    })

    res.status(204).send()
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'User not found' })
      return
    }
    await logAdminAudit({
      userId: authedReq.adminUser.id,
      email: authedReq.adminUser.email,
      action: 'delete_admin_user',
      success: false,
      ipAddress: getRequestIps(req)[0] || null,
      userAgent: req.headers['user-agent'] || null,
      metadata: { deletedUserId: req.params.id },
    })
    throw error
  }
})

// Customers
app.get('/api/customers', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    customers.map((customer) => ({
      ...customer,
      contractStartDate: customer.contractStartDate.toISOString(),
      createdAt: customer.createdAt.toISOString(),
      updatedAt: customer.updatedAt.toISOString(),
    }))
  )
})

app.get('/api/customers/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
  })
  if (!customer) {
    res.status(404).json({ error: 'Customer not found' })
    return
  }
  res.json({
    ...customer,
    contractStartDate: customer.contractStartDate.toISOString(),
    createdAt: customer.createdAt.toISOString(),
    updatedAt: customer.updatedAt.toISOString(),
  })
})

app.post('/api/customers', async (req, res) => {
  const {
    companyName,
    contractType,
    contractStartDate,
    contractLengthMonths,
    status,
    addOns,
  } = req.body as Record<string, unknown>

  if (
    !companyName ||
    !contractType ||
    !contractStartDate ||
    contractLengthMonths === undefined ||
    !status
  ) {
    res.status(400).json({ error: 'Missing required customer fields' })
    return
  }

  const normalizedAddOns = normalizeAddOnsInput(addOns)

  const created = await prisma.customer.create({
    data: {
      companyName: String(companyName),
      contractType: contractType as ContractType,
      contractStartDate: parseDateOnly(String(contractStartDate))!,
      contractLengthMonths: Number(contractLengthMonths),
      status: status as CustomerStatus,
      ...(normalizedAddOns !== undefined ? { addOns: normalizedAddOns } : {}),
    },
  })
  res.status(201).json({
    ...created,
    contractStartDate: created.contractStartDate.toISOString(),
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  })
})

app.put('/api/customers/:id', async (req, res) => {
  const {
    companyName,
    contractType,
    contractStartDate,
    contractLengthMonths,
    status,
    addOns,
  } = req.body as Record<string, unknown>
  const data: Prisma.CustomerUpdateInput = {}

  if (companyName !== undefined) data.companyName = String(companyName)
  if (contractType !== undefined)
    if (contractType !== undefined)
      data.contractType = contractType as ContractType
    if (contractStartDate !== undefined) {
      const parsedDate = parseDateOnly(String(contractStartDate))
      if (parsedDate !== null)
        data.contractStartDate = parsedDate
    }
    if (contractLengthMonths !== undefined)
      data.contractLengthMonths = Number(contractLengthMonths)
    if (status !== undefined)
      data.status = status as CustomerStatus

  const normalizedAddOns = normalizeAddOnsInput(addOns)
  if (normalizedAddOns !== undefined) {
    data.addOns = normalizedAddOns
  }

  try {
    const updated = await prisma.customer.update({
      where: { id: req.params.id },
      data,
    })
    res.json({
      ...updated,
      contractStartDate: updated.contractStartDate.toISOString(),
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Customer not found' })
      return
    }
    throw error
  }
})

app.delete('/api/customers/:id', async (req, res) => {
  try {
    await prisma.customer.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Customer not found' })
      return
    }
    throw error
  }
})

// Customer Notes
app.get('/api/customers/:id/notes', async (req, res) => {
  const notes = await prisma.customerNote.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    notes.map((note) => ({
      ...note,
      createdAt: note.createdAt.toISOString(),
    }))
  )
})

app.post('/api/customers/:id/notes', async (req, res) => {
  const { content } = req.body as Record<string, unknown>
  if (!content) {
    res.status(400).json({ error: 'Note content is required' })
    return
  }
  const note = await prisma.customerNote.create({
    data: { customerId: req.params.id, content: String(content) },
  })
  res.status(201).json({ ...note, createdAt: note.createdAt.toISOString() })
})

app.delete('/api/notes/:id', async (req, res) => {
  try {
    await prisma.customerNote.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Note not found' })
      return
    }
    throw error
  }
})

// Scopes
app.get('/api/customers/:id/scopes', async (req, res) => {
  const scopes = await prisma.scope.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    scopes.map((scope) => ({
      ...scope,
      createdAt: scope.createdAt.toISOString(),
    }))
  )
})

app.post('/api/scopes', async (req, res) => {
  const { customerId, type, value, notes, active } = req.body as Record<
    string,
    unknown
  >
  if (!customerId || !type || !value) {
    res.status(400).json({ error: 'Missing scope fields' })
    return
  }
  const scope = await prisma.scope.create({
    data: {
      customerId: String(customerId),
      type: type as ScopeType,
      value: String(value),
      notes: notes ? String(notes) : null,
      active: active === undefined ? true : Boolean(active),
    },
  })
  res.status(201).json({ ...scope, createdAt: scope.createdAt.toISOString() })
})

app.put('/api/scopes/:id', async (req, res) => {
  const { type, value, notes, active } = req.body as Record<string, unknown>
  const data: Prisma.ScopeUpdateInput = {}
  if (type !== undefined) data.type = type as ScopeType
  if (value !== undefined) data.value = String(value)
  if (notes !== undefined) data.notes = notes ? String(notes) : null
  if (active !== undefined) data.active = Boolean(active)

  try {
    const scope = await prisma.scope.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ ...scope, createdAt: scope.createdAt.toISOString() })
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Scope not found' })
      return
    }
    throw error
  }
})

app.delete('/api/scopes/:id', async (req, res) => {
  try {
    await prisma.scope.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Scope not found' })
      return
    }
    throw error
  }
})

// Test Configuration
app.get('/api/customers/:id/test-config', async (req, res) => {
  const config = await prisma.testConfiguration.findUnique({
    where: { customerId: req.params.id },
  })
  if (!config) {
    res.json(null)
    return
  }
  res.json({
    ...config,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  })
})

app.post('/api/customers/:id/test-config', async (req, res) => {
  const {
    testType,
    frequency,
    cronExpression,
    preferredRunWindow,
    enabled,
  } = req.body as Record<string, unknown>

  if (!testType || !frequency || !preferredRunWindow) {
    res.status(400).json({ error: 'Missing test configuration fields' })
    return
  }

  const config = await prisma.testConfiguration.upsert({
    where: { customerId: req.params.id },
    create: {
      customerId: req.params.id,
      testType: testType as TestType,
      frequency: frequency as Frequency,
      cronExpression: cronExpression ? String(cronExpression) : null,
      preferredRunWindow: preferredRunWindow as Prisma.JsonObject,
      enabled: enabled === undefined ? true : Boolean(enabled),
    },
    update: {
      testType: testType as TestType,
      frequency: frequency as Frequency,
      cronExpression: cronExpression ? String(cronExpression) : null,
      preferredRunWindow: preferredRunWindow as Prisma.JsonObject,
      enabled: enabled === undefined ? true : Boolean(enabled),
    },
  })

  res.json({
    ...config,
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString(),
  })
})

app.put('/api/test-config/:id', async (req, res) => {
  const {
    testType,
    frequency,
    cronExpression,
    preferredRunWindow,
    enabled,
  } = req.body as Record<string, unknown>

  const data: Prisma.TestConfigurationUpdateInput = {}
  if (testType !== undefined) data.testType = testType as TestType
  if (frequency !== undefined) data.frequency = frequency as Frequency
  if (cronExpression !== undefined)
    data.cronExpression = cronExpression ? String(cronExpression) : null
  if (preferredRunWindow !== undefined)
    data.preferredRunWindow = preferredRunWindow as Prisma.JsonObject
  if (enabled !== undefined) data.enabled = Boolean(enabled)

  try {
    const config = await prisma.testConfiguration.update({
      where: { id: req.params.id },
      data,
    })
    res.json({
      ...config,
      createdAt: config.createdAt.toISOString(),
      updatedAt: config.updatedAt.toISOString(),
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Test configuration not found' })
      return
    }
    throw error
  }
})

// Test Runs
app.get('/api/customers/:id/test-runs', async (req, res) => {
  const runs = await prisma.testRun.findMany({
    where: { customerId: req.params.id },
    include: {
      scopes: { select: { scopeId: true } },
      report: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(runs.map(serializeTestRun))
})

app.get('/api/test-runs', async (_req, res) => {
  const runs = await prisma.testRun.findMany({
    include: {
      scopes: { select: { scopeId: true } },
      report: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(runs.map(serializeTestRun))
})

app.post('/api/test-runs', async (req, res) => {
  const {
    customerId,
    scopeIds,
    startTime,
    endTime,
    scheduledTime,
    status,
    engineOutputReference,
    errorMessage,
  } = req.body as Record<string, unknown>

  if (!customerId || !scheduledTime || !status) {
    res.status(400).json({ error: 'Missing test run fields' })
    return
  }

  const run = await prisma.testRun.create({
    data: {
      customerId: String(customerId),
      startTime: startTime ? new Date(String(startTime)) : null,
      endTime: endTime ? new Date(String(endTime)) : null,
      scheduledTime: new Date(String(scheduledTime)),
      status: status as TestRunStatus,
      engineOutputReference: engineOutputReference
        ? String(engineOutputReference)
        : null,
      errorMessage: errorMessage ? String(errorMessage) : null,
      scopes: Array.isArray(scopeIds)
        ? {
            create: scopeIds.map((scopeId) => ({
              scopeId: String(scopeId),
            })),
          }
        : undefined,
    },
    include: {
      scopes: { select: { scopeId: true } },
      report: { select: { id: true } },
    },
  })

  res.status(201).json(serializeTestRun(run))
})

app.put('/api/test-runs/:id', async (req, res) => {
  const {
    scopeIds,
    startTime,
    endTime,
    scheduledTime,
    status,
    engineOutputReference,
    errorMessage,
  } = req.body as Record<string, unknown>

  const data: Prisma.TestRunUpdateInput = {}
  if (startTime !== undefined)
    data.startTime = startTime ? new Date(String(startTime)) : undefined
  if (endTime !== undefined)
    data.endTime = endTime ? new Date(String(endTime)) : undefined
  if (scheduledTime !== undefined)
    data.scheduledTime = new Date(String(scheduledTime))
  if (status !== undefined) data.status = status as TestRunStatus
  if (engineOutputReference !== undefined)
    data.engineOutputReference = engineOutputReference
      ? String(engineOutputReference)
      : null
  if (errorMessage !== undefined)
    data.errorMessage = errorMessage ? String(errorMessage) : null

  if (Array.isArray(scopeIds)) {
    data.scopes = {
      deleteMany: {},
      create: scopeIds.map((scopeId) => ({ scopeId: String(scopeId) })),
    }
  }

  try {
    const run = await prisma.testRun.update({
      where: { id: req.params.id },
      data,
      include: {
        scopes: { select: { scopeId: true } },
        report: { select: { id: true } },
      },
    })
    res.json(serializeTestRun(run))
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Test run not found' })
      return
    }
    throw error
  }
})

// Reports
app.get('/api/customers/:id/reports', async (req, res) => {
  const reports = await prisma.report.findMany({
    where: { customerId: req.params.id },
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    reports.map((report) => ({
      ...report,
      generatedTimestamp: report.generatedTimestamp.toISOString(),
      createdAt: report.createdAt.toISOString(),
    }))
  )
})

app.get('/api/reports', async (_req, res) => {
  const reports = await prisma.report.findMany({
    orderBy: { createdAt: 'desc' },
  })
  res.json(
    reports.map((report) => ({
      ...report,
      generatedTimestamp: report.generatedTimestamp.toISOString(),
      createdAt: report.createdAt.toISOString(),
    }))
  )
})

app.get('/api/reports/:id', async (req, res) => {
  const report = await prisma.report.findUnique({
    where: { id: req.params.id },
  })
  if (!report) {
    res.status(404).json({ error: 'Report not found' })
    return
  }
  res.json({
    ...report,
    generatedTimestamp: report.generatedTimestamp.toISOString(),
    createdAt: report.createdAt.toISOString(),
  })
})

app.post('/api/reports', async (req, res) => {
  const {
    runId,
    customerId,
    severitySummary,
    reportFile,
    rawDataFile,
    generatedTimestamp,
    sentToCustomer,
    notes,
    status,
  } = req.body as Record<string, unknown>

  if (
    !runId ||
    !customerId ||
    !severitySummary ||
    !reportFile ||
    !rawDataFile ||
    !generatedTimestamp ||
    !status
  ) {
    res.status(400).json({ error: 'Missing report fields' })
    return
  }

  const report = await prisma.report.create({
    data: {
      runId: String(runId),
      customerId: String(customerId),
      severitySummary: severitySummary as Prisma.JsonObject,
      reportFile: String(reportFile),
      rawDataFile: String(rawDataFile),
      generatedTimestamp: new Date(String(generatedTimestamp)),
      sentToCustomer: Boolean(sentToCustomer),
      notes: notes ? String(notes) : null,
      status: status as ReportStatus,
    },
  })

  res.status(201).json({
    ...report,
    generatedTimestamp: report.generatedTimestamp.toISOString(),
    createdAt: report.createdAt.toISOString(),
  })
})

app.put('/api/reports/:id', async (req, res) => {
  const {
    severitySummary,
    reportFile,
    rawDataFile,
    generatedTimestamp,
    sentToCustomer,
    notes,
    status,
  } = req.body as Record<string, unknown>

  const data: Prisma.ReportUpdateInput = {}
  if (severitySummary !== undefined)
    data.severitySummary = severitySummary as Prisma.JsonObject
  if (reportFile !== undefined) data.reportFile = String(reportFile)
  if (rawDataFile !== undefined) data.rawDataFile = String(rawDataFile)
  if (generatedTimestamp !== undefined)
    data.generatedTimestamp = new Date(String(generatedTimestamp))
  if (sentToCustomer !== undefined) data.sentToCustomer = Boolean(sentToCustomer)
  if (notes !== undefined) data.notes = notes ? String(notes) : null
  if (status !== undefined) data.status = status as ReportStatus

  try {
    const report = await prisma.report.update({
      where: { id: req.params.id },
      data,
    })
    res.json({
      ...report,
      generatedTimestamp: report.generatedTimestamp.toISOString(),
      createdAt: report.createdAt.toISOString(),
    })
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Report not found' })
      return
    }
    throw error
  }
})

// Consents
app.get('/api/customers/:id/consents', async (req, res) => {
  const consents = await prisma.customerConsent.findMany({
    where: { customerId: req.params.id },
    orderBy: { uploadedAt: 'desc' },
  })
  res.json(
    consents.map((consent) => ({
      id: consent.id,
      customerId: consent.customerId,
      fileName: consent.fileName,
      agreedAt: consent.agreedAt.toISOString(),
      uploadedAt: consent.uploadedAt.toISOString(),
      fileSize: consent.fileSize,
      fileMimeType: consent.fileMimeType,
      downloadUrl: consentDownloadUrl(consent.id),
    }))
  )
})

app.post(
  '/api/customers/:id/consents',
  upload.single('file'),
  async (req, res) => {
    const file = req.file
    if (!file) {
      res.status(400).json({ error: 'Consent file is required' })
      return
    }

    const agreedAt = parseDateOnly(
      typeof req.body.agreedAt === 'string' ? req.body.agreedAt : undefined
    )

    // Copy buffer into a new Uint8Array so Prisma's Bytes (ArrayBuffer) type is satisfied
    const fileData = new Uint8Array(file.size)
    fileData.set(file.buffer as Uint8Array)

    const consent = await prisma.customerConsent.create({
      data: {
        customerId: req.params.id,
        fileName: file.originalname,
        fileMimeType: file.mimetype,
        fileSize: file.size,
        fileData,
        agreedAt: agreedAt ?? new Date(),
      },
    })

    res.status(201).json({
      id: consent.id,
      customerId: consent.customerId,
      fileName: consent.fileName,
      agreedAt: consent.agreedAt.toISOString(),
      uploadedAt: consent.uploadedAt.toISOString(),
      fileSize: consent.fileSize,
      fileMimeType: consent.fileMimeType,
      downloadUrl: consentDownloadUrl(consent.id),
    })
  }
)

app.get('/api/consents/:id/download', async (req, res) => {
  const consent = await prisma.customerConsent.findUnique({
    where: { id: req.params.id },
  })
  if (!consent) {
    res.status(404).json({ error: 'Consent not found' })
    return
  }
  res.setHeader('Content-Type', consent.fileMimeType)
  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${encodeURIComponent(consent.fileName)}"`
  )
  res.send(consent.fileData)
})

app.delete('/api/consents/:id', async (req, res) => {
  try {
    await prisma.customerConsent.delete({ where: { id: req.params.id } })
    res.status(204).send()
  } catch (error) {
    if (isNotFoundError(error)) {
      res.status(404).json({ error: 'Consent not found' })
      return
    }
    throw error
  }
})

if (adminUiEnabled) {
  app.use(express.static(distDir))
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({ error: 'Not found' })
      return
    }
    res.sendFile(path.join(distDir, 'index.html'))
  })
}

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof MulterError) {
    res.status(400).json({ error: error.message })
    return
  }
  if (error instanceof Error) {
    res.status(500).json({ error: error.message })
    return
  }
  res.status(500).json({ error: 'Unexpected server error' })
})

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`)
})
