import { create } from 'zustand'

export type ToastVariant = 'success' | 'error' | 'info' | 'warning'

export interface Toast {
  id: string
  title: string
  message?: string
  variant: ToastVariant
  duration: number
}

export interface ToastInput {
  title: string
  message?: string
  variant: ToastVariant
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: ToastInput) => string
  removeToast: (id: string) => void
  clearToasts: () => void
}

const DEFAULT_DURATION = 3800

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  addToast: (toast) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const entry: Toast = {
      id,
      duration: toast.duration || DEFAULT_DURATION,
      ...toast,
    }
    set((state) => ({
      toasts: [entry, ...state.toasts].slice(0, 6),
    }))
    return id
  },
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}))

export function showToast(toast: ToastInput) {
  useToastStore.getState().addToast(toast)
}
