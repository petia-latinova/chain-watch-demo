import 'reflect-metadata';
import { DataSource } from 'typeorm';

const isProd = process.env.NODE_ENV === 'production';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  synchronize: false,
  logging: !isProd,
  entities: [__dirname + '/entities/**/*.{ts,js}'],
  migrations: [isProd ? 'dist/migrations/*.js' : 'src/migrations/*.ts'],
});

module.exports = { AppDataSource };
