import { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { supabase } from '../supabase'
import { requireAuth } from '../middleware/auth'
import { AppError, ValidationError } from '../middleware/error-handler'
import { allocateBadges } from '../services/badges'

const router = Router()

const createIssueSchema = z.object({
  title: z.string().min(5).max(100),
  description: z.string().max(1000).optional(),
  category: z.enum(['pothole', 'road_damage', 'water_leak', 'sewage', 'streetlight', 'garbage', 'illegal_dumping', 'fallen_tree', 'park_damage', 'other']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().optional(),
  ward: z.string().optional(),
  image_urls: z.array(z.string()).min(1, 'At least one image is required'),
  video_url: z.string().optional(),
})

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function boundingBox(lat: number, lng: number, radiusKm: number) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180))
  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLng: lng - lngDelta,
    maxLng: lng + lngDelta,
  }
}

const ISSUE_SELECT = `
  id, reporter_id, title, description, image_urls, video_url,
  category, severity,
  ai_category, ai_severity, ai_summary, ai_confidence,
  ai_is_duplicate, ai_duplicate_of, ai_processed_at,
  latitude, longitude, address, ward, status,
  assigned_department_id, assigned_at,
  upvote_count, verification_count,
  created_at, updated_at, resolved_at,
  reporter:profiles!reporter_id(id, name, avatar_url, hero_score),
  assigned_department:departments!assigned_department_id(id, name)
`

const SORT_COLUMNS: Record<string, { column: string; dir: 'asc' | 'desc' }> = {
  newest: { column: 'created_at', dir: 'desc' },
  oldest: { column: 'created_at', dir: 'asc' },
  most_verified: { column: 'verification_count', dir: 'desc' },
  severity: { column: 'severity', dir: 'desc' },
  title: { column: 'title', dir: 'asc' },
  status: { column: 'status', dir: 'asc' },
  created_at: { column: 'created_at', dir: 'desc' },
  verification_count: { column: 'verification_count', dir: 'desc' },
}

function applyFilters(q: any, filters: Record<string, any>) {
  let query = q.is('deleted_at', null)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.category) query = query.eq('category', filters.category)
  if (filters.severity) query = query.eq('severity', filters.severity)
  if (filters.reporter_id) query = query.eq('reporter_id', filters.reporter_id)
  if (filters.department_id) query = query.eq('assigned_department_id', filters.department_id)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)
  if (filters.minLat !== undefined) query = query.gte('latitude', filters.minLat)
  if (filters.maxLat !== undefined) query = query.lte('latitude', filters.maxLat)
  if (filters.minLng !== undefined) query = query.gte('longitude', filters.minLng)
  if (filters.maxLng !== undefined) query = query.lte('longitude', filters.maxLng)
  return query
}

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10))
    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)))
    const sort = (req.query.sort as string) || ''
    const lat = req.query.lat ? parseFloat(req.query.lat as string) : undefined
    const lng = req.query.lng ? parseFloat(req.query.lng as string) : undefined
    const radiusKm = parseFloat((req.query.radius_km as string) ?? '10')

    const filters: Record<string, any> = {
      status: req.query.status as string | undefined,
      category: req.query.category as string | undefined,
      severity: req.query.severity as string | undefined,
      reporter_id: req.query.reporter_id as string | undefined,
      search: req.query.search as string | undefined,
    }

    const departmentSlug = req.query.department as string | undefined
    if (departmentSlug) {
      const { data: dept } = await supabase
        .from('departments')
        .select('id')
        .eq('slug', departmentSlug)
        .maybeSingle()
      if (dept) filters.department_id = dept.id
    }

    const deptId = req.query.department_id as string | undefined
    if (deptId) filters.department_id = deptId

    if (lat !== undefined && lng !== undefined) {
      const bb = boundingBox(lat, lng, radiusKm)
      filters.minLat = bb.minLat
      filters.maxLat = bb.maxLat
      filters.minLng = bb.minLng
      filters.maxLng = bb.maxLng
    }

    let sortColumn = 'created_at'
    let sortDir: 'asc' | 'desc' = 'desc'

    const sortBy = req.query.sort_by as string | undefined
    const sortOrder = req.query.sort_order as string | undefined

    if (sortBy) {
      sortColumn = sortBy === 'days_open' ? 'created_at' : sortBy
      sortDir = sortOrder === 'asc' ? 'asc' : 'desc'
    } else if (sort) {
      const sortInfo = SORT_COLUMNS[sort] || SORT_COLUMNS.newest
      sortColumn = sortInfo.column
      sortDir = sortInfo.dir
    }

    const useNearestSort = sort === 'nearest' && lat !== undefined && lng !== undefined

    if (!useNearestSort) {
      const from = (page - 1) * limit
      const to = from + limit - 1

      const { count: total, error: countErr } = await applyFilters(
        supabase.from('issues').select('id', { count: 'exact', head: true }),
        filters,
      )
      if (countErr) throw new AppError(500, 'DB_ERROR', countErr.message)

      let query = applyFilters(
        supabase.from('issues').select(ISSUE_SELECT),
        filters,
      )
        .order(sortColumn, { ascending: sortDir === 'asc' })
        .range(from, to)

      const { data: issues, error } = await query
      if (error) throw new AppError(500, 'DB_ERROR', error.message)

      return res.json({
        issues: issues ?? [],
        pagination: { page, limit, total: total ?? 0, has_more: (total ?? 0) > to + 1 },
      })
    } else {
      const { count: total, error: countErr } = await applyFilters(
        supabase.from('issues').select('id', { count: 'exact', head: true }),
        filters,
      )
      if (countErr) throw new AppError(500, 'DB_ERROR', countErr.message)

      let query = applyFilters(
        supabase.from('issues').select(ISSUE_SELECT),
        filters,
      )

      const { data: allIssues, error } = await query
      if (error) throw new AppError(500, 'DB_ERROR', error.message)

      const withDist = (allIssues ?? []).map((issue: any) => ({
        ...issue,
        distance_km: Math.round(haversineKm(lat!, lng!, issue.latitude, issue.longitude) * 100) / 100,
      }))
      withDist.sort((a: any, b: any) => a.distance_km - b.distance_km)

      const sliced = withDist.slice((page - 1) * limit, page * limit)

      return res.json({
        issues: sliced,
        pagination: { page, limit, total: total ?? 0, has_more: (total ?? 0) > page * limit },
      })
    }
  } catch (err) {
    next(err)
  }
})

router.get('/nearby', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lat = parseFloat(req.query.lat as string)
    const lng = parseFloat(req.query.lng as string)
    const radiusKm = parseFloat((req.query.radius_km as string) ?? '5')

    if (isNaN(lat) || isNaN(lng)) {
      return res.json({ markers: [] })
    }

    const bb = boundingBox(lat, lng, radiusKm)

    const { data: issues, error } = await supabase
      .from('issues')
      .select('id, title, latitude, longitude, category, severity, status')
      .is('deleted_at', null)
      .gte('latitude', bb.minLat)
      .lte('latitude', bb.maxLat)
      .gte('longitude', bb.minLng)
      .lte('longitude', bb.maxLng)
      .order('created_at', { ascending: false })

    if (error) throw new AppError(500, 'DB_ERROR', error.message)

    const markers = (issues ?? []).filter((i: any) =>
      haversineKm(lat, lng, i.latitude, i.longitude) <= radiusKm,
    )

    res.json({ markers })
  } catch (err) {
    next(err)
  }
})

router.use(requireAuth)

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = createIssueSchema.parse(req.body)
    const userId = req.userId!

    const { data: issue, error: insertError } = await supabase
      .from('issues')
      .insert({
        reporter_id: userId,
        title: body.title,
        description: body.description ?? null,
        category: body.category,
        severity: body.severity,
        latitude: body.latitude,
        longitude: body.longitude,
        address: body.address ?? null,
        ward: body.ward ?? null,
        image_urls: body.image_urls,
        video_url: body.video_url ?? null,
        status: 'pending',
      })
      .select('*')
      .single()

    if (insertError) throw new AppError(500, 'DB_ERROR', insertError.message)
    if (!issue) throw new AppError(500, 'DB_ERROR', 'Failed to create issue')

    const { error: updateError } = await supabase
      .from('issue_updates')
      .insert({
        issue_id: issue.id,
        updated_by: userId,
        type: 'status_change',
        new_status: 'pending',
      })

    if (updateError) throw new AppError(500, 'DB_ERROR', updateError.message)

    const { data: profile } = await supabase
      .from('profiles')
      .select('total_reports, hero_score')
      .eq('id', userId)
      .single()

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          total_reports: (profile.total_reports ?? 0) + 1,
          hero_score: (profile.hero_score ?? 0) + 10,
        })
        .eq('id', userId)

      allocateBadges(userId).catch(() => {})
    }

    res.status(201).json({ issue })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new ValidationError(err.errors[0].message))
    }
    next(err)
  }
})

router.get('/my', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!

    const { data: issues, error } = await supabase
      .from('issues')
      .select('*')
      .eq('reporter_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw new AppError(500, 'DB_ERROR', error.message)

    res.json({ issues: issues ?? [] })
  } catch (err) {
    next(err)
  }
})

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params

    const { data: issue, error } = await supabase
      .from('issues')
      .select(ISSUE_SELECT)
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (error || !issue) {
      throw new AppError(404, 'NOT_FOUND', 'Issue not found')
    }

    res.json({ issue })
  } catch (err) {
    next(err)
  }
})

const updateAiAnalysisSchema = z.object({
  ai_summary: z.string().max(500).optional(),
  ai_category: z.enum(['pothole', 'road_damage', 'water_leak', 'sewage', 'streetlight', 'garbage', 'illegal_dumping', 'fallen_tree', 'park_damage', 'other']).optional(),
  ai_severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
})

router.patch('/:id/ai-analysis', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params
    const body = updateAiAnalysisSchema.parse(req.body)
    const userId = req.userId!

    const updateFields: Record<string, unknown> = {}
    if (body.ai_summary !== undefined) updateFields.ai_summary = body.ai_summary
    if (body.ai_category !== undefined) updateFields.ai_category = body.ai_category
    if (body.ai_severity !== undefined) updateFields.ai_severity = body.ai_severity
    if (Object.keys(updateFields).length === 0) {
      throw new ValidationError('No valid fields to update')
    }

    const { data: issue, error: fetchError } = await supabase
      .from('issues')
      .select('id')
      .eq('id', id)
      .is('deleted_at', null)
      .single()

    if (fetchError || !issue) throw new AppError(404, 'NOT_FOUND', 'Issue not found')

    const { error: updateError } = await supabase
      .from('issues')
      .update(updateFields)
      .eq('id', id)

    if (updateError) throw new AppError(500, 'DB_ERROR', updateError.message)

    await supabase
      .from('issue_updates')
      .insert({
        issue_id: id,
        updated_by: userId,
        type: 'note_added',
        note: 'AI analysis updated',
      })

    res.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new ValidationError(err.errors[0].message))
    }
    next(err)
  }
})

export default router
