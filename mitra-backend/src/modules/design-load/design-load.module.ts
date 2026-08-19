import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';

import { DesignLoadStandard } from './entities/design-load-standard.entity';
import { DesignLoadStandardStage } from './entities/design-load-standard-stage.entity';
import { ProjectDesignLoad } from './entities/project-design-load.entity';
import { ProjectDesignLoadStage } from './entities/project-design-load-stage.entity';
import { DesignSystem } from './entities/design-system.entity';
import { DesignShift } from './entities/design-shift.entity';

import { Employee } from '../people/entities/employee.entity';
import { EmployeeSkill } from '../people/entities/employee-skill.entity';
import { Skill } from '../people/entities/skill.entity';
import { ResourceAvailability } from '../people/entities/resource-availability.entity';
import { Project } from '../project/entities/project.entity';

import { DesignLoadStandardService } from './services/design-load-standard.service';
import { ProjectDesignLoadService } from './services/project-design-load.service';
import { DesignSystemService } from './services/design-system.service';
import { CapacityIntelligenceService } from './services/capacity-intelligence.service';
import { CapacityLevelingService } from './services/capacity-leveling.service';

import { DesignLoadStandardController } from './controllers/design-load-standard.controller';
import { ProjectDesignLoadController } from './controllers/project-design-load.controller';
import { DesignSystemController } from './controllers/design-system.controller';
import { CapacityIntelligenceController } from './controllers/capacity-intelligence.controller';
import { CapacityLevelingController } from './controllers/capacity-leveling.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      DesignLoadStandard,
      DesignLoadStandardStage,
      ProjectDesignLoad,
      ProjectDesignLoadStage,
      DesignSystem,
      DesignShift,
      Employee,
      EmployeeSkill,
      Skill,
      ResourceAvailability,
      Project,
    ]),
    AuditModule,
    PlatformModule,
  ],
  controllers: [
    DesignLoadStandardController,
    ProjectDesignLoadController,
    DesignSystemController,
    CapacityIntelligenceController,
    CapacityLevelingController,
  ],
  providers: [
    DesignLoadStandardService,
    ProjectDesignLoadService,
    DesignSystemService,
    CapacityIntelligenceService,
    CapacityLevelingService,
  ],
  exports: [
    DesignLoadStandardService,
    ProjectDesignLoadService,
    DesignSystemService,
    CapacityIntelligenceService,
    CapacityLevelingService,
  ],
})
export class DesignLoadModule {}
