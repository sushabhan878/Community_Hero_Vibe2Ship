import 'dotenv/config'

async function main() {
  const SUPABASE_AUTH = process.env.SUPABASE_URL + '/auth/v1'
  const ANON_KEY = process.env.SUPABASE_ANON_KEY

  // Sign in
  const signin = await fetch(SUPABASE_AUTH + '/token?grant_type=password', {
    method: 'POST',
    headers: { apikey: ANON_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'testuser@communityhero.test', password: 'TestPassword123!' }),
  })
  const session = await signin.json()
  if (!signin.ok) { console.log('Signin failed:', session); return }
  const token = session.access_token
  console.log('Signed in')

  // Get an issue
  const issues = await fetch('http://localhost:8000/api/issues', {
    headers: { Authorization: 'Bearer ' + token }
  })
  const issuesData = await issues.json()
  const issueId = issuesData.issues?.[0]?.id
  if (!issueId) { console.log('No issues found'); return }
  console.log('Issue:', issueId)

  // Verify
  const verify = await fetch('http://localhost:8000/api/issues/' + issueId + '/verify', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
  })
  console.log('Status:', verify.status)
  console.log('Body:', await verify.text())
}
main()
