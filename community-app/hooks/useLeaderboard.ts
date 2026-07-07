import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { type LeaderboardEntry } from '../lib/types'

interface LeaderboardParams {
  scope?: 'city' | 'ward'
  ward?: string
  period?: 'all_time' | 'this_month' | 'this_week'
  limit?: number
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  my_rank: { rank: number; total: number } | null
}

export function useLeaderboard(params: LeaderboardParams = {}) {
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async () => {
      const searchParams = new URLSearchParams()
      searchParams.set('scope', params.scope ?? 'city')
      searchParams.set('period', params.period ?? 'all_time')
      if (params.ward) searchParams.set('ward', params.ward)

      const data = await apiGet<LeaderboardResponse>(
        `/leaderboard?${searchParams.toString()}`
      )
      return data
    },
    staleTime: 30_000,
  })
}

export function useProfileStats(userId: string) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      const data = await apiGet<{
        hero_score: number
        total_reports: number
        total_resolved: number
        total_verified: number
        rank: number
        badges: { slug: string; awarded_at: string; name: string }[]
        recent_issues: unknown[]
      }>(`/profile/${userId}/stats`)

      return data
    },
    enabled: !!userId,
  })
}
