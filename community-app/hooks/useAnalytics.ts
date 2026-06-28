import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import {
  type AnalyticsOverview,
  type TrendPoint,
  type HeatmapPoint,
  type Prediction,
} from '../lib/types'

export function useAnalyticsOverview(departmentId?: string, period = '30d') {
  return useQuery({
    queryKey: ['analytics', 'overview', departmentId, period],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('period', period)
      if (departmentId) query.set('department_id', departmentId)

      const { data, error } = await supabase.functions.invoke(`analytics/overview?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { kpis: { total: 0, pending: 0, resolved: 0, verified: 0, critical: 0, avgResolutionDays: 0 }, by_status: {} }
      }
      return data as { kpis: AnalyticsOverview['kpis']; by_status: Record<string, number> }
    },
  })
}

export function useAnalyticsTrends(departmentId?: string, period = '30d', granularity = 'day') {
  return useQuery({
    queryKey: ['analytics', 'trends', departmentId, period, granularity],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('period', period)
      query.set('granularity', granularity)
      if (departmentId) query.set('department_id', departmentId)

      const { data, error } = await supabase.functions.invoke(`analytics/trends?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { reported: [], resolved: [], verified: [] }
      }
      return data as {
        reported: TrendPoint[]
        resolved: TrendPoint[]
        verified: TrendPoint[]
      }
    },
  })
}

export function useAnalyticsHeatmap(bounds?: string, departmentId?: string) {
  return useQuery({
    queryKey: ['analytics', 'heatmap', bounds, departmentId],
    queryFn: async () => {
      const query = new URLSearchParams()
      if (bounds) query.set('bounds', bounds)
      if (departmentId) query.set('department_id', departmentId)

      const { data, error } = await supabase.functions.invoke(`analytics/heatmap?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { points: [] }
      }
      return data as { points: HeatmapPoint[] }
    },
    enabled: !!bounds,
  })
}

export function useAnalyticsPredictions() {
  return useQuery({
    queryKey: ['analytics', 'predictions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('analytics/predictions', {
        method: 'GET',
      })
      if (error || !data) return null
      return data as Prediction
    },
  })
}
