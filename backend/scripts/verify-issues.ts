import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function verify() {
  const { data, error, count } = await supabase
    .from('issues')
    .select('id, title, category, severity, status', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Query error:', error.message)
    process.exit(1)
  }

  console.log(`\nTotal issues: ${count}`)
  console.log('─'.repeat(80))
  console.log('  #  | Status        | Category        | Severity | Title')
  console.log('─'.repeat(80))

  data!.forEach((issue, i) => {
    const status = issue.status.padEnd(14)
    const cat = issue.category.padEnd(16)
    const sev = issue.severity.padEnd(8)
    console.log(`  ${String(i + 1).padEnd(2)} | ${status} | ${cat} | ${sev} | ${issue.title}`)
  })

  console.log('─'.repeat(80))
}

verify()
