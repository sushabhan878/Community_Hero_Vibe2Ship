import { Router, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../supabase';
import { config } from '../config';
import { AuthRequest } from '../types';
import { requireAuth, loadProfile } from '../middleware/auth';
import { NotFoundError, AppError, RateLimitedError } from '../middleware/error-handler';
import { allocateBadges } from '../services/badges';

const router = Router();

router.post(
  '/issues/:issue_id/verify',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { issue_id } = req.params;
      const profile = req.profile!;

      const { data: issue } = await supabaseAdmin
        .from('issues')
        .select('*')
        .eq('id', issue_id)
        .is('deleted_at', null)
        .single()

      if (!issue) {
        return next(new NotFoundError('Issue'));
      }

      if (issue.reporter_id === profile.id) {
        const { count: selfVerifCount } = await supabaseAdmin
          .from('verifications')
          .select('id', { count: 'exact', head: true })
          .eq('issue_id', issue_id)
          .eq('user_id', profile.id)

        if ((selfVerifCount ?? 0) > 0) {
          return next(new AppError(400, 'ALREADY_VERIFIED', 'You already verified this issue'));
        }
      }

      const { count: existingCount } = await supabaseAdmin
        .from('verifications')
        .select('id', { count: 'exact', head: true })
        .eq('issue_id', issue_id)
        .eq('user_id', profile.id)

      if (existingCount && existingCount > 0) {
        return next(new AppError(400, 'ALREADY_VERIFIED', 'You already verified this issue'));
      }

      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

      const { count: recentVerifs } = await supabaseAdmin
        .from('verifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .gte('created_at', oneHourAgo)

      if (recentVerifs && recentVerifs >= config.rateLimitVerificationsPerHour) {
        return next(new RateLimitedError());
      }

      await supabaseAdmin.from('verifications').insert([{ issue_id, user_id: profile.id }])

      const { data: issueForInc } = await supabaseAdmin
        .from('issues')
        .select('verification_count')
        .eq('id', issue_id)
        .single()

      await supabaseAdmin
        .from('issues')
        .update({ verification_count: (issueForInc?.verification_count ?? 0) + 1 })
        .eq('id', issue_id)

      const { data: profileForInc } = await supabaseAdmin
        .from('profiles')
        .select('total_verified')
        .eq('id', profile.id)
        .single()

      await supabaseAdmin
        .from('profiles')
        .update({ total_verified: (profileForInc?.total_verified ?? 0) + 1 })
        .eq('id', profile.id)

      allocateBadges(profile.id).catch(() => {})

      const { data: updatedIssue } = await supabaseAdmin
        .from('issues')
        .select('verification_count, status')
        .eq('id', issue_id)
        .single()

      const { verification_count, status } = updatedIssue!

      let newStatus = status;
      if (verification_count >= config.verificationThreshold && status === 'ai_processed') {
        newStatus = 'verified';
        await supabaseAdmin.from('issues').update({ status: 'verified' }).eq('id', issue_id)
      }

      await supabaseAdmin.from('issue_updates').insert([{
        issue_id,
        updated_by: profile.id,
        type: 'verification_milestone',
        new_status: newStatus,
        note: 'Issue verified by community member',
      }])

      res.json({
        verification_count,
        has_verified: true,
        status: newStatus,
        hero_points_earned: 2,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.delete(
  '/issues/:issue_id/verify',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { issue_id } = req.params;
      const profile = req.profile!;

      const { data: issue } = await supabaseAdmin
        .from('issues')
        .select('*')
        .eq('id', issue_id)
        .is('deleted_at', null)
        .single()

      if (!issue) {
        return next(new NotFoundError('Issue'));
      }

      const { data: verifications } = await supabaseAdmin
        .from('verifications')
        .select('id')
        .eq('issue_id', issue_id)
        .eq('user_id', profile.id)
        .limit(1)

      const verification = verifications?.[0]
      if (!verification) {
        return next(new AppError(400, 'NOT_VERIFIED', "You haven't verified this issue"));
      }

      await supabaseAdmin.from('verifications').delete().eq('id', verification.id)

      const { data: issueForDec } = await supabaseAdmin
        .from('issues')
        .select('verification_count')
        .eq('id', issue_id)
        .single()

      await supabaseAdmin
        .from('issues')
        .update({ verification_count: Math.max((issueForDec?.verification_count ?? 0) - 1, 0) })
        .eq('id', issue_id)

      const { data: profileForDec } = await supabaseAdmin
        .from('profiles')
        .select('total_verified')
        .eq('id', profile.id)
        .single()

      await supabaseAdmin
        .from('profiles')
        .update({ total_verified: Math.max((profileForDec?.total_verified ?? 0) - 1, 0) })
        .eq('id', profile.id)

      allocateBadges(profile.id).catch(() => {})

      const { data: updatedIssue } = await supabaseAdmin
        .from('issues')
        .select('verification_count, status')
        .eq('id', issue_id)
        .single()

      const { verification_count, status } = updatedIssue!

      let newStatus = status;
      if (verification_count < config.verificationThreshold && status === 'verified') {
        newStatus = 'ai_processed';
        await supabaseAdmin.from('issues').update({ status: 'ai_processed' }).eq('id', issue_id)
      }

      res.json({
        verification_count,
        has_verified: false,
        status: newStatus,
        hero_points_earned: 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/issues/:issue_id/verifications',
  requireAuth,
  loadProfile,
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const { issue_id } = req.params;
      const profile = req.profile!;
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));

      const { count: issueExists } = await supabaseAdmin
        .from('issues')
        .select('id', { count: 'exact', head: true })
        .eq('id', issue_id)
        .is('deleted_at', null)

      if (!issueExists || issueExists === 0) {
        return next(new NotFoundError('Issue'));
      }

      const { count: total } = await supabaseAdmin
        .from('verifications')
        .select('id', { count: 'exact', head: true })
        .eq('issue_id', issue_id)

      const offset = (page - 1) * limit;
      const { data: verifications } = await supabaseAdmin
        .from('verifications')
        .select(`
          created_at,
          user:user_id(id, name, avatar_url)
        `)
        .eq('issue_id', issue_id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const entries = (verifications || []).map((v: any) => ({
        user: { id: v.user?.id, name: v.user?.name, avatar_url: v.user?.avatar_url },
        created_at: v.created_at,
      }));

      const { count: userVerifCount } = await supabaseAdmin
        .from('verifications')
        .select('id', { count: 'exact', head: true })
        .eq('issue_id', issue_id)
        .eq('user_id', profile.id)

      res.json({
        verifications: entries,
        total: total || 0,
        has_verified: (userVerifCount || 0) > 0,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
