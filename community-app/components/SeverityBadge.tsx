import { View, Text, StyleSheet } from 'react-native'
import { COLORS, SEVERITY_COLORS, BORDER_RADIUS, FONT_SIZES } from '../lib/constants'
import { type IssueSeverity } from '../lib/types'

interface Props {
  severity: IssueSeverity
  size?: 'sm' | 'md'
}

export function SeverityBadge({ severity, size = 'sm' }: Props) {
  const color = SEVERITY_COLORS[severity] || COLORS.textMuted
  const label = severity.charAt(0).toUpperCase() + severity.slice(1)

  return (
    <View style={[styles.badge, { backgroundColor: color + '20' }, size === 'sm' ? styles.sm : styles.md]}>
      <Text style={[styles.label, { color }, size === 'sm' ? styles.labelSm : styles.labelMd]}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.badge,
  },
  sm: { paddingHorizontal: 8, paddingVertical: 2 },
  md: { paddingHorizontal: 12, paddingVertical: 4 },
  label: { fontWeight: '600' },
  labelSm: { fontSize: FONT_SIZES.caption },
  labelMd: { fontSize: FONT_SIZES.bodySm },
})
