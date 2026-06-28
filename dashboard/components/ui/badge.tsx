import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'danger' | 'info'
}

const variantStyles = {
  default: 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200',
  outline: 'border border-zinc-300 text-zinc-700 dark:border-zinc-600 dark:text-zinc-300',
  success: 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800',
  warning: 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
  danger: 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  info: 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        variantStyles[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}
