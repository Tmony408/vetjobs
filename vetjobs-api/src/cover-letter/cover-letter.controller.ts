import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CoverLetterService } from './cover-letter.service';
import { LetterInput } from './letter.builder';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('cover-letter')
@UseGuards(JwtAuthGuard) // applying (and its letters) requires an account
export class CoverLetterController {
  constructor(private readonly svc: CoverLetterService) {}

  // POST /api/cover-letter  { profile, role, job, cvText } -> { letter, source }
  @Post()
  generate(@Body() body: LetterInput) {
    return this.svc.generate(body || {});
  }
}
