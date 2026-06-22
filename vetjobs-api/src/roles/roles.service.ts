import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly repo: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  list(userId: string) {
    return this.repo.find({ where: { user: { id: userId } } });
  }

  async add(userId: string, data: Partial<Role>) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const role = this.repo.create({ ...data, user });
    return this.repo.save(role);
  }

  async update(id: string, patch: Partial<Role>) {
    await this.repo.update(id, patch);
    return this.repo.findOne({ where: { id } });
  }

  async remove(id: string) {
    await this.repo.delete(id);
    return { ok: true };
  }
}
