import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase';
import { AuthRequest } from '../types';
import { requireAuth, loadProfile } from '../middleware/auth';
import { AppError, ValidationError } from '../middleware/error-handler';
import { allocateBadges } from '../services/badges';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().optional(),
  phone: z.string().nullable().optional(),
});

const pushTokenSchema = z.object({
  token: z.string(),
  platform: z.string(),
});

router.get(
  '/me',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const profileId = req.profile!.id

      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select(`
          *,
          department:departments!department_id(id, name, slug),
          badges(user_id, slug, awarded_at)
        `)
        .eq('id', profileId)
        .single()

      if (error || !profile) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Profile not found' } });
      }

      await allocateBadges(profileId)

      const { data: updatedProfile } = await supabaseAdmin
        .from('profiles')
        .select(`
          *,
          department:departments!department_id(id, name, slug),
          badges(user_id, slug, awarded_at)
        `)
        .eq('id', profileId)
        .single()

      const profileData = updatedProfile || profile
      const badgeList = (profileData.badges || [])
        .filter((b: any) => b.slug)
        .map((b: any) => ({ slug: b.slug, awarded_at: b.awarded_at }))

      res.json({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        avatar_url: profile.avatar_url,
        role: profile.role,
        hero_score: profile.hero_score,
        total_reports: profile.total_reports,
        total_resolved: profile.total_resolved,
        total_verified: profile.total_verified,
        badges: badgeList,
        department: profile.department || null,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.patch(
  '/me',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = updateProfileSchema.parse(req.body);
      const profile = req.profile!;

      const updates: Record<string, any> = {}
      if (body.name !== undefined) {
        const trimmed = body.name.trim();
        if (trimmed.length < 2) {
          return next(new ValidationError('Name must be at least 2 characters'));
        }
        updates.name = trimmed;
      }
      if (body.phone !== undefined) {
        updates.phone = body.phone;
      }
      if (Object.keys(updates).length > 0) {
        await supabaseAdmin.from('profiles').update(updates).eq('id', profile.id)
        Object.assign(profile, updates)
      }

      res.json({ success: true, data: { name: profile.name, phone: profile.phone } });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
      }
      next(err);
    }
  }
);

router.post(
  '/push-token',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = pushTokenSchema.parse(req.body);
      const profile = req.profile!;

      const { count } = await supabaseAdmin
        .from('push_tokens')
        .select('id', { count: 'exact', head: true })
        .eq('token', body.token)

      if (count && count > 0) {
        await supabaseAdmin.from('push_tokens').update({ user_id: profile.id }).eq('token', body.token)
      } else {
        await supabaseAdmin.from('push_tokens').insert([{ user_id: profile.id, token: body.token, platform: body.platform }])
      }

      res.json({ success: true, message: 'Push token registered' });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
      }
      next(err);
    }
  }
);

router.post(
  '/refresh-badges',
  requireAuth,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!
      const earned = await allocateBadges(userId)
      res.json({ success: true, earned })
    } catch (err) {
      next(err)
    }
  }
)

export default router;
