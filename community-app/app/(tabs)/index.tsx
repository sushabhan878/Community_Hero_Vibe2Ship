import { useState, useCallback } from 'react'
import {
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker, Callout, type Region } from 'react-native-maps'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIssues, useNearbyMarkers } from '../../hooks/useIssues'
import { useFilterStore } from '../../stores/filterStore'
import { IssueCard } from '../../components/IssueCard'
import { StatusBadge } from '../../components/StatusBadge'
import { SeverityBadge } from '../../components/SeverityBadge'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, SEVERITY_COLORS } from '../../lib/constants'
import { type IssueCategory, type IssueSeverity, type IssueStatus } from '../../lib/types'

const FILTER_CHIPS: { label: string; key: string }[] = [
  { label: 'All', key: '' },
  { label: 'Pending', key: 'pending' },
  { label: 'Verified', key: 'verified' },
  { label: 'In Progress', key: 'in_progress' },
  { label: 'Resolved', key: 'resolved' },
]

export default function FeedScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const [search, setSearch] = useState('')
  const [chipFilter, setChipFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [region, setRegion] = useState<Region | null>(null)

  const { viewMode, setViewMode, sortBy, setSortBy, activeCount } = useFilterStore()

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    refetch,
    isRefetching,
  } = useIssues({
    status: chipFilter,
    search: search || undefined,
    sort: sortBy,
  })

  const { data: nearbyMarkers } = useNearbyMarkers(
    region?.latitude,
    region?.longitude,
    5,
  )

  const issues = data?.pages.flatMap((p) => p.issues) ?? []

  const handleIssuePress = useCallback((id: string) => {
    router.push(`/issue/${id}`)
  }, [router])

  const handleRegionChange = useCallback((r: Region) => {
    setRegion(r)
  }, [])

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Community Hero</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={() => setShowFilters(true)} style={styles.filterButton}>
            <Ionicons name="funnel-outline" size={20} color={COLORS.textPrimary} />
            {activeCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/leaderboard')}>
            <Ionicons name="trophy-outline" size={22} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
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
          {search ? (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsRow}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={FILTER_CHIPS}
          contentContainerStyle={{ gap: SPACING.sm, paddingHorizontal: SPACING.lg }}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.chip, chipFilter === item.key && styles.chipActive]}
              onPress={() => setChipFilter(item.key)}
            >
              <Text style={[styles.chipText, chipFilter === item.key && styles.chipTextActive]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'list' && styles.modeActive]}
          onPress={() => setViewMode('list')}
        >
          <Ionicons name="list" size={18} color={viewMode === 'list' ? COLORS.white : COLORS.textSecondary} />
          <Text style={[styles.modeText, viewMode === 'list' && styles.modeTextActive]}>List</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, viewMode === 'map' && styles.modeActive]}
          onPress={() => setViewMode('map')}
        >
          <Ionicons name="map" size={18} color={viewMode === 'map' ? COLORS.white : COLORS.textSecondary} />
          <Text style={[styles.modeText, viewMode === 'map' && styles.modeTextActive]}>Map</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' ? (
        <FlatList
          data={issues}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <IssueCard issue={item} onPress={handleIssuePress} />}
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          onEndReached={() => hasNextPage && fetchNextPage()}
          onEndReachedThreshold={0.5}
          ListFooterComponent={isFetchingNextPage ? (
            <ActivityIndicator style={{ padding: SPACING.xl }} color={COLORS.primary} />
          ) : null}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.emptyState}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={48} color={COLORS.textMuted} />
                <Text style={styles.emptyTitle}>No issues found</Text>
                <Text style={styles.emptySubtitle}>Be the first to report one!</Text>
              </View>
            )
          }
          contentContainerStyle={{ paddingBottom: SPACING.xxxxl }}
        />
      ) : (
        <MapView
          style={styles.map}
          initialRegion={{
            latitude: 12.9716,
            longitude: 77.5946,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          onRegionChangeComplete={handleRegionChange}
          showsUserLocation
        >
          {(nearbyMarkers ?? []).map((marker) => (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              pinColor={SEVERITY_COLORS[marker.severity] || COLORS.textMuted}
              onCalloutPress={() => handleIssuePress(marker.id)}
            >
              <Callout>
                <View style={styles.callout}>
                  <Text style={styles.calloutCategory}>{marker.category}</Text>
                  <SeverityBadge severity={marker.severity} />
                  <StatusBadge status={marker.status} />
                </View>
              </Callout>
            </Marker>
          ))}
        </MapView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  greeting: { fontSize: FONT_SIZES.h2, fontWeight: '700', color: COLORS.textPrimary },
  headerRight: { flexDirection: 'row', gap: SPACING.lg, alignItems: 'center' },
  filterButton: { position: 'relative' },
  filterBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    backgroundColor: COLORS.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: { color: COLORS.white, fontSize: 10, fontWeight: '700' },
  searchRow: { paddingHorizontal: SPACING.lg, paddingBottom: SPACING.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.input,
    paddingHorizontal: SPACING.md,
    gap: SPACING.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.bodySm,
    color: COLORS.textPrimary,
  },
  chipsRow: { paddingBottom: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.badge,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontWeight: '500' },
  chipTextActive: { color: COLORS.white },
  modeToggle: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.button,
    padding: 2,
    alignSelf: 'flex-start',
  },
  modeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.button - 2,
  },
  modeActive: { backgroundColor: COLORS.primary },
  modeText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontWeight: '500' },
  modeTextActive: { color: COLORS.white },
  map: { flex: 1 },
  callout: { padding: SPACING.sm, gap: 4, minWidth: 120 },
  calloutCategory: { fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.textPrimary, textTransform: 'capitalize' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 100, gap: SPACING.md },
  emptyTitle: { fontSize: FONT_SIZES.h3, color: COLORS.textSecondary, fontWeight: '600' },
  emptySubtitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textMuted },
})
