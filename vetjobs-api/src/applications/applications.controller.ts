import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { Application } from '../entities/application.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('applications')
@UseGuards(JwtAuthGuard) // applying / viewing applications requires an account
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.apps.list(userId);
  }

  @Post()
  create(@CurrentUserId() userId: string, @Body() body: Partial<Application>) {
    return this.apps.create(userId, body);
  }
}
