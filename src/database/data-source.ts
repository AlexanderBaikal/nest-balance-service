import 'dotenv/config';
import { DataSource } from 'typeorm';
import { ormConfigFromEnv } from '@config/orm.config';

export default new DataSource(ormConfigFromEnv());
