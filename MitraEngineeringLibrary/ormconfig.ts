import { DataSource } from 'typeorm';
import { AppDataSourceOptions } from './src/database/data-source';

export default new DataSource(AppDataSourceOptions);
