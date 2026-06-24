import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from '../entities/user.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId, CurrentUser } from '../auth/current-user.decorator';

@Controller('me')
@UseGuards(JwtAuthGuard) // your own profile — requires sign in
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // GET /api/me -> the signed-in user (auto-creates the profile on first sign-in)
  @Get()
  async me(@CurrentUser() u: { sub: string; email?: string; name?: string }) {
    await this.users.ensure(u.sub, u.email, u.name);
    return this.users.get(u.sub);
  }

  // PATCH /api/me  { name, phone, location, linkedin, portfolio, answers, subscribed, ... }
  @Patch()
  update(@CurrentUserId() userId: string, @Body() body: Partial<User>) {
    return this.users.update(userId, body);
  }
}
