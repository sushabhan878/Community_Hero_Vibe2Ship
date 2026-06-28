'use client'

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  type: ToastType
  message: string
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextType>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
}

const colors = {
  success: 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
  error: 'border-red-500 bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-300',
  info: 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
  warning: 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now()
    setToasts((prev) => [...prev, { id, type, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((t) => {
          const Icon = icons[t.type]
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border-l-4 px-4 py-3 shadow-lg min-w-[300px] animate-in slide-in-from-right',
                colors[t.type],
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm">{t.message}</p>
              <button
                onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                className="shrink-0 rounded p-0.5 hover:opacity-70"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
