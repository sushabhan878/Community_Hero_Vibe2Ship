import { useState, useCallback } from 'react'
import {
  View, Text, ScrollView, Image, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, TextInput, Modal,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import MapView, { Marker } from 'react-native-maps'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIssue, useUpdateIssueStatus, useUpdateAiAnalysis } from '../../hooks/useIssues'
import { useAuthStore } from '../../stores/authStore'
import { StatusBadge } from '../../components/StatusBadge'
import { SeverityBadge } from '../../components/SeverityBadge'
import { CategoryIcon } from '../../components/CategoryIcon'
import { Avatar } from '../../components/Avatar'
import { TimelineItem } from '../../components/TimelineItem'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, VALID_STATUS_TRANSITIONS, STATUS_LABELS, CATEGORY_LABELS } from '../../lib/constants'
import { type Profile } from '../../lib/types'
import { formatRelativeTime, formatDate } from '../../lib/utils'
import { getAuthHeaders } from '../../lib/api'
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export default function IssueDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const { data: issue, isLoading, refetch } = useIssue(id!)
  const { profile } = useAuthStore()
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')
  const [showAiEditModal, setShowAiEditModal] = useState(false)
  const [editAiSummary, setEditAiSummary] = useState('')
  const [editAiCategory, setEditAiCategory] = useState('other')
  const [editAiSeverity, setEditAiSeverity] = useState('low')
  const [verifying, setVerifying] = useState(false)
  const [justVerified, setJustVerified] = useState(false)
  const updateStatus = useUpdateIssueStatus()
  const updateAiAnalysis = useUpdateAiAnalysis()

  const isDeptAdmin = profile?.role === 'department_admin'
  const isSuperAdmin = profile?.role === 'super_admin'
  const isReporter = issue?.reporter_id === profile?.id
  const canVerify = true

  const handleVerify = useCallback(async () => {
    if (!id || verifying) return
    setVerifying(true)
    try {
      const headers = await getAuthHeaders()
      const method = issue?.has_verified ? 'DELETE' : 'POST'
      const res = await fetch(`${API_URL}/api/issues/${id}/verify`, { method, headers })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error?.message || 'Failed to verify')
      if (!issue?.has_verified) setJustVerified(true)
      refetch()
      const user = useAuthStore.getState().session?.user
      if (user) {
        await supabase.rpc('allocate_badges', { user_id: user.id })
        const { data } = await supabase
          .from('profiles')
          .select('*, badges(*), department:departments(*)')
          .eq('id', user.id)
          .single()
        if (data) {
          useAuthStore.getState().setProfile(data as unknown as Profile)
        }
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to verify')
    } finally {
      setVerifying(false)
    }
  }, [id, issue?.has_verified, refetch, verifying])

  const handleStatusChange = useCallback(async () => {
    if (!newStatus) return
    try {
      await updateStatus.mutateAsync({ id: id!, status: newStatus, note: statusNote || undefined })
      setShowStatusModal(false)
      setNewStatus('')
      setStatusNote('')
      refetch()
    } catch {
      Alert.alert('Error', 'Could not update status')
    }
  }, [id, newStatus, statusNote, updateStatus, refetch])

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    )
  }

  if (!issue) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Issue not found</Text>
      </View>
    )
  }

  const validTransitions = VALID_STATUS_TRANSITIONS[issue.status] || []

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <TouchableOpacity>
          <Ionicons name="share-outline" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {issue.image_urls.length > 0 && (
          <View style={styles.gallery}>
            <Image source={{ uri: issue.image_urls[currentImageIndex] }} style={styles.galleryImage} />
            {issue.image_urls.length > 1 && (
              <View style={styles.galleryDots}>
                {issue.image_urls.map((_, i) => (
                  <TouchableOpacity key={i} onPress={() => setCurrentImageIndex(i)}>
                    <View style={[styles.galleryDot, i === currentImageIndex && styles.galleryDotActive]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={styles.badgesRow}>
          <CategoryIcon category={issue.category} size={20} />
          <SeverityBadge severity={issue.severity} size="md" />
          <StatusBadge status={issue.status} size="md" />
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>{issue.title}</Text>
          {issue.description && <Text style={styles.description}>{issue.description}</Text>}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.locationText}>{issue.address || `${issue.latitude.toFixed(5)}, ${issue.longitude.toFixed(5)}`}</Text>
          <MapView
            style={styles.mapPreview}
            initialRegion={{
              latitude: issue.latitude,
              longitude: issue.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            scrollEnabled={false}
            zoomEnabled={false}
          >
            <Marker coordinate={{ latitude: issue.latitude, longitude: issue.longitude }} />
          </MapView>
        </View>

        {issue.ai_summary && (
          <View style={styles.aiCard}>
            <View style={styles.aiCardHeader}>
              <Text style={styles.aiCardTitle}>AI Analysis</Text>
              <TouchableOpacity
                style={styles.aiEditButton}
                onPress={() => {
                  setEditAiSummary(issue.ai_summary ?? '')
                  setEditAiCategory(issue.ai_category ?? issue.category ?? 'other')
                  setEditAiSeverity(issue.ai_severity ?? issue.severity ?? 'low')
                  setShowAiEditModal(true)
                }}
              >
                <Ionicons name="create-outline" size={18} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.aiSummary}>{issue.ai_summary}</Text>
            {issue.ai_confidence && (
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>Confidence</Text>
                <View style={styles.confidenceBar}>
                  <View style={[styles.confidenceFill, { width: `${Math.round(issue.ai_confidence * 100)}%` }]} />
                </View>
                <Text style={styles.confidenceText}>{Math.round(issue.ai_confidence * 100)}%</Text>
              </View>
            )}
            {issue.assigned_department && (
              <Text style={styles.deptText}>Assigned to: {issue.assigned_department.name}</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reporter</Text>
          <View style={styles.reporterRow}>
            <Avatar name={issue.reporter?.name ?? 'User'} url={issue.reporter?.avatar_url} size={40} />
            <View>
              <Text style={styles.reporterName}>{issue.reporter?.name ?? 'Anonymous'}</Text>
              {issue.reporter && <Text style={styles.reporterScore}>Hero Score: {issue.reporter.hero_score}</Text>}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.verificationHeader}>
            <Text style={styles.sectionTitle}>Verification</Text>
            <Text style={styles.verifCount}>{issue.verification_count} neighbors confirmed</Text>
          </View>
          {canVerify && (
            <TouchableOpacity
              style={[styles.verifyButton, (issue.has_verified || justVerified) && styles.verifyButtonActive]}
              onPress={handleVerify}
              disabled={verifying}
            >
              {verifying ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <>
                  <Ionicons
                    name={issue.has_verified || justVerified ? 'shield-checkmark' : 'shield-outline'}
                    size={20}
                    color={issue.has_verified || justVerified ? COLORS.white : COLORS.primary}
                  />
                  <Text style={[styles.verifyText, (issue.has_verified || justVerified) && styles.verifyTextActive]}>
                    {justVerified ? 'You verified the issue' : issue.has_verified ? 'Verified' : 'Verify'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {issue.timeline && issue.timeline.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Timeline</Text>
            {issue.timeline.map((t, i) => (
              <TimelineItem
                key={t.id}
                type={t.type}
                note={t.note}
                timestamp={t.created_at}
                isFirst={i === 0}
                isLast={i === issue.timeline!.length - 1}
              />
            ))}
          </View>
        )}

        {(isDeptAdmin || isSuperAdmin) && validTransitions.length > 0 && (
          <View style={styles.section}>
            <TouchableOpacity style={styles.adminButton} onPress={() => setShowStatusModal(true)}>
              <Ionicons name="create-outline" size={20} color={COLORS.white} />
              <Text style={styles.adminButtonText}>Change Status</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: SPACING.xxxxl }} />
      </ScrollView>

      <Modal visible={showAiEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit AI Analysis</Text>
            <Text style={styles.modalSubtitle}>Correct the AI's assessment</Text>

            <Text style={styles.fieldLabel}>Summary</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="AI summary"
              placeholderTextColor={COLORS.textMuted}
              value={editAiSummary}
              onChangeText={setEditAiSummary}
              multiline
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pickerRow}>
              {['pothole', 'road_damage', 'water_leak', 'sewage', 'streetlight', 'garbage', 'illegal_dumping', 'fallen_tree', 'park_damage', 'other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.pickerOption, editAiCategory === cat && styles.pickerOptionActive]}
                  onPress={() => setEditAiCategory(cat)}
                >
                  <Text style={[styles.pickerOptionText, editAiCategory === cat && styles.pickerOptionTextActive]}>
                    {CATEGORY_LABELS[cat] ?? cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.pickerRow}>
              {['low', 'medium', 'high', 'critical'].map((sev) => (
                <TouchableOpacity
                  key={sev}
                  style={[styles.pickerOption, editAiSeverity === sev && styles.pickerOptionActive]}
                  onPress={() => setEditAiSeverity(sev)}
                >
                  <Text style={[styles.pickerOptionText, editAiSeverity === sev && styles.pickerOptionTextActive]}>
                    {sev.charAt(0).toUpperCase() + sev.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAiEditModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, updateAiAnalysis.isPending && styles.buttonDisabled]}
                onPress={async () => {
                  try {
                    await updateAiAnalysis.mutateAsync({
                      id: id!,
                      ai_summary: editAiSummary,
                      ai_category: editAiCategory,
                      ai_severity: editAiSeverity,
                    })
                    setShowAiEditModal(false)
                    refetch()
                  } catch {
                    Alert.alert('Error', 'Could not update AI analysis')
                  }
                }}
                disabled={updateAiAnalysis.isPending}
              >
                {updateAiAnalysis.isPending ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.confirmText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Change Status</Text>
            <Text style={styles.modalSubtitle}>Current: {STATUS_LABELS[issue.status]}</Text>

            {validTransitions.map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.statusOption, newStatus === status && styles.statusOptionActive]}
                onPress={() => setNewStatus(status)}
              >
                <Text style={[styles.statusOptionText, newStatus === status && styles.statusOptionTextActive]}>
                  {STATUS_LABELS[status]}
                </Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.noteInput}
              placeholder="Add a note (optional)"
              placeholderTextColor={COLORS.textMuted}
              value={statusNote}
              onChangeText={setStatusNote}
              multiline
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setShowStatusModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmButton, !newStatus && styles.buttonDisabled]}
                onPress={handleStatusChange}
                disabled={!newStatus || updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.confirmText}>Confirm</Text>
                )}
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600' },
  gallery: { position: 'relative' },
  galleryImage: { width: '100%', height: 280, backgroundColor: COLORS.surface },
  galleryDots: {
    position: 'absolute', bottom: SPACING.md, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: SPACING.xs,
  },
  galleryDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.white + '80' },
  galleryDotActive: { backgroundColor: COLORS.white, width: 20 },
  badgesRow: { flexDirection: 'row', gap: SPACING.sm, padding: SPACING.lg, alignItems: 'center' },
  section: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', color: COLORS.textPrimary, marginBottom: SPACING.md },
  title: { fontSize: FONT_SIZES.h2, fontWeight: '700', color: COLORS.textPrimary },
  description: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, lineHeight: 24, marginTop: SPACING.sm },
  locationText: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.md },
  mapPreview: { width: '100%', height: 150, borderRadius: BORDER_RADIUS.card },
  aiCard: {
    backgroundColor: COLORS.white, marginHorizontal: SPACING.lg, marginTop: SPACING.lg,
    borderRadius: BORDER_RADIUS.card, borderWidth: 1, borderColor: COLORS.border,
    padding: SPACING.lg, shadowColor: COLORS.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  aiCardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.md,
  },
  aiCardTitle: { fontSize: FONT_SIZES.h3, fontWeight: '700', color: COLORS.textPrimary },
  aiEditButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primaryLight + '30',
    alignItems: 'center', justifyContent: 'center',
  },
  aiSummary: { fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary, lineHeight: 20 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginTop: SPACING.md },
  confidenceLabel: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, width: 64 },
  confidenceBar: { flex: 1, height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden' },
  confidenceFill: { height: 8, backgroundColor: COLORS.primary, borderRadius: 4 },
  confidenceText: { fontSize: FONT_SIZES.caption, fontWeight: '700', color: COLORS.primary, width: 36, textAlign: 'right' },
  deptText: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginTop: SPACING.md },
  fieldLabel: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  pickerOption: {
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.badge, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pickerOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  pickerOptionText: { fontSize: FONT_SIZES.caption, fontWeight: '500', color: COLORS.textSecondary },
  pickerOptionTextActive: { color: COLORS.white },
  reporterRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'center' },
  reporterName: { fontSize: FONT_SIZES.body, fontWeight: '600' },
  reporterScore: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary },
  verificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verifCount: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary },
  verifyButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    borderWidth: 2, borderColor: COLORS.primary, borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.md, marginTop: SPACING.md,
  },
  verifyButtonActive: { backgroundColor: COLORS.primary },
  verifyText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.primary },
  verifyTextActive: { color: COLORS.white },
  adminButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.md,
  },
  adminButtonText: { color: COLORS.white, fontSize: FONT_SIZES.button, fontWeight: '600' },
  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modal: {
    backgroundColor: COLORS.card, borderTopLeftRadius: BORDER_RADIUS.modal,
    borderTopRightRadius: BORDER_RADIUS.modal, padding: SPACING.xl,
    paddingBottom: SPACING.xxxxl,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600' },
  modalSubtitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  statusOption: {
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  statusOptionActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  statusOptionText: { fontSize: FONT_SIZES.body, fontWeight: '500' },
  statusOptionTextActive: { color: COLORS.white },
  noteInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, padding: SPACING.md, marginTop: SPACING.md,
    height: 80, textAlignVertical: 'top', fontSize: FONT_SIZES.bodySm,
  },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  cancelButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.border,
  },
  cancelText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.textSecondary },
  confirmButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.primary,
  },
  buttonDisabled: { opacity: 0.5 },
  confirmText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.white },
})
