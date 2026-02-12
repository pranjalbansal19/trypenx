type EdgeContext = { ip?: string }
declare const Netlify: {
  env: {
    get: (key: string) => string | undefined
  }
}

const allowlist = (Netlify.env.get('ADMIN_IP_ALLOWLIST') || '')
  .split(',')
  .map((ip) => ip.trim())
  .filter(Boolean)
const debugEnabled = (Netlify.env.get('ALLOWLIST_DEBUG') || '') === '1'

function normalizeIp(ip: string): string {
  return ip.replace('::ffff:', '').trim()
}

function extractIps(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((entry) => normalizeIp(entry))
    .filter(Boolean)
}

function getCandidateIps(request: Request, context: EdgeContext): string[] {
  const headers = request.headers
  const candidates = [
    context.ip ? normalizeIp(context.ip) : '',
    ...extractIps(headers.get('x-nf-client-connection-ip')),
    ...extractIps(headers.get('x-forwarded-for')),
    ...extractIps(headers.get('x-real-ip')),
    ...extractIps(headers.get('cf-connecting-ip')),
    ...extractIps(headers.get('true-client-ip')),
  ]
  return Array.from(new Set(candidates))
}

export default async function handler(request: Request, context: EdgeContext) {
  if (allowlist.length === 0) {
    return new Response('Access restricted. Admin allowlist not configured.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  const ips = getCandidateIps(request, context)
  const allowed = ips.some((ip) => allowlist.includes(ip))

  if (!allowed) {
    if (debugEnabled) {
      const debugPayload = {
        detectedIps: ips,
        contextIp: context.ip || null,
        headers: {
          'x-nf-client-connection-ip': request.headers.get(
            'x-nf-client-connection-ip'
          ),
          'x-forwarded-for': request.headers.get('x-forwarded-for'),
          'x-real-ip': request.headers.get('x-real-ip'),
          'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
          'true-client-ip': request.headers.get('true-client-ip'),
        },
        allowlist,
      }
      return new Response(JSON.stringify(debugPayload, null, 2), {
        status: 403,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      })
    }
    return new Response('Access denied. Your IP is not allowed.', {
      status: 403,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }

  return fetch(request)
}
