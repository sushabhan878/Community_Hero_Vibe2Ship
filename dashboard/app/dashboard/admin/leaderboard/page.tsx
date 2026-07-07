'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, RefreshCw, Medal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import { formatRelativeTime } from '@/lib/utils'
import type { Profile } from '@/types'

const TOP_3_MEDALS = ['🥇', '🥈', '🥉']

export default function AdminLeaderboardPage() {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .is('deleted_at', null)
      .order('hero_score', { ascending: false })
      .limit(20)
    if (data) setUsers(data)
    setLoading(false)
  }, [])

  useEffect(() => { fetchLeaderboard() }, [fetchLeaderboard])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-zinc-500">Top 20 citizens by Hero Score</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeaderboard}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="w-12 px-4 py-3 text-left font-medium text-zinc-500">#</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-zinc-500">Role</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Reports</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Resolved</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Verified</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Hero Score</th>
                  <th className="px-4 py-3 text-right font-medium text-zinc-500">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const rank = index + 1
                  const isTop3 = rank <= 3
                  return (
                    <tr key={user.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center text-base">
                          {isTop3 ? (
                            <span className="text-lg">{TOP_3_MEDALS[index]}</span>
                          ) : (
                            <span className="text-zinc-400 font-medium">#{rank}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.name} size="sm" />
                          <div>
                            <p className="font-medium">{user.name}</p>
                            <p className="text-xs text-zinc-400">{user.email ?? '—'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.role === 'super_admin' ? 'warning' : user.role === 'department_admin' ? 'success' : 'info'}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">{user.total_reports}</td>
                      <td className="px-4 py-3 text-right text-emerald-600 font-medium">{user.total_resolved}</td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">{user.total_verified}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center gap-1 text-lg font-bold text-amber-600">
                          <Trophy className="h-4 w-4" />
                          {user.hero_score}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500">{formatRelativeTime(user.created_at)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {!loading && users.length === 0 && (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-zinc-400">
            <div className="text-center">
              <Medal className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2">No users found.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
