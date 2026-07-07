import 'dotenv/config'

async function main() {
  const API = 'http://localhost:8000'

  // Test 1: Health
  try {
    const h = await (await fetch(`${API}/api/health`, { signal: AbortSignal.timeout(5000) })).json()
    console.log('Health:', JSON.stringify(h))
  } catch (e: any) {
    console.log('Health FAILED:', e.message)
    process.exit(1)
  }

  // Test 2: GET /api/issues (no filters)
  const r = await fetch(`${API}/api/issues`, { signal: AbortSignal.timeout(5000) })
  const data = await r.json()
  console.log('Issues count:', data.issues?.length)
  console.log('Pagination:', JSON.stringify(data.pagination))
  if (data.issues?.length > 0) {
    console.log('First issue title:', data.issues[0].title)
    console.log('Has reporter:', !!data.issues[0].reporter)
    console.log('Reporter details:', JSON.stringify(data.issues[0].reporter))
  }

  // Test 3: GET /api/issues?lat=12.9716&lng=77.5946&radius_km=50
  const r2 = await fetch(`${API}/api/issues?lat=12.9716&lng=77.5946&radius_km=50`, { signal: AbortSignal.timeout(5000) })
  const data2 = await r2.json()
  console.log('\nWith location filter (50km radius):')
  console.log('Issues count:', data2.issues?.length)
  if (data2.issues?.length > 0) {
    console.log('First issue:', data2.issues[0].title, 'distance:', data2.issues[0].distance_km)
  }

  // Test 4: GET /api/issues/nearby
  const r3 = await fetch(`${API}/api/issues/nearby?lat=12.9716&lng=77.5946&radius_km=50`, { signal: AbortSignal.timeout(5000) })
  const data3 = await r3.json()
  console.log('\nNearby markers:', data3.markers?.length)

  // Test 5: GET /api/issues/:id (first issue)
  if (data.issues?.length > 0) {
    const id = data.issues[0].id
    const r4 = await fetch(`${API}/api/issues/${id}`, { signal: AbortSignal.timeout(5000) })
    const data4 = await r4.json()
    console.log('\nSingle issue:', data4.issue?.title)
    console.log('Has reporter:', !!data4.issue?.reporter)
  }

  console.log('\nAll tests passed!')
}

main().catch(e => { console.error(e); process.exit(1) })
