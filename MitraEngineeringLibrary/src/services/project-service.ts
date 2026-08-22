import { DataSource } from 'typeorm';
import { CustomerMaster } from '../entities/customer-master.entity';
import { MachineMaster } from '../entities/machine-master.entity';
import { MaterialMaster } from '../entities/material-master.entity';
import { NeckTypeMaster } from '../entities/neck-type-master.entity';
import { ProductMaster } from '../entities/product-master.entity';
import { BottleFamily } from '../entities/bottle-family.entity';
import { TechnicalSpecification } from '../entities/technical-specification.entity';
import { ProjectMaster } from '../entities/project-master.entity';

export class ProjectService {
  constructor(private dataSource: DataSource) {}

  async createProject(projectCode: string): Promise<ProjectMaster> {
    const projectRepository = this.dataSource.getRepository(ProjectMaster);
    let project = await projectRepository.findOne({ where: { projectCode } });

    if (!project) {
      project = projectRepository.create({ projectCode });
      await projectRepository.save(project);
    }

    return project;
  }

  async findOrCreateCustomer(name: string): Promise<CustomerMaster> {
    const repo = this.dataSource.getRepository(CustomerMaster);
    let customer = await repo.findOne({ where: { name } });
    if (!customer) {
      customer = repo.create({ name, sourceFile: null });
      await repo.save(customer);
    }
    return customer;
  }

  async findOrCreateProduct(name: string, bottleFamilyName?: string): Promise<ProductMaster> {
    const repo = this.dataSource.getRepository(ProductMaster);
    let product = await repo.findOne({ where: { name } });
    if (!product) {
      let bottleFamily = null;
      if (bottleFamilyName) {
        bottleFamily = await this.dataSource.getRepository(BottleFamily).findOne({ where: { name: bottleFamilyName } });
        if (!bottleFamily) {
          bottleFamily = this.dataSource.getRepository(BottleFamily).create({ name: bottleFamilyName, description: null, sourceFile: null });
          await this.dataSource.getRepository(BottleFamily).save(bottleFamily);
        }
      }
      product = repo.create({ name, bottleFamily, description: null, sourceFile: null });
      await repo.save(product);
    }
    return product;
  }

  async findOrCreateMachine(name: string): Promise<MachineMaster> {
    const repo = this.dataSource.getRepository(MachineMaster);
    let machine = await repo.findOne({ where: { name } });
    if (!machine) {
      machine = repo.create({ name, sourceFile: null });
      await repo.save(machine);
    }
    return machine;
  }

  async findOrCreateMaterial(name: string): Promise<MaterialMaster> {
    const repo = this.dataSource.getRepository(MaterialMaster);
    let material = await repo.findOne({ where: { name } });
    if (!material) {
      material = repo.create({ name, sourceFile: null });
      await repo.save(material);
    }
    return material;
  }

  async findOrCreateNeckType(type: string): Promise<NeckTypeMaster> {
    const repo = this.dataSource.getRepository(NeckTypeMaster);
    let neckType = await repo.findOne({ where: { type } });
    if (!neckType) {
      neckType = repo.create({ type, sourceFile: null });
      await repo.save(neckType);
    }
    return neckType;
  }
}
