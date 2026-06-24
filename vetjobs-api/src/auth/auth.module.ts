import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

// Auth is handled by Supabase. This module only exposes the guard that verifies
// Supabase access tokens on protected routes.
@Global()
@Module({
  providers: [JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
