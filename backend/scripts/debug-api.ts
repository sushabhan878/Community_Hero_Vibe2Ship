import 'dotenv/config'

async function main() {
  const r = await fetch('http://localhost:8000/api/issues', { signal: AbortSignal.timeout(10000) })
  console.log('Status:', r.status)
  const text = await r.text()
  console.log('Body:', text.slice(0, 2000))
  process.exit(0)
}
main().catch(e => { console.error(e.message); process.exit(1) })
