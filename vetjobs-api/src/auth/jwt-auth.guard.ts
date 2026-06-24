import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

// Verifies a Supabase access token by asking Supabase who it belongs to.
// (Robust regardless of how the project signs tokens — HS256 or asymmetric keys.)
@Injectable()
export class JwtAuthGuard implements CanActivate {
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new UnauthorizedException('Sign in required');

    const url = process.env.SUPABASE_URL;
    const anon = process.env.SUPABASE_ANON_KEY;
    if (!url || !anon) throw new UnauthorizedException('Auth not configured');

    try {
      const r = await fetch(`${url}/auth/v1/user`, {
        headers: { apikey: anon, Authorization: `Bearer ${token}` },
      });
      if (!r.ok) throw new Error('invalid');
      const u: any = await r.json();
      if (!u?.id) throw new Error('no user');
      // sub = Supabase user id (also our users.id); plus email + display name
      req.user = { sub: u.id, email: u.email, name: u.user_metadata?.full_name || u.user_metadata?.name || '' };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }
}
