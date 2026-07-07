import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLeaderboard } from '../hooks/useLeaderboard'
import { useAuthStore } from '../stores/authStore'
import { Avatar } from '../components/Avatar'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../lib/constants'
import type { LeaderboardEntry } from '../lib/types'

type Period = 'all_time' | 'this_month' | 'this_week'

const periods: { key: Period; label: string }[] = [
  { key: 'all_time', label: 'All Time' },
  { key: 'this_month', label: 'Month' },
  { key: 'this_week', label: 'Week' },
]

function MyRankCard({
  rank,
  total,
  profile,
}: {
  rank: number
  total: number
  profile: { name: string; avatar_url?: string; hero_score: number }
}) {
  const isInTop10 = rank <= 10
  return (
    <View style={[styles.myRankCard, isInTop10 && styles.myRankCardTop10]}>
      <View style={styles.myRankHeader}>
        <Ionicons name="person-circle" size={20} color={COLORS.primary} />
        <Text style={styles.myRankLabel}>Your Position</Text>
      </View>
      <View style={styles.myRankBody}>
        <View style={styles.myRankLeft}>
          <View style={styles.myRankBadge}>
            <Text style={styles.myRankBadgeText}>#{rank}</Text>
          </View>
          <Avatar name={profile.name} url={profile.avatar_url} size={36} />
          <Text style={styles.myRankName} numberOfLines={1}>{profile.name}</Text>
        </View>
        <View style={styles.myRankRight}>
          <Text style={styles.myRankScore}>{profile.hero_score}</Text>
          <Text style={styles.myRankScoreLabel}>pts</Text>
        </View>
      </View>
      <Text style={styles.myRankTotal}>
        of {total} citizens
      </Text>
    </View>
  )
}

export default function LeaderboardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile } = useAuthStore()
  const [period, setPeriod] = useState<Period>('all_time')

  const { data, isLoading, refetch, isRefetching } = useLeaderboard({ period })
  const entries: LeaderboardEntry[] = data?.entries ?? []
  const myRank = data?.my_rank

  const top3 = entries.slice(0, 3)
  const rest = entries.slice(3, 10)

  const userEntry = entries.find((e) => e.profile.id === profile?.id)

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Leaderboard</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.periodRow}>
        {periods.map((p) => (
          <TouchableOpacity
            key={p.key}
            style={[styles.periodButton, period === p.key && styles.periodActive]}
            onPress={() => setPeriod(p.key)}
          >
            <Text style={[styles.periodText, period === p.key && styles.periodTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={rest}
          keyExtractor={(item) => item.profile.id}
          ListHeaderComponent={
            <>
              {top3.length > 0 && (
                <View style={styles.podium}>
                  {top3.length > 1 && (
                    <View style={styles.podiumItem}>
                      <Text style={styles.podiumMedal}>2</Text>
                      <Avatar name={top3[1].profile.name} url={top3[1].profile.avatar_url} size={48} />
                      <Text style={styles.podiumName}>{top3[1].profile.name}</Text>
                      <Text style={styles.podiumScore}>{top3[1].profile.hero_score}</Text>
                    </View>
                  )}
                  <View style={[styles.podiumItem, styles.podiumFirst]}>
                    <Text style={styles.podiumMedal}>1</Text>
                    <Avatar name={top3[0].profile.name} url={top3[0].profile.avatar_url} size={56} />
                    <Text style={styles.podiumName}>{top3[0].profile.name}</Text>
                    <Text style={styles.podiumScore}>{top3[0].profile.hero_score}</Text>
                  </View>
                  {top3.length > 2 && (
                    <View style={styles.podiumItem}>
                      <Text style={styles.podiumMedal}>3</Text>
                      <Avatar name={top3[2].profile.name} url={top3[2].profile.avatar_url} size={48} />
                      <Text style={styles.podiumName}>{top3[2].profile.name}</Text>
                      <Text style={styles.podiumScore}>{top3[2].profile.hero_score}</Text>
                    </View>
                  )}
                </View>
              )}
            </>
          }
          renderItem={({ item, index }) => {
            const rank = index + 4
            const isMe = item.profile.id === profile?.id
            return (
              <View style={[styles.row, isMe && styles.rowMe]}>
                <Text style={styles.rank}>#{rank}</Text>
                <Avatar name={item.profile.name} url={item.profile.avatar_url} size={36} />
                <View style={styles.rowInfo}>
                  <Text style={[styles.rowName, isMe && styles.rowNameMe]} numberOfLines={1}>
                    {item.profile.name}
                  </Text>
                  <Text style={styles.rowDetail}>{item.total_reports} reports · {item.total_resolved} resolved</Text>
                </View>
                <Text style={styles.rowScore}>{item.profile.hero_score}</Text>
              </View>
            )
          }}
          ListFooterComponent={
            <View style={styles.footer}>
              {myRank && !userEntry && (
                <MyRankCard
                  rank={myRank.rank}
                  total={myRank.total}
                  profile={{
                    name: profile?.name ?? 'You',
                    avatar_url: profile?.avatar_url,
                    hero_score: profile?.hero_score ?? 0,
                  }}
                />
              )}
              {myRank && userEntry && (
                <MyRankCard
                  rank={myRank.rank}
                  total={myRank.total}
                  profile={{
                    name: profile?.name ?? 'You',
                    avatar_url: profile?.avatar_url,
                    hero_score: profile?.hero_score ?? 0,
                  }}
                />
              )}
              <Text style={styles.footerNote}>
                Hero score is earned by reporting issues, getting them resolved, and verifying others' reports.
              </Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          contentContainerStyle={{ paddingBottom: SPACING.xxxxl }}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.h2, fontWeight: '700' },
  periodRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg, marginVertical: SPACING.md,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.button, padding: 2,
  },
  periodButton: { flex: 1, paddingVertical: SPACING.sm, alignItems: 'center', borderRadius: BORDER_RADIUS.button - 2 },
  periodActive: { backgroundColor: COLORS.primary },
  periodText: { fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.textSecondary },
  periodTextActive: { color: COLORS.white },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  podium: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end',
    padding: SPACING.xl, paddingBottom: SPACING.lg, gap: SPACING.lg,
  },
  podiumItem: { alignItems: 'center', gap: SPACING.xs },
  podiumFirst: { marginBottom: -SPACING.md },
  podiumMedal: {
    fontSize: FONT_SIZES.caption, fontWeight: '800', color: COLORS.white,
    backgroundColor: COLORS.primary, width: 24, height: 24, borderRadius: 12,
    textAlign: 'center', lineHeight: 24, overflow: 'hidden',
  },
  podiumName: { fontSize: FONT_SIZES.caption, fontWeight: '600', textAlign: 'center' },
  podiumScore: { fontSize: FONT_SIZES.bodySm, fontWeight: '700', color: COLORS.primary },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowMe: { backgroundColor: COLORS.primaryLight + '20' },
  rank: { width: 32, fontSize: FONT_SIZES.bodySm, fontWeight: '700', color: COLORS.textSecondary },
  rowInfo: { flex: 1 },
  rowName: { fontSize: FONT_SIZES.bodySm, fontWeight: '600' },
  rowNameMe: { color: COLORS.primary },
  rowDetail: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  rowScore: { fontSize: FONT_SIZES.body, fontWeight: '700', color: COLORS.textPrimary },
  footer: {
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg, gap: SPACING.md,
  },
  myRankCard: {
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg, borderWidth: 1, borderColor: COLORS.border,
  },
  myRankCardTop10: {
    borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight + '15',
  },
  myRankHeader: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, marginBottom: SPACING.sm,
  },
  myRankLabel: {
    fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  myRankBody: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  myRankLeft: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md, flex: 1,
  },
  myRankBadge: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.badge,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
  },
  myRankBadgeText: {
    fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.white,
  },
  myRankName: {
    fontSize: FONT_SIZES.bodySm, fontWeight: '600', flex: 1,
  },
  myRankRight: {
    alignItems: 'center',
  },
  myRankScore: {
    fontSize: FONT_SIZES.h3, fontWeight: '700', color: COLORS.primary,
  },
  myRankScoreLabel: {
    fontSize: FONT_SIZES.caption, color: COLORS.textMuted,
  },
  myRankTotal: {
    fontSize: FONT_SIZES.caption, color: COLORS.textMuted, marginTop: SPACING.xs,
  },
  footerNote: {
    fontSize: FONT_SIZES.caption, color: COLORS.textMuted, textAlign: 'center',
    lineHeight: 18, paddingBottom: SPACING.xl,
  },
})
