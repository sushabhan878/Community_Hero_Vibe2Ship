import { View, Text, StyleSheet } from 'react-native'
import { COLORS, STATUS_COLORS, STATUS_LABELS, BORDER_RADIUS, FONT_SIZES } from '../lib/constants'
import { type IssueStatus } from '../lib/types'

interface Props {
  status: IssueStatus
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'sm' }: Props) {
  const bgColor = STATUS_COLORS[status] || COLORS.textMuted
  const label = STATUS_LABELS[status] || status

  return (
    <View style={[styles.badge, { backgroundColor: bgColor + '20' }, size === 'sm' ? styles.sm : styles.md]}>
      <View style={[styles.dot, { backgroundColor: bgColor }]} />
      <Text style={[styles.label, { color: bgColor }, size === 'sm' ? styles.labelSm : styles.labelMd]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.badge,
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 12, paddingVertical: 4 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  label: { fontWeight: '600' },
  labelSm: { fontSize: FONT_SIZES.caption },
  labelMd: { fontSize: FONT_SIZES.bodySm },
})
