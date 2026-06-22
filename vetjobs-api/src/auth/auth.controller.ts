import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // POST /api/auth/signup  { email, password, name? } -> { access_token, user }
  @Post('signup')
  signup(@Body() body: { email: string; password: string; name?: string }) {
    return this.auth.signup(body.email, body.password, body.name);
  }

  // POST /api/auth/login  { email, password } -> { access_token, user }
  @Post('login')
  login(@Body() body: { email: string; password: string }) {
    return this.auth.login(body.email, body.password);
  }
}
