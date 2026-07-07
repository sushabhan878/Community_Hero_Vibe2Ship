import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  try {
    const res = await fetch(`${BACKEND_URL}/api/issues?${params}`, {
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: res.status })
    }
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch from backend' }, { status: 502 })
  }
}
