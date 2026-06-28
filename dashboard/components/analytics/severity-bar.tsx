'use client'

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'

const COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#6b7280',
}

interface SeverityBarProps {
  data: Record<string, number>
}

export function SeverityBar({ data }: SeverityBarProps) {
  const chartData = Object.entries(data)
    .filter(([, count]) => count > 0)
    .map(([key, count]) => ({ name: key.charAt(0).toUpperCase() + key.slice(1), count, color: COLORS[key] ?? '#6b7280' }))

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle>Issues by Severity</CardTitle></CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-sm text-zinc-400">
          No data available
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader><CardTitle>Issues by Severity</CardTitle></CardHeader>
      <CardContent>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, i) => (
                  <rect key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
