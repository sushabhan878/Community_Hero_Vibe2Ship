import { useCallback } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNotifications, useMarkNotificationsRead } from '../../hooks/useNotifications'
import { Avatar } from '../../components/Avatar'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, NOTIFICATION_ICONS, NOTIFICATION_COLORS } from '../../lib/constants'
import { formatRelativeTime } from '../../lib/utils'
import { type AppNotification } from '../../lib/types'

function NotificationItem({ item, onPress }: { item: AppNotification; onPress: (n: AppNotification) => void }) {
  const iconName = NOTIFICATION_ICONS[item.type] || 'notifications'
  const iconColor = NOTIFICATION_COLORS[item.type] || COLORS.textMuted

  return (
    <TouchableOpacity
      style={[styles.notifItem, !item.read && styles.notifUnread]}
      onPress={() => onPress(item)}
    >
      <View style={[styles.notifIcon, { backgroundColor: iconColor + '20' }]}>
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={22} color={iconColor} />
      </View>
      <View style={styles.notifContent}>
        <Text style={[styles.notifTitle, !item.read && styles.notifTitleUnread]}>{item.title}</Text>
        <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
        <Text style={styles.notifTime}>{formatRelativeTime(item.created_at)}</Text>
      </View>
      {!item.read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { data, isLoading, refetch, isRefetching } = useNotifications()
  const markRead = useMarkNotificationsRead()

  const notifications = data?.notifications ?? []
  const unreadCount = data?.unread_count ?? 0

  const handlePress = useCallback((item: AppNotification) => {
    if (!item.read) {
      markRead.mutate([item.id])
    }
    if (item.issue_id) {
      router.push(`/issue/${item.issue_id}`)
    }
  }, [markRead, router])

  const handleMarkAllRead = useCallback(() => {
    markRead.mutate(undefined)
  }, [markRead])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={handleMarkAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <NotificationItem item={item} onPress={handlePress} />}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="notifications-off-outline" size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>You're all caught up!</Text>
            </View>
          )
        }
        contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: SPACING.xxxxl }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.h2, fontWeight: '700' },
  markAllText: { fontSize: FONT_SIZES.bodySm, color: COLORS.primary, fontWeight: '600' },
  notifItem: {
    flexDirection: 'row', padding: SPACING.lg, gap: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  notifUnread: { backgroundColor: COLORS.info + '08' },
  notifIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary },
  notifTitleUnread: { fontWeight: '700' },
  notifBody: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: 2 },
  notifTime: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.info,
    marginTop: 6,
  },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.h3, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubtitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textMuted },
})
