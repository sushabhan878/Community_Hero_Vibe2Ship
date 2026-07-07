import { Pool, QueryResult } from 'pg'
import dotenv from 'dotenv'
import dns from 'dns'

dns.setServers(['8.8.8.8', '8.8.4.4'])

dotenv.config()

const rawUrl = process.env.DATABASE_URL || ''
const dbUrl = rawUrl.replace('postgresql+asyncpg://', 'postgresql://')

const lookup: any = (hostname: string, options: any, callback?: any) => {
  if (typeof options === 'function') {
    dns.resolve4(hostname, (err, addresses) => {
      options(err || null, addresses?.[0] || '', 4)
    })
  } else {
    dns.resolve4(hostname, (err, addresses) => {
      callback(err || null, addresses?.[0] || '', 4)
    })
  }
}

export const pool = new Pool({
  connectionString: dbUrl,
  max: 10,
  idleTimeoutMillis: 30000,
  ssl: { rejectUnauthorized: false },
  lookup,
} as any)

pool.on('error', (err) => {
  console.error('Unexpected pool error:', err)
})

export async function query(text: string, params?: unknown[]): Promise<QueryResult> {
  return pool.query(text, params)
}
