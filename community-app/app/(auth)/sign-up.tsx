import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator, ScrollView,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../lib/constants'

export default function SignUpScreen() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const router = useRouter()

  function validate() {
    const e: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 2) e.name = 'Name must be at least 2 characters'
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format'
    if (!password || password.length < 8) e.password = 'Password must be at least 8 characters'
    if (phone && !/^\+?[\d\s-]{7,15}$/.test(phone)) e.phone = 'Invalid phone number'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSignUp() {
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { name: name.trim() } },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          Alert.alert('Email Taken', 'This email is already registered. Sign in instead?', [
            { text: 'Sign In', onPress: () => router.push('/(auth)/sign-in') },
            { text: 'Cancel', style: 'cancel' },
          ])
        } else {
          Alert.alert('Sign Up Failed', error.message)
        }
        return
      }
      Alert.alert(
        'Account Created!',
        'Check your email for a confirmation link. You can sign in once confirmed.',
        [{ text: 'OK', onPress: () => router.push('/(auth)/sign-in') }],
      )
    } catch {
      Alert.alert('Error', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const passwordChecks = [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Contains a number', met: /\d/.test(password) },
    { label: 'Contains a letter', met: /[a-zA-Z]/.test(password) },
  ]

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <TouchableOpacity onPress={() => router.back()} style={styles.back}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>

          <Text style={styles.heading}>Create Account</Text>
          <Text style={styles.subtitle}>Join your community</Text>

          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={[styles.input, errors.name && styles.inputError]}
                placeholder="Your full name"
                placeholderTextColor={COLORS.textMuted}
                value={name}
                onChangeText={(t) => { setName(t); setErrors((e) => ({ ...e, name: '' })) }}
                autoCapitalize="words"
              />
              {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, errors.email && styles.inputError]}
                placeholder="email@example.com"
                placeholderTextColor={COLORS.textMuted}
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: '' })) }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                  placeholder="Min 8 characters"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: '' })) }}
                  secureTextEntry={!showPassword}
                  autoComplete="new-password"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
              <View style={styles.checks}>
                {passwordChecks.map((check) => (
                  <View key={check.label} style={styles.checkRow}>
                    <Ionicons
                      name={check.met ? 'checkmark-circle' : 'ellipse-outline'}
                      size={16}
                      color={check.met ? COLORS.primary : COLORS.textMuted}
                    />
                    <Text style={[styles.checkText, check.met && styles.checkMet]}>{check.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Phone (optional)</Text>
              <TextInput
                style={[styles.input, errors.phone && styles.inputError]}
                placeholder="+91xxxxxxxxxx"
                placeholderTextColor={COLORS.textMuted}
                value={phone}
                onChangeText={(t) => { setPhone(t); setErrors((e) => ({ ...e, phone: '' })) }}
                keyboardType="phone-pad"
                autoComplete="tel"
              />
              {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignUp}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => router.push('/(auth)/sign-in')}>
            <Text style={styles.footerText}>
              Already have an account? <Text style={styles.footerLink}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: SPACING.xxl, paddingTop: 60, paddingBottom: SPACING.xxxxl },
  back: { marginBottom: SPACING.xxl, width: 40 },
  heading: { fontSize: FONT_SIZES.h1, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xxl },
  form: { gap: SPACING.lg },
  field: { gap: SPACING.xs },
  label: { fontSize: FONT_SIZES.bodySm, fontWeight: '600', color: COLORS.textPrimary },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.input,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONT_SIZES.body,
    color: COLORS.textPrimary,
  },
  inputError: { borderColor: COLORS.danger },
  passwordRow: { position: 'relative' },
  passwordInput: { paddingRight: 48 },
  eyeButton: { position: 'absolute', right: 12, top: 14 },
  errorText: { fontSize: FONT_SIZES.caption, color: COLORS.danger },
  checks: { gap: 2, marginTop: SPACING.xs },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  checkText: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  checkMet: { color: COLORS.primary },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: COLORS.white, fontSize: FONT_SIZES.button, fontWeight: '600' },
  footerText: { textAlign: 'center', fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginTop: SPACING.xxl },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
})
