import type {
  Customer,
  Scope,
  TestConfiguration,
  TestRun,
  Report,
  SeveritySummary,
} from '../types/admin'

// Simulate API latency
function delay(ms = 300): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// In-memory storage for demo (replace with real API calls)
let customersStore: Customer[] = []
let scopesStore: Scope[] = []
let testConfigsStore: TestConfiguration[] = []
let testRunsStore: TestRun[] = []
let reportsStore: Report[] = []

// Generate IDs
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Customers API
export async function getCustomers(): Promise<Customer[]> {
  await delay()
  return [...customersStore]
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  await delay()
  return customersStore.find((c) => c.id === id) || null
}

export async function createCustomer(
  data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Customer> {
  await delay()
  const customer: Customer = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  customersStore.push(customer)
  return customer
}

export async function updateCustomer(
  id: string,
  data: Partial<Customer>
): Promise<Customer> {
  await delay()
  const index = customersStore.findIndex((c) => c.id === id)
  if (index === -1) throw new Error('Customer not found')
  const updated = {
    ...customersStore[index],
    ...data,
    updatedAt: new Date().toISOString(),
  } as Customer
  customersStore[index] = updated
  return updated
}

export async function deleteCustomer(id: string): Promise<void> {
  await delay()
  customersStore = customersStore.filter((c) => c.id !== id)
  // Also delete related scopes, configs, etc.
  scopesStore = scopesStore.filter((s) => s.customerId !== id)
  testConfigsStore = testConfigsStore.filter((tc) => tc.customerId !== id)
}

// Scopes API
export async function getScopesByCustomerId(
  customerId: string
): Promise<Scope[]> {
  await delay()
  return scopesStore.filter((s) => s.customerId === customerId)
}

export async function createScope(
  data: Omit<Scope, 'id' | 'createdAt'>
): Promise<Scope> {
  await delay()
  const scope: Scope = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  scopesStore.push(scope)
  return scope
}

export async function updateScope(
  id: string,
  data: Partial<Scope>
): Promise<Scope> {
  await delay()
  const index = scopesStore.findIndex((s) => s.id === id)
  if (index === -1) throw new Error('Scope not found')
  const updated = {
    ...scopesStore[index],
    ...data,
  } as Scope
  scopesStore[index] = updated
  return updated
}

export async function deleteScope(id: string): Promise<void> {
  await delay()
  scopesStore = scopesStore.filter((s) => s.id !== id)
}

// Test Configurations API
export async function getTestConfigByCustomerId(
  customerId: string
): Promise<TestConfiguration | null> {
  await delay()
  return testConfigsStore.find((tc) => tc.customerId === customerId) || null
}

export async function createTestConfig(
  data: Omit<TestConfiguration, 'id' | 'createdAt' | 'updatedAt'>
): Promise<TestConfiguration> {
  await delay()
  const config: TestConfiguration = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  // Remove existing config for this customer if any
  testConfigsStore = testConfigsStore.filter(
    (tc) => tc.customerId !== data.customerId
  )
  testConfigsStore.push(config)
  return config
}

export async function updateTestConfig(
  id: string,
  data: Partial<TestConfiguration>
): Promise<TestConfiguration> {
  await delay()
  const index = testConfigsStore.findIndex((tc) => tc.id === id)
  if (index === -1) throw new Error('Test configuration not found')
  const updated = {
    ...testConfigsStore[index],
    ...data,
    updatedAt: new Date().toISOString(),
  } as TestConfiguration
  testConfigsStore[index] = updated
  return updated
}

// Test Runs API
export async function getTestRunsByCustomerId(
  customerId: string
): Promise<TestRun[]> {
  await delay()
  return testRunsStore
    .filter((tr) => tr.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

export async function getAllTestRuns(): Promise<TestRun[]> {
  await delay()
  return [...testRunsStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function createTestRun(
  data: Omit<TestRun, 'id' | 'createdAt'>
): Promise<TestRun> {
  await delay()
  const testRun: TestRun = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  testRunsStore.push(testRun)
  return testRun
}

export async function updateTestRun(
  id: string,
  data: Partial<TestRun>
): Promise<TestRun> {
  await delay()
  const index = testRunsStore.findIndex((tr) => tr.id === id)
  if (index === -1) throw new Error('Test run not found')
  const updated = {
    ...testRunsStore[index],
    ...data,
  } as TestRun
  testRunsStore[index] = updated
  return updated
}

// Reports API
export async function getReportsByCustomerId(
  customerId: string
): Promise<Report[]> {
  await delay()
  return reportsStore
    .filter((r) => r.customerId === customerId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
}

export async function getAllReports(): Promise<Report[]> {
  await delay()
  return [...reportsStore].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
}

export async function getReportById(id: string): Promise<Report | null> {
  await delay()
  return reportsStore.find((r) => r.id === id) || null
}

export async function createReport(
  data: Omit<Report, 'id' | 'createdAt'>
): Promise<Report> {
  await delay()
  const report: Report = {
    ...data,
    id: generateId(),
    createdAt: new Date().toISOString(),
  }
  reportsStore.push(report)
  return report
}

export async function updateReport(
  id: string,
  data: Partial<Report>
): Promise<Report> {
  await delay()
  const index = reportsStore.findIndex((r) => r.id === id)
  if (index === -1) throw new Error('Report not found')
  const updated = {
    ...reportsStore[index],
    ...data,
  } as Report
  reportsStore[index] = updated
  return updated
}

// Helper: Get last and next run for a customer
export async function getCustomerRunInfo(customerId: string): Promise<{
  lastRun: TestRun | null
  nextScheduledRun: TestRun | null
}> {
  await delay()
  const runs = testRunsStore.filter((tr) => tr.customerId === customerId)
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
