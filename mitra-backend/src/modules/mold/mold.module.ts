import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoldStructure } from './entities/moldstructure.entity';
import { MoldAssembly } from './entities/moldassembly.entity';
import { MoldComponent } from './entities/moldcomponent.entity';
import { ComponentMaterial } from './entities/componentmaterial.entity';
import { MoldSpecification } from './entities/moldspecification.entity';
import { MoldStructureService } from './services/moldstructure.service';
import { MoldStructureController } from './controllers/moldstructure.controller';

@Module({
  imports: [TypeOrmModule.forFeature([MoldStructure, MoldAssembly, MoldComponent, ComponentMaterial, MoldSpecification])],
  controllers: [MoldStructureController],
  providers: [MoldStructureService],
  exports: [MoldStructureService, TypeOrmModule],
})
export class MoldModule {}
