import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { PaymentAction, PaymentHistory } from './payment-history.entity';
import { User } from './user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    private readonly dataSource: DataSource,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getUserWithBalance(userId: number): Promise<{ id: number; balance: number }> {
    const cacheKey = this.cacheKey(userId);
    const cached = await this.cacheManager.get<number>(cacheKey);
    if (cached !== undefined) {
      return { id: userId, balance: cached };
    }

    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    const balance = Number(user.balance);
    await this.cacheManager.set(cacheKey, balance);
    return { id: user.id, balance };
  }

  async debitUser(userId: number, amount: number): Promise<{ balance: number }> {
    this.ensurePositive(amount);
    return this.applyOperation(userId, amount, PaymentAction.Debit);
  }

  async creditUser(userId: number, amount: number): Promise<{ balance: number }> {
    this.ensurePositive(amount);
    return this.applyOperation(userId, amount, PaymentAction.Credit);
  }

  private ensurePositive(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
  }

  private async applyOperation(
    userId: number,
    amount: number,
    action: PaymentAction,
  ): Promise<{ balance: number }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const user = await queryRunner.manager.findOne(User, {
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

      const historyEntry = queryRunner.manager.create(PaymentHistory, {
        userId,
        action,
        amount: amount.toFixed(2),
      });
      await queryRunner.manager.save(historyEntry);

      const balanceFromHistory = await this.recalculateBalanceFromHistory(queryRunner, userId);
      user.balance = balanceFromHistory.toFixed(2);
      await queryRunner.manager.save(user);

      await queryRunner.commitTransaction();

      await this.cacheManager.set(this.cacheKey(userId), balanceFromHistory);
      return { balance: balanceFromHistory };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private cacheKey(userId: number) {
    return `user:${userId}:balance`;
  }

  private async recalculateBalanceFromHistory(
    queryRunner: QueryRunner,
    userId: number,
  ): Promise<number> {
    const result = await queryRunner.manager
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
