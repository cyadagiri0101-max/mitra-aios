import { DataSourceOptions } from 'typeorm';
import { CustomerMaster } from '../entities/customer-master.entity';
import { MachineMaster } from '../entities/machine-master.entity';
import { MaterialMaster } from '../entities/material-master.entity';
import { NeckTypeMaster } from '../entities/neck-type-master.entity';
import { BottleFamily } from '../entities/bottle-family.entity';
import { ProjectMaster } from '../entities/project-master.entity';
import { ProductMaster } from '../entities/product-master.entity';
import { TechnicalSpecification } from '../entities/technical-specification.entity';
import { FolderTemplateMaster } from '../entities/folder-template-master.entity';
import { PartList } from '../entities/part-list.entity';
import { ProcessPlanning } from '../entities/process-planning.entity';
import { CycleTimeHistory } from '../entities/cycle-time-history.entity';
import { EngineeringDocument } from '../entities/engineering-document.entity';
import { AITag } from '../entities/ai-tag.entity';

export const AppDataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'mitra_engineering_library',
  synchronize: true,
  logging: false,
  entities: [
    CustomerMaster,
    MachineMaster,
    MaterialMaster,
    NeckTypeMaster,
    BottleFamily,
    ProjectMaster,
    ProductMaster,
    TechnicalSpecification,
    FolderTemplateMaster,
    PartList,
    ProcessPlanning,
    CycleTimeHistory,
    EngineeringDocument,
    AITag,
  ],
};
