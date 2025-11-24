import { ConfigService } from '@nestjs/config';
import { DataSourceOptions } from 'typeorm';
import { User } from '../modules/user/user.entity';
import { PaymentHistory } from '../modules/user/payment-history.entity';
import { InitSchema1700840000000 } from '../database/migrations/1700840000000-InitSchema';

export const typeOrmConfig = (configService: ConfigService): DataSourceOptions => {
  const db = configService.get('database');

  return {
    type: 'postgres',
    host: db.host,
    port: db.port,
    username: db.username,
    password: db.password,
    database: db.name,
    entities: [User, PaymentHistory],
    migrations: [InitSchema1700840000000],
    synchronize: false,
    migrationsRun: false,
    logging: true,
  };
};

export const ormConfigFromEnv = (): DataSourceOptions => {
  const {
    DB_HOST = 'localhost',
    DB_PORT = '5432',
    DB_USER = 'postgres',
    DB_PASSWORD = 'postgres',
    DB_NAME = 'balances',
  } = process.env;

  return {
    type: 'postgres',
    host: DB_HOST,
    port: parseInt(DB_PORT, 10),
    username: DB_USER,
    password: DB_PASSWORD,
    database: DB_NAME,
    entities: [User, PaymentHistory],
    migrations: [InitSchema1700840000000],
    synchronize: false,
    logging: true,
  };
};
