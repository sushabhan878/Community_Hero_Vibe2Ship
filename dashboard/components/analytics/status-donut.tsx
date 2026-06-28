'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const COLORS: Record<string, string> = {
  resolved: '#22c55e',
  in_progress: '#3b82f6',
  verified: '#a855f7',
  assigned: '#f97316',
  ai_processed: '#eab308',
  pending: '#6b7280',
  rejected: '#ef4444',
  closed: '#4b5563',
}

const LABELS: Record<string, string> = {
  resolved: 'Resolved',
  in_progress: 'In Progress',
  verified: 'Verified',
  assigned: 'Assigned',
  ai_processed: 'AI Processed',
  pending: 'Pending',
  rejected: 'Rejected',
  closed: 'Closed',
}

interface StatusDonutProps {
  data: Record<string, number>
}

export function StatusDonut({ data }: StatusDonutProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ name: LABELS[key] ?? key, value: count, color: COLORS[key] ?? '#6b7280' }))

  const total = chartData.reduce((sum, d) => sum + d.value, 0)

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Issues by Status</CardTitle></CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-zinc-400">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Issues by Status</CardTitle></CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="h-56 w-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value} (${(Number(value) / total * 100).toFixed(1)}%)`]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5">
            {chartData.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-zinc-500">{entry.name}</span>
                <span className="ml-auto font-medium">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
