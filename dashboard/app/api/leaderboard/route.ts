import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams.toString()
  const authHeader = request.headers.get('authorization')

  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (authHeader) {
    headers['Authorization'] = authHeader
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/leaderboard?${params}`, {
      headers,
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Backend error' }, { status: res.status })
    }

    const data = await res.json()

    // Map backend format to frontend format
    const leaderboard = (data.entries || []).map((entry: any) => ({
      rank: entry.rank,
      user: {
        id: entry.profile.id,
        name: entry.profile.name,
        avatar_url: entry.profile.avatar_url,
        hero_score: entry.profile.hero_score,
        total_reports: entry.total_reports,
        total_resolved: entry.total_resolved,
        badges: (entry.badges || []).map((b: any) => b.slug),
      },
    }))

    const total_participants = data.my_rank ? data.my_rank.total : leaderboard.length

    let my_rank = null
    if (data.my_rank) {
      const rank = data.my_rank.rank
      const total = data.my_rank.total
      const percentile = total > 0 ? Math.max(1, Math.round((rank / total) * 100)) : 100
      my_rank = {
        rank,
        hero_score: data.my_rank.hero_score,
        percentile,
      }
    }

    return NextResponse.json({
      leaderboard,
      my_rank,
      total_participants,
    })
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch from backend' }, { status: 502 })
  }
}
