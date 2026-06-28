'use client'

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Select } from '@/components/ui/select'

interface TrendLineChartProps {
  reported: { date: string; count: number }[]
  resolved: { date: string; count: number }[]
  metric: string
  onMetricChange: (metric: string) => void
}

export function TrendLineChart({ reported, resolved, metric, onMetricChange }: TrendLineChartProps) {
  const dates = [...new Set([...reported.map((d) => d.date), ...resolved.map((d) => d.date)])].sort()

  const chartData = dates.map((date) => ({
    date: new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    Reported: reported.find((d) => d.date === date)?.count ?? 0,
    Resolved: resolved.find((d) => d.date === date)?.count ?? 0,
  }))

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Issues Over Time</CardTitle>
          <Select
            options={[
              { label: 'Reported', value: 'reported' },
              { label: 'Resolved', value: 'resolved' },
              { label: 'Both', value: 'both' },
            ]}
            value={metric}
            onChange={(e) => onMetricChange(e.target.value)}
            className="w-32"
          />
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              {(metric === 'reported' || metric === 'both') && (
                <Line type="monotone" dataKey="Reported" stroke="#3b82f6" strokeWidth={2} dot={false} />
              )}
              {(metric === 'resolved' || metric === 'both') && (
                <Line type="monotone" dataKey="Resolved" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
