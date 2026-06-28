import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { CATEGORY_LABELS, CATEGORY_ICONS, COLORS, BORDER_RADIUS, FONT_SIZES } from '../lib/constants'
import { type IssueCategory } from '../lib/types'

interface Props {
  category: IssueCategory
  size?: number
  showLabel?: boolean
}

export function CategoryIcon({ category, size = 24, showLabel = false }: Props) {
  const iconName = CATEGORY_ICONS[category] || 'help-circle'
  const label = CATEGORY_LABELS[category] || category

  return (
    <View style={styles.container}>
      <View style={[styles.iconWrap, { width: size + 8, height: size + 8 }]}>
        <Ionicons name={iconName as keyof typeof Ionicons.glyphMap} size={size} color={COLORS.primary} />
      </View>
      {showLabel && <Text style={styles.label}>{label}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 4 },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: COLORS.primaryLight + '40',
  },
  label: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, textAlign: 'center' },
})
