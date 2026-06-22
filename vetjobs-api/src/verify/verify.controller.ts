import { Body, Controller, Post } from '@nestjs/common';
import { verifyJob, VerifyInput } from './verify.engine';

@Controller('verify')
export class VerifyController {
  // POST /api/verify  { text, email?, company? }
  @Post()
  check(@Body() body: VerifyInput) {
    return verifyJob(body || {});
  }
}
