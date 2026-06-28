import { Stack } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'
import { Redirect } from 'expo-router'

export default function AdminLayout() {
  const { profile } = useAuthStore()
  const isAdmin = profile?.role === 'department_admin' || profile?.role === 'super_admin'

  if (!isAdmin) {
    return <Redirect href="/(tabs)" />
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Dashboard' }} />
      <Stack.Screen name="issues" options={{ title: 'All Issues' }} />
    </Stack>
  )
}
