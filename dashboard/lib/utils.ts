import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffSec < 60) return 'just now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function shortUUID(id: string): string {
  return id.slice(-6)
}

export function severityColor(severity: string): string {
  const map: Record<string, string> = {
    critical: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    high: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
    medium: 'text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800',
    low: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  }
  return map[severity] ?? map.low
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: 'text-gray-600 bg-gray-100 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
    ai_processed: 'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
    verified: 'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-950 dark:text-purple-400 dark:border-purple-800',
    assigned: 'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800',
    in_progress: 'text-sky-600 bg-sky-50 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800',
    resolved: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
    rejected: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
    closed: 'text-gray-500 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  }
  return map[status] ?? map.pending
}

export function categoryIcon(category: string): string {
  const map: Record<string, string> = {
    pothole: '🕳️', road_damage: '🛣️', water_leak: '💧', sewage: '🚽',
    streetlight: '💡', garbage: '🗑️', illegal_dumping: '🚮',
    fallen_tree: '🌳', park_damage: '🏞️', other: '📌',
  }
  return map[category] ?? '📌'
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    pending: 'Pending', ai_processed: 'AI Processed', verified: 'Verified',
    assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved',
    rejected: 'Rejected', closed: 'Closed',
  }
  return map[status] ?? status
}

export function severityLabel(severity: string): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}
