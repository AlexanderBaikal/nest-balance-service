import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { PaymentAction } from '@modules/user/payment-history.entity';
import { User } from '@modules/user/user.entity';
import { BalanceRepository } from '@modules/user/balance.repository';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    private readonly balanceRepository: BalanceRepository,
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
    const balance = await this.balanceRepository.applyOperation(
      userId,
      amount,
      PaymentAction.Debit,
    );
    await this.cacheManager.set(this.cacheKey(userId), balance);
    return { balance };
  }

  async creditUser(userId: number, amount: number): Promise<{ balance: number }> {
    this.ensurePositive(amount);
    const balance = await this.balanceRepository.applyOperation(
      userId,
      amount,
      PaymentAction.Credit,
    );
    await this.cacheManager.set(this.cacheKey(userId), balance);
    return { balance };
  }

  private ensurePositive(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }
  }

  private cacheKey(userId: number) {
    return `user:${userId}:balance`;
  }
}
