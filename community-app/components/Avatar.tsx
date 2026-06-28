import { View, Text, Image, StyleSheet } from 'react-native'
import { COLORS, FONT_SIZES } from '../lib/constants'
import { getInitials } from '../lib/utils'

interface Props {
  url?: string | null
  name: string
  size?: number
}

export function Avatar({ url, name, size = 40 }: Props) {
  const initials = getInitials(name)
  const fontSize = size * 0.4

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    )
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  image: { backgroundColor: COLORS.surface },
  fallback: {
    backgroundColor: COLORS.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: COLORS.primary,
    fontWeight: '700',
  },
})
