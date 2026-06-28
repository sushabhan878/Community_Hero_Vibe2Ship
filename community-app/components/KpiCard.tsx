import { View, Text, StyleSheet } from 'react-native'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../lib/constants'

interface Props {
  label: string
  value: string | number
  delta?: number
  color?: string
}

export function KpiCard({ label, value, delta, color = COLORS.primary }: Props) {
  return (
    <View style={[styles.card, { borderTopColor: color, borderTopWidth: 3 }]}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {delta !== undefined && (
        <Text style={[styles.delta, { color: delta >= 0 ? COLORS.primary : COLORS.danger }]}>
          {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)}%
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.card,
    borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 2,
  },
  value: {
    fontSize: FONT_SIZES.h1,
    fontWeight: '700',
  },
  label: {
    fontSize: FONT_SIZES.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 2,
  },
  delta: {
    fontSize: FONT_SIZES.caption,
    fontWeight: '600',
    marginTop: 2,
  },
})
