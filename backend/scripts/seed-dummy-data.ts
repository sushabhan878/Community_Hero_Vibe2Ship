import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const COMMON_PASSWORD = 'DummyPass123!'

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Rohan', 'Ishaan', 'Ayaan', 'Ananya',
  'Diya', 'Aadhya', 'Sara', 'Kavya', 'Riya', 'Priya', 'Nisha', 'Meera', 'Tanvi', 'Shreya',
  'Rahul', 'Vikram', 'Sanjay', 'Amit', 'Rajesh', 'Manish', 'Deepak', 'Suresh', 'Nitin', 'Pooja',
]

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Singh', 'Kumar', 'Gupta', 'Reddy', 'Joshi', 'Nair', 'Menon',
  'Deshmukh', 'Iyer', 'Rao', 'Bose', 'Das', 'Sen', 'Mukherjee', 'Banerjee', 'Pillai', 'Chopra',
]

const DOMAINS = ['gmail.com', 'yahoo.com', 'outlook.com', 'proton.me', 'icloud.com']

const CATEGORIES = ['pothole', 'road_damage', 'water_leak', 'sewage', 'streetlight', 'garbage', 'illegal_dumping', 'fallen_tree', 'park_damage', 'other'] as const
const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
const STATUSES = ['pending', 'ai_processed', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'] as const

const WARDS = ['Ward 1', 'Ward 2', 'Ward 3', 'Ward 4', 'Ward 5', 'Ward 6', 'Ward 7']
const BANGALORE_LOCATIONS = [
  { lat: 12.9716, lng: 77.5946, addr: 'MG Road' },
  { lat: 12.9720, lng: 77.5950, addr: 'Church Street' },
  { lat: 12.9730, lng: 77.5930, addr: 'Park Avenue' },
  { lat: 12.9740, lng: 77.5960, addr: 'Temple Road' },
  { lat: 12.9700, lng: 77.5980, addr: 'Greenwood Colony' },
  { lat: 12.9750, lng: 77.5920, addr: 'Ring Road' },
  { lat: 12.9760, lng: 77.5990, addr: 'Central Park' },
  { lat: 12.9770, lng: 77.5970, addr: 'Station Road' },
  { lat: 12.9780, lng: 77.5955, addr: 'Lakeview Apartments' },
  { lat: 12.9790, lng: 77.5935, addr: 'School Road' },
  { lat: 12.9800, lng: 77.5940, addr: 'Lake Road Junction' },
  { lat: 12.9810, lng: 77.5985, addr: 'NH-44 Service Road' },
  { lat: 12.9820, lng: 77.5965, addr: 'Main Street' },
  { lat: 12.9830, lng: 77.5910, addr: 'Sunshine School' },
  { lat: 12.9840, lng: 77.5925, addr: 'Community Park' },
  { lat: 12.9850, lng: 77.5995, addr: 'College Road' },
  { lat: 12.9860, lng: 77.5975, addr: 'Sunrise Colony' },
  { lat: 12.9870, lng: 77.5900, addr: 'Outer Ring Road' },
  { lat: 12.9880, lng: 77.6000, addr: 'Old Town' },
  { lat: 12.9690, lng: 77.6020, addr: 'Industrial Area' },
]

const ISSUE_TITLES = [
  'Large pothole near {addr}',
  'Water leak from pipeline at {addr}',
  'Streetlight not working at {addr}',
  'Garbage overflowing at {addr}',
  'Sewage blockage near {addr}',
  'Road damage at {addr}',
  'Fallen tree blocking road at {addr}',
  'Illegal dumping at {addr}',
  'Park equipment broken at {addr}',
  'Manhole cover missing at {addr}',
  'Drain blocked at {addr}',
  'Stagnant water at {addr}',
  'Broken footpath at {addr}',
  'Stray animal issue at {addr}',
  'Noise complaint from {addr}',
]

const ISSUE_DESCRIPTIONS = [
  'This issue has been bothering the neighborhood for a while and needs prompt attention.',
  'Residents have reported this issue multiple times but no action has been taken yet.',
  'This is causing inconvenience to daily commuters and local residents.',
  'The situation is getting worse day by day and requires immediate intervention.',
  'Multiple families in the area are affected by this ongoing problem.',
  'This is a safety hazard that needs to be addressed urgently.',
  'Local residents have been requesting a fix for over a month now.',
  'The condition has deteriorated significantly in the past week.',
]

const SAMPLE_IMAGES = [
  'https://images.unsplash.com/photo-1587574296773-73b2c1e76fb6?w=800',
  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
  'https://images.unsplash.com/photo-1604093882750-3ed498f3178b?w=800',
  'https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800',
  'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800',
  'https://images.unsplash.com/photo-1559595500-08f6e2658448?w=800',
  'https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800',
  'https://images.unsplash.com/photo-1568952433726-3896e3881c65?w=800',
]

function rand<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function generateEmail(index: number): string {
  const name = FIRST_NAMES[index % FIRST_NAMES.length].toLowerCase()
  return `dummy${index + 1}@communityhero.test`
}

function generateIssueTitle(loc: string): string {
  return rand(ISSUE_TITLES).replace('{addr}', loc)
}

function generateDescription(): string {
  return rand(ISSUE_DESCRIPTIONS)
}

async function createUsers(): Promise<string[]> {
  console.log('Creating 30 dummy users...\n')
  const userIds: string[] = []

  for (let i = 0; i < 30; i++) {
    const email = generateEmail(i)
    const firstName = FIRST_NAMES[i]
    const lastName = rand(LAST_NAMES)
    const fullName = `${firstName} ${lastName}`

    const { data: existing } = await supabase.auth.admin.listUsers()
    const found = existing.users.find(u => u.email === email)

    if (found) {
      console.log(`  [${i + 1}/30] EXISTS — ${email} (${found.id})`)
      userIds.push(found.id)
      continue
    }

    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password: COMMON_PASSWORD,
      email_confirm: true,
      user_metadata: { name: fullName },
    })

    if (createError) {
      console.error(`  [${i + 1}/30] FAIL — ${email}: ${createError.message}`)
      continue
    }

    const uid = newUser.user.id
    userIds.push(uid)

    const { error: profileError } = await supabase.from('profiles').upsert({
      id: uid,
      name: fullName,
      email,
      role: 'citizen',
      is_active: true,
      hero_score: Math.floor(Math.random() * 500),
      total_reports: 0,
      total_resolved: 0,
      total_verified: Math.floor(Math.random() * 20),
      phone: `+91${String(9000000000 + i).slice(0, 10)}`,
    })

    if (profileError) {
      console.error(`    Profile insert failed: ${profileError.message}`)
    } else {
      console.log(`  [${i + 1}/30] OK — ${email} (${fullName})`)
    }
  }

  return userIds
}

async function createIssues(userIds: string[]): Promise<void> {
  console.log('\nCreating issues for each user...\n')
  let totalCreated = 0

  for (const userId of userIds) {
    const numIssues = randInt(5, 8)
    let userCreated = 0

    for (let j = 0; j < numIssues; j++) {
      const loc = rand(BANGALORE_LOCATIONS)
      const category = rand(CATEGORIES)
      const severity = rand(SEVERITIES)
      const status = rand(STATUSES)
      const title = generateIssueTitle(loc.addr)
      const description = generateDescription()
      const imageUrl = rand(SAMPLE_IMAGES)

      const { data: newIssue, error: insertError } = await supabase
        .from('issues')
        .insert({
          reporter_id: userId,
          title,
          description,
          category,
          severity,
          status,
          latitude: loc.lat + (Math.random() - 0.5) * 0.01,
          longitude: loc.lng + (Math.random() - 0.5) * 0.01,
          address: `${loc.addr}, Bangalore`,
          ward: rand(WARDS),
          image_urls: [imageUrl],
          upvote_count: Math.floor(Math.random() * 100),
          verification_count: Math.floor(Math.random() * 15),
        })
        .select('id')
        .single()

      if (insertError) {
        console.error(`    FAIL — User ${userId.slice(0, 8)} issue ${j + 1}: ${insertError.message}`)
        continue
      }

      await supabase.from('issue_updates').insert({
        issue_id: newIssue.id,
        updated_by: userId,
        type: 'status_change',
        new_status: status,
        note: `Issue created with status: ${status}`,
      })

      userCreated++
      totalCreated++
    }

    const shortId = userId.slice(0, 8)
    console.log(`  User ${shortId}: ${userCreated}/${numIssues} issues created`)
  }

  console.log(`\nTotal: ${totalCreated} issues created across ${userIds.length} users.`)
}

async function seed() {
  console.log('=== Community Hero — Dummy Data Seeder ===\n')

  const userIds = await createUsers()
  console.log(`\n${userIds.length} users ready.`)

  await createIssues(userIds)

  console.log('\n=== Done ===')
  console.log(`\nAll ${userIds.length} users share the password: ${COMMON_PASSWORD}`)
  console.log('Email pattern: dummy1@communityhero.test, dummy2@communityhero.test, ... dummy30@communityhero.test')
}

seed().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
