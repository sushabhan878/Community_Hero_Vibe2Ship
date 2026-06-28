import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView,
  Platform, Alert, ActivityIndicator,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '../../lib/supabase'
import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../../lib/constants'

export default function SignInScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const router = useRouter()

  function validate() {
    const e: typeof errors = {}
    if (!email.trim()) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format'
    if (!password) e.password = 'Password is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSignIn() {
    if (!validate()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) {
        Alert.alert('Sign In Failed', error.message)
        return
      }
      router.replace('/(tabs)')
    } catch {
      Alert.alert('Error', 'Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setLoading(true)
    try {
      await supabase.auth.signInWithOAuth({ provider: 'google' })
    } catch {
      Alert.alert('Error', 'Failed to start Google sign in.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>

        <Text style={styles.welcome}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>

        <View style={styles.form}>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, errors.email && styles.inputError]}
              placeholder="email@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })) }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, styles.passwordInput, errors.password && styles.inputError]}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.textMuted}
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })) }}
                secureTextEntry={!showPassword}
                autoComplete="current-password"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          <TouchableOpacity>
            <Text style={styles.forgot}>Forgot password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.primaryButton, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or continue with</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={20} color={COLORS.textPrimary} />
            <Text style={styles.googleButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => router.push('/(auth)/sign-up')}>
          <Text style={styles.footerText}>
            Don't have an account? <Text style={styles.footerLink}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { flex: 1, paddingHorizontal: SPACING.xxl, paddingTop: 60 },
  back: { marginBottom: SPACING.xxl, width: 40 },
  welcome: { fontSize: FONT_SIZES.h1, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONT_SIZES.body, color: COLORS.textSecondary, marginTop: SPACING.xs, marginBottom: SPACING.xxxl },
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
  forgot: { fontSize: FONT_SIZES.bodySm, color: COLORS.primary, textAlign: 'right', fontWeight: '500' },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  buttonDisabled: { opacity: 0.6 },
  primaryButtonText: { color: COLORS.white, fontSize: FONT_SIZES.button, fontWeight: '600' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  dividerText: { fontSize: FONT_SIZES.caption, color: COLORS.textMuted },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.button,
    paddingVertical: SPACING.lg,
  },
  googleButtonText: { fontSize: FONT_SIZES.body, fontWeight: '600', color: COLORS.textPrimary },
  footerText: { textAlign: 'center', fontSize: FONT_SIZES.bodySm, color: COLORS.textSecondary, marginTop: SPACING.xxl },
  footerLink: { color: COLORS.primary, fontWeight: '600' },
})
