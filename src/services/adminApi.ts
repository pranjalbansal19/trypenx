import type {
  Customer,
  CustomerConsent,
  CustomerNote,
  Scope,
  TestConfiguration,
  TestRun,
  Report,
} from '../types/admin'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options)
  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const data = (await response.json()) as { error?: string }
      if (data?.error) message = data.error
    } catch {
      // ignore JSON parsing errors for non-JSON responses
    }
    throw new Error(message)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    return (await response.json()) as T
  }

  return (await response.text()) as unknown as T
}

function jsonBody(body: unknown): RequestInit {
  return {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }
}

// Customers API
export async function getCustomers(): Promise<Customer[]> {
  return apiFetch<Customer[]>(`${API_BASE}/customers`)
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    return await apiFetch<Customer>(`${API_BASE}/customers/${id}`)
  } catch (error) {
    if ((error as Error).message.toLowerCase().includes('not found')) {
      return null
    }
    throw error
  }
}

export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  return apiFetch<Customer>(`${API_BASE}/customers`, {
    method: 'POST',
    ...jsonBody(data),
  })
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<Customer> {
  return apiFetch<Customer>(`${API_BASE}/customers/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  })
}

export async function deleteCustomer(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/customers/${id}`, { method: 'DELETE' })
}

// Customer notes
export async function getNotesByCustomerId(
  customerId: string
): Promise<CustomerNote[]> {
  return apiFetch<CustomerNote[]>(
    `${API_BASE}/customers/${customerId}/notes`
  )
}

export async function createNote(
  data: Omit<CustomerNote, 'id' | 'createdAt'>
): Promise<CustomerNote> {
  return apiFetch<CustomerNote>(
    `${API_BASE}/customers/${data.customerId}/notes`,
    {
      method: 'POST',
      ...jsonBody({ content: data.content }),
    }
  )
}

export async function deleteNote(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/notes/${id}`, { method: 'DELETE' })
}

// Scopes API
export async function getScopesByCustomerId(
  customerId: string
): Promise<Scope[]> {
  return apiFetch<Scope[]>(`${API_BASE}/customers/${customerId}/scopes`)
}

export async function createScope(
  data: Omit<Scope, 'id' | 'createdAt'>
): Promise<Scope> {
  return apiFetch<Scope>(`${API_BASE}/scopes`, {
    method: 'POST',
    ...jsonBody(data),
  })
}

export async function updateScope(
  id: string,
  data: Partial<Scope>
): Promise<Scope> {
  return apiFetch<Scope>(`${API_BASE}/scopes/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  })
}

export async function deleteScope(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/scopes/${id}`, { method: 'DELETE' })
}

// Test Configurations API
export async function getTestConfigByCustomerId(
  customerId: string
): Promise<TestConfiguration | null> {
  return apiFetch<TestConfiguration | null>(
    `${API_BASE}/customers/${customerId}/test-config`
  )
}

export async function createTestConfig(
  data: Omit<TestConfiguration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestConfiguration> {
  return apiFetch<TestConfiguration>(
    `${API_BASE}/customers/${data.customerId}/test-config`,
    {
      method: 'POST',
      ...jsonBody(data),
    }
  )
}

export async function updateTestConfig(
  id: string,
  data: Partial<TestConfiguration>
): Promise<TestConfiguration> {
  return apiFetch<TestConfiguration>(`${API_BASE}/test-config/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  })
}

// Test Runs API
export async function getTestRunsByCustomerId(
  customerId: string
): Promise<TestRun[]> {
  return apiFetch<TestRun[]>(`${API_BASE}/customers/${customerId}/test-runs`)
}

export async function getAllTestRuns(): Promise<TestRun[]> {
  return apiFetch<TestRun[]>(`${API_BASE}/test-runs`)
}

export async function createTestRun(
  data: Omit<TestRun, 'id' | 'createdAt'>
): Promise<TestRun> {
  return apiFetch<TestRun>(`${API_BASE}/test-runs`, {
    method: 'POST',
    ...jsonBody(data),
  })
}

export async function updateTestRun(
  id: string,
  data: Partial<TestRun>
): Promise<TestRun> {
  return apiFetch<TestRun>(`${API_BASE}/test-runs/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  })
}

// Reports API
export async function getReportsByCustomerId(
  customerId: string
): Promise<Report[]> {
  return apiFetch<Report[]>(`${API_BASE}/customers/${customerId}/reports`)
}

export async function getAllReports(): Promise<Report[]> {
  return apiFetch<Report[]>(`${API_BASE}/reports`)
}

export async function getReportById(id: string): Promise<Report | null> {
  try {
    return await apiFetch<Report>(`${API_BASE}/reports/${id}`)
  } catch (error) {
    if ((error as Error).message.toLowerCase().includes('not found')) {
      return null
    }
    throw error
  }
}

export async function createReport(
  data: Omit<Report, 'id' | 'createdAt'>
): Promise<Report> {
  return apiFetch<Report>(`${API_BASE}/reports`, {
    method: 'POST',
    ...jsonBody(data),
  })
}

export async function updateReport(
  id: string,
  data: Partial<Report>
): Promise<Report> {
  return apiFetch<Report>(`${API_BASE}/reports/${id}`, {
    method: 'PUT',
    ...jsonBody(data),
  })
}

// Customer consents
export async function getConsentsByCustomerId(
  customerId: string
): Promise<CustomerConsent[]> {
  return apiFetch<CustomerConsent[]>(
    `${API_BASE}/customers/${customerId}/consents`
  )
}

export async function uploadConsent(
  customerId: string,
  file: File,
  agreedAt?: string
): Promise<CustomerConsent> {
  const formData = new FormData()
  formData.append('file', file)
  if (agreedAt) {
    formData.append('agreedAt', agreedAt)
  }
  return apiFetch<CustomerConsent>(
    `${API_BASE}/customers/${customerId}/consents`,
    {
      method: 'POST',
      body: formData,
    }
  )
}

export async function deleteConsent(id: string): Promise<void> {
  await apiFetch<void>(`${API_BASE}/consents/${id}`, { method: 'DELETE' })
}

// Helper: Get last and next run for a customer
export async function getCustomerRunInfo(customerId: string): Promise<{
  lastRun: TestRun | null
  nextScheduledRun: TestRun | null
}> {
  const runs = await getTestRunsByCustomerId(customerId)
  const completedRuns = runs
    .filter((r) => r.status === 'Completed')
    .sort(
      (a, b) =>
        new Date(b.endTime || b.createdAt).getTime() -
        new Date(a.endTime || a.createdAt).getTime()
    )
  const scheduledRuns = runs
    .filter((r) => r.status === 'Scheduled')
    .sort(
      (a, b) =>
        new Date(a.scheduledTime).getTime() -
        new Date(b.scheduledTime).getTime()
    )
  return {
    lastRun: completedRuns[0] || null,
    nextScheduledRun: scheduledRuns[0] || null,
  }
}
