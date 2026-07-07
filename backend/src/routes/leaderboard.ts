import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

const leaderboardSchema = z.object({
  period: z.enum(['all_time', 'this_month', 'this_week']).default('all_time'),
  scope: z.enum(['city', 'ward']).default('city'),
  ward: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

router.get(
  '/',
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = leaderboardSchema.parse(req.query);
      const userId = req.userId!;
      const limit = query.limit;

      let dateFilter = '';
      if (query.period === 'this_month') {
        dateFilter = "AND created_at >= date_trunc('month', now())";
      } else if (query.period === 'this_week') {
        dateFilter = "AND created_at >= date_trunc('week', now())";
      }

      let wardFilter = '';
      if (query.scope === 'ward' && query.ward) {
        wardFilter = `AND ward = '${query.ward.replace(/'/g, "''")}'`;
      }

      const { data: entries, error: entriesError } = await supabaseAdmin
        .from('profiles')
        .select('id, name, avatar_url, hero_score, total_reports, total_resolved, total_verified')
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('hero_score', { ascending: false })
        .limit(limit);

      if (entriesError) {
        return res.status(500).json({ error: 'Failed to fetch leaderboard' });
      }

      const enriched = await Promise.all(
        (entries || []).map(async (p, index) => {
          const { count: periodReports } = await supabaseAdmin
            .from('issues')
            .select('id', { count: 'exact', head: true })
            .eq('reporter_id', p.id)
            .is('deleted_at', null)
          const { count: periodResolved } = await supabaseAdmin
            .from('issues')
            .select('id', { count: 'exact', head: true })
            .eq('reporter_id', p.id)
            .eq('status', 'resolved')
            .is('deleted_at', null)

          const { data: badges } = await supabaseAdmin
            .from('badges')
            .select('slug, awarded_at')
            .eq('user_id', p.id);

          return {
            rank: index + 1,
            profile: {
              id: p.id,
              name: p.name,
              avatar_url: p.avatar_url,
              hero_score: p.hero_score,
            },
            total_reports: periodReports ?? p.total_reports,
            total_resolved: periodResolved ?? p.total_resolved,
            badges: badges || [],
          };
        })
      );

      const { count: totalActive } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true)
        .is('deleted_at', null);

      let myRank: number | null = null;
      let myHeroScore = 0;
      if (userId) {
        const { data: myProfile } = await supabaseAdmin
          .from('profiles')
          .select('hero_score')
          .eq('id', userId)
          .single();

        if (myProfile) {
          myHeroScore = myProfile.hero_score;
          const { count: rankCount } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true)
            .is('deleted_at', null)
            .gt('hero_score', myHeroScore);

          myRank = (rankCount ?? 0) + 1;
        }
      }

      res.json({
        entries: enriched,
        my_rank: myRank ? { rank: myRank, total: totalActive ?? 0, hero_score: myHeroScore } : null,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ error: err.errors[0].message });
      }
      next(err);
    }
  }
);

export default router;
