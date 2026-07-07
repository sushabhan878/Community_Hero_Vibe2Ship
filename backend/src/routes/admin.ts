import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { supabaseAdmin } from '../supabase';
import { config } from '../config';
import { AuthRequest } from '../types';
import { requireAuth, loadProfile, requireRole } from '../middleware/auth';
import { AppError } from '../middleware/error-handler';

const router = Router();

const SUPABASE_AUTH = `${config.supabaseUrl}/auth/v1`;

function adminHeaders() {
  return {
    apikey: config.supabaseServiceRoleKey,
    Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
    'Content-Type': 'application/json',
  };
}

const createDeptAdminSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  department_id: z.string(),
});

const toggleUserSchema = z.object({
  user_id: z.string(),
  is_active: z.boolean(),
});

router.post(
  '/create-dept-admin',
  requireAuth,
  loadProfile,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = createDeptAdminSchema.parse(req.body);

      const resp = await fetch(`${SUPABASE_AUTH}/admin/users`, {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({
          email: body.email,
          password: null,
          email_confirm: true,
          user_metadata: { name: body.name },
        }),
      });

      const data: any = await resp.json();

      if (!resp.ok) {
        const errMsg = data.error_description || data.msg || 'Failed to create user';
        return res.status(400).json({
          success: false,
          error: { code: 'CREATE_FAILED', message: errMsg },
        });
      }

      const userId: string = data.user.id;

      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('id', userId)

      if (count && count > 0) {
        await supabaseAdmin
          .from('profiles')
          .update({ role: 'department_admin', department_id: body.department_id, name: body.name.trim() })
          .eq('id', userId)
      } else {
        await supabaseAdmin
          .from('profiles')
          .insert([{ id: userId, name: body.name.trim(), email: body.email, role: 'department_admin', department_id: body.department_id }])
      }

      res.json({
        success: true,
        data: { id: userId, email: body.email, role: 'department_admin' },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
      }
      next(err);
    }
  }
);

router.patch(
  '/toggle-user',
  requireAuth,
  loadProfile,
  requireRole('super_admin'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const body = toggleUserSchema.parse(req.body);

      const { count } = await supabaseAdmin
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('id', body.user_id)

      if (!count || count === 0) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'User not found' },
        });
      }

      await supabaseAdmin
        .from('profiles')
        .update({ is_active: body.is_active })
        .eq('id', body.user_id)

      res.json({
        success: true,
        data: { id: body.user_id, is_active: body.is_active },
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
      }
      next(err);
    }
  }
);

export default router;
