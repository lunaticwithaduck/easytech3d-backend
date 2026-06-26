import { createHash, timingSafeEqual } from 'node:crypto';
import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';

// Shared-secret admin auth: the admin app sends `x-admin-token` matching ADMIN_TOKEN. Sufficient for
// an internal single-operator dashboard; swap for proper auth (better-auth) if multi-user is needed.
// Compared constant-time (over SHA-256 digests, so unequal lengths don't leak via timingSafeEqual).
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = req.headers['x-admin-token'];
    const expected = process.env.ADMIN_TOKEN;
    if (!expected || typeof token !== 'string') throw new UnauthorizedException('invalid admin token');
    const a = createHash('sha256').update(token).digest();
    const b = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(a, b)) throw new UnauthorizedException('invalid admin token');
    return true;
  }
}
