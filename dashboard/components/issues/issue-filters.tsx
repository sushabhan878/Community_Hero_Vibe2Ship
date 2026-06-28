'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useCallback } from 'react'
import { Search, X } from 'lucide-react'
import { Select } from '@/components/ui/select'
import { STATUS_OPTIONS, SEVERITY_OPTIONS, CATEGORY_OPTIONS } from '@/lib/constants'

export function IssueFilters() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value) params.set(key, value)
      else params.delete(key)
      params.set('page', '1')
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams],
  )

  const clearFilters = () => {
    router.push(pathname)
  }

  const search = searchParams.get('search') ?? ''
  const status = searchParams.get('status') ?? ''
  const severity = searchParams.get('severity') ?? ''
  const category = searchParams.get('category') ?? ''
  const hasFilters = search || status || severity || category

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="text"
          placeholder="Search issues..."
          defaultValue={search}
          onChange={(e) => {
            const timeout = setTimeout(() => setParam('search', e.target.value), 300)
            return () => clearTimeout(timeout)
          }}
          className="h-10 w-full rounded-lg border border-zinc-300 bg-white pl-9 pr-3 text-sm placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
        />
      </div>

      <Select
        options={STATUS_OPTIONS}
        value={status}
        onChange={(e) => setParam('status', e.target.value)}
        placeholder="All Statuses"
        className="w-36"
      />
      <Select
        options={SEVERITY_OPTIONS}
        value={severity}
        onChange={(e) => setParam('severity', e.target.value)}
        placeholder="All Severities"
        className="w-36"
      />
      <Select
        options={CATEGORY_OPTIONS}
        value={category}
        onChange={(e) => setParam('category', e.target.value)}
        placeholder="All Categories"
        className="w-40"
      />

      {hasFilters && (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
        >
          <X className="h-4 w-4" />
          Clear
        </button>
      )}
    </div>
  )
}
