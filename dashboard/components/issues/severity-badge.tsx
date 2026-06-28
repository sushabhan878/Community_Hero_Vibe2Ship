import { severityColor, severityLabel } from '@/lib/utils'
import type { IssueSeverity } from '@/types'

export function SeverityBadge({ severity }: { severity: IssueSeverity }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${severityColor(severity)}`}>
      {severityLabel(severity)}
    </span>
  )
}
