import { useState } from 'react'
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIssues } from '../../hooks/useIssues'
import { StatusBadge } from '../../components/StatusBadge'
import { SeverityBadge } from '../../components/SeverityBadge'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, STATUS_LABELS } from '../../lib/constants'
import { type IssueStatus } from '../../lib/types'
import { formatRelativeTime } from '../../lib/utils'

const statusFilters: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Assigned', value: 'assigned' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
]

export default function AdminIssuesScreen() {
  const insets = useSafeAreaInsets()
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const { data, isLoading, refetch, isRefetching, fetchNextPage, hasNextPage, isFetchingNextPage } = useIssues({
    status: statusFilter,
    search: search || undefined,
    limit: 50,
  })

  const issues = data?.pages.flatMap((p) => p.issues) ?? []

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issues ({issues.length})</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search issues..."
            placeholderTextColor={COLORS.textMuted}
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.lg }}
          data={statusFilters}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, statusFilter === item.value && styles.chipActive]}
              onPress={() => setStatusFilter(item.value)}
            >
              <Text style={[styles.chipText, statusFilter === item.value && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {selected.size > 0 && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkText}>{selected.size} selected</Text>
          <TouchableOpacity style={styles.bulkAction}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.white} />
            <Text style={styles.bulkActionText}>Resolve</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bulkAction}>
            <Ionicons name="hammer" size={18} color={COLORS.white} />
            <Text style={styles.bulkActionText}>In Progress</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSelected(new Set())}>
            <Ionicons name="close" size={20} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={issues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.tableRow}
            onPress={() => router.push(`/issue/${item.id}`)}
            onLongPress={() => toggleSelect(item.id)}
          >
            <TouchableOpacity onPress={() => toggleSelect(item.id)} style={styles.checkCol}>
              <Ionicons
                name={selected.has(item.id) ? 'checkbox' : 'square-outline'}
                size={20}
                color={selected.has(item.id) ? COLORS.primary : COLORS.textMuted}
              />
            </TouchableOpacity>
            <View style={styles.infoCol}>
              <Text style={styles.issueTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.issueMeta}>
                <StatusBadge status={item.status} />
                <SeverityBadge severity={item.severity} />
                <Text style={styles.metaText}>{item.verification_count} verif</Text>
              </View>
            </View>
            <View style={styles.ageCol}>
              <Text style={styles.ageText}>{formatRelativeTime(item.created_at)}</Text>
              <Text style={styles.reporterText}>{item.reporter?.name?.split(' ')[0]}</Text>
            </View>
          </TouchableOpacity>
        )}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        onEndReached={() => hasNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No issues found</Text>
            </View>
          )
        }
        ListFooterComponent={isFetchingNextPage ? (
          <ActivityIndicator style={{ padding: SPACING.xl }} color={COLORS.primary} />
        ) : null}
        contentContainerStyle={{ paddingBottom: SPACING.xxxxl }}
      />
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
  headerTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600' },
  searchRow: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.input, paddingHorizontal: SPACING.md, gap: SPACING.sm,
  },
  searchInput: { flex: 1, paddingVertical: SPACING.sm, fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary },
  chipsRow: { paddingBottom: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.badge, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  bulkBar: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.lg, borderRadius: BORDER_RADIUS.button, marginBottom: SPACING.sm,
  },
  bulkText: { color: COLORS.white, fontWeight: '600', flex: 1 },
  bulkAction: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bulkActionText: { color: COLORS.white, fontSize: FONT_SIZES.caption, fontWeight: '600' },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  checkCol: { width: 28 },
  infoCol: { flex: 1, gap: 4 },
  issueTitle: { fontSize: FONT_SIZES.bodySm, fontWeight: '600' },
  issueMeta: { flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center' },
  metaText: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  ageCol: { alignItems: 'flex-end' },
  ageText: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  reporterText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 100 },
  emptyText: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
})
