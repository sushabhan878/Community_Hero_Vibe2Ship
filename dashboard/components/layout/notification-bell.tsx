'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Notification } from '@/types'

export function NotificationBell() {
  const [unread, setUnread] = useState(0)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const supabase = createClient()

    const fetchUnread = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false)
      setUnread(count ?? 0)
    }

    fetchUnread()

    const channel = supabase
      .channel('notif-bell')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => {
        fetchUnread()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const fetchPreview = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)
    setNotifications(data ?? [])
    setOpen(true)
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={fetchPreview}
        className="relative rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-80 rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <p className="text-sm font-semibold">Notifications</p>
          </div>
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500">All caught up!</p>
            ) : (
              notifications.map((n) => (
                <Link
                  key={n.id}
                  href={n.issue_id ? `/dashboard/issues/${n.issue_id}` : '/dashboard/notifications'}
                  onClick={() => setOpen(false)}
                  className="block border-b border-zinc-100 px-4 py-3 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{n.body}</p>
                  <p className="mt-1 text-[10px] text-zinc-400">{formatRelativeTime(n.created_at)}</p>
                </Link>
              ))
            )}
          </div>
          <Link
            href="/dashboard/notifications"
            onClick={() => setOpen(false)}
            className="block border-t border-zinc-200 px-4 py-3 text-center text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            View All Notifications →
          </Link>
        </div>
      )}
    </div>
  )
}
