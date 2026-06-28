import { useState, useRef } from 'react'
import {
  View, Text, FlatList, Dimensions, TouchableOpacity, StyleSheet,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../lib/constants'

const { width } = Dimensions.get('window')

const slides = [
  {
    id: '1',
    icon: 'camera-outline',
    title: 'Report Issues',
    description: 'Snap a photo, describe the problem, and alert your city authorities instantly.',
  },
  {
    id: '2',
    icon: 'hardware-chip-outline',
    title: 'AI Powered',
    description: 'Smart AI categorizes and routes your report to the right department automatically.',
  },
  {
    id: '3',
    icon: 'people-outline',
    title: 'Community Powered',
    description: 'Neighbors verify and upvote issues. The more confirmations, the higher the priority.',
  },
  {
    id: '4',
    icon: 'trending-up-outline',
    title: 'Track Impact',
    description: 'Watch your issue go from reported to resolved. Earn hero scores and badges.',
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const flatListRef = useRef<FlatList>(null)
  const router = useRouter()

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: { index: number | null }[] }) => {
    if (viewableItems[0]?.index !== null && viewableItems[0]?.index !== undefined) {
      setCurrentIndex(viewableItems[0].index)
    }
  }).current

  const skipOnboarding = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true')
    router.replace('/(auth)/sign-in')
  }

  const goToSignUp = async () => {
    await AsyncStorage.setItem('onboarding_complete', 'true')
    router.replace('/(auth)/sign-up')
  }

  const isLastSlide = currentIndex === slides.length - 1

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={skipOnboarding} style={styles.skipButton}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width }]}>
            <View style={styles.iconContainer}>
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={80} color={COLORS.primary} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </View>
        )}
      />

      <View style={styles.dots}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>

      <View style={styles.actions}>
        {isLastSlide ? (
          <TouchableOpacity style={styles.primaryButton} onPress={goToSignUp}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1 })
          }}>
            <Text style={styles.primaryButtonText}>Next</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 60,
  },
  skipButton: { alignSelf: 'flex-end', paddingHorizontal: SPACING.xl, paddingVertical: SPACING.sm },
  skipText: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: SPACING.xxxl },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: COLORS.primaryLight + '40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xxxxl,
  },
  title: {
    fontSize: FONT_SIZES.h1,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: FONT_SIZES.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.sm, marginVertical: SPACING.xxl },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.border },
  activeDot: { width: 24, backgroundColor: COLORS.primary },
  actions: { paddingHorizontal: SPACING.xxxl, paddingBottom: SPACING.xxxxl, gap: SPACING.lg },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  primaryButtonText: { color: COLORS.white, fontSize: FONT_SIZES.button, fontWeight: '600' },
  signInText: { textAlign: 'center', fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary },
  signInLink: { color: COLORS.primary, fontWeight: '600' },
})
