import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '../entities/application.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class ApplicationsService {
  constructor(
    @InjectRepository(Application) private readonly repo: Repository<Application>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  list(userId: string) {
    return this.repo.find({ where: { user: { id: userId } }, order: { appliedAt: 'DESC' } });
  }

  async create(userId: string, data: Partial<Application>) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    // Never apply to the same job twice. If this user already has an application
    // for this jobId, return it instead of creating a duplicate.
    if (data.jobId) {
      const existing = await this.repo.findOne({ where: { user: { id: userId }, jobId: data.jobId } });
      if (existing) return existing;
    }
    const app = this.repo.create({ ...data, user });
    return this.repo.save(app);
  }
}
