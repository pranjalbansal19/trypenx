// Admin Portal Data Models

export type ContractType = 'Foundation' | 'Pro' | 'Enterprise'
export type CustomerStatus = 'Active' | 'Paused' | 'Cancelled'
export type ScopeType = 'ip_range' | 'domain' | 'subdomain'
export type TestType = 'soft_scan' | 'full_pen_test'
export type Frequency = 'daily' | 'weekly' | 'monthly' | 'custom'
export type TestRunStatus = 'Scheduled' | 'Running' | 'Completed' | 'Failed'
export type ReportStatus = 'New' | 'Reviewed' | 'Sent'

export interface Customer {
  id: string
  companyName: string
  contractType: ContractType
  contractStartDate: string // ISO date
  contractLengthMonths: number
  status: CustomerStatus
  createdAt: string
  updatedAt: string
}

/** A single timestamped note for a customer (shown like a to-do list) */
export interface CustomerNote {
  id: string
  customerId: string
  content: string
  createdAt: string // ISO date-time
}

/** Signed consent document (e.g. VAA / pen test agreement) for a customer */
export interface CustomerConsent {
  id: string
  customerId: string
  fileName: string
  /** When the document was agreed/signed (displayed as "Signed at") */
  agreedAt: string // ISO date
  /** When the file was uploaded to the portal */
  uploadedAt: string // ISO date
  /** Download URL for the stored file */
  downloadUrl: string
  fileSize?: number
  fileMimeType?: string
}

export interface Scope {
  id: string
  customerId: string
  type: ScopeType
  value: string // e.g. "192.168.0.0/24" or "app.customer.com"
  notes?: string
  active: boolean
  createdAt: string
}

export interface TestConfiguration {
  id: string
  customerId: string
  testType: TestType
  frequency: Frequency
  cronExpression?: string // For custom frequency
  preferredRunWindow: {
    timezone: string
    startTime: string // HH:mm format
    endTime: string // HH:mm format
  }
  enabled: boolean
  createdAt: string
  updatedAt: string
}

export interface TestRun {
  id: string
  customerId: string
  scopeIds: string[]
  startTime: string | null
  endTime: string | null
  scheduledTime: string
  status: TestRunStatus
  engineOutputReference: string | null // File path or URL
  reportId: string | null
  errorMessage?: string
  createdAt: string
}

export interface SeveritySummary {
  critical: number
  high: number
  medium: number
  low: number
}

export interface Report {
  id: string
  runId: string
  customerId: string
  severitySummary: SeveritySummary
  reportFile: string // PDF file path or URL
  rawDataFile: string // JSON file path or URL
  generatedTimestamp: string
  sentToCustomer: boolean
  notes?: string
  status: ReportStatus
  createdAt: string
}
