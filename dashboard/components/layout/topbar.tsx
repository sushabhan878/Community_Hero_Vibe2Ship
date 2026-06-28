'use client'

import { usePathname } from 'next/navigation'
import { Menu, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NotificationBell } from './notification-bell'
import { UserMenu } from './user-menu'

interface TopbarProps {
  onMenuClick: () => void
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const pathname = usePathname()

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).replace(/-/g, ' '))

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-900/80">
      <button
        onClick={onMenuClick}
        className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <nav className="hidden items-center gap-1.5 text-sm text-zinc-500 sm:flex">
        <span className="font-medium text-zinc-900 dark:text-zinc-100">Dashboard</span>
        {segments.slice(1).map((seg) => (
          <span key={seg} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5" />
            <span className={cn(seg === segments[segments.length - 1] && 'text-zinc-900 dark:text-zinc-100 font-medium')}>
              {seg}
            </span>
          </span>
        ))}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  )
}
