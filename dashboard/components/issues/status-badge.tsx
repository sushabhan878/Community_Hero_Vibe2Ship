import { Badge } from '@/components/ui/badge'
import { statusColor, statusLabel } from '@/lib/utils'
import type { IssueStatus } from '@/types'

export function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColor(status)}`}>
      {statusLabel(status)}
    </span>
  )
}
