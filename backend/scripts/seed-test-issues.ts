import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const categories = ['pothole', 'road_damage', 'water_leak', 'sewage', 'streetlight', 'garbage', 'illegal_dumping', 'fallen_tree', 'park_damage', 'other'] as const
const severities = ['low', 'medium', 'high', 'critical'] as const
const statuses = ['pending', 'ai_processed', 'verified', 'assigned', 'in_progress', 'resolved', 'rejected', 'closed'] as const

const issues = [
  {
    title: 'Large pothole on MG Road near bus stop',
    description: 'Deep pothole approximately 2 feet wide on the main road, causing traffic delays and vehicle damage.',
    category: 'pothole' as const,
    severity: 'high' as const,
    status: 'verified' as const,
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'MG Road, near Bus Stop 14',
    ward: 'Ward 3',
    image_urls: ['https://images.unsplash.com/photo-1587574296773-73b2c1e76fb6?w=800'],
  },
  {
    title: 'Water pipeline burst on Church Street',
    description: 'Major water leak from a burst pipeline, flooding the sidewalk and causing water wastage.',
    category: 'water_leak' as const,
    severity: 'critical' as const,
    status: 'assigned' as const,
    latitude: 12.9720,
    longitude: 77.5950,
    address: 'Church Street, near Cafe Coffee Day',
    ward: 'Ward 3',
    image_urls: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800'],
  },
  {
    title: 'Streetlight not working on Park Avenue',
    description: 'Three consecutive streetlights have been out for over a week, making the area unsafe at night.',
    category: 'streetlight' as const,
    severity: 'medium' as const,
    status: 'pending' as const,
    latitude: 12.9730,
    longitude: 77.5930,
    address: 'Park Avenue, Block C',
    ward: 'Ward 5',
    image_urls: ['https://images.unsplash.com/photo-1604093882750-3ed498f3178b?w=800'],
  },
  {
    title: 'Illegal garbage dumping at empty plot',
    description: 'Construction debris and household waste being dumped illegally on the empty plot near the temple.',
    category: 'illegal_dumping' as const,
    severity: 'high' as const,
    status: 'in_progress' as const,
    latitude: 12.9740,
    longitude: 77.5960,
    address: 'Plot 45, Temple Road',
    ward: 'Ward 7',
    image_urls: ['https://images.unsplash.com/photo-1582213782179-e0d53f98f2ca?w=800'],
  },
  {
    title: 'Sewage overflow on Residential Lane',
    description: 'Sewage overflowing from manhole, creating health hazard and foul smell in the residential area.',
    category: 'sewage' as const,
    severity: 'critical' as const,
    status: 'assigned' as const,
    latitude: 12.9700,
    longitude: 77.5980,
    address: 'Greenwood Colony, Lane 5',
    ward: 'Ward 2',
    image_urls: ['https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=800'],
  },
  {
    title: 'Fallen tree blocking road after storm',
    description: 'A large tree has fallen across the main road after last nights storm, completely blocking traffic.',
    category: 'fallen_tree' as const,
    severity: 'high' as const,
    status: 'resolved' as const,
    latitude: 12.9750,
    longitude: 77.5920,
    address: 'Ring Road, near Flyover',
    ward: 'Ward 4',
    image_urls: ['https://images.unsplash.com/photo-1559595500-08f6e2658448?w=800'],
  },
  {
    title: 'Playground equipment damaged in park',
    description: 'Swing set and slide heavily damaged, sharp edges exposed - dangerous for children.',
    category: 'park_damage' as const,
    severity: 'medium' as const,
    status: 'pending' as const,
    latitude: 12.9760,
    longitude: 77.5990,
    address: 'Central Park, Childrens Area',
    ward: 'Ward 1',
    image_urls: ['https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=800'],
  },
  {
    title: 'Road damage near railway crossing',
    description: 'The road surface has deteriorated severely near the railway crossing, multiple cracks and depressions.',
    category: 'road_damage' as const,
    severity: 'high' as const,
    status: 'ai_processed' as const,
    latitude: 12.9770,
    longitude: 77.5970,
    address: 'Railway Crossing, Station Road',
    ward: 'Ward 6',
    image_urls: ['https://images.unsplash.com/photo-1568952433726-3896e3881c65?w=800'],
  },
  {
    title: 'Overflowing garbage bins in market area',
    description: 'Municipal garbage bins have not been collected for 5 days, waste spilling onto the street.',
    category: 'garbage' as const,
    severity: 'medium' as const,
    status: 'in_progress' as const,
    latitude: 12.9710,
    longitude: 77.6010,
    address: 'Market Complex, Main Bazaar',
    ward: 'Ward 3',
    image_urls: ['https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800'],
  },
  {
    title: 'Water leak in apartment complex',
    description: 'Constant water leak from main supply line in the apartment basement, tenant worried about foundation.',
    category: 'water_leak' as const,
    severity: 'low' as const,
    status: 'pending' as const,
    latitude: 12.9780,
    longitude: 77.5955,
    address: 'Lakeview Apartments, Basement',
    ward: 'Ward 5',
    image_urls: ['https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800'],
  },
  {
    title: 'Multiple potholes on school road',
    description: 'Stretch of road near St Marys School has 5-6 potholes causing danger for children and parents.',
    category: 'pothole' as const,
    severity: 'high' as const,
    status: 'verified' as const,
    latitude: 12.9790,
    longitude: 77.5935,
    address: 'School Road, St Marys School',
    ward: 'Ward 2',
    image_urls: ['https://images.unsplash.com/photo-1573461160327-b450ce3d8e7f?w=800'],
  },
  {
    title: 'Streetlight pole leaning dangerously',
    description: 'Streetlight pole on the footpath is leaning at a 45-degree angle after being hit by a vehicle.',
    category: 'streetlight' as const,
    severity: 'high' as const,
    status: 'assigned' as const,
    latitude: 12.9800,
    longitude: 77.5940,
    address: 'Junction of Lake Road and Main Street',
    ward: 'Ward 1',
    image_urls: ['https://images.unsplash.com/photo-1545153105-1cafc86f291f?w=800'],
  },
  {
    title: 'Construction debris dumped on roadside',
    description: 'Bricks, concrete chunks, and sand piled on the roadside for over 2 weeks, never collected.',
    category: 'illegal_dumping' as const,
    severity: 'medium' as const,
    status: 'pending' as const,
    latitude: 12.9810,
    longitude: 77.5985,
    address: 'NH-44 Service Road',
    ward: 'Ward 7',
    image_urls: ['https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=800'],
  },
  {
    title: 'Manhole cover missing on busy street',
    description: 'Open manhole on the main road, extremely dangerous for pedestrians and vehicles especially at night.',
    category: 'other' as const,
    severity: 'critical' as const,
    status: 'resolved' as const,
    latitude: 12.9820,
    longitude: 77.5965,
    address: 'Main Street, opposite City Hospital',
    ward: 'Ward 4',
    image_urls: ['https://images.unsplash.com/photo-1582562124811-c09040d0a901?w=800'],
  },
  {
    title: 'Sewage smell from drain near school',
    description: 'Blocked drain near the school entrance emitting strong sewage smell, children complaining of nausea.',
    category: 'sewage' as const,
    severity: 'high' as const,
    status: 'in_progress' as const,
    latitude: 12.9830,
    longitude: 77.5910,
    address: 'Near Sunshine School, Back Gate',
    ward: 'Ward 6',
    image_urls: ['https://images.unsplash.com/photo-1602688485302-27c3e3e0a3b5?w=800'],
  },
  {
    title: 'Park bench and fence vandalized',
    description: 'Multiple park benches broken and iron fence damaged in the community park, glass pieces on ground.',
    category: 'park_damage' as const,
    severity: 'low' as const,
    status: 'pending' as const,
    latitude: 12.9840,
    longitude: 77.5925,
    address: 'Community Park, Sector B',
    ward: 'Ward 3',
    image_urls: ['https://images.unsplash.com/photo-1585314062340-f1a5a7c9328d?w=800'],
  },
  {
    title: 'Tree branch dangerously overhanging road',
    description: 'Large dead branch from an old tree is hanging precariously over the road, could fall anytime.',
    category: 'fallen_tree' as const,
    severity: 'medium' as const,
    status: 'ai_processed' as const,
    latitude: 12.9850,
    longitude: 77.5995,
    address: 'College Road, near Engineering College',
    ward: 'Ward 5',
    image_urls: ['https://images.unsplash.com/photo-1518495973-89e5ff0c3c9e?w=800'],
  },
  {
    title: 'Garbage not collected for 2 weeks in colony',
    description: 'Residents of Sunrise Colony have not had garbage collection for 14 days, bins overflowing everywhere.',
    category: 'garbage' as const,
    severity: 'high' as const,
    status: 'assigned' as const,
    latitude: 12.9860,
    longitude: 77.5975,
    address: 'Sunrise Colony, Gate 2',
    ward: 'Ward 2',
    image_urls: ['https://images.unsplash.com/photo-1526958097901-5e6d4f9bed9d?w=800'],
  },
  {
    title: 'Road subsidence near metro construction',
    description: 'Road surface sinking near the metro construction site, large cracks forming in the asphalt.',
    category: 'road_damage' as const,
    severity: 'critical' as const,
    status: 'verified' as const,
    latitude: 12.9870,
    longitude: 77.5900,
    address: 'Metro Construction Site, Outer Ring Road',
    ward: 'Ward 1',
    image_urls: ['https://images.unsplash.com/photo-1590674899484-13f46abfed48?w=800'],
  },
  {
    title: 'Water contamination in old town area',
    description: 'Residents reporting brown colored water with sediment from taps in the old town neighborhood.',
    category: 'water_leak' as const,
    severity: 'critical' as const,
    status: 'closed' as const,
    latitude: 12.9880,
    longitude: 77.6000,
    address: 'Old Town, Street 12',
    ward: 'Ward 7',
    image_urls: ['https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800'],
  },
]

async function seed() {
  console.log('Seeding test issues...\n')

  const testEmail = 'testuser@communityhero.test'
  const testPassword = 'TestPassword123!'
  const testName = 'Test Citizen'

  let userId: string

  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers()
  if (listError) {
    console.error('Error listing users:', listError.message)
    process.exit(1)
  }

  const existingUser = existingUsers.users.find(u => u.email === testEmail)

  if (existingUser) {
    userId = existingUser.id
    console.log(`Test user already exists: ${testEmail} (${userId})`)
  } else {
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
      user_metadata: { name: testName },
    })

    if (createError) {
      console.error('Error creating test user:', createError.message)
      process.exit(1)
    }

    userId = newUser.user.id
    console.log(`Created test user: ${testEmail} (${userId})`)

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        name: testName,
        email: testEmail,
        role: 'citizen',
        is_active: true,
      })

    if (profileError) {
      console.error('Error upserting profile:', profileError.message)
      process.exit(1)
    }

    console.log('Profile created/updated.\n')
  }

  let successCount = 0
  for (let i = 0; i < issues.length; i++) {
    const issue = issues[i]

    const { data: existingIssues } = await supabase
      .from('issues')
      .select('id')
      .eq('title', issue.title)
      .is('deleted_at', null)

    if (existingIssues && existingIssues.length > 0) {
      console.log(`  [${i + 1}/${issues.length}] SKIP — already exists: "${issue.title}"`)
      successCount++
      continue
    }

    const { data: newIssue, error: insertError } = await supabase
      .from('issues')
      .insert({
        reporter_id: userId,
        title: issue.title,
        description: issue.description,
        category: issue.category,
        severity: issue.severity,
        status: issue.status,
        latitude: issue.latitude,
        longitude: issue.longitude,
        address: issue.address,
        ward: issue.ward,
        image_urls: issue.image_urls,
        upvote_count: Math.floor(Math.random() * 50),
        verification_count: Math.floor(Math.random() * 10),
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(`  [${i + 1}/${issues.length}] FAIL — "${issue.title}": ${insertError.message}`)
      continue
    }

    await supabase.from('issue_updates').insert({
      issue_id: newIssue.id,
      updated_by: userId,
      type: 'status_change',
      new_status: issue.status,
      note: `Issue created with status: ${issue.status}`,
    })

    successCount++
    console.log(`  [${i + 1}/${issues.length}] OK — "${issue.title}" (${issue.category}, ${issue.severity}, ${issue.status})`)
  }

  console.log(`\nDone. ${successCount}/${issues.length} issues created.`)
  console.log(`\nTest user credentials:`)
  console.log(`  Email:    ${testEmail}`)
  console.log(`  Password: ${testPassword}`)
  console.log(`  User ID:  ${userId}`)
}

seed().catch(err => {
  console.error(err)
  process.exit(1)
})
