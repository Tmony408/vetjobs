import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Role } from './role.entity';
import { Application } from './application.entity';

@Entity('users')
export class User {
  // = the Supabase user id (auth is handled by Supabase; this row is the profile).
  @PrimaryColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column({ default: '' })
  name: string;

  @Column({ default: '' })
  phone: string;

  @Column({ default: '' })
  location: string;

  @Column({ default: '' })
  linkedin: string;

  @Column({ default: '' })
  portfolio: string;

  // { exp, notice, auth, salary, relocate, heard }
  @Column({ type: 'jsonb', default: {} })
  answers: Record<string, string>;

  @Column({ default: false })
  subscribed: boolean;

  @Column({ default: 0 })
  bonusDays: number;

  @Column({ default: 0 })
  referrals: number;

  @Column({ default: 0 })
  dodged: number;

  @CreateDateColumn()
  trialStart: Date;

  @OneToMany(() => Role, (r) => r.user)
  roles: Role[];

  @OneToMany(() => Application, (a) => a.user)
  applications: Application[];
}
