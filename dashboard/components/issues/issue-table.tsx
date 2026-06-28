'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronDown } from 'lucide-react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { SeverityBadge } from './severity-badge'
import { CategoryBadge } from './category-badge'
import { Avatar } from '@/components/ui/avatar'
import { formatRelativeTime, shortUUID } from '@/lib/utils'
import type { Issue, Pagination } from '@/types'

interface IssueTableProps {
  issues: Issue[]
  pagination: Pagination
  onPageChange: (page: number) => void
  onSort: (column: string) => void
  sortBy: string
  sortOrder: 'asc' | 'desc'
}

export function IssueTable({ issues, pagination, onPageChange, onSort, sortBy, sortOrder }: IssueTableProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const toggleAll = () => {
    if (selected.size === issues.length) setSelected(new Set())
    else setSelected(new Set(issues.map((i) => i.id)))
  }

  const toggleOne = (id: string) => {
    const next = new Set(selected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return <ChevronDown className="h-3 w-3 opacity-0 group-hover:opacity-50" />
    return (
      <ChevronDown
        className={`h-3 w-3 ${sortOrder === 'desc' ? 'rotate-0' : 'rotate-180'}`}
      />
    )
  }

  const totalPages = Math.ceil(pagination.total / pagination.limit)

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <input
                type="checkbox"
                checked={selected.size === issues.length && issues.length > 0}
                onChange={toggleAll}
                className="rounded border-zinc-300"
              />
            </TableHead>
            <TableHead>ID</TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('title')}>
              <span className="flex items-center gap-1">Title <SortIcon column="title" /></span>
            </TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('severity')}>
              <span className="flex items-center gap-1">Severity <SortIcon column="severity" /></span>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('status')}>
              <span className="flex items-center gap-1">Status <SortIcon column="status" /></span>
            </TableHead>
            <TableHead>Department</TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('verification_count')}>
              <span className="flex items-center gap-1">Votes <SortIcon column="verification_count" /></span>
            </TableHead>
            <TableHead>Reporter</TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('created_at')}>
              <span className="flex items-center gap-1">Created <SortIcon column="created_at" /></span>
            </TableHead>
            <TableHead className="cursor-pointer group" onClick={() => onSort('days_open')}>
              <span className="flex items-center gap-1">Open <SortIcon column="days_open" /></span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {issues.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="h-48 text-center text-zinc-500">
                <div className="flex flex-col items-center gap-2">
                  <span className="text-3xl">📋</span>
                  <p className="font-medium">No issues found</p>
                  <p className="text-sm">Try adjusting your filters or check back later.</p>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            issues.map((issue) => (
              <TableRow
                key={issue.id}
                className={selected.has(issue.id) ? 'bg-blue-50 dark:bg-blue-950/30' : ''}
              >
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(issue.id)}
                    onChange={() => toggleOne(issue.id)}
                    className="rounded border-zinc-300"
                  />
                </TableCell>
                <TableCell className="font-mono text-xs text-zinc-400">{shortUUID(issue.id)}</TableCell>
                <TableCell>
                  <Link href={`/dashboard/issues/${issue.id}`} className="font-medium hover:underline">
                    {issue.title}
                  </Link>
                </TableCell>
                <TableCell><CategoryBadge category={issue.category} /></TableCell>
                <TableCell><SeverityBadge severity={issue.severity} /></TableCell>
                <TableCell><StatusBadge status={issue.status} /></TableCell>
                <TableCell className="text-sm text-zinc-500">
                  {issue.assigned_department?.name ?? '—'}
                </TableCell>
                <TableCell className="text-sm">{issue.verification_count}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar name={issue.reporter?.name ?? 'U'} size="sm" />
                    <span className="text-sm">{issue.reporter?.name ?? 'Unknown'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-sm text-zinc-500">{formatRelativeTime(issue.created_at)}</TableCell>
                <TableCell className="text-sm text-zinc-500">{issue.days_open ?? '—'}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {pagination.total > 0 && (
        <div className="flex items-center justify-between border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <p className="text-sm text-zinc-500">
            Showing {(pagination.page - 1) * pagination.limit + 1}–
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              ◀
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const start = Math.max(1, pagination.page - 2)
              const page = start + i
              if (page > totalPages) return null
              return (
                <Button
                  key={page}
                  variant={page === pagination.page ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onPageChange(page)}
                >
                  {page}
                </Button>
              )
            })}
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= totalPages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              ▶
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
