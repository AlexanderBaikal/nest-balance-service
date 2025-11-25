import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from '@modules/user/user.controller';
import { UsersService } from '@modules/user/user.service';

describe('UsersController', () => {
  let controller: UsersController;
  const mockService = {
    getUserWithBalance: jest.fn(),
    debitUser: jest.fn(),
    creditUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('returns user balance', async () => {
    mockService.getUserWithBalance.mockResolvedValue({ id: 1, balance: 200 });
    const res = await controller.getUser(1);
    expect(res).toEqual({ id: 1, balance: 200 });
    expect(mockService.getUserWithBalance).toHaveBeenCalledWith(1);
  });

  it('debits user', async () => {
    mockService.debitUser.mockResolvedValue({ balance: 150 });
    const res = await controller.debit(1, { amount: 50 });
    expect(res.balance).toBe(150);
    expect(mockService.debitUser).toHaveBeenCalledWith(1, 50);
  });

  it('credits user', async () => {
    mockService.creditUser.mockResolvedValue({ balance: 250 });
    const res = await controller.credit(1, { amount: 50 });
    expect(res.balance).toBe(250);
    expect(mockService.creditUser).toHaveBeenCalledWith(1, 50);
  });
});
