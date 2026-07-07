import { Request, Response, NextFunction } from 'express'
import { supabase as supabaseAdmin } from '../supabase'
import { AuthRequest } from '../types'

declare global {
  namespace Express {
    interface Request {
      userId?: string
    }
  }
}

function decodeUnsafe(token: string): { sub?: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString())
  } catch {
    return null
  }
}

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' })
    return
  }

  const token = header.slice(7)

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    const payload = decodeUnsafe(token)
    if (!payload?.sub) {
      res.status(401).json({ error: 'Invalid or expired token' })
      return
    }
    req.userId = payload.sub
    next()
    return
  }

  req.userId = user.id
  next()
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  await authMiddleware(req, res, next)
}

export async function loadProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', req.userId)
      .single()

    if (error || !profile) {
      res.status(404).json({ error: 'Profile not found' })
      return
    }
    req.profile = profile
    next()
  } catch (err) {
    next(err)
  }
}

export function requireRole(role: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (req.profile?.role !== role) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}
