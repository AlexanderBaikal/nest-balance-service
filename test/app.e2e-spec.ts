import request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe, NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersController } from '@modules/user/user.controller';
import { UsersService } from '@modules/user/user.service';

describe('UsersController (API, mocked service)', () => {
  let app: INestApplication;
  const mockService: Partial<jest.Mocked<UsersService>> = {
    getUserWithBalance: jest.fn().mockResolvedValue({ id: 1, balance: 100 }),
    debitUser: jest.fn().mockResolvedValue({ balance: 50 }),
    creditUser: jest.fn().mockResolvedValue({ balance: 150 }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockService }],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /users/1 returns user with balance', async () => {
    const res = await request(app.getHttpServer()).get('/users/1').expect(200);

    expect(res.body).toEqual({ id: 1, balance: 100 });
    expect(mockService.getUserWithBalance).toHaveBeenCalledWith(1);
  });

  it('POST /users/1/debit debits user and returns balance', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/1/debit')
      .send({ amount: 50 })
      .expect(201);

    expect(mockService.debitUser).toHaveBeenCalledWith(1, 50);
    expect(res.body).toEqual({ balance: 50 });
  });

  it('POST /users/1/credit credits user and returns balance', async () => {
    const res = await request(app.getHttpServer())
      .post('/users/1/credit')
      .send({ amount: 50 })
      .expect(201);

    expect(mockService.creditUser).toHaveBeenCalledWith(1, 50);
    expect(res.body).toEqual({ balance: 150 });
  });

  it('POST /users/1/debit rejects invalid amount', async () => {
    await request(app.getHttpServer())
      .post('/users/1/debit')
      .send({ amount: 0 })
      .expect(400);
    expect(mockService.debitUser).not.toHaveBeenCalled();
  });

  it('POST /users/999/debit returns 404 when service throws NotFound', async () => {
    (mockService.debitUser as jest.Mock).mockRejectedValueOnce(new NotFoundException());

    await request(app.getHttpServer())
      .post('/users/999/debit')
      .send({ amount: 10 })
      .expect(404);
  });

  it('POST /users/1/debit returns 400 when service throws BadRequest', async () => {
    (mockService.debitUser as jest.Mock).mockRejectedValueOnce(new BadRequestException());

    await request(app.getHttpServer())
      .post('/users/1/debit')
      .send({ amount: 10 })
      .expect(400);
  });
});
