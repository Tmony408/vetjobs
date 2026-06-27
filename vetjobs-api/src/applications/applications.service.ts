import { Injectable } from '@nestjs/common';
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

  async create(
    identity: { sub: string; email?: string; name?: string } | string,
    data: Partial<Application>,
  ) {
    const userId = typeof identity === 'string' ? identity : identity.sub;
    // Ensure the profile row exists. If the user signed in but /me never ran (or
    // the row was wiped), create it on the fly so applying never fails silently.
    let user = await this.users.findOne({ where: { id: userId } });
    if (!user) {
      const email = typeof identity === 'string' ? '' : identity.email || '';
      const name = typeof identity === 'string' ? '' : identity.name || '';
      user = this.users.create({ id: userId, email, name, answers: {} });
      await this.users.save(user);
    }
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
