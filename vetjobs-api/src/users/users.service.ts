import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  // Create on first sight, otherwise return the existing user (simple emailed-based identity).
  async upsertByEmail(data: Partial<User>): Promise<User> {
    let user = await this.repo.findOne({ where: { email: data.email } });
    if (!user) {
      user = this.repo.create({ email: data.email, name: data.name || '', answers: {} });
    }
    Object.assign(user, data);
    return this.repo.save(user);
  }

  async get(id: string): Promise<User> {
    const user = await this.repo.findOne({ where: { id }, relations: ['roles', 'applications'] });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, patch: Partial<User>): Promise<User> {
    const user = await this.repo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    Object.assign(user, patch);
    return this.repo.save(user);
  }
}
