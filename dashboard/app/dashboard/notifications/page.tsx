'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { CheckCheck, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Notification as NotificationType } from '@/types'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationType[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const limit = 50
  const { toast } = useToast()

  const fetchNotifications = useCallback(async (pageNum: number) => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const from = (pageNum - 1) * limit
    const to = from + limit - 1

    const { data, count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (data) {
      setNotifications((prev) => (pageNum === 1 ? data : [...prev, ...data]))
    }
    if (count !== null) setTotal(count)
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotifications(1) }, [fetchNotifications])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('notif-page')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
      }, () => { fetchNotifications(1) })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications])

  const markAllRead = async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    toast('All notifications marked as read', 'success')
  }

  const markRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const grouped = notifications.reduce<Record<string, NotificationType[]>>((acc, n) => {
    const date = new Date(n.created_at)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let key: string
    if (date.toDateString() === today.toDateString()) key = 'Today'
    else if (date.toDateString() === yesterday.toDateString()) key = 'Yesterday'
    else if (date.getTime() > today.getTime() - 7 * 86400000) key = 'This Week'
    else key = 'Earlier'

    if (!acc[key]) acc[key] = []
    acc[key].push(n)
    return acc
  }, {})

  const groupOrder = ['Today', 'Yesterday', 'This Week', 'Earlier']
  const hasMore = total > notifications.length

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-sm text-zinc-500">
            {notifications.filter((n) => !n.read).length} unread
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={markAllRead}>
          <CheckCheck className="h-4 w-4" />
          Mark All Read
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16 text-zinc-400">
            <Bell className="h-10 w-10" />
            <p className="mt-4 text-lg font-medium text-zinc-500">All caught up!</p>
            <p className="text-sm">You have no notifications at this time.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupOrder.map((group) => {
            const items = grouped[group]
            if (!items?.length) return null
            return (
              <div key={group}>
                <h3 className="mb-3 text-sm font-medium text-zinc-400">{group}</h3>
                <div className="space-y-2">
                  {items.map((n) => (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3 rounded-xl border p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${n.read ? 'border-zinc-200 dark:border-zinc-800' : 'border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20'}`}
                    >
                      <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-blue-500'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${n.read ? '' : 'font-medium'}`}>{n.title}</p>
                        <p className="mt-0.5 text-xs text-zinc-500 line-clamp-2">{n.body}</p>
                        <div className="mt-2 flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400">{formatRelativeTime(n.created_at)}</span>
                          {n.issue_id && (
                            <Link
                              href={`/dashboard/issues/${n.issue_id}`}
                              className="text-[10px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                              onClick={() => markRead(n.id)}
                            >
                              View Issue →
                            </Link>
                          )}
                        </div>
                      </div>
                      {!n.read && (
                        <button
                          onClick={() => markRead(n.id)}
                          className="shrink-0 text-xs text-zinc-400 hover:text-zinc-600"
                        >
                          Mark read
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {hasMore && (
            <div className="text-center">
              <Button variant="outline" onClick={() => { setPage((p) => p + 1); fetchNotifications(page + 1) }}>
                Load More ({total - notifications.length} remaining)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
