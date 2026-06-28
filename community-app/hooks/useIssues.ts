import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type Issue, type IssueMarker, type SortBy } from '../lib/types'

interface IssuesParams {
  page?: number
  limit?: number
  status?: string
  category?: string
  severity?: string
  lat?: number
  lng?: number
  radius_km?: number
  sort?: SortBy
  search?: string
}

export function useIssues(params: IssuesParams = {}) {
  return useInfiniteQuery({
    queryKey: ['issues', params],
    queryFn: async ({ pageParam = 1 }) => {
      const query = new URLSearchParams()
      query.set('page', String(pageParam))
      query.set('limit', String(params.limit ?? 20))
      if (params.status) query.set('status', params.status)
      if (params.category) query.set('category', params.category)
      if (params.severity) query.set('severity', params.severity)
      if (params.lat) query.set('lat', String(params.lat))
      if (params.lng) query.set('lng', String(params.lng))
      if (params.radius_km) query.set('radius_km', String(params.radius_km))
      if (params.sort) query.set('sort', params.sort)
      if (params.search) query.set('search', params.search)

      const { data, error } = await supabase.functions.invoke(`issues?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { issues: [], pagination: { page: pageParam, has_more: false } }
      }
      return data as { issues: Issue[]; pagination: { page: number; has_more: boolean } }
    },
    getNextPageParam: (lastPage) =>
      lastPage?.pagination?.has_more ? lastPage.pagination.page + 1 : undefined,
    initialPageParam: 1,
  })
}

export function useIssue(id: string) {
  return useQuery({
    queryKey: ['issue', id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke(`issues/${id}`, {
        method: 'GET',
      })
      if (error || !data) return null
      return (data as { issue: Issue }).issue
    },
    enabled: !!id,
  })
}

export function useNearbyMarkers(lat?: number, lng?: number, radiusKm = 2) {
  return useQuery({
    queryKey: ['issues', 'nearby', lat, lng, radiusKm],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('lat', String(lat))
      query.set('lng', String(lng))
      query.set('radius_km', String(radiusKm))

      const { data, error } = await supabase.functions.invoke(`issues/nearby?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) return []
      return (data as { markers: IssueMarker[] }).markers
    },
    enabled: !!lat && !!lng,
  })
}

export function useCreateIssue() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (issueData: {
      title: string
      description?: string
      category: string
      severity: string
      latitude: number
      longitude: number
      address?: string
      ward?: string
      image_urls: string[]
      video_url?: string
    }) => {
      const { data, error } = await supabase.functions.invoke('issues', {
        method: 'POST',
        body: issueData,
      })
      if (error) throw error
      return data as { issue: Issue }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useUpdateIssueStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      status,
      note,
    }: {
      id: string
      status: string
      note?: string
    }) => {
      const { data, error } = await supabase.functions.invoke(`issues/${id}/status`, {
        method: 'PATCH',
        body: { status, note },
      })
      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['issue', variables.id] })
      queryClient.invalidateQueries({ queryKey: ['issues'] })
    },
  })
}

export function useUploadMedia() {
  return useMutation({
    mutationFn: async ({
      files,
      issueTempId,
    }: {
      files: { uri: string; type: string; name: string }[]
      issueTempId: string
    }) => {
      const formData = new FormData()
      files.forEach((f) => formData.append('files[]', f as unknown as Blob))
      formData.append('issue_temp_id', issueTempId)

      const { data, error } = await supabase.functions.invoke('issues/upload-media', {
        method: 'POST',
        body: formData,
      })
      if (error) throw error
      return data as { image_urls: string[]; video_url: string | null }
    },
  })
}
