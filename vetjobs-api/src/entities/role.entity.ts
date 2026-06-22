import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  skills: string;

  @Column({ default: '' })
  cvName: string;

  @Column({ type: 'text', default: '' })
  cvText: string;

  @ManyToOne(() => User, (u) => u.roles, { onDelete: 'CASCADE' })
  user: User;
}
