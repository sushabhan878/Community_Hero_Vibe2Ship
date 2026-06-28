import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAnalyticsOverview } from '../../hooks/useAnalytics'
import { useAuthStore } from '../../stores/authStore'
import { KpiCard } from '../../components/KpiCard'
import { IssueCard } from '../../components/IssueCard'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../lib/constants'
import { useIssues } from '../../hooks/useIssues'

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const { profile } = useAuthStore()
  const isSuperAdmin = profile?.role === 'super_admin'

  const { data: analytics, isLoading, refetch, isRefetching } = useAnalyticsOverview(
    profile?.department_id,
    '30d',
  )
  const { data: issuesData } = useIssues({ status: 'in_progress', limit: 5 })

  const kpis = analytics?.kpis
  const criticalOpen = kpis?.critical_open ?? 0

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {profile?.name?.split(' ')[0]}</Text>
          <Text style={styles.subtitle}>
            {profile?.department?.name ?? 'All Departments'}
          </Text>
        </View>
        {isSuperAdmin && (
          <TouchableOpacity style={styles.deptButton}>
            <Text style={styles.deptButtonText}>All Dept ▼</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.kpiRow}>
            <KpiCard label="Total Issues" value={kpis?.total_issues ?? 0} delta={kpis?.total_issues_delta} />
            <KpiCard label="Open" value={kpis?.open_issues ?? 0} color={COLORS.warning} />
            <KpiCard label="In Progress" value={kpis?.by_status?.in_progress ?? 0} color={COLORS.info} />
            <KpiCard label="Res. Rate" value={`${Math.round(kpis?.resolution_rate ?? 0)}%`} color={COLORS.primary} />
          </View>

          {criticalOpen > 0 && (
            <View style={styles.alertBanner}>
              <Ionicons name="alert-circle" size={20} color={COLORS.white} />
              <Text style={styles.alertText}>{criticalOpen} critical issue{criticalOpen > 1 ? 's' : ''} requiring attention</Text>
            </View>
          )}

          <View style={styles.quickActions}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="checkmark-circle" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Resolve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="hammer" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>In Progress</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton}>
                <Ionicons name="document-text" size={20} color={COLORS.white} />
                <Text style={styles.actionText}>Add Note</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.recentIssues}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>In Progress</Text>
              <TouchableOpacity onPress={() => router.push('/admin/issues')}>
                <Text style={styles.viewAll}>View All →</Text>
              </TouchableOpacity>
            </View>
            {issuesData?.pages[0]?.issues?.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onPress={(id) => router.push(`/issue/${id}`)}
              />
            ))}
          </View>

          <View style={{ height: SPACING.xxxxl }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  greeting: { fontSize: FONT_SIZES.h2, fontWeight: '700' },
  subtitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary },
  deptButton: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.border,
  },
  deptButtonText: { fontSize: FONT_SIZES.caption, fontWeight: '600' },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kpiRow: {
    flexDirection: 'row', padding: SPACING.lg, gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  alertBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.danger, marginHorizontal: SPACING.lg,
    padding: SPACING.md, borderRadius: BORDER_RADIUS.card,
  },
  alertText: { color: COLORS.white, fontSize: FONT_SIZES.bodySm, fontWeight: '500', flex: 1 },
  quickActions: { padding: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', marginBottom: SPACING.md },
  actionRow: { flexDirection: 'row', gap: SPACING.sm },
  actionButton: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.button,
  },
  actionText: { color: COLORS.white, fontSize: FONT_SIZES.caption, fontWeight: '600' },
  recentIssues: { padding: SPACING.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  viewAll: { fontSize: FONT_SIZES.bodySm, color: COLORS.primary, fontWeight: '600' },
})
