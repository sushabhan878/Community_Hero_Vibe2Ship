'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { IssueFilters } from '@/components/issues/issue-filters'
import { IssueTable } from '@/components/issues/issue-table'
import { createClient } from '@/lib/supabase/client'
import { Skeleton } from '@/components/ui/skeleton'
import type { Issue, Pagination } from '@/types'

export default function IssuesPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const [issues, setIssues] = useState<Issue[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 25, total: 0, has_more: false })
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchIssues = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    const params = new URLSearchParams(searchParams.toString())
    params.set('sort_by', sortBy)
    params.set('sort_order', sortOrder)
    params.set('page', searchParams.get('page') ?? '1')
    params.set('limit', '25')

    const { data, error } = await supabase.functions.invoke('analytics/issues-table', {
      body: Object.fromEntries(params),
    })

    if (!error && data) {
      setIssues(data.issues ?? [])
      setPagination(data.pagination ?? { page: 1, limit: 25, total: 0, has_more: false })
    }
    setLoading(false)
  }, [searchParams, sortBy, sortOrder])

  useEffect(() => {
    fetchIssues()
  }, [fetchIssues])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dept-issues-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'issues',
      }, () => {
        fetchIssues()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchIssues])

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(page))
    router.push(`${pathname}?${params.toString()}`)
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Issues</h1>
          <p className="text-sm text-zinc-500">Manage and track civic issues</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchIssues}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      <IssueFilters />

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <IssueTable
            issues={issues}
            pagination={pagination}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </div>
      )}
    </div>
  )
}
