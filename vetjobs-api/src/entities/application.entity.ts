import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('applications')
export class Application {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  jobId: string;

  @Column({ default: '' })
  company: string;

  @Column({ default: '' })
  title: string;

  @Column({ default: '' })
  roleTitle: string;

  @Column({ default: '' })
  cvName: string;

  @Column({ default: 'Applied' })
  status: string;

  @Column({ type: 'text', default: '' })
  letter: string;

  @CreateDateColumn()
  appliedAt: Date;

  @ManyToOne(() => User, (u) => u.applications, { onDelete: 'CASCADE' })
  user: User;
}
