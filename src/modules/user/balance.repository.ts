import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource, QueryRunner } from 'typeorm';
import { PaymentAction, PaymentHistory } from '@modules/user/payment-history.entity';
import { User } from '@modules/user/user.entity';

@Injectable()
export class BalanceRepository {
  constructor(private readonly dataSource: DataSource) {}

  async applyOperation(userId: number, amount: number, action: PaymentAction): Promise<number> {
    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();

    try {
      const user = await runner.manager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new NotFoundException(`User ${userId} not found`);
      }

      const currentBalance = Number(user.balance);
      if (action === PaymentAction.Debit && currentBalance < amount) {
        throw new BadRequestException('Insufficient funds');
      }

      const historyEntry = runner.manager.create(PaymentHistory, {
        userId,
        action,
        amount: amount.toFixed(2),
      });
      await runner.manager.save(historyEntry);

      const balanceFromHistory = await this.recalculateBalanceFromHistory(runner, userId);
      user.balance = balanceFromHistory.toFixed(2);
      await runner.manager.save(user);

      await runner.commitTransaction();
      return balanceFromHistory;
    } catch (error) {
      await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async recalculateBalanceFromHistory(
    runner: QueryRunner,
    userId: number,
  ): Promise<number> {
    const result = await runner.manager
      .createQueryBuilder(PaymentHistory, 'history')
      .select(
        `COALESCE(SUM(CASE WHEN history.action = :credit THEN history.amount ELSE -history.amount END), 0)`,
        'total',
      )
      .where('history.user_id = :userId', { userId })
      .setParameters({ credit: PaymentAction.Credit })
      .getRawOne<{ total: string | null }>();

    return result ? Number(result.total) : 0;
  }
}
