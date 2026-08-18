import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';
const ext = isProd ? 'js' : 'ts';
const baseDir = isProd ? 'dist' : 'src';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: [`${baseDir}/modules/**/*.entity.${ext}`],
  migrations: [`${baseDir}/database/migrations/*.${ext}`],
  migrationsRun: false,
  migrationsTableName: 'migrations',
  synchronize: false,
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;