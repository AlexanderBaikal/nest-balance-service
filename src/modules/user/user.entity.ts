import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '@shared/base.entity';
import { PaymentHistory } from '@modules/user/payment-history.entity';

@Entity({ name: 'users' })
export class User extends BaseEntity {
  @Column({ type: 'numeric', precision: 15, scale: 2, default: 0 })
  balance: string;

  @OneToMany(() => PaymentHistory, (history) => history.user)
  history: PaymentHistory[];
}
