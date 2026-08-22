import { Router } from 'express';
import { DataSource } from 'typeorm';

export function createApiRouter(dataSource: DataSource): Router {
  const router = Router();

  router.get('/status', async (req, res) => {
    const isInitialized = dataSource.isInitialized;
    res.json({ status: 'ok', initialized: isInitialized });
  });

  router.get('/projects', async (req, res) => {
    const projects = await dataSource.getRepository('project_master').find({ relations: ['customer', 'product', 'technicalSpecification'] });
    res.json(projects);
  });

  router.get('/customers', async (req, res) => {
    const customers = await dataSource.getRepository('customer_master').find();
    res.json(customers);
  });

  router.get('/machines', async (req, res) => {
    const machines = await dataSource.getRepository('machine_master').find();
    res.json(machines);
  });

  router.get('/materials', async (req, res) => {
    const materials = await dataSource.getRepository('material_master').find();
    res.json(materials);
  });

  return router;
}
