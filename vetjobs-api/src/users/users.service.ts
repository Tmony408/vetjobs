import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(@InjectRepository(User) private readonly repo: Repository<User>) {}

  // Ensure a profile row exists for this Supabase user (id = Supabase user id).
  async ensure(id: string, email?: string, name?: string): Promise<User> {
    let user = await this.repo.findOne({ where: { id } });
    if (!user) {
      user = this.repo.create({ id, email: email || '', name: name || '', answers: {} });
      await this.repo.save(user);
    } else if ((email && user.email !== email) || (name && !user.name)) {
      user.email = email || user.email;
      if (name && !user.name) user.name = name;
      await this.repo.save(user);
    }
    return user;
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
