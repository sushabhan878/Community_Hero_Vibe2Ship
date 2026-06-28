'use client'

import { formatRelativeTime } from '@/lib/utils'
import type { IssueUpdate } from '@/types'

const icons: Record<string, string> = {
  status_change: '●',
  ai_processed: '🤖',
  department_assigned: '🏢',
  note_added: '💬',
  verification_milestone: '👍',
}

interface IssueTimelineProps {
  updates: IssueUpdate[]
}

export function IssueTimeline({ updates }: IssueTimelineProps) {
  if (updates.length === 0) {
    return (
      <div className="flex flex-col items-center py-12 text-zinc-500">
        <span className="text-2xl">📜</span>
        <p className="mt-2 text-sm">No activity yet</p>
        <p className="text-xs">Waiting for updates...</p>
      </div>
    )
  }

  return (
    <div className="relative space-y-0">
      {updates.map((update, i) => (
        <div key={update.id} className="relative flex gap-4 pb-6">
          {i < updates.length - 1 && (
            <div className="absolute left-[11px] top-5 bottom-0 w-0.5 bg-zinc-200 dark:bg-zinc-700" />
          )}
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-xs dark:bg-zinc-800">
            {icons[update.type] ?? '📌'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div>
                {update.type === 'status_change' && (
                  <p className="text-sm font-medium">
                    Status changed: <span className="capitalize">{update.old_status?.replace('_', ' ')}</span>
                    {' → '}
                    <span className="capitalize">{update.new_status?.replace('_', ' ')}</span>
                  </p>
                )}
                {update.type === 'ai_processed' && (
                  <p className="text-sm font-medium">AI Processing</p>
                )}
                {update.type === 'department_assigned' && (
                  <p className="text-sm font-medium">Department Assigned</p>
                )}
                {update.type === 'note_added' && (
                  <p className="text-sm font-medium">Note Added</p>
                )}
                {update.type === 'verification_milestone' && (
                  <p className="text-sm font-medium">Verification Milestone</p>
                )}
                {update.note && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">{update.note}</p>}
              </div>
              <span className="shrink-0 text-xs text-zinc-400">{formatRelativeTime(update.created_at)}</span>
            </div>
            {update.updated_by_user && (
              <p className="mt-0.5 text-xs text-zinc-400">
                by {update.updated_by_user.name}
                {update.updated_by_user.role === 'system' && ' (System)'}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
