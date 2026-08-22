import request from 'supertest';
import express from 'express';
import bodyParser from 'body-parser';
import { createApiRouter } from '../src/controllers/api.controller';
import { DataSource } from 'typeorm';
import { AppDataSourceOptions } from '../src/database/data-source';

describe('API Controller', () => {
  let app: express.Express;
  let dataSource: DataSource;

  beforeAll(async () => {
    dataSource = new DataSource({ ...AppDataSourceOptions, database: 'postgres', synchronize: false, logging: false });
    await dataSource.initialize();
    app = express();
    app.use(bodyParser.json());
    app.use('/api', createApiRouter(dataSource));
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('returns status ok', async () => {
    const response = await request(app).get('/api/status');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ status: 'ok' }));
  });
});
