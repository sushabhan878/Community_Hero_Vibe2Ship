import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../lib/constants'
import { type UpdateType } from '../lib/types'
import { formatRelativeTime } from '../lib/utils'
import { STATUS_COLORS } from '../lib/constants'

const TIMELINE_ICONS: Record<string, string> = {
  status_change: 'arrow-forward-circle',
  department_assigned: 'hard-hat',
  note_added: 'document-text',
  ai_processed: 'robot',
  verification_milestone: 'people',
}

const TIMELINE_LABELS: Record<string, string> = {
  status_change: 'Status changed',
  department_assigned: 'Department assigned',
  note_added: 'Note added',
  ai_processed: 'AI processed',
  verification_milestone: 'Verification milestone',
}

interface Props {
  type: UpdateType
  label?: string
  note?: string
  timestamp: string
  isFirst?: boolean
  isLast?: boolean
}

export function TimelineItem({ type, label, note, timestamp, isFirst, isLast }: Props) {
  const iconName = TIMELINE_ICONS[type] || 'ellipse'
  const displayLabel = label || TIMELINE_LABELS[type] || type
  const color = STATUS_COLORS[type === 'status_change' ? 'in_progress' : 'verified'] || COLORS.textMuted

  return (
    <View style={styles.row}>
      <View style={styles.lineContainer}>
        {!isFirst && <View style={[styles.line, { backgroundColor: color + '40' }]} />}
        <View style={[styles.dot, { backgroundColor: color }]}>
          <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={14} color={COLORS.white} />
        </View>
        {!isLast && <View style={[styles.line, { backgroundColor: color + '40' }]} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.label}>{displayLabel}</Text>
        {note && <Text style={styles.note}>{note}</Text>}
        <Text style={styles.time}>{formatRelativeTime(timestamp)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SPACING.md },
  lineContainer: { alignItems: 'center', width: 28 },
  line: { width: 2, flex: 1 },
  dot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { flex: 1, paddingBottom: SPACING.lg },
  label: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary },
  note: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: 2 },
  time: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted, marginTop: 2 },
})
