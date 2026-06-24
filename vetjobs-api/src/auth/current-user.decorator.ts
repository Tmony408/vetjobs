import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// The authenticated user's id (= Supabase user id), set by JwtAuthGuard.
export const CurrentUserId = createParamDecorator((_data: unknown, ctx: ExecutionContext): string => {
  return ctx.switchToHttp().getRequest().user?.sub;
});

// The full authenticated user { sub, email, name }.
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});
