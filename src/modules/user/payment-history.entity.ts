import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '@shared/base.entity';
import { User } from './user.entity';

export enum PaymentAction {
  Debit = 'debit',
  Credit = 'credit',
}

@Entity({ name: 'payment_history' })
export class PaymentHistory extends BaseEntity {
  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User, (user) => user.history, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 32 })
  action: PaymentAction;

  @Column({ type: 'numeric', precision: 15, scale: 2 })
  amount: string;

  @CreateDateColumn({ name: 'ts', type: 'timestamp with time zone' })
  occurredAt: Date;
}
