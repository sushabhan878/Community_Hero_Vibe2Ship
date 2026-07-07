import { create } from 'zustand'
import { type IssueCategory, type IssueSeverity, type IssueStatus } from '../lib/types'

export type SortBy = 'newest' | 'nearest' | 'most_verified' | 'severity'

interface FilterState {
  status: IssueStatus[]
  category: IssueCategory[]
  severity: IssueSeverity[]
  sortBy: SortBy
  search: string
  viewMode: 'list' | 'map'
  pendingFilter: string
  setStatus: (status: IssueStatus[]) => void
  setCategory: (category: IssueCategory[]) => void
  setSeverity: (severity: IssueSeverity[]) => void
  setSortBy: (sort: SortBy) => void
  setSearch: (search: string) => void
  setViewMode: (mode: 'list' | 'map') => void
  setPendingFilter: (filter: string) => void
  reset: () => void
  activeCount: () => number
}

const initialState = {
  status: [] as IssueStatus[],
  category: [] as IssueCategory[],
  severity: [] as IssueSeverity[],
  sortBy: 'newest' as SortBy,
  search: '',
  viewMode: 'list' as const,
  pendingFilter: '',
}

export const useFilterStore = create<FilterState>((set, get) => ({
  ...initialState,
  setStatus: (status) => set({ status }),
  setCategory: (category) => set({ category }),
  setSeverity: (severity) => set({ severity }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSearch: (search) => set({ search }),
  setViewMode: (viewMode) => set({ viewMode }),
  setPendingFilter: (pendingFilter) => set({ pendingFilter }),
  reset: () => set(initialState),
  activeCount: () => {
    const s = get()
    return s.status.length + s.category.length + s.severity.length
  },
}))
