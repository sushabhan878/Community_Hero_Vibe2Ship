import { useEffect } from 'react'
import { Stack, useRouter, useSegments } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { ActivityIndicator, View, StyleSheet } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { QueryProvider } from '../providers/QueryProvider'
import { AuthProvider } from '../providers/AuthProvider'
import { NotificationProvider } from '../providers/NotificationProvider'
import { useAuthStore } from '../stores/authStore'
import { COLORS } from '../lib/constants'

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuthStore()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    const inAuthGroup = segments[0] === '(auth)'

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)')
    } else if (isAuthenticated && inAuthGroup) {
      router.replace('/(tabs)')
    }
  }, [isAuthenticated, isLoading, segments])

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  return <>{children}</>
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <QueryProvider>
        <AuthProvider>
          <NotificationProvider>
            <AuthGuard>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(tabs)" />
                <Stack.Screen
                  name="issue/[id]"
                  options={{ presentation: 'card', headerShown: true, title: 'Issue' }}
                />
                <Stack.Screen
                  name="leaderboard"
                  options={{ presentation: 'card', headerShown: true, title: 'Leaderboard' }}
                />
                <Stack.Screen
                  name="admin"
                  options={{ headerShown: false }}
                />
                <Stack.Screen
                  name="analytics/index"
                  options={{ presentation: 'card', headerShown: true, title: 'Analytics' }}
                />
              </Stack>
              <StatusBar style="dark" />
            </AuthGuard>
          </NotificationProvider>
        </AuthProvider>
      </QueryProvider>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bg,
  },
})
