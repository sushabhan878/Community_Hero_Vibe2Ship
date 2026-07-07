import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { type Issue } from '../lib/types'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, STATUS_LABELS, STATUS_COLORS } from '../lib/constants'
import { SeverityBadge } from './SeverityBadge'
import { Avatar } from './Avatar'
import { formatRelativeTime } from '../lib/utils'

interface Props {
  issue: Issue
  onPress: (id: string) => void
}

export function IssueCard({ issue, onPress }: Props) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress(issue.id)}
      activeOpacity={0.7}
    >
      <View style={styles.row}>
        {issue.image_urls?.[0] && (
          <Image
            source={{ uri: issue.image_urls[0] }}
            style={styles.thumbnail}
          />
        )}
        <View style={styles.content}>
          <Text style={styles.title} numberOfLines={2}>
            {issue.title}
          </Text>
          <View style={styles.badges}>
            <SeverityBadge severity={issue.severity} />
            <Text style={[styles.statusText, { color: STATUS_COLORS[issue.status] || COLORS.textMuted }]}>
              {STATUS_LABELS[issue.status] || issue.status}
            </Text>
          </View>
          <View style={styles.meta}>
            <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.metaText} numberOfLines={1}>
              {issue.address || `${issue.latitude.toFixed(4)}, ${issue.longitude.toFixed(4)}`}
            </Text>
          </View>
            <View style={styles.footer}>
              <Text style={styles.time}>{formatRelativeTime(issue.created_at)}</Text>
              <View style={styles.verification}>
                <Ionicons name="shield-checkmark" size={14} color={COLORS.primary} />
                <Text style={styles.verifCount}>{issue.verification_count}</Text>
              </View>
              {issue.reporter && (
                <Avatar name={issue.reporter.name} url={issue.reporter.avatar_url} size={20} />
              )}
            </View>
        </View>
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginVertical: SPACING.xs,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 3,
  },
  row: { flexDirection: 'row', gap: SPACING.md },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: COLORS.surface,
  },
  content: { flex: 1, gap: 4 },
  title: {
    fontSize: FONT_SIZES.body,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  badges: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  metaText: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 2,
  },
  time: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  statusText: { fontSize: FONT_SIZES.caption, fontWeight: '600' },
  verification: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  verifCount: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.primary,
    fontWeight: '600',
  },
})
