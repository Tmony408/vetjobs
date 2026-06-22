import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async signup(email: string, password: string, name?: string) {
    if (!email || !password) throw new UnauthorizedException('Email and password are required');
    const existing = await this.users.findOne({ where: { email } });
    if (existing) throw new ConflictException('That email is already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.users.create({ email, name: name || '', passwordHash, answers: {} });
    await this.users.save(user);
    return this.token(user);
  }

  async login(email: string, password: string) {
    const user = await this.users.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'passwordHash'],
    });
    if (!user || !user.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid email or password');
    }
    return this.token(user);
  }

  private token(user: User) {
    const access_token = this.jwt.sign({ sub: user.id, email: user.email });
    return { access_token, user: { id: user.id, email: user.email, name: user.name } };
  }
}
