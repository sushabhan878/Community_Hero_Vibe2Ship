import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { config } from '../config';
import { supabaseAdmin } from '../supabase';
import { AppError } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';

const router = Router();

const SUPABASE_AUTH = `${config.supabaseUrl}/auth/v1`;

function supabaseHeaders(useServiceRole = false) {
  const key = useServiceRole ? config.supabaseServiceRoleKey : config.supabaseAnonKey;
  return {
    apikey: key,
    'Content-Type': 'application/json',
  };
}

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name cannot be empty').transform(s => s.trim()),
  phone: z.string().nullable().optional(),
});

const signinSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const refreshSchema = z.object({
  refresh_token: z.string(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/signup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = signupSchema.parse(req.body);

    const resp = await fetch(`${SUPABASE_AUTH}/signup`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({
        email: body.email,
        password: body.password,
        data: { name: body.name },
      }),
    });

    const data: any = await resp.json();

    if (!resp.ok) {
      const code = (data.code || 'SIGNUP_FAILED').toUpperCase();
      throw new AppError(400, code, data.msg || 'Signup failed');
    }

    const userId: string = data.user.id;

    const { count } = await supabaseAdmin
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('id', userId)

    if (count === 0) {
      await supabaseAdmin.from('profiles').insert([
        { id: userId, name: body.name, email: body.email, phone: body.phone ?? null },
      ])
    } else if (body.phone) {
      await supabaseAdmin.from('profiles').update({ phone: body.phone }).eq('id', userId)
    }

    res.status(200).json({
      user: { id: userId, email: data.user.email, name: body.name },
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
    }
    next(err);
  }
});

router.post('/signin', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = signinSchema.parse(req.body);

    const resp = await fetch(`${SUPABASE_AUTH}/token?grant_type=password`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ email: body.email, password: body.password }),
    });

    const data: any = await resp.json();

    if (!resp.ok) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Wrong email or password');
    }

    const userId: string = data.user.id;

    let { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .is('deleted_at', null)
      .maybeSingle()

    if (profile && !profile.is_active) {
      throw new AppError(403, 'ACCOUNT_DISABLED', 'Account is disabled');
    }

    if (!profile) {
      const name = data.user.user_metadata?.name || data.user.email.split('@')[0];
      await supabaseAdmin.from('profiles').insert([
        { id: userId, name, email: data.user.email },
      ])
      profile = { id: userId, name, email: data.user.email };
    }

    res.status(200).json({
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      },
      profile: {
        id: profile.id,
        name: profile.name,
        role: profile.role || 'citizen',
        hero_score: profile.hero_score || 0,
        avatar_url: profile.avatar_url || null,
        department_id: profile.department_id || null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
    }
    next(err);
  }
});

router.post('/signout', requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.slice(7) || '';
    await fetch(`${SUPABASE_AUTH}/logout`, {
      method: 'POST',
      headers: { ...supabaseHeaders(), Authorization: `Bearer ${token}` },
    });
    res.json({ success: true, message: 'Signed out' });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = refreshSchema.parse(req.body);

    const resp = await fetch(`${SUPABASE_AUTH}/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ refresh_token: body.refresh_token }),
    });

    const data: any = await resp.json();

    if (!resp.ok) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
    }

    res.json({ access_token: data.access_token, refresh_token: data.refresh_token });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
    }
    next(err);
  }
});

router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = forgotPasswordSchema.parse(req.body);

    const resp = await fetch(`${SUPABASE_AUTH}/recover`, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({ email: body.email }),
    });

    if (!resp.ok) {
      throw new AppError(400, 'RESET_FAILED', 'Failed to send reset email');
    }

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return next(new AppError(422, 'VALIDATION_ERROR', err.errors[0].message));
    }
    next(err);
  }
});

export default router;
