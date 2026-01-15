import type { DomainFile } from '../utils/fileReader'

export interface ReportSection {
  key: string
  title: string
  content: string
}

export interface PreparedReportData {
  domain: string
  sections: ReportSection[]
  severitySummary: {
    critical: number
    high: number
    medium: number
    low: number
  }
  score?: number
  trend?: Array<{ label: string; value: number }>
  vulnerabilitiesTable?: Array<{
    severity: string
    title: string
    recommendation: string
  }>
  domainFiles?: DomainFile[]
  pentestType?: 'aggressive' | 'soft'
}

// Fetch markdown/text files from domain folder structure and prepare report
export async function getPreparedReport(
  domain: string
): Promise<PreparedReportData> {
  // Files are now uploaded via FolderUploadPage
  // In production API, this will fetch files dynamically based on domain
  const domainFiles: DomainFile[] = []

  // Parse files into sections
  const sections: ReportSection[] = domainFiles.map((file, idx) => ({
    key: `file-${idx}`,
    title: file.path.split('/').pop() || 'Document',
    content: file.content,
  }))

  // If no files found, add default sections
  if (sections.length === 0) {
    sections.push({
      key: 'exec',
      title: 'Executive Summary',
      content:
        'AI-driven reconnaissance identified exposure across TLS configuration, admin endpoints, and directory indexing. Prioritize remediation of critical items within 7 days.',
    })
  }

  const trend = [
    { label: 'W1', value: 55 },
    { label: 'W2', value: 78 },
    { label: 'W3', value: 52 },
    { label: 'W4', value: 88 },
    { label: 'W5', value: 87 },
    { label: 'W6', value: 90 },
    { label: 'W7', value: 89 },
    { label: 'W8', value: 60 },
  ]

  return {
    domain,
    sections,
    severitySummary: { critical: 1, high: 1, medium: 1, low: 0 },
    score: 65,
    trend,
    vulnerabilitiesTable: [
      {
        severity: 'high',
        title: 'Outdated TLS configuration',
        recommendation:
          'Disable TLS 1.0/1.1 and weak ciphers; enforce TLS 1.2+',
      },
      {
        severity: 'medium',
        title: 'Directory listing enabled',
        recommendation:
          'Disable autoindex and restrict access via server config.',
      },
      {
        severity: 'critical',
        title: 'Admin panel exposed',
        recommendation: 'Enforce authN/Z, IP restrictions, and MFA for admin.',
      },
    ],
    domainFiles,
  }
}

export async function buildReportFromState(params: {
  domain: string
  score: number
  trend: Array<{ label: string; value: number }>
  vulnerabilities: Array<{
    severity: string
    title: string
    recommendation: string
  }>
}): Promise<PreparedReportData> {
  // Files are now uploaded via FolderUploadPage
  const domainFiles: DomainFile[] = []

  const severity = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  } as PreparedReportData['severitySummary']
  for (const v of params.vulnerabilities) {
    if (v.severity in severity) {
      // @ts-expect-error narrow keys
      severity[v.severity] += 1
    }
  }
  return {
    domain: params.domain,
    sections: [
      {
        key: 'exec',
        title: 'Executive Summary',
        content: 'Automated AI Pen Test report generated from dashboard data.',
      },
    ],
    severitySummary: severity,
    score: params.score,
    trend: params.trend,
    vulnerabilitiesTable: params.vulnerabilities,
    domainFiles,
  }
}
