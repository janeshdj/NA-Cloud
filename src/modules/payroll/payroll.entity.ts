import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('payslips')
export class Payslip {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  month_year: string; // e.g., '2026-09'

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  basic_salary: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  house_rent_allowance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  special_allowance: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  provident_fund_deduction: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  tax_deduction: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  net_salary: number;

  @Column({ default: 'PAID' })
  payment_status: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
