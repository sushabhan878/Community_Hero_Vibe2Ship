import { supabaseAdmin } from '../supabase'

type BadgeRule = {
  slug: string
  label: string
  check: (profile: { total_reports: number; total_resolved: number; total_verified: number; hero_score: number }) => boolean
}

const BADGE_RULES: BadgeRule[] = [
  { slug: 'first_report', label: 'First Responder', check: (p) => p.total_reports > 1 },
  { slug: 'verified_reporter', label: 'Verified Reporter', check: (p) => p.total_reports > 5 && p.total_reports === p.total_resolved },
  { slug: 'super_verifier', label: 'Super Verifier', check: (p) => p.total_reports > 10 },
  { slug: 'speed_reporter', label: 'Speed Reporter', check: (p) => p.hero_score >= 30 },
  { slug: 'problem_solver', label: 'Problem Solver', check: (p) => p.hero_score >= 200 },
  { slug: 'community_pillar', label: 'Community Pillar', check: (p) => p.hero_score > 50 },
  { slug: 'top_hero', label: 'City Hero', check: (p) => p.hero_score > 100 },
  { slug: 'neighborhood_watch', label: 'Neighborhood Watch', check: (p) => p.total_verified > 0 },
]

export async function allocateBadges(userId: string): Promise<string[]> {
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('total_reports, total_resolved, total_verified, hero_score')
    .eq('id', userId)
    .single()

  if (!profile) return []

  const { data: existing } = await supabaseAdmin
    .from('badges')
    .select('slug')
    .eq('user_id', userId)

  const owned = new Set((existing ?? []).map((b) => b.slug))
  const earned: string[] = []

  for (const badge of BADGE_RULES) {
    if (owned.has(badge.slug)) continue
    if (badge.check(profile)) {
      const { error } = await supabaseAdmin
        .from('badges')
        .insert({ user_id: userId, slug: badge.slug })
      if (!error) earned.push(badge.slug)
    }
  }

  return earned
}
