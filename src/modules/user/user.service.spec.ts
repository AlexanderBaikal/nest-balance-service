import { Test, TestingModule } from '@nestjs/testing';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cache } from 'cache-manager';
import { UsersService } from '@modules/user/user.service';
import { User } from '@modules/user/user.entity';
import { PaymentHistory } from '@modules/user/payment-history.entity';
import { BalanceRepository } from '@modules/user/balance.repository';
import { BadRequestException, NotFoundException } from '@nestjs/common';

type MockType<T> = {
  [P in keyof T]?: jest.Mock;
};

describe('UsersService (unit, with BalanceRepository mocked)', () => {
  let service: UsersService;
  let userRepo: MockType<Repository<User>>;
  let cache: Partial<Cache>;
  let balanceRepo: MockType<BalanceRepository>;
  const cacheKey = 'user:1:balance';

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn().mockResolvedValue(null),
    };

    balanceRepo = {
      applyOperation: jest.fn().mockResolvedValue(0),
    };

    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PaymentHistory), useValue: {} },
        { provide: CACHE_MANAGER, useValue: cache },
        { provide: BalanceRepository, useValue: balanceRepo },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns cached balance when present', async () => {
    jest.spyOn(cache, 'get').mockResolvedValueOnce(50);
    const result = await service.getUserWithBalance(1);
    expect(result).toEqual({ id: 1, balance: 50 });
  });

  it('fetches from DB when cache miss and stores cache', async () => {
    jest.spyOn(cache, 'get').mockResolvedValueOnce(undefined);
    jest.spyOn(cache, 'set');
    jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce({ id: 1, balance: '25.00' });

    await service.getUserWithBalance(1);

    expect(cache.set).toHaveBeenCalledWith(cacheKey, 25);
  });

  it('throws NotFound when user missing', async () => {
    jest.spyOn(cache, 'get').mockResolvedValueOnce(undefined);
    jest.spyOn(userRepo, 'findOne').mockResolvedValueOnce(null);
    await expect(service.getUserWithBalance(99)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('debits through repository and caches result', async () => {
    jest.spyOn(balanceRepo, 'applyOperation').mockResolvedValueOnce(100);
    jest.spyOn(cache, 'set');

    const result = await service.debitUser(1, 50);

    expect(cache.set).toHaveBeenCalledWith(cacheKey, 100);
    expect(result).toEqual({ balance: 100 });
  });

  it('credits through repository and caches result', async () => {
    jest.spyOn(balanceRepo, 'applyOperation').mockResolvedValueOnce(60);
    jest.spyOn(cache, 'set');

    const result = await service.creditUser(1, 50);

    expect(cache.set).toHaveBeenCalledWith(cacheKey, 60);
    expect(result).toEqual({ balance: 60 });
  });

  it('bubbles insufficient funds from repository', async () => {
    jest.spyOn(balanceRepo, 'applyOperation').mockRejectedValueOnce(new BadRequestException());
    await expect(service.debitUser(1, 30)).rejects.toBeInstanceOf(BadRequestException);
  });
});
