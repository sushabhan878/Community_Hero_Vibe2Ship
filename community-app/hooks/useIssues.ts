import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { apiPost, apiGet, getAuthHeaders } from '../lib/api'
import { uploadToCloudinary } from '../lib/cloudinary'
import { useAuthStore } from '../stores/authStore'
import { type Issue, type IssueMarker, type SortBy, type Profile } from '../lib/types'

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

interface IssuesParams {
  page?: number
  limit?: number
  status?: string
  category?: string
  severity?: string
  reporter_id?: string
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
      const headers = await getAuthHeaders()
      const qs = new URLSearchParams()
      qs.set('page', String(pageParam))
      qs.set('limit', String(params.limit ?? 20))
      if (params.status) qs.set('status', params.status)
      if (params.category) qs.set('category', params.category)
      if (params.severity) qs.set('severity', params.severity)
      if (params.reporter_id) qs.set('reporter_id', params.reporter_id)
      if (params.lat !== undefined) qs.set('lat', String(params.lat))
      if (params.lng !== undefined) qs.set('lng', String(params.lng))
      if (params.radius_km) qs.set('radius_km', String(params.radius_km))
      if (params.sort) qs.set('sort', params.sort)
      if (params.search) qs.set('search', params.search)

      const res = await fetch(`${API_URL}/api/issues?${qs.toString()}`, { headers })
      if (!res.ok) {
        return { issues: [], pagination: { page: pageParam, has_more: false } }
      }
      return (await res.json()) as { issues: Issue[]; pagination: { page: number; has_more: boolean } }
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
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/issues/${id}`, { headers })
      if (!res.ok) return null
      const data = await res.json()
      return (data as { issue: Issue }).issue
    },
    enabled: !!id,
  })
}

export function useNearbyMarkers(lat?: number, lng?: number, radiusKm = 2) {
  return useQuery({
    queryKey: ['issues', 'nearby', lat, lng, radiusKm],
    queryFn: async () => {
      const headers = await getAuthHeaders()
      const qs = new URLSearchParams()
      qs.set('lat', String(lat))
      qs.set('lng', String(lng))
      qs.set('radius_km', String(radiusKm))

      const res = await fetch(`${API_URL}/api/issues/nearby?${qs.toString()}`, { headers })
      if (!res.ok) return []
      const data = await res.json()
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
      const data = await apiPost<{ issue: Issue }>('/api/issues', issueData)
      return data
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      const user = useAuthStore.getState().session?.user
      if (user) {
        await supabase.rpc('allocate_badges', { user_id: user.id })
        const { data } = await supabase
          .from('profiles')
          .select('*, badges(*), department:departments(*)')
          .eq('id', user.id)
          .single()
        if (data) {
          useAuthStore.getState().setProfile(data as unknown as Profile)
        }
      }
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

export function useUpdateAiAnalysis() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      ai_summary,
      ai_category,
      ai_severity,
    }: {
      id: string
      ai_summary?: string
      ai_category?: string
      ai_severity?: string
    }) => {
      const body: Record<string, unknown> = {}
      if (ai_summary !== undefined) body.ai_summary = ai_summary
      if (ai_category !== undefined) body.ai_category = ai_category
      if (ai_severity !== undefined) body.ai_severity = ai_severity
      const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/issues/${id}/ai-analysis`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to update AI analysis')
      return data as { success: boolean }
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
    }: {
      files: { uri: string; type: string; name: string }[]
    }) => {
      const image_urls: string[] = []
      for (const file of files) {
        const url = await uploadToCloudinary(file.uri)
        image_urls.push(url)
      }
      return { image_urls, video_url: null }
    },
  })
}
