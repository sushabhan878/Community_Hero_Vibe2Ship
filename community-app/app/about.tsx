import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../lib/constants'

const aboutSections = [
  {
    title: 'Community Hero',
    items: [
      { icon: 'information-circle-outline', text: 'A hyperlocal platform for citizens to report, track, and resolve community issues using the power of AI and community verification.' },
    ],
  },
  {
    title: 'Features',
    items: [
      { icon: 'camera-outline', text: 'Image & video-based issue reporting' },
      { icon: 'map-outline', text: 'Geo-located issue tracking on map' },
      { icon: 'sparkles-outline', text: 'AI-powered issue categorization' },
      { icon: 'shield-checkmark-outline', text: 'Community verification system' },
      { icon: 'trending-up-outline', text: 'Impact dashboards & analytics' },
      { icon: 'trophy-outline', text: 'Gamification & hero scores' },
    ],
  },
  {
    title: 'How to Use',
    items: [
      { icon: 'camera-outline', text: 'Tap the Report tab to capture a photo or video of a community issue' },
      { icon: 'map-outline', text: 'Pin the exact location on the map and add details' },
      { icon: 'sparkles-outline', text: 'AI will auto-categorize the issue and suggest severity' },
      { icon: 'checkmark-circle-outline', text: 'Track your issue status — from pending to resolved' },
      { icon: 'people-outline', text: 'Verify other citizens\' reports to help prioritize them' },
    ],
  },
  {
    title: 'How to Rank on Leaderboard',
    items: [
      { icon: 'flag-outline', text: 'Report issues — each report earns hero score points' },
      { icon: 'checkmark-done-outline', text: 'Get your reports verified by other citizens for bonus points' },
      { icon: 'thumbs-up-outline', text: 'Verify other people\'s reports — every verification counts' },
      { icon: 'checkmark-circle-outline', text: 'Have your reports marked as resolved for a big score boost' },
      { icon: 'trophy-outline', text: 'Stay active consistently — the top 10 citizens appear on the leaderboard' },
    ],
  },
  {
    title: 'Tech Stack',
    items: [
      { icon: 'code-slash-outline', text: 'React Native (Expo) · Express · Supabase' },
      { icon: 'hardware-chip-outline', text: 'PostGIS · Google Gemini AI' },
    ],
  },
]

export default function AboutScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: SPACING.xxxxl }}>
        <View style={styles.heroSection}>
          <View style={styles.logoCircle}>
            <Ionicons name="shield-checkmark" size={40} color={COLORS.white} />
          </View>
          <Text style={styles.appName}>Community Hero</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        {aboutSections.map((section, si) => (
          <View key={si} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.card}>
              {section.items.map((item, ii) => (
                <View key={ii} style={[styles.row, ii < section.items.length - 1 && styles.rowBorder]}>
                  <Ionicons name={item.icon as any} size={20} color={COLORS.primary} />
                  <Text style={styles.rowText}>{item.text}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Links</Text>
          <TouchableOpacity style={styles.linkRow} onPress={() => Linking.openURL('https://opencode.ai')}>
            <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
            <Text style={styles.linkText}>OpenCode AI</Text>
            <Ionicons name="open-outline" size={16} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </ScrollView>
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
  heroSection: { alignItems: 'center', padding: SPACING.xxl, gap: SPACING.sm },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  appName: { fontSize: FONT_SIZES.h1, fontWeight: '700', color: COLORS.textPrimary },
  version: { fontSize: FONT_SIZES.bodySm, color: COLORS.textMuted },
  section: { paddingHorizontal: SPACING.lg, marginTop: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', marginBottom: SPACING.sm },
  card: {
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.card,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    padding: SPACING.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowText: { flex: 1, fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary, lineHeight: 20 },
  linkRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.card, borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md,
  },
  linkText: { flex: 1, fontSize: FONT_SIZES.bodySm, color: COLORS.primary, fontWeight: '500' },
})
