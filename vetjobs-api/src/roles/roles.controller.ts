import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role } from '../entities/role.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';

@Controller('roles')
@UseGuards(JwtAuthGuard) // managing target roles requires an account
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @Get()
  list(@CurrentUserId() userId: string) {
    return this.roles.list(userId);
  }

  @Post()
  add(@CurrentUserId() userId: string, @Body() body: Partial<Role>) {
    return this.roles.add(userId, body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: Partial<Role>) {
    return this.roles.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.roles.remove(id);
  }
}
