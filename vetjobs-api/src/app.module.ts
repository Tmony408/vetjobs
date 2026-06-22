import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Role } from './entities/role.entity';
import { Application } from './entities/application.entity';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { ApplicationsModule } from './applications/applications.module';
import { JobsModule } from './jobs/jobs.module';
import { VerifyModule } from './verify/verify.module';
import { CoverLetterModule } from './cover-letter/cover-letter.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      entities: [User, Role, Application],
      synchronize: true, // DEV ONLY: auto-creates/updates tables. Use migrations in prod.
      // Hosted Postgres (Neon, Supabase, RDS…) requires SSL. Enabled automatically
      // when the connection string asks for it, or when DATABASE_SSL=true.
      ssl:
        process.env.DATABASE_SSL === 'true' || /sslmode=require/.test(process.env.DATABASE_URL || '')
          ? { rejectUnauthorized: false }
          : false,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    ApplicationsModule,
    JobsModule,
    VerifyModule,
    CoverLetterModule,
  ],
})
export class AppModule {}
