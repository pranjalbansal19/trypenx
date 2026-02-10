import { useEffect } from 'react'
import type { CSSProperties } from 'react'
import {
  CheckCircle2,
  XCircle,
  Info,
  AlertTriangle,
  X,
} from 'lucide-react'
import { useToastStore, type Toast, type ToastVariant } from '../state/toastStore'

const variantStyles: Record<ToastVariant, { icon: JSX.Element; ring: string; bar: string }> =
  {
    success: {
      icon: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
      ring: 'ring-emerald-100',
      bar: 'bg-emerald-500',
    },
    error: {
      icon: <XCircle className="h-5 w-5 text-rose-600" />,
      ring: 'ring-rose-100',
      bar: 'bg-rose-500',
    },
    info: {
      icon: <Info className="h-5 w-5 text-sky-600" />,
      ring: 'ring-sky-100',
      bar: 'bg-sky-500',
    },
    warning: {
      icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
      ring: 'ring-amber-100',
      bar: 'bg-amber-500',
    },
  }

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast)
  const styles = variantStyles[toast.variant]

  useEffect(() => {
    const timer = window.setTimeout(() => removeToast(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [toast.id, toast.duration, removeToast])

  return (
    <div
      className={`toast-enter relative overflow-hidden rounded-xl border border-slate-200 bg-white/95 shadow-[0_18px_50px_-24px_rgba(15,23,42,0.55)] ring-1 ${styles.ring} backdrop-blur`}
      style={{ '--toast-duration': `${toast.duration}ms` } as CSSProperties}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-50">
          {styles.icon}
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold text-slate-900">{toast.title}</div>
          {toast.message ? (
            <div className="mt-1 text-sm text-slate-600">{toast.message}</div>
          ) : null}
        </div>
        <button
          onClick={() => removeToast(toast.id)}
          className="text-slate-400 transition hover:text-slate-600"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 h-1 bg-slate-100">
        <div className={`toast-progress h-full ${styles.bar}`} />
      </div>
    </div>
  )
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)

  if (toasts.length === 0) return null

  return (
    <div className="fixed right-4 top-4 z-[60] flex w-[360px] flex-col gap-3">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </div>
  )
}
