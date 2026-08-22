import 'reflect-metadata';
import express from 'express';
import bodyParser from 'body-parser';
import { DataSource } from 'typeorm';
import { AppDataSourceOptions } from './database/data-source';
import { createApiRouter } from './controllers/api.controller';

const app = express();
app.use(bodyParser.json());

const dataSource = new DataSource(AppDataSourceOptions);

dataSource.initialize().then(() => {
  app.use('/api', createApiRouter(dataSource));

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
  app.listen(port, () => {
    console.log(`Engineering Knowledge Library API listening on http://localhost:${port}`);
  });
}).catch((error) => {
  console.error('Failed to initialize database', error);
  process.exit(1);
});
