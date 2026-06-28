/**
 * One-time setup: creates the sole admin user in Supabase Auth + profile.
 *
 * Usage:
 *   1. Open Supabase Dashboard → SQL Editor → paste & run scripts/migration.sql
 *   2. node scripts/setup-admin.mjs
 *
 * Prerequisites: .env.local with NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = join(__dirname, '..', '.env.local')
const envRaw = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envRaw
    .split('\n')
    .filter((l) => l.trim() && !l.startsWith('#'))
    .map((l) => l.split('='))
    .map(([k, ...v]) => [k.trim(), v.join('=').trim()]),
)

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local')
  process.exit(1)
}

const ADMIN_EMAIL = 'community.admin@vibe2ship.com'
const ADMIN_PASSWORD = 'vibe2ship'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  // --- Step 1: Create or find the Auth user ---
  console.log(`🔧 Setting up admin user: ${ADMIN_EMAIL}`)

  let userId

  const { data: userData, error: createError } = await supabase.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { name: 'Community Admin' },
  })

  if (createError) {
    if (createError.message.includes('already exists') || createError.message.includes('already been registered')) {
      console.log('ℹ️  User already exists in Auth. Fetching...')
      const { data: existing } = await supabase.auth.admin.listUsers()
      const found = existing?.users.find((u) => u.email === ADMIN_EMAIL)
      if (!found) {
        console.error('Could not find existing user.')
        process.exit(1)
      }
      userId = found.id
      console.log(`✅ Found existing user: ${userId}`)
    } else {
      console.error('Failed to create user:', createError.message)
      process.exit(1)
    }
  } else {
    userId = userData?.user?.id
    console.log(`✅ Created Auth user: ${userId}`)
  }

  if (!userId) {
    console.error('No user ID.')
    process.exit(1)
  }

  // --- Step 2: Upsert the profile ---
  const { error: profileError } = await supabase.from('profiles').upsert({
    id: userId,
    name: 'Community Admin',
    email: ADMIN_EMAIL,
    role: 'super_admin',
    hero_score: 0,
    total_reports: 0,
    total_resolved: 0,
    total_verified: 0,
    is_active: true,
  })

  if (profileError) {
    if (profileError.message.includes('does not exist') || profileError.message.includes('relation') || profileError.message.includes('schema cache')) {
      console.error()
      console.error('❌ The "profiles" table does not exist yet.')
      console.error('   → Open your Supabase Dashboard → SQL Editor')
      console.error('   → Paste and run the contents of: scripts/migration.sql')
      console.error('   → Then run this script again: node scripts/setup-admin.mjs')
      console.error()
      process.exit(1)
    }
    console.error('Failed to upsert profile:', profileError.message)
    process.exit(1)
  }

  console.log('✅ Profile set to super_admin')
  console.log()
  console.log('🎉 Admin is ready!')
  console.log(`   Email:    ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
}

main().catch(console.error)
