import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { type AppNotification } from '../lib/types'

export function useNotifications(page = 1, unreadOnly = false) {
  return useQuery({
    queryKey: ['notifications', page, unreadOnly],
    queryFn: async () => {
      const query = new URLSearchParams()
      query.set('page', String(page))
      query.set('limit', '30')
      if (unreadOnly) query.set('unread', 'true')

      const { data, error } = await supabase.functions.invoke(`notifications?${query.toString()}`, {
        method: 'GET',
      })
      if (error || !data) {
        return { notifications: [], unread_count: 0, pagination: { page, has_more: false } }
      }
      return data as { notifications: AppNotification[]; unread_count: number; pagination: { page: number; has_more: boolean } }
    },
  })
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      const { data, error } = await supabase.functions.invoke('notifications/read', {
        method: 'PATCH',
        body: { ids: ids ?? [], all: !ids || ids.length === 0 },
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
