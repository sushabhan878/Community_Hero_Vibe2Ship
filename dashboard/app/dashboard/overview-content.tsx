'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { KpiCard } from '@/components/analytics/kpi-card'
import { StatusDonut } from '@/components/analytics/status-donut'
import { SeverityBar } from '@/components/analytics/severity-bar'
import { TrendLineChart } from '@/components/analytics/trend-line-chart'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { statusColor, statusLabel } from '@/lib/utils'
import type { Profile, OverviewStats, TrendsData, DepartmentStats } from '@/types'

interface OverviewContentProps {
  profile: Profile
  overview: OverviewStats | null
  trendsReported: TrendsData | null
  trendsResolved: TrendsData | null
  departments: { departments: DepartmentStats[] } | null
}

export function OverviewContent({ profile, overview, trendsReported, trendsResolved, departments }: OverviewContentProps) {
  const [period, setPeriod] = useState('30d')
  const [trendMetric, setTrendMetric] = useState('both')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {profile.role === 'super_admin' ? 'City Overview' : 'Department Overview'}
          </h1>
          <p className="text-sm text-zinc-500">
            {profile.role === 'super_admin'
              ? 'All departments, all issues'
              : `Your department's performance`}
          </p>
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
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {overview ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Issues"
              value={overview.kpis.total_issues}
              delta={overview.kpis.total_issues_delta}
              icon="📊"
              color="blue"
            />
            <KpiCard
              title="Resolution Rate"
              value={`${overview.kpis.resolution_rate}%`}
              delta={null}
              icon="✅"
              color="green"
            />
            <KpiCard
              title="Avg Resolution"
              value={`${overview.kpis.avg_resolution_hours}h`}
              delta={null}
              icon="⏱️"
              color="amber"
            />
            <KpiCard
              title="Critical Open"
              value={overview.kpis.critical_open}
              delta={null}
              icon="🔴"
              color="red"
            />
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
        </>
      ) : (
        <Card>
          <CardContent className="flex h-48 items-center justify-center text-sm text-zinc-400">
            Analytics data is not available yet. Make sure the Edge Functions are deployed.
          </CardContent>
        </Card>
      )}

      {profile.role === 'super_admin' && departments && (
        <Card>
          <CardHeader>
            <CardTitle>Department Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800">
                    <th className="pb-3 text-left font-medium text-zinc-500">Department</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Issues</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Resolved</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Rate</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Avg Time</th>
                    <th className="pb-3 text-right font-medium text-zinc-500">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.departments.map((dept) => (
                    <tr key={dept.id} className="border-b border-zinc-100 dark:border-zinc-800">
                      <td className="py-3 font-medium">{dept.name}</td>
                      <td className="py-3 text-right">{dept.stats.total_assigned}</td>
                      <td className="py-3 text-right text-emerald-600">{dept.stats.resolved}</td>
                      <td className="py-3 text-right">{dept.stats.resolution_rate}%</td>
                      <td className="py-3 text-right">{dept.stats.avg_resolution_hours.toFixed(1)}h</td>
                      <td className="py-3 text-right">
                        <Badge variant={dept.stats.overdue > 5 ? 'danger' : dept.stats.overdue > 0 ? 'warning' : 'success'}>
                          {dept.stats.overdue}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
