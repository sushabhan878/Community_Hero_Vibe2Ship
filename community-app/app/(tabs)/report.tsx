import { useState, useRef, useCallback } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
  TextInput, Alert, ActivityIndicator, Dimensions,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCreateIssue, useUploadMedia } from '../../hooks/useIssues'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, CATEGORY_LABELS, CATEGORY_ICONS } from '../../lib/constants'
import { type IssueCategory, type IssueSeverity } from '../../lib/types'
import { generateTempId } from '../../lib/utils'

const { width } = Dimensions.get('window')
const STEPS = ['Media', 'Location', 'Details']

const CATEGORIES: { key: IssueCategory; icon: string }[] = [
  { key: 'pothole', icon: 'road-variant' },
  { key: 'road_damage', icon: 'road' },
  { key: 'water_leak', icon: 'water' },
  { key: 'sewage', icon: 'pipe' },
  { key: 'streetlight', icon: 'lightbulb-on' },
  { key: 'garbage', icon: 'trash-can' },
  { key: 'illegal_dumping', icon: 'dump-truck' },
  { key: 'fallen_tree', icon: 'tree' },
  { key: 'park_damage', icon: 'tree' },
  { key: 'other', icon: 'help-circle' },
]

const SEVERITIES: { key: IssueSeverity; label: string }[] = [
  { key: 'low', label: 'Low' },
  { key: 'medium', label: 'Medium' },
  { key: 'high', label: 'High' },
  { key: 'critical', label: 'Critical' },
]

export default function ReportScreen() {
  const [step, setStep] = useState(0)
  const [images, setImages] = useState<string[]>([])
  const [cameraRef, setCameraRef] = useState<CameraView | null>(null)
  const [cameraPermission] = useCameraPermissions()
  const [facing, setFacing] = useState<'front' | 'back'>('back')
  const [location, setLocation] = useState<{ latitude: number; longitude: number; address?: string } | null>(null)
  const [mapRegion, setMapRegion] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01,
  })
  const [category, setCategory] = useState<IssueCategory | null>(null)
  const [severity, setSeverity] = useState<IssueSeverity>('medium')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [ward, setWard] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()
  const insets = useSafeAreaInsets()
  const uploadMedia = useUploadMedia()
  const createIssue = useCreateIssue()

  const pickFromGallery = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5 - images.length,
    })
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5))
    }
  }, [images.length])

  const takePhoto = useCallback(async () => {
    if (!cameraRef) return
    const photo = await cameraRef.takePictureAsync({ quality: 0.8 })
    if (photo) {
      setImages((prev) => [...prev, photo.uri].slice(0, 5))
    }
  }, [cameraRef])

  const getCurrentLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Location permission is needed to pin your report.')
      return
    }
    const loc = await Location.getCurrentPositionAsync({})
    const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude }
    setLocation(coords)
    setMapRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 })

    const [address] = await Location.reverseGeocodeAsync(coords)
    if (address) {
      const addr = [address.name, address.street, address.city, address.region].filter(Boolean).join(', ')
      setLocation((prev) => prev ? { ...prev, address: addr } : prev)
    }
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!category || !title || !location) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.')
      return
    }
    if (images.length === 0) {
      Alert.alert('No Media', 'Please add at least one photo.')
      return
    }

    setSubmitting(true)
    try {
      const tempId = generateTempId()
      const mediaResult = await uploadMedia.mutateAsync({
        files: images.map((uri) => ({ uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` })),
        issueTempId: tempId,
      })

      await createIssue.mutateAsync({
        title,
        description: description || undefined,
        category,
        severity,
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address,
        ward: ward || undefined,
        image_urls: mediaResult.image_urls,
      })

      Alert.alert('Report Submitted!', 'AI is analyzing your report. You\'ll be notified shortly.', [
        { text: 'OK', onPress: () => router.push('/(tabs)') },
      ])
    } catch {
      Alert.alert('Submission Failed', 'Please check your connection and try again.')
    } finally {
      setSubmitting(false)
    }
  }, [category, title, location, images, severity, description, ward, uploadMedia, createIssue, router])

  const canProceed = {
    0: images.length > 0,
    1: location !== null,
    2: !!category && title.length >= 5 && title.length <= 100,
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step === 0 ? router.back() : setStep(step - 1)}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.steps}>
          {STEPS.map((s, i) => (
            <View key={s} style={styles.stepRow}>
              <View style={[styles.stepDot, i <= step && styles.stepDotActive]}>
                <Text style={[styles.stepNum, i <= step && styles.stepNumActive]}>{i + 1}</Text>
              </View>
              {i < STEPS.length - 1 && <View style={[styles.stepLine, i < step && styles.stepLineActive]} />}
            </View>
          ))}
        </View>
        <Text style={styles.stepLabel}>{STEPS[step]}</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {step === 0 && (
          <View style={styles.stepContent}>
            {cameraPermission?.granted && images.length < 5 && (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={(ref) => setCameraRef(ref)}
                  style={styles.camera}
                  facing={facing}
                >
                  <View style={styles.cameraOverlay}>
                    <TouchableOpacity style={styles.flipButton} onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                      <Ionicons name="camera-reverse" size={24} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                </CameraView>
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.thumbnailRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                {images.map((uri, i) => (
                  <View key={i} style={styles.thumbWrap}>
                    <Image source={{ uri }} style={styles.thumbnail} />
                    <TouchableOpacity
                      style={styles.removeThumb}
                      onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Ionicons name="close-circle" size={20} color={COLORS.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <TouchableOpacity style={styles.addMore} onPress={pickFromGallery}>
                    <Ionicons name="images-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.addMoreText}>Gallery</Text>
                  </TouchableOpacity>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {step === 1 && (
          <View style={styles.stepContent}>
            <MapView
              style={styles.mapPicker}
              region={mapRegion}
              onRegionChangeComplete={(r) => setMapRegion(r)}
            >
              {location && (
                <Marker coordinate={{ latitude: location.latitude, longitude: location.longitude }} draggable
                  onDragEnd={(e) => setLocation({ latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude })}
                />
              )}
            </MapView>
            <TouchableOpacity style={styles.useLocationButton} onPress={getCurrentLocation}>
              <Ionicons name="locate" size={20} color={COLORS.white} />
              <Text style={styles.useLocationText}>Use My Location</Text>
            </TouchableOpacity>
            {location && (
              <Text style={styles.locationText}>{location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}</Text>
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.categoryItem, category === c.key && styles.categoryActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Ionicons name={c.icon as keyof typeof Ionicons.glyphMap} size={24} color={category === c.key ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.categoryLabel, category === c.key && styles.categoryLabelActive]}>
                    {CATEGORY_LABELS[c.key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Severity</Text>
            <View style={styles.severityRow}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.severityItem, severity === s.key && styles.severityActive]}
                  onPress={() => setSeverity(s.key)}
                >
                  <Text style={[styles.severityText, severity === s.key && styles.severityTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Title *</Text>
            <TextInput
              style={styles.textInput}
              placeholder="What did you see?"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>

            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              placeholder="Add more details..."
              placeholderTextColor={COLORS.textMuted}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1000}
            />
            <Text style={styles.charCount}>{description.length}/1000</Text>

            <Text style={styles.fieldLabel}>Ward (optional)</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. Shivajinagar"
              placeholderTextColor={COLORS.textMuted}
              value={ward}
              onChangeText={setWard}
            />
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.nextButton, !canProceed[step as keyof typeof canProceed] && styles.buttonDisabled]}
          onPress={() => step < 2 ? setStep(step + 1) : handleSubmit()}
          disabled={!canProceed[step as keyof typeof canProceed] || submitting}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.nextButtonText}>
              {step < 2 ? 'Continue' : 'Submit Report'}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  steps: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  stepRow: { flexDirection: 'row', alignItems: 'center' },
  stepDot: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: COLORS.surface, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.border,
  },
  stepDotActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  stepNum: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted },
  stepNumActive: { color: COLORS.white },
  stepLine: { width: 20, height: 2, backgroundColor: COLORS.border, marginHorizontal: 4 },
  stepLineActive: { backgroundColor: COLORS.primary },
  stepLabel: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary },
  content: { flex: 1 },
  stepContent: { padding: SPACING.lg, gap: SPACING.lg },
  cameraContainer: { alignItems: 'center', gap: SPACING.md },
  camera: { width: width - 32, height: width * 0.75, borderRadius: BORDER_RADIUS.card, overflow: 'hidden' },
  cameraOverlay: { flex: 1, justifyContent: 'flex-end', padding: SPACING.md },
  flipButton: { alignSelf: 'flex-end', padding: SPACING.sm },
  captureButton: {
    width: 64, height: 64, borderRadius: 32,
    borderWidth: 4, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  captureInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primary },
  thumbnailRow: { paddingVertical: SPACING.sm },
  thumbWrap: { position: 'relative' },
  thumbnail: { width: 72, height: 72, borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.surface },
  removeThumb: { position: 'absolute', top: -6, right: -6 },
  addMore: {
    width: 72, height: 72, borderRadius: BORDER_RADIUS.button,
    borderWidth: 2, borderColor: COLORS.primary + '40', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center', gap: 2,
  },
  addMoreText: { fontSize: 10, color: COLORS.primary },
  mapPicker: { width: '100%', height: 300, borderRadius: BORDER_RADIUS.card },
  useLocationButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, padding: SPACING.md, borderRadius: BORDER_RADIUS.button,
  },
  useLocationText: { color: COLORS.white, fontWeight: '600' },
  locationText: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, textAlign: 'center' },
  fieldLabel: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  categoryItem: {
    width: (width - 48) / 5 - 4, alignItems: 'center', gap: 4,
    padding: SPACING.sm, borderRadius: BORDER_RADIUS.card,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  categoryActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  categoryLabel: { fontSize: 9, color: COLORS.textPrimary, textAlign: 'center' },
  categoryLabelActive: { color: COLORS.white },
  severityRow: { flexDirection: 'row', gap: SPACING.sm },
  severityItem: {
    flex: 1, paddingVertical: SPACING.sm, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  severityActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  severityText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontWeight: '600' },
  severityTextActive: { color: COLORS.white },
  textInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary,
  },
  textArea: { height: 100, textAlignVertical: 'top' },
  charCount: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted, textAlign: 'right' },
  footer: { padding: SPACING.lg, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextButton: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.lg, alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.5 },
  nextButtonText: { color: COLORS.white, fontSize: FONT_SIZES.button, fontWeight: '600' },
})
