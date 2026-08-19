import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { Employee } from './entities/employee.entity';
import { Skill } from './entities/skill.entity';
import { EmployeeSkill } from './entities/employee-skill.entity';
import { ResourceAvailability } from './entities/resource-availability.entity';
import { EmployeeService } from './services/employee.service';
import { SkillService } from './services/skill.service';
import { EmployeeSkillService } from './services/employee-skill.service';
import { ResourceAvailabilityService } from './services/resource-availability.service';
import { EmployeesController } from './controllers/employees.controller';
import { SkillsController } from './controllers/skills.controller';
import { EmployeeSkillsController } from './controllers/employee-skills.controller';
import { AvailabilityController } from './controllers/availability.controller';

/**
 * People domain (M1 Sprint 1): employee / engineer / resource master,
 * skill master, employee–skill matrix and resource availability foundation.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Skill, EmployeeSkill, ResourceAvailability]),
    AuditModule,
  ],
  controllers: [EmployeesController, SkillsController, EmployeeSkillsController, AvailabilityController],
  providers: [EmployeeService, SkillService, EmployeeSkillService, ResourceAvailabilityService],
  exports: [EmployeeService, SkillService, EmployeeSkillService, ResourceAvailabilityService],
})
export class PeopleModule {}