import { create } from 'zustand'
import type {
  Customer,
  Scope,
  TestConfiguration,
  TestRun,
  Report,
} from '../types/admin'
import * as adminApi from '../services/adminApi'

interface AdminState {
  // Data
  customers: Customer[]
  scopes: Record<string, Scope[]> // customerId -> scopes
  testConfigs: Record<string, TestConfiguration | null> // customerId -> config
  testRuns: Record<string, TestRun[]> // customerId -> runs
  reports: Record<string, Report[]> // customerId -> reports
  allReports: Report[]

  // UI state
  selectedCustomerId: string | null
  loading: boolean
  error: string | null

  // Actions
  loadCustomers: () => Promise<void>
  loadCustomer: (id: string) => Promise<void>
  createCustomer: (
    data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<Customer>
  updateCustomer: (id: string, data: Partial<Customer>) => Promise<void>
  deleteCustomer: (id: string) => Promise<void>

  loadScopes: (customerId: string) => Promise<void>
  createScope: (data: Omit<Scope, 'id' | 'createdAt'>) => Promise<void>
  updateScope: (
    id: string,
    customerId: string,
    data: Partial<Scope>
  ) => Promise<void>
  deleteScope: (id: string, customerId: string) => Promise<void>

  loadTestConfig: (customerId: string) => Promise<void>
  saveTestConfig: (
    data: Omit<TestConfiguration, 'id' | 'createdAt' | 'updatedAt'>
  ) => Promise<void>

  loadTestRuns: (customerId: string) => Promise<void>
  loadAllTestRuns: () => Promise<void>

  loadReports: (customerId: string) => Promise<void>
  loadAllReports: () => Promise<void>
  updateReport: (id: string, data: Partial<Report>) => Promise<void>

  setSelectedCustomerId: (id: string | null) => void
  setError: (error: string | null) => void
}

export const useAdminStore = create<AdminState>((set, get) => ({
  // Initial state
  customers: [],
  scopes: {},
  testConfigs: {},
  testRuns: {},
  reports: {},
  allReports: [],
  selectedCustomerId: null,
  loading: false,
  error: null,

  // Load all customers
  loadCustomers: async () => {
    set({ loading: true, error: null })
    try {
      const customers = await adminApi.getCustomers()
      set({ customers, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  // Load single customer and related data
  loadCustomer: async (id: string) => {
    set({ loading: true, error: null, selectedCustomerId: id })
    try {
      const customer = await adminApi.getCustomerById(id)
      if (!customer) throw new Error('Customer not found')

      const [scopes, testConfig, testRuns, reports] = await Promise.all([
        adminApi.getScopesByCustomerId(id),
        adminApi.getTestConfigByCustomerId(id),
        adminApi.getTestRunsByCustomerId(id),
        adminApi.getReportsByCustomerId(id),
      ])

      set((state) => ({
        scopes: { ...state.scopes, [id]: scopes },
        testConfigs: { ...state.testConfigs, [id]: testConfig },
        testRuns: { ...state.testRuns, [id]: testRuns },
        reports: { ...state.reports, [id]: reports },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  createCustomer: async (data) => {
    set({ loading: true, error: null })
    try {
      const customer = await adminApi.createCustomer(data)
      set((state) => ({
        customers: [...state.customers, customer],
        loading: false,
      }))
      return customer
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateCustomer: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await adminApi.updateCustomer(id, data)
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteCustomer: async (id) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteCustomer(id)
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        scopes: { ...state.scopes, [id]: [] },
        testConfigs: { ...state.testConfigs, [id]: null },
        testRuns: { ...state.testRuns, [id]: [] },
        reports: { ...state.reports, [id]: [] },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadScopes: async (customerId) => {
    try {
      const scopes = await adminApi.getScopesByCustomerId(customerId)
      set((state) => ({
        scopes: { ...state.scopes, [customerId]: scopes },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  createScope: async (data) => {
    set({ loading: true, error: null })
    try {
      const scope = await adminApi.createScope(data)
      set((state) => ({
        scopes: {
          ...state.scopes,
          [data.customerId]: [...(state.scopes[data.customerId] || []), scope],
        },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateScope: async (id, customerId, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await adminApi.updateScope(id, data)
      set((state) => ({
        scopes: {
          ...state.scopes,
          [customerId]: (state.scopes[customerId] || []).map((s) =>
            s.id === id ? updated : s
          ),
        },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteScope: async (id, customerId) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteScope(id)
      set((state) => ({
        scopes: {
          ...state.scopes,
          [customerId]: (state.scopes[customerId] || []).filter(
            (s) => s.id !== id
          ),
        },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadTestConfig: async (customerId) => {
    try {
      const config = await adminApi.getTestConfigByCustomerId(customerId)
      set((state) => ({
        testConfigs: { ...state.testConfigs, [customerId]: config },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  saveTestConfig: async (data) => {
    set({ loading: true, error: null })
    try {
      const config = await adminApi.createTestConfig(data)
      set((state) => ({
        testConfigs: { ...state.testConfigs, [data.customerId]: config },
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadTestRuns: async (customerId) => {
    try {
      const runs = await adminApi.getTestRunsByCustomerId(customerId)
      set((state) => ({
        testRuns: { ...state.testRuns, [customerId]: runs },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  loadAllTestRuns: async () => {
    try {
      const runs = await adminApi.getAllTestRuns()
      // Group by customer for easier access
      const grouped: Record<string, TestRun[]> = {}
      runs.forEach((run) => {
        if (!grouped[run.customerId]) {
          grouped[run.customerId] = []
        }
        grouped[run.customerId]!.push(run)
      })
      set((state) => ({
        testRuns: { ...state.testRuns, ...grouped },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  loadReports: async (customerId) => {
    try {
      const reports = await adminApi.getReportsByCustomerId(customerId)
      set((state) => ({
        reports: { ...state.reports, [customerId]: reports },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  loadAllReports: async () => {
    set({ loading: true, error: null })
    try {
      const reports = await adminApi.getAllReports()
      set({ allReports: reports, loading: false })
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateReport: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await adminApi.updateReport(id, data)
      set((state) => ({
        allReports: state.allReports.map((r) => (r.id === id ? updated : r)),
        reports: Object.fromEntries(
          Object.entries(state.reports).map(([customerId, reports]) => [
            customerId,
            reports.map((r) => (r.id === id ? updated : r)),
          ])
        ),
        loading: false,
      }))
    } catch (error) {
      set({ error: (error as Error).message, loading: false })
    }
  },

  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  setError: (error) => set({ error }),
}))
