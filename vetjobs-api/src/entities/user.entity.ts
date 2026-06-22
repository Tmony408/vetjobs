import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Role } from './role.entity';
import { Application } from './application.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  // Not selected by default; explicitly requested only during login.
  @Column({ nullable: true, select: false })
  passwordHash: string;

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
