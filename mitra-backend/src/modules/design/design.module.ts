import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DesignPart } from './entities/designpart.entity';
import { DesignRevision } from './entities/designrevision.entity';
import { DesignFile } from './entities/designfile.entity';
import { DesignBom } from './entities/designbom.entity';
import { DesignApproval } from './entities/designapproval.entity';
import { DesignStandard } from './entities/designstandard.entity';
import { DesignPartService } from './services/designpart.service';
import { DesignPartController } from './controllers/designpart.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DesignPart, DesignRevision, DesignFile, DesignBom, DesignApproval, DesignStandard])],
  controllers: [DesignPartController],
  providers: [DesignPartService],
  exports: [DesignPartService, TypeOrmModule],
})
export class DesignModule {}
