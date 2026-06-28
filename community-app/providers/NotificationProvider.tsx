import { useEffect, type ReactNode } from 'react'
import { Platform } from 'react-native'
import Constants from 'expo-constants'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/authStore'

const isExpoGo = Constants.appOwnership === 'expo'

let NotificationsModule: {
  setNotificationHandler: (handler: {
    handleNotification: () => Promise<{
      shouldShowAlert: boolean
      shouldPlaySound: boolean
      shouldSetBadge: boolean
    }>
  }) => void
  requestPermissionAsync: () => Promise<{ status: string }>
  getExpoPushTokenAsync: () => Promise<{ data: string }>
} | null = null

if (!isExpoGo) {
  try {
    NotificationsModule = require('expo-notifications')
    NotificationsModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    })
  } catch {
    console.warn('expo-notifications failed to load')
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated || !NotificationsModule) return
    registerForPush()
  }, [isAuthenticated])

  async function registerForPush() {
    if (!NotificationsModule) return
    const { status } = await NotificationsModule.requestPermissionAsync()
    if (status !== 'granted') return

    const token = await NotificationsModule.getExpoPushTokenAsync()
    await supabase.from('push_tokens').upsert({
      token: token.data,
      platform: Platform.OS,
      user_id: (await supabase.auth.getUser()).data.user?.id,
    })
  }

  return <>{children}</>
}
