import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface KpiCardProps {
  title: string
  value: string | number
  delta?: number | null
  deltaLabel?: string
  icon: string
  color?: 'blue' | 'green' | 'amber' | 'red'
}

const colorMap = {
  blue: 'text-blue-600 bg-blue-50 dark:bg-blue-950 dark:text-blue-400',
  green: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-400',
  amber: 'text-amber-600 bg-amber-50 dark:bg-amber-950 dark:text-amber-400',
  red: 'text-red-600 bg-red-50 dark:bg-red-950 dark:text-red-400',
}

export function KpiCard({ title, value, delta, deltaLabel, icon, color = 'blue' }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{title}</p>
          <span className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-lg', colorMap[color])}>
            {icon}
          </span>
        </div>
        <p className="mt-3 text-2xl font-bold">{value}</p>
        {delta !== undefined && delta !== null && (
          <div className="mt-1 flex items-center gap-1">
            <span className={cn(
              'text-sm font-medium',
              delta > 0 ? 'text-emerald-600' : delta < 0 ? 'text-red-600' : 'text-zinc-400',
            )}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '—'} {Math.abs(delta)}%
            </span>
            {deltaLabel && <span className="text-xs text-zinc-400">{deltaLabel}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
