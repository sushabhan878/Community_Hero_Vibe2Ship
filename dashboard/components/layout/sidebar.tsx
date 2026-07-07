'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, AlertTriangle, Trophy,
  Users, Building2, ChevronLeft, X,
} from 'lucide-react'
import { NAV_ITEMS, ADMIN_NAV_ITEMS } from '@/lib/constants'

const iconMap: Record<string, React.ElementType> = {
  LayoutDashboard, AlertTriangle, Trophy, Users, Building2,
}

interface SidebarProps {
  role: string
  open: boolean
  onClose: () => void
}

export function Sidebar({ role, open, onClose }: SidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === href
    return pathname.startsWith(href)
  }

  const content = (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
      <div className="flex h-16 items-center gap-3 border-b border-zinc-200 px-6 dark:border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 text-sm font-bold">
          CH
        </div>
        <span className="text-sm font-semibold">Community Hero</span>
        <button onClick={onClose} className="ml-auto rounded-md p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden">
          <X className="h-4 w-4" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        <p className="px-3 text-xs font-medium uppercase text-zinc-400">Main</p>
        {NAV_ITEMS.filter((item) => item.roles.includes(role as never)).map((item) => {
          const Icon = iconMap[item.icon]
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                  : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {item.label}
            </Link>
          )
        })}

        {role === 'super_admin' && (
          <>
            <div className="pt-4">
              <p className="px-3 text-xs font-medium uppercase text-zinc-400">Admin</p>
            </div>
            {ADMIN_NAV_ITEMS.map((item) => {
              const Icon = iconMap[item.icon]
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive(item.href)
                      ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100'
                      : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100',
                  )}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              )
            })}
          </>
        )}
      </nav>

      <div className="border-t border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-xs text-zinc-400">Community Hero AI v0.1</p>
      </div>
    </div>
  )

  return (
    <>
      <aside className="hidden w-60 shrink-0 lg:block">{content}</aside>
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={onClose} />
          <aside className="fixed inset-y-0 left-0 z-50 w-60">{content}</aside>
        </div>
      )}
    </>
  )
}
