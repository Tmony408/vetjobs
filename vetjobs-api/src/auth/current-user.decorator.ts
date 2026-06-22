import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Returns the authenticated user's id from the JWT (set by JwtAuthGuard).
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  const req = ctx.switchToHttp().getRequest();
  return req.user?.sub;
});
