import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type LeaderboardEntry } from '../lib/types'

interface LeaderboardParams {
  scope?: 'city' | 'ward'
  ward?: string
  period?: 'all_time' | 'this_month' | 'this_week'
  limit?: number
}

export function useLeaderboard(params: LeaderboardParams = {}) {
  return useQuery({
    queryKey: ['leaderboard', params],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('scope', params.scope ?? 'city')
      query.set('period', params.period ?? 'all_time')
      query.set('limit', String(params.limit ?? 50))
      if (params.ward) query.set('ward', params.ward)

      const { data, error } = await supabase.functions.invoke(`leaderboard?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { entries: [], my_rank: { rank: 0, total: 0 } }
      }
      return data as { entries: LeaderboardEntry[]; my_rank: { rank: number; total: number } }
    },
  })
}

export function useProfileStats(userId: string) {
  return useQuery({
    queryKey: ['profile-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(`profile/${userId}/stats`, {
        method: 'GET',
      })
      if (error || !data) {
        return {
          hero_score: 0,
          total_reports: 0,
          total_resolved: 0,
          total_verified: 0,
          rank: 0,
          badges: [],
          recent_issues: [],
        }
      }
      return data as {
        hero_score: number
        total_reports: number
        total_resolved: number
        total_verified: number
        rank: number
        badges: { slug: string; awarded_at: string; name: string }[]
        recent_issues: unknown[]
      }
    },
    enabled: !!userId,
  })
}
