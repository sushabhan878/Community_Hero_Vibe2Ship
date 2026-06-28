'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Trophy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import type { LeaderboardData } from '@/types'

const BADGE_NAMES: Record<string, string> = {
  first_report: 'First Responder',
  neighborhood_watch: 'Neighborhood Watch',
  community_pillar: 'Community Pillar',
  problem_solver: 'Problem Solver',
  speed_reporter: 'Speed Reporter',
  top_hero: 'City Hero',
  verified_reporter: 'Verified Reporter',
  super_verifier: 'Super Verifier',
}

const BADGE_ICONS: Record<string, string> = {
  first_report: '🥇', neighborhood_watch: '👁️', community_pillar: '🧩',
  problem_solver: '🏗️', speed_reporter: '⚡', top_hero: '🏆',
  verified_reporter: '✅', super_verifier: '👍',
}

const TOP_3_STYLES = ['bg-yellow-50 border-yellow-300 dark:bg-yellow-950/30', 'bg-gray-50 border-gray-300 dark:bg-gray-800', 'bg-orange-50 border-orange-300 dark:bg-orange-950/30']
const TOP_3_ICONS = ['🥇', '🥈', '🥉']

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchLeaderboard = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: result } = await supabase.functions.invoke('leaderboard', {
      body: { scope: 'city', period: 'all_time', limit: 50 },
    })
    if (result) setData(result)
    setLoading(false)
  }

  useEffect(() => { fetchLeaderboard() }, [])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leaderboard</h1>
          <p className="text-sm text-zinc-500">Top community contributors</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLeaderboard}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {data.leaderboard.map((entry) => {
              const isTop3 = entry.rank <= 3
              return (
                <div
                  key={entry.user.id}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/50 ${isTop3 ? TOP_3_STYLES[entry.rank - 1] : 'border-zinc-200 dark:border-zinc-800'}`}
                >
                  <div className="flex w-10 items-center justify-center text-lg font-bold">
                    {isTop3 ? <span className="text-2xl">{TOP_3_ICONS[entry.rank - 1]}</span> : `#${entry.rank}`}
                  </div>
                  <Avatar name={entry.user.name} src={entry.user.avatar_url} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{entry.user.name}</p>
                    <p className="text-xs text-zinc-500">
                      {entry.user.total_reports} reports · {entry.user.total_resolved} resolved
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-0.5">
                      {entry.user.badges.slice(0, 3).map((b) => (
                        <span key={b} title={BADGE_NAMES[b] ?? b}>{BADGE_ICONS[b] ?? '🏅'}</span>
                      ))}
                      {entry.user.badges.length > 3 && (
                        <span className="text-xs text-zinc-400">+{entry.user.badges.length - 3}</span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold">{entry.user.hero_score}</p>
                      <p className="text-[10px] text-zinc-400">pts</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Your Rank</CardTitle>
              </CardHeader>
              <CardContent>
                {data.my_rank ? (
                  <div className="text-center">
                    <p className="text-3xl font-bold">#{data.my_rank.rank}</p>
                    <p className="text-sm text-zinc-500">of {data.total_participants}</p>
                    <p className="mt-2 text-sm text-zinc-400">
                      Top {data.my_rank.percentile}% · {data.my_rank.hero_score} pts
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 text-center">Rank data unavailable</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Badge Gallery</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(BADGE_NAMES).map(([slug, name]) => (
                    <div key={slug} className="flex items-center gap-2 rounded-lg border border-zinc-200 p-2 dark:border-zinc-800">
                      <span className="text-lg">{BADGE_ICONS[slug] ?? '🏅'}</span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium truncate">{name}</p>
                        <p className="text-[10px] text-zinc-400">{slug.replace('_', ' ')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-zinc-400">
            <div className="text-center">
              <Trophy className="mx-auto h-8 w-8 text-zinc-300" />
              <p className="mt-2">No leaderboard data available yet.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
