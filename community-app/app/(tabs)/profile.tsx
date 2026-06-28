import { useState } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Modal, TextInput,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as ImagePicker from 'expo-image-picker'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/authStore'
import { Avatar } from '../../components/Avatar'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, BADGE_LABELS, BADGE_CRITERIA } from '../../lib/constants'
import { type BadgeSlug } from '../../lib/types'

const menuItems = [
  { icon: 'list-outline', label: 'My Reports', route: '/(tabs)' },
  { icon: 'trophy-outline', label: 'Leaderboard', route: '/leaderboard' },
  { icon: 'settings-outline', label: 'Notification Settings' },
  { icon: 'information-circle-outline', label: 'About' },
]

export default function ProfileScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { profile, signOut } = useAuthStore()
  const [showEditModal, setShowEditModal] = useState(false)
  const [editName, setEditName] = useState(profile?.name ?? '')
  const [editPhone, setEditPhone] = useState(profile?.phone ?? '')

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut()
          signOut()
          router.replace('/(auth)')
        },
      },
    ])
  }

  async function handleAvatarChange() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    })
    if (!result.canceled && result.assets[0]) {
      const formData = new FormData()
      formData.append('file', {
        uri: result.assets[0].uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      } as unknown as Blob)
      await supabase.functions.invoke('profile/avatar', {
        method: 'POST',
        body: formData,
      })
    }
  }

  async function handleSaveProfile() {
    if (!editName.trim() || editName.trim().length < 2) {
      Alert.alert('Invalid', 'Name must be at least 2 characters')
      return
    }
    await supabase.from('profiles').update({ name: editName.trim(), phone: editPhone.trim() || null })
      .eq('id', profile?.id)
    setShowEditModal(false)
  }

  const badges = profile?.badges ?? []
  const allBadges: { slug: BadgeSlug; earned: boolean; awarded_at?: string }[] = [
    'first_report', 'neighborhood_watch', 'problem_solver', 'community_pillar',
    'speed_reporter', 'top_hero', 'verified_reporter', 'super_verifier',
  ].map((slug) => {
    const found = badges.find((b) => b.slug === slug)
    return { slug: slug as BadgeSlug, earned: !!found, awarded_at: found?.awarded_at }
  })

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => setShowEditModal(true)}>
          <Ionicons name="create-outline" size={22} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={handleAvatarChange}>
            <Avatar name={profile?.name ?? 'User'} url={profile?.avatar_url} size={72} />
            <View style={styles.editBadge}>
              <Ionicons name="camera" size={12} color={COLORS.white} />
            </View>
          </TouchableOpacity>
          <Text style={styles.profileName}>{profile?.name ?? 'User'}</Text>
          <View style={styles.scoreRow}>
            <Ionicons name="trophy" size={18} color={COLORS.warning} />
            <Text style={styles.scoreText}>Hero Score: {profile?.hero_score ?? 0}</Text>
          </View>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>
              {(profile?.role ?? 'citizen').replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_reports ?? 0}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_resolved ?? 0}</Text>
            <Text style={styles.statLabel}>Resolved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_verified ?? 0}</Text>
            <Text style={styles.statLabel}>Verified</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Badges</Text>
          <View style={styles.badgesGrid}>
            {allBadges.map((b) => (
              <View key={b.slug} style={[styles.badgeItem, !b.earned && styles.badgeLocked]}>
                <Ionicons
                  name={b.earned ? 'shield-checkmark' : 'shield-outline'}
                  size={24}
                  color={b.earned ? COLORS.primary : COLORS.textMuted}
                />
                <Text style={[styles.badgeName, !b.earned && styles.badgeNameLocked]}>
                  {BADGE_LABELS[b.slug]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as any)}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={COLORS.textPrimary} />
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: SPACING.xxxxl }} />
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit Profile</Text>

            <TouchableOpacity style={styles.avatarEdit} onPress={handleAvatarChange}>
              <Avatar name={profile?.name ?? 'User'} url={profile?.avatar_url} size={80} />
              <Text style={styles.changePhotoText}>Tap to change photo</Text>
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your name"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.fieldLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={editPhone}
              onChangeText={setEditPhone}
              placeholder="+91xxxxxxxxxx"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="phone-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveProfile}>
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.h2, fontWeight: '700' },
  profileHeader: { alignItems: 'center', padding: SPACING.xl, gap: SPACING.sm },
  editBadge: {
    position: 'absolute', bottom: 0, right: 0,
    backgroundColor: COLORS.primary, borderRadius: 10, width: 20, height: 20,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.white,
  },
  profileName: { fontSize: FONT_SIZES.h2, fontWeight: '700', marginTop: SPACING.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  scoreText: { fontSize: FONT_SIZES.bodySm, color: COLORS.warning, fontWeight: '600' },
  roleBadge: {
    backgroundColor: COLORS.primary + '20', paddingHorizontal: SPACING.md, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.badge,
  },
  roleText: { fontSize: FONT_SIZES.caption, color: COLORS.primary, fontWeight: '600', textTransform: 'capitalize' },
  statsRow: {
    flexDirection: 'row', marginHorizontal: SPACING.lg,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.card,
    padding: SPACING.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: FONT_SIZES.h1, fontWeight: '700', color: COLORS.textPrimary },
  statLabel: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  section: { padding: SPACING.lg },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', marginBottom: SPACING.md },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  badgeItem: {
    width: '23%', alignItems: 'center', gap: 4,
    padding: SPACING.sm, backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.card,
  },
  badgeLocked: { opacity: 0.5 },
  badgeName: { fontSize: 9, color: COLORS.textPrimary, textAlign: 'center' },
  badgeNameLocked: { color: COLORS.textMuted },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  menuLabel: { flex: 1, fontSize: FONT_SIZES.body, color: COLORS.textPrimary },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.danger + '40',
  },
  signOutText: { fontSize: FONT_SIZES.button, color: COLORS.danger, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: COLORS.overlay, justifyContent: 'flex-end' },
  modal: {
    backgroundColor: COLORS.card, borderTopLeftRadius: BORDER_RADIUS.modal,
    borderTopRightRadius: BORDER_RADIUS.modal, padding: SPACING.xl,
    paddingBottom: SPACING.xxxxl,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', marginBottom: SPACING.lg },
  avatarEdit: { alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.xl },
  changePhotoText: { fontSize: FONT_SIZES.caption, color: COLORS.primary },
  fieldLabel: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.body, color: COLORS.textPrimary,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  cancelButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.textSecondary },
  saveButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.primary,
  },
  saveText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.white },
})
