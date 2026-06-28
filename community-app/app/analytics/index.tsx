import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAnalyticsOverview, useAnalyticsTrends, useAnalyticsPredictions } from '../../hooks/useAnalytics'
import { useAuthStore } from '../../stores/authStore'
import { KpiCard } from '../../components/KpiCard'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../lib/constants'

const { width } = Dimensions.get('window')

type Period = '7d' | '30d' | '90d'

export default function AnalyticsScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuthStore()
  const [period, setPeriod] = useState<Period>('30d')

  const { data: overview, isLoading: overviewLoading, refetch, isRefetching } = useAnalyticsOverview(
    profile?.department_id,
    period,
  )
  const { data: trends } = useAnalyticsTrends(profile?.department_id, period, 'day')
  const { data: predictions } = useAnalyticsPredictions()

  const kpis = overview?.kpis

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Analytics</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.periodRow}>
        {(['7d', '30d', '90d'] as Period[]).map((p) => (
          <TouchableOpacity
            key={p}
            style={[styles.periodButton, period === p && styles.periodActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {overviewLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.kpiRow}>
            <KpiCard label="Total" value={kpis?.total_issues ?? 0} />
            <KpiCard label="Res. Rate" value={`${Math.round(kpis?.resolution_rate ?? 0)}%`} color={COLORS.primary} />
            <KpiCard label="Avg Time" value={`${Math.round(kpis?.avg_resolution_hours ?? 0)}h`} color={COLORS.info} />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trends</Text>
            <View style={styles.chartContainer}>
              {trends ? (
                <View style={styles.simpleChart}>
                  {trends.reported.slice(-14).map((point, i) => {
                    const max = Math.max(...trends.reported.map((t) => t.count), 1)
                    const height = (point.count / max) * 120
                    return (
                      <View key={i} style={styles.barWrap}>
                        <View style={[styles.bar, { height: Math.max(height, 4), backgroundColor: COLORS.primary }]} />
                        <Text style={styles.barLabel}>{new Date(point.date).getDate()}</Text>
                      </View>
                    )
                  })}
                </View>
              ) : (
                <Text style={styles.noDataText}>Not enough data</Text>
              )}
            </View>
          </View>

          {predictions?.hotspots && predictions.hotspots.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Hotspots</Text>
              {predictions.hotspots.map((hotspot, i) => (
                <View key={i} style={styles.hotspotCard}>
                  <View style={styles.hotspotHeader}>
                    <Ionicons name="flame" size={20} color={COLORS.danger} />
                    <Text style={styles.hotspotArea}>{hotspot.area}</Text>
                    <View style={[styles.riskBadge, { backgroundColor: hotspot.risk_score > 70 ? COLORS.danger + '20' : COLORS.warning + '20' }]}>
                      <Text style={[styles.riskText, { color: hotspot.risk_score > 70 ? COLORS.danger : COLORS.warning }]}>
                        Risk: {hotspot.risk_score}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.hotspotDetail}>{hotspot.issue_count} reports — {hotspot.dominant_category}</Text>
                  <Text style={styles.hotspotPrediction}>{hotspot.prediction}</Text>
                </View>
              ))}
            </View>
          )}

          {predictions?.category_trends && predictions.category_trends.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Category Trends</Text>
              {predictions.category_trends.map((trend, i) => (
                <View key={i} style={styles.trendRow}>
                  <Text style={styles.trendCategory}>{trend.category}</Text>
                  <Text style={[styles.trendDirection, { color: trend.direction === 'up' ? COLORS.danger : COLORS.primary }]}>
                    {trend.direction === 'up' ? '▲' : '▼'} {Math.abs(trend.change_pct)}%
                  </Text>
                  <View style={styles.trendBar}>
                    <View
                      style={[
                        styles.trendFill,
                        {
                          width: `${Math.min(Math.abs(trend.change_pct), 100)}%`,
                          backgroundColor: trend.direction === 'up' ? COLORS.danger : COLORS.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={{ height: SPACING.xxxxl }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    backgroundColor: COLORS.bg, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.h2, fontWeight: '700' },
  periodRow: {
    flexDirection: 'row', margin: SPACING.lg,
    backgroundColor: COLORS.bg, borderRadius: BORDER_RADIUS.button, padding: 2,
  },
  periodButton: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.button - 2 },
  periodActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.white },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  kpiRow: { flexDirection: 'row', padding: SPACING.lg, gap: SPACING.sm },
  section: { padding: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', marginBottom: SPACING.md },
  chartContainer: {
    backgroundColor: COLORS.bg, borderRadius: BORDER_RADIUS.card, padding: SPACING.lg,
    minHeight: 180, justifyContent: 'center',
  },
  simpleChart: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 140 },
  barWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '80%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 8, color: COLORS.textMuted, marginTop: 4 },
  noDataText: { textAlign: 'center', color: COLORS.textMuted, fontSize: FONT_SIZES.bodySm },
  hotspotCard: {
    backgroundColor: COLORS.bg, borderRadius: BORDER_RADIUS.card, padding: SPACING.md,
    marginBottom: SPACING.sm, gap: SPACING.xs,
  },
  hotspotHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  hotspotArea: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', flex: 1 },
  riskBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.badge },
  riskText: { fontSize: FONT_SIZES.caption, fontWeight: '600' },
  hotspotDetail: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary },
  hotspotPrediction: { fontSize: FONT_SIZES.caption, color: COLORS.textPrimary, fontStyle: 'italic' },
  trendRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  trendCategory: { width: 100, fontSize: FONT_SIZES.bodySm, fontWeight: '500' },
  trendDirection: { width: 60, fontSize: FONT_SIZES.caption, fontWeight: '600', textAlign: 'right' },
  trendBar: { flex: 1, height: 8, backgroundColor: COLORS.surface, borderRadius: 4 },
  trendFill: { height: 8, borderRadius: 4 },
})
