import { create } from 'zustand'
import type {
  Customer,
  CustomerConsent,
  CustomerNote,
  Scope,
  TestConfiguration,
  TestRun,
  Report,
} from '../types/admin'
import * as adminApi from '../services/adminApi'
import { showToast } from './toastStore'

interface AdminState {
  // Data
  customers: Customer[]
  scopes: Record<string, Scope[]> // customerId -> scopes
  testConfigs: Record<string, TestConfiguration | null> // customerId -> config
  testRuns: Record<string, TestRun[]> // customerId -> runs
  reports: Record<string, Report[]> // customerId -> reports
  consents: Record<string, CustomerConsent[]> // customerId -> consent docs
  notes: Record<string, CustomerNote[]> // customerId -> notes (timestamped list)
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

  loadConsents: (customerId: string) => Promise<void>
  uploadConsent: (customerId: string, file: File, agreedAt?: string) => Promise<CustomerConsent>
  deleteConsent: (id: string, customerId: string) => Promise<void>

  loadNotes: (customerId: string) => Promise<void>
  addNote: (customerId: string, content: string) => Promise<CustomerNote>
  deleteNote: (id: string, customerId: string) => Promise<void>

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
  consents: {},
  notes: {},
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

      const [scopes, testConfig, testRuns, reports, consents, notes] = await Promise.all([
        adminApi.getScopesByCustomerId(id),
        adminApi.getTestConfigByCustomerId(id),
        adminApi.getTestRunsByCustomerId(id),
        adminApi.getReportsByCustomerId(id),
        adminApi.getConsentsByCustomerId(id),
        adminApi.getNotesByCustomerId(id),
      ])

      set((state) => ({
        customers: state.customers.some((c) => c.id === id)
          ? state.customers.map((c) => (c.id === id ? customer : c))
          : [customer, ...state.customers],
        scopes: { ...state.scopes, [id]: scopes },
        testConfigs: { ...state.testConfigs, [id]: testConfig },
        testRuns: { ...state.testRuns, [id]: testRuns },
        reports: { ...state.reports, [id]: reports },
        consents: { ...state.consents, [id]: consents },
        notes: { ...state.notes, [id]: notes },
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
      showToast({
        variant: 'success',
        title: 'Customer created',
        message: `${customer.companyName} added successfully.`,
      })
      set((state) => ({
        customers: [...state.customers, customer],
        loading: false,
      }))
      return customer
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Customer creation failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  updateCustomer: async (id, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await adminApi.updateCustomer(id, data)
      showToast({
        variant: 'success',
        title: 'Customer updated',
        message: `${updated.companyName} saved successfully.`,
      })
      set((state) => ({
        customers: state.customers.map((c) => (c.id === id ? updated : c)),
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Customer update failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteCustomer: async (id) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteCustomer(id)
      showToast({
        variant: 'success',
        title: 'Customer deleted',
        message: 'The customer record was removed.',
      })
      set((state) => ({
        customers: state.customers.filter((c) => c.id !== id),
        scopes: { ...state.scopes, [id]: [] },
        testConfigs: { ...state.testConfigs, [id]: null },
        testRuns: { ...state.testRuns, [id]: [] },
        reports: { ...state.reports, [id]: [] },
        consents: { ...state.consents, [id]: [] },
        notes: { ...state.notes, [id]: [] },
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Customer deletion failed',
        message: (error as Error).message,
      })
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
      showToast({
        variant: 'success',
        title: 'Scope added',
        message: 'Scope item saved successfully.',
      })
      set((state) => ({
        scopes: {
          ...state.scopes,
          [data.customerId]: [...(state.scopes[data.customerId] || []), scope],
        },
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Scope creation failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  updateScope: async (id, customerId, data) => {
    set({ loading: true, error: null })
    try {
      const updated = await adminApi.updateScope(id, data)
      showToast({
        variant: 'success',
        title: 'Scope updated',
        message: 'Scope changes saved.',
      })
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
      showToast({
        variant: 'error',
        title: 'Scope update failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  deleteScope: async (id, customerId) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteScope(id)
      showToast({
        variant: 'success',
        title: 'Scope removed',
        message: 'Scope item deleted successfully.',
      })
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
      showToast({
        variant: 'error',
        title: 'Scope deletion failed',
        message: (error as Error).message,
      })
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
      showToast({
        variant: 'success',
        title: 'Test configuration saved',
        message: 'Scheduling preferences updated.',
      })
      set((state) => ({
        testConfigs: { ...state.testConfigs, [data.customerId]: config },
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Test configuration failed',
        message: (error as Error).message,
      })
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
      showToast({
        variant: 'success',
        title: 'Report updated',
        message: 'Report status saved successfully.',
      })
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
      showToast({
        variant: 'error',
        title: 'Report update failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadConsents: async (customerId) => {
    try {
      const consents = await adminApi.getConsentsByCustomerId(customerId)
      set((state) => ({
        consents: { ...state.consents, [customerId]: consents },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  uploadConsent: async (customerId, file, agreedAt) => {
    set({ loading: true, error: null })
    try {
      const consent = await adminApi.uploadConsent(customerId, file, agreedAt)
      showToast({
        variant: 'success',
        title: 'Consent uploaded',
        message: `${consent.fileName} uploaded successfully.`,
      })
      set((state) => ({
        consents: {
          ...state.consents,
          [customerId]: [consent, ...(state.consents[customerId] || [])],
        },
        loading: false,
      }))
      return consent
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Consent upload failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteConsent: async (id, customerId) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteConsent(id)
      showToast({
        variant: 'success',
        title: 'Consent removed',
        message: 'The consent document was deleted.',
      })
      set((state) => ({
        consents: {
          ...state.consents,
          [customerId]: (state.consents[customerId] || []).filter(
            (c) => c.id !== id
          ),
        },
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Consent deletion failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  loadNotes: async (customerId) => {
    try {
      const notes = await adminApi.getNotesByCustomerId(customerId)
      set((state) => ({
        notes: { ...state.notes, [customerId]: notes },
      }))
    } catch (error) {
      set({ error: (error as Error).message })
    }
  },

  addNote: async (customerId, content) => {
    set({ loading: true, error: null })
    try {
      const note = await adminApi.createNote({ customerId, content })
      showToast({
        variant: 'success',
        title: 'Note added',
        message: 'Your note was saved.',
      })
      set((state) => ({
        notes: {
          ...state.notes,
          [customerId]: [note, ...(state.notes[customerId] || [])],
        },
        loading: false,
      }))
      return note
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Note creation failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
      throw error
    }
  },

  deleteNote: async (id, customerId) => {
    set({ loading: true, error: null })
    try {
      await adminApi.deleteNote(id)
      showToast({
        variant: 'success',
        title: 'Note deleted',
        message: 'The note was removed.',
      })
      set((state) => ({
        notes: {
          ...state.notes,
          [customerId]: (state.notes[customerId] || []).filter(
            (n) => n.id !== id
          ),
        },
        loading: false,
      }))
    } catch (error) {
      showToast({
        variant: 'error',
        title: 'Note deletion failed',
        message: (error as Error).message,
      })
      set({ error: (error as Error).message, loading: false })
    }
  },

  setSelectedCustomerId: (id) => set({ selectedCustomerId: id }),
  setError: (error) => set({ error }),
}))
