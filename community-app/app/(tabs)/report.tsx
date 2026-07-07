import { useState, useCallback, useEffect, useRef } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, Image, ScrollView,
  TextInput, Alert, ActivityIndicator, Dimensions, Modal,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { CameraView, useCameraPermissions } from 'expo-camera'
import * as ImagePicker from 'expo-image-picker'
import MapView, { Marker } from 'react-native-maps'
import * as Location from 'expo-location'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCreateIssue, useUploadMedia } from '../../hooks/useIssues'
import { apiPost } from '../../lib/api'
import { useAuthStore } from '../../stores/authStore'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS, CATEGORY_LABELS, CATEGORY_ICONS, STATUS_LABELS, STATUS_COLORS, SEVERITY_COLORS } from '../../lib/constants'
import { type IssueCategory, type IssueSeverity, type AiImageAnalysis } from '../../lib/types'

const { width } = Dimensions.get('window')
const STEPS = ['Media', 'Location', 'Details']

const CATEGORIES: { key: IssueCategory; icon: string }[] = [
  { key: 'pothole', icon: 'car-sport' },
  { key: 'road_damage', icon: 'car' },
  { key: 'water_leak', icon: 'water' },
  { key: 'sewage', icon: 'construct' },
  { key: 'streetlight', icon: 'bulb' },
  { key: 'garbage', icon: 'trash' },
  { key: 'illegal_dumping', icon: 'trash-bin' },
  { key: 'fallen_tree', icon: 'leaf' },
  { key: 'park_damage', icon: 'leaf' },
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
  const [cameraPermission, requestCameraPermission] = useCameraPermissions()
  const [cameraActive, setCameraActive] = useState(false)
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
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiImageAnalysis | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [showAiEditModal, setShowAiEditModal] = useState(false)
  const [showLocationModal, setShowLocationModal] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSearching, setLocationSearching] = useState(false)
  const [locationResults, setLocationResults] = useState<{ latitude: number; longitude: number; address: string }[]>([])

  const resetForm = useCallback(() => {
    setImages([])
    setCategory(null)
    setSeverity('medium')
    setTitle('')
    setDescription('')
    setWard('')
    setLocation(null)
    setMapRegion({ latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.01, longitudeDelta: 0.01 })
    setAiResult(null)
    setAiError(null)
    setStep(0)
  }, [])

  const router = useRouter()
  const insets = useSafeAreaInsets()
  const uploadMedia = useUploadMedia()
  const createIssue = useCreateIssue()
  const { profile } = useAuthStore()

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
      setCameraActive(false)
    }
  }, [cameraRef])

  const uriToBase64 = useCallback(async (uri: string): Promise<string> => {
    const response = await fetch(uri)
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        resolve(result.split(',')[1])
      }
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }, [])

  const analyzeWithAi = useCallback(async () => {
    if (images.length === 0) return
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const base64 = await uriToBase64(images[0])
      const data = await apiPost<{ analysis: AiImageAnalysis }>('/api/ai/analyze-image', {
        image: base64,
        mimeType: 'image/jpeg',
      })
      const analysis = data.analysis
      setAiResult(analysis)
      setCategory(analysis.category)
      setSeverity(analysis.severity)
      setTitle(analysis.title)
      setDescription(analysis.description)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Analysis failed'
      setAiError(msg)
    } finally {
      setAiLoading(false)
    }
  }, [images, uriToBase64])

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
      const mediaResult = await uploadMedia.mutateAsync({
        files: images.map((uri) => ({ uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` })),
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

      resetForm()
      router.replace('/(tabs)')
    } catch (e) {
      console.error('Submission failed:', e)
      let msg = 'Please check your connection and try again.'
      if (e instanceof Error) {
        msg = e.message
        const httpErr = (e as any).context
        if (httpErr?.status) msg += ` (HTTP ${httpErr.status})`
      }
      Alert.alert('Submission Failed', msg)
    } finally {
      setSubmitting(false)
    }
  }, [category, title, location, images, severity, description, ward, uploadMedia, createIssue, resetForm, router])

  const handleReportFromAi = useCallback(async () => {
    if (!category || !title || images.length === 0) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.')
      return
    }
    setShowLocationModal(true)
  }, [category, title, images.length])

  const handleLocationConfirm = useCallback(async () => {
    if (!location) {
      Alert.alert('Location Needed', 'Please select a location on the map or use your current location.')
      return
    }
    setShowLocationModal(false)
    setSubmitting(true)
    try {
      const mediaResult = await uploadMedia.mutateAsync({
        files: images.map((uri) => ({ uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` })),
      })
      await createIssue.mutateAsync({
        title, description: description || undefined, category, severity,
        latitude: location.latitude, longitude: location.longitude,
        address: location.address, ward: ward || undefined,
        image_urls: mediaResult.image_urls,
      })
      resetForm()
      router.replace('/(tabs)')
    } catch (e) {
      console.error('Report failed:', e)
      let msg = 'Please check your connection and try again.'
      if (e instanceof Error) msg = e.message
      Alert.alert('Report Failed', msg)
    } finally {
      setSubmitting(false)
    }
  }, [category, title, images, severity, description, ward, location, uploadMedia, createIssue, resetForm, router])

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (!locationSearch.trim() || !showLocationModal) {
      setLocationResults([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setLocationSearching(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationSearch)}&format=json&addressdetails=1&limit=5`,
          { headers: { 'User-Agent': 'CommunityHeroApp/1.0' } }
        )
        const data = await res.json()
        setLocationResults(
          (Array.isArray(data) ? data : [])
            .filter((r: any) => r.display_name)
            .map((r: any) => ({
              latitude: parseFloat(r.lat),
              longitude: parseFloat(r.lon),
              address: r.display_name,
            }))
        )
      } catch { /* ignore */ }
      setLocationSearching(false)
    }, 400)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [locationSearch, showLocationModal])

  const selectLocationResult = useCallback(async (result: { latitude: number; longitude: number; address: string }) => {
    setLocation({ latitude: result.latitude, longitude: result.longitude, address: result.address })
    setMapRegion({ latitude: result.latitude, longitude: result.longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 })
    setLocationResults([])
    setLocationSearch(result.address)
  }, [])

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
            {cameraActive && cameraPermission?.granted ? (
              <View style={styles.cameraContainer}>
                <CameraView
                  ref={(ref) => setCameraRef(ref)}
                  style={styles.camera}
                  facing={facing}
                >
                  <View style={styles.cameraOverlay}>
                    <View style={styles.cameraTopBar}>
                      <TouchableOpacity onPress={() => setCameraActive(false)}>
                        <Ionicons name="close" size={28} color={COLORS.white} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
                        <Ionicons name="camera-reverse" size={28} color={COLORS.white} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </CameraView>
                <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                  <View style={styles.captureInner} />
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View style={styles.mediaPrompt}>
                  <TouchableOpacity
                    style={styles.cameraIconArea}
                    onPress={async () => {
                      if (!cameraPermission?.granted) {
                        const perm = await requestCameraPermission()
                        if (!perm.granted) {
                          Alert.alert('Permission Denied', 'Camera access is needed to take photos.')
                          return
                        }
                      }
                      setCameraActive(true)
                    }}
                  >
                    <View style={styles.cameraIconCircle}>
                      <Ionicons name="camera-outline" size={48} color={COLORS.white} />
                    </View>
                    <Text style={styles.cameraIconLabel}>Tap to take a photo</Text>
                  </TouchableOpacity>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>OR</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <TouchableOpacity style={styles.galleryButton} onPress={pickFromGallery}>
                    <Ionicons name="images-outline" size={24} color={COLORS.primary} />
                    <Text style={styles.galleryButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                </View>

                {images.length > 0 && (
                  <View style={styles.thumbnailSection}>
                    <Text style={styles.sectionTitle}>
                      {images.length}/{5} photos selected
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: SPACING.sm }}>
                      {images.map((uri, i) => (
                        <View key={i} style={styles.thumbWrap}>
                          <Image source={{ uri }} style={styles.thumbnail} />
                          <TouchableOpacity
                            style={styles.removeThumb}
                            onPress={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                          >
                            <Ionicons name="close-circle" size={22} color={COLORS.danger} />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {images.length < 5 && (
                        <TouchableOpacity style={styles.addMore} onPress={pickFromGallery}>
                          <Ionicons name="add" size={28} color={COLORS.primary} />
                        </TouchableOpacity>
                      )}
                    </ScrollView>
                  </View>
                )}

                {aiLoading && (
                  <View style={styles.aiLoadingSection}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                    <Text style={styles.aiLoadingText}>AI is analyzing your image...</Text>
                  </View>
                )}

                {aiError && (
                  <View style={styles.aiErrorSection}>
                    <Ionicons name="alert-circle" size={20} color={COLORS.danger} />
                    <Text style={styles.aiErrorText}>{aiError}</Text>
                    <TouchableOpacity style={styles.aiRetryButton} onPress={analyzeWithAi}>
                      <Text style={styles.aiRetryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {aiResult && (
                  <View style={styles.aiResultSection}>
                    <View style={styles.aiResultHeader}>
                      <Ionicons name="sparkles" size={18} color={COLORS.primary} />
                      <Text style={styles.aiResultTitle}>AI Analysis</Text>
                      <View style={{ flex: 1 }} />
                      <TouchableOpacity
                        style={styles.aiResultEditButton}
                        onPress={() => setShowAiEditModal(true)}
                      >
                        <Ionicons name="pencil" size={16} color={COLORS.primary} />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>Category</Text>
                      <View style={[styles.aiBadge, { backgroundColor: COLORS.primary + '20' }]}>
                        <Text style={styles.aiBadgeText}>{CATEGORY_LABELS[category!] || category}</Text>
                      </View>
                    </View>

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>Severity</Text>
                      <View style={[styles.aiBadge, { backgroundColor: (SEVERITY_COLORS[severity] || COLORS.textMuted) + '20' }]}>
                        <Text style={[styles.aiBadgeText, { color: SEVERITY_COLORS[severity] || COLORS.textMuted }]}>{severity.toUpperCase()}</Text>
                      </View>
                    </View>

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>Title</Text>
                      <Text style={styles.aiResultField}>{title}</Text>
                    </View>

                    {description ? (
                      <View style={styles.aiResultRow}>
                        <Text style={styles.aiResultLabel}>Description</Text>
                        <Text style={styles.aiResultField} numberOfLines={2}>{description}</Text>
                      </View>
                    ) : null}

                    <View style={styles.aiResultRow}>
                      <Text style={styles.aiResultLabel}>Department</Text>
                      <View style={[styles.aiBadge, { backgroundColor: COLORS.info + '20' }]}>
                        <Text style={[styles.aiBadgeText, { color: COLORS.info }]}>{aiResult.department}</Text>
                      </View>
                    </View>

                    <View style={styles.aiConfidenceRow}>
                      <Text style={styles.aiConfidenceLabel}>Confidence</Text>
                      <View style={styles.aiConfidenceBarBg}>
                        <View style={[styles.aiConfidenceBarFill, { width: `${Math.round(aiResult.confidence * 100)}%` }]} />
                      </View>
                      <Text style={styles.aiConfidencePct}>{Math.round(aiResult.confidence * 100)}%</Text>
                    </View>
                    {aiResult.estimated_resolution_days && (
                      <Text style={styles.aiEstimate}>Estimated resolution: ~{aiResult.estimated_resolution_days} days</Text>
                    )}
                    {!aiResult.is_valid_civic_issue && aiResult.rejection_reason && (
                      <Text style={styles.aiRejection}>Not a valid civic issue: {aiResult.rejection_reason}</Text>
                    )}
                  </View>
                )}

              </>
            )}
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
            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Category</Text>
              {aiResult && <View style={styles.aiSuggestionBadge}><Text style={styles.aiSuggestionText}>AI</Text></View>}
            </View>
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

            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Severity</Text>
              {aiResult && <View style={styles.aiSuggestionBadge}><Text style={styles.aiSuggestionText}>AI</Text></View>}
            </View>
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

            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Title *</Text>
              {aiResult && <View style={styles.aiSuggestionBadge}><Text style={styles.aiSuggestionText}>AI</Text></View>}
            </View>
            <TextInput
              style={styles.textInput}
              placeholder="What did you see?"
              placeholderTextColor={COLORS.textMuted}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>

            <View style={styles.fieldLabelRow}>
              <Text style={styles.fieldLabel}>Description</Text>
              {aiResult && <View style={styles.aiSuggestionBadge}><Text style={styles.aiSuggestionText}>AI</Text></View>}
            </View>
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

      <Modal visible={showAiEditModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Edit AI Analysis</Text>
            <Text style={styles.modalSubtitle}>Review and correct the AI's suggestions</Text>

            <Text style={styles.modalFieldLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalPickerRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.key}
                  style={[styles.modalPickerChip, category === c.key && styles.modalPickerChipActive]}
                  onPress={() => setCategory(c.key)}
                >
                  <Ionicons name={c.icon as any} size={16} color={category === c.key ? COLORS.white : COLORS.primary} />
                  <Text style={[styles.modalPickerChipText, category === c.key && styles.modalPickerChipTextActive]}>
                    {CATEGORY_LABELS[c.key]}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.modalFieldLabel}>Severity</Text>
            <View style={styles.modalPickerRow}>
              {SEVERITIES.map((s) => (
                <TouchableOpacity
                  key={s.key}
                  style={[styles.modalPickerChip, severity === s.key && styles.modalPickerChipActive]}
                  onPress={() => setSeverity(s.key)}
                >
                  <Text style={[styles.modalPickerChipText, severity === s.key && styles.modalPickerChipTextActive]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalFieldLabel}>Title</Text>
            <TextInput
              style={styles.modalInput}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
              placeholder="What did you see?"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.modalFieldLabel}>Description</Text>
            <TextInput
              style={[styles.modalInput, styles.modalTextArea]}
              value={description}
              onChangeText={setDescription}
              maxLength={1000}
              multiline
              placeholder="Add more details..."
              placeholderTextColor={COLORS.textMuted}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowAiEditModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={() => setShowAiEditModal(false)}
              >
                <Text style={styles.modalConfirmText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showLocationModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.locationModalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Location</Text>
            <Text style={styles.modalSubtitle}>Set where this issue is located</Text>

            <View style={styles.locationSearchRow}>
              <Ionicons name="search" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.locationSearchInput}
                placeholder="Search for a place..."
                placeholderTextColor={COLORS.textMuted}
                value={locationSearch}
                onChangeText={setLocationSearch}
                returnKeyType="search"
              />
              {locationSearching && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>
            {locationResults.length > 0 && (
              <View style={styles.locationResultsList}>
                <ScrollView
                  style={styles.locationResultsScroll}
                  keyboardShouldPersistTaps="handled"
                  nestedScrollEnabled
                >
                  {locationResults.map((r, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.locationResultItem}
                      onPress={() => selectLocationResult(r)}
                    >
                      <Ionicons name="location-outline" size={16} color={COLORS.textSecondary} />
                      <Text style={styles.locationResultText} numberOfLines={2}>{r.address}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}

            <TouchableOpacity style={styles.locationCurrentButton} onPress={getCurrentLocation}>
              <Ionicons name="locate" size={18} color={COLORS.primary} />
              <Text style={styles.locationCurrentText}>Use Current Location</Text>
            </TouchableOpacity>

            <View style={styles.locationMapContainer}>
              <MapView
                style={styles.locationMap}
                region={mapRegion}
                onRegionChangeComplete={(r) => setMapRegion(r)}
              >
                {location && (
                  <Marker
                    coordinate={{ latitude: location.latitude, longitude: location.longitude }}
                    draggable
                    onDragEnd={(e) => {
                      const coords = { latitude: e.nativeEvent.coordinate.latitude, longitude: e.nativeEvent.coordinate.longitude }
                      setLocation(coords)
                      setMapRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 })
                      Location.reverseGeocodeAsync(coords).then((address) => {
                        if (address[0]) {
                          const addr = [address[0].name, address[0].street, address[0].city, address[0].region].filter(Boolean).join(', ')
                          setLocation((prev) => prev ? { ...prev, address: addr } : prev)
                        }
                      })
                    }}
                  />
                )}
              </MapView>
            </View>

            {location?.address && (
              <Text style={styles.locationAddressText}>{location.address}</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelButton} onPress={() => setShowLocationModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmButton, !location && styles.buttonDisabled]}
                onPress={handleLocationConfirm}
                disabled={!location || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmText}>Confirm & Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={styles.footer}>
        {step === 0 && aiLoading ? (
          <View style={styles.nextButton}><ActivityIndicator color={COLORS.white} /></View>
        ) : step === 0 && aiResult ? (
          <TouchableOpacity style={[styles.nextButton, (!category || !title) && styles.buttonDisabled]} onPress={handleReportFromAi} disabled={!category || !title || submitting}>
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.nextButtonText}>Report Issue</Text>}
          </TouchableOpacity>
        ) : step === 0 && images.length > 0 && !aiResult ? (
          <TouchableOpacity style={styles.nextButton} onPress={analyzeWithAi}>
            <Ionicons name="sparkles" size={20} color={COLORS.white} />
            <Text style={styles.nextButtonText}>  Analyze with AI</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.nextButton, !canProceed[step as keyof typeof canProceed] && styles.buttonDisabled]}
            onPress={() => step < 2 ? setStep(step + 1) : handleSubmit()}
            disabled={!canProceed[step as keyof typeof canProceed] || submitting}
          >
            {submitting ? <ActivityIndicator color={COLORS.white} /> : <Text style={styles.nextButtonText}>{step < 2 ? 'Continue' : 'Submit Report'}</Text>}
          </TouchableOpacity>
        )}
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
  cameraContainer: { alignItems: 'center', gap: SPACING.lg },
  camera: { width: width - 32, height: width * 0.75, borderRadius: BORDER_RADIUS.card, overflow: 'hidden' },
  cameraOverlay: { flex: 1, padding: SPACING.md },
  cameraTopBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
  },
  captureButton: {
    width: 72, height: 72, borderRadius: 36,
    borderWidth: 4, borderColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  captureInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary },
  mediaPrompt: { alignItems: 'center', gap: SPACING.xl, paddingVertical: SPACING.xxxxl },
  cameraIconArea: { alignItems: 'center', gap: SPACING.md },
  cameraIconCircle: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cameraIconLabel: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, fontWeight: '500' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', width: '60%' },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { marginHorizontal: SPACING.md, fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  galleryButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl,
    borderWidth: 2, borderColor: COLORS.primary + '30', borderStyle: 'dashed',
    borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.surface,
  },
  galleryButtonText: { fontSize: FONT_SIZES.body, color: COLORS.primary, fontWeight: '600' },
  thumbnailSection: { gap: SPACING.sm },
  sectionTitle: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontWeight: '600' },
  thumbWrap: { position: 'relative' },
  thumbnail: { width: 80, height: 80, borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.surface },
  removeThumb: { position: 'absolute', top: -8, right: -8 },
  addMore: {
    width: 80, height: 80, borderRadius: BORDER_RADIUS.button,
    borderWidth: 2, borderColor: COLORS.primary + '40', borderStyle: 'dashed',
    alignItems: 'center', justifyContent: 'center',
  },
  aiButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.primary, paddingVertical: SPACING.md, paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.button,
  },
  aiButtonText: { color: COLORS.white, fontSize: FONT_SIZES.bodySm, fontWeight: '600' },
  aiLoadingSection: { alignItems: 'center', gap: SPACING.md, paddingVertical: SPACING.xl },
  aiLoadingText: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary },
  aiErrorSection: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.danger + '10', padding: SPACING.md,
    borderRadius: BORDER_RADIUS.button, flexWrap: 'wrap',
  },
  aiErrorText: { flex: 1, fontSize: FONT_SIZES.caption, color: COLORS.danger },
  aiRetryButton: { paddingHorizontal: SPACING.sm, paddingVertical: 4, backgroundColor: COLORS.danger + '20', borderRadius: BORDER_RADIUS.badge },
  aiRetryText: { fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.danger },
  aiResultSection: {
    backgroundColor: COLORS.primary + '08', borderRadius: BORDER_RADIUS.card,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.primary + '20', gap: SPACING.sm,
  },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  aiResultTitle: { fontSize: FONT_SIZES.bodySm, fontWeight: '700', color: COLORS.textPrimary },
  aiBadgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  aiBadge: { paddingHorizontal: SPACING.sm, paddingVertical: 2, borderRadius: BORDER_RADIUS.badge },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: COLORS.textPrimary },
  aiResultField: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, lineHeight: 18, flex: 1, flexShrink: 1, textAlign: 'right' },
  aiResultLabel: { fontWeight: '600', color: COLORS.textPrimary },
  aiConfidenceRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiConfidenceLabel: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', width: 60 },
  aiConfidenceBarBg: {
    flex: 1, height: 6, backgroundColor: COLORS.border,
    borderRadius: 3, overflow: 'hidden',
  },
  aiConfidenceBarFill: { height: 6, backgroundColor: COLORS.primary, borderRadius: 3 },
  aiConfidencePct: { fontSize: 10, color: COLORS.textMuted, fontWeight: '600', width: 32, textAlign: 'right' },
  aiEstimate: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, fontStyle: 'italic' },
  aiRejection: { fontSize: FONT_SIZES.caption, color: COLORS.danger, fontStyle: 'italic' },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  aiSuggestionBadge: {
    paddingHorizontal: 4, paddingVertical: 1,
    backgroundColor: COLORS.primary + '20',
    borderRadius: BORDER_RADIUS.badge,
  },
  aiSuggestionText: { fontSize: 8, fontWeight: '700', color: COLORS.primary },
  aiEditableRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  aiEditableValue: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs, flex: 1, justifyContent: 'flex-end' },
  aiEditCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  aiEditSeverityRow: { flexDirection: 'row', gap: SPACING.xs },
  aiEditChip: {
    paddingHorizontal: SPACING.sm, paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.badge, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  aiEditChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  aiEditChipText: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary },
  aiEditChipTextActive: { color: COLORS.white },
  aiEditInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary,
  },
  aiEditTextArea: { height: 80, textAlignVertical: 'top' },
  aiEditDone: { fontSize: FONT_SIZES.caption, fontWeight: '600', color: COLORS.primary, textAlign: 'right', marginTop: 4 },
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
  footer: { padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border },
  nextButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.xs,
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.md,
  },
  buttonDisabled: { opacity: 0.5 },
  nextButtonText: { color: COLORS.white, fontSize: FONT_SIZES.bodySm, fontWeight: '600' },
  aiResultEditButton: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center', justifyContent: 'center',
  },
  aiResultRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SPACING.xs,
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: BORDER_RADIUS.modal,
    borderTopRightRadius: BORDER_RADIUS.modal, padding: SPACING.xl,
    paddingBottom: SPACING.xxxxl, maxHeight: '80%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border,
    borderRadius: 2, alignSelf: 'center', marginBottom: SPACING.lg,
  },
  modalTitle: { fontSize: FONT_SIZES.h3, fontWeight: '600', color: COLORS.textPrimary },
  modalSubtitle: { fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginBottom: SPACING.lg },
  modalFieldLabel: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary, marginTop: SPACING.md, marginBottom: SPACING.xs },
  modalPickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.xs },
  modalPickerChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.badge, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  modalPickerChipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  modalPickerChipText: { fontSize: FONT_SIZES.caption, fontWeight: '500', color: COLORS.textSecondary },
  modalPickerChipTextActive: { color: COLORS.white },
  modalInput: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, paddingHorizontal: SPACING.md, paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary,
  },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.xl },
  modalCancelButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, borderWidth: 1, borderColor: COLORS.border,
  },
  modalCancelText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.textSecondary },
  modalConfirmButton: {
    flex: 1, paddingVertical: SPACING.md, alignItems: 'center',
    borderRadius: BORDER_RADIUS.button, backgroundColor: COLORS.primary,
  },
  modalConfirmText: { fontSize: FONT_SIZES.button, fontWeight: '600', color: COLORS.white },
  locationModalContent: {
    backgroundColor: COLORS.card, borderTopLeftRadius: BORDER_RADIUS.modal,
    borderTopRightRadius: BORDER_RADIUS.modal, padding: SPACING.xl,
    paddingBottom: SPACING.xxxxl, maxHeight: '90%',
  },
  locationSearchRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.surface, borderRadius: BORDER_RADIUS.input,
    borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  locationSearchInput: { flex: 1, paddingVertical: SPACING.md, fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary },
  locationCurrentButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, marginTop: SPACING.md, borderRadius: BORDER_RADIUS.button,
    borderWidth: 1, borderColor: COLORS.primary, backgroundColor: COLORS.primary + '08',
  },
  locationCurrentText: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.primary },
  locationMapContainer: {
    marginTop: SPACING.md, borderRadius: BORDER_RADIUS.card, overflow: 'hidden',
    height: 220, borderWidth: 1, borderColor: COLORS.border,
  },
  locationMap: { flex: 1 },
  locationAddressText: { fontSize: FONT_SIZES.caption, color: COLORS.textSecondary, marginTop: SPACING.sm, textAlign: 'center' },
  locationResultsList: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input, marginTop: SPACING.xs,
    maxHeight: 180,
  },
  locationResultsScroll: { maxHeight: 180 },
  locationResultItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.md, paddingHorizontal: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  locationResultText: { flex: 1, fontSize: FONT_SIZES.bodySm, color: COLORS.textPrimary },
})
