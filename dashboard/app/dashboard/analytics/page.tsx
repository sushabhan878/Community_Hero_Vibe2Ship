'use client'

import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { KpiCard } from '@/components/analytics/kpi-card'
import { StatusDonut } from '@/components/analytics/status-donut'
import { SeverityBar } from '@/components/analytics/severity-bar'
import { TrendLineChart } from '@/components/analytics/trend-line-chart'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/client'
import dynamic from 'next/dynamic'

const HeatmapMap = dynamic(() => import('@/components/analytics/issue-heatmap'), { ssr: false })

import type { OverviewStats, TrendsData } from '@/types'

export default function AnalyticsPage() {
  const [period, setPeriod] = useState('30d')
  const [trendMetric, setTrendMetric] = useState('both')
  const [overview, setOverview] = useState<OverviewStats | null>(null)
  const [trendsReported, setTrendsReported] = useState<TrendsData | null>(null)
  const [trendsResolved, setTrendsResolved] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    setLoading(true)
    const supabase = createClient()

    const [ov, trRep, trRes] = await Promise.all([
      supabase.functions.invoke('analytics/overview', { body: { period } }),
      supabase.functions.invoke('analytics/trends', { body: { metric: 'reported', period } }),
      supabase.functions.invoke('analytics/trends', { body: { metric: 'resolved', period } }),
    ])

    if (ov.data) setOverview(ov.data)
    if (trRep.data) setTrendsReported(trRep.data)
    if (trRes.data) setTrendsResolved(trRes.data)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [period])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-sm text-zinc-500">Detailed analytics and insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            options={[
              { label: 'Last 7 days', value: '7d' },
              { label: 'Last 30 days', value: '30d' },
              { label: 'Last 90 days', value: '90d' },
            ]}
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-36"
          />
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
          <Skeleton className="h-80 rounded-xl" />
        </div>
      ) : overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard title="Total Issues" value={overview.kpis.total_issues} delta={overview.kpis.total_issues_delta} icon="📊" color="blue" />
            <KpiCard title="Resolution Rate" value={`${overview.kpis.resolution_rate}%`} delta={null} icon="✅" color="green" />
            <KpiCard title="Avg Resolution" value={`${overview.kpis.avg_resolution_hours}h`} delta={null} icon="⏱️" color="amber" />
            <KpiCard title="Verified Rate" value={`${overview.kpis.verified_rate}%`} delta={null} icon="👍" color="blue" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <StatusDonut data={overview.by_status} />
            <SeverityBar data={overview.by_severity} />
          </div>

          <TrendLineChart
            reported={trendsReported?.series ?? []}
            resolved={trendsResolved?.series ?? []}
            metric={trendMetric}
            onMetricChange={setTrendMetric}
          />

          <Card>
            <div className="p-6">
              <h3 className="mb-4 text-lg font-semibold">Issue Heatmap</h3>
              <div className="h-[400px] rounded-lg overflow-hidden">
                <HeatmapMap period={period} />
              </div>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-zinc-400">
            No analytics data available. Deploy Edge Functions first.
          </CardContent>
        </Card>
      )}
    </div>
  )
}
