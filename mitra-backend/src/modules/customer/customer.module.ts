import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerApproval } from './entities/customerapproval.entity';
import { CustomerApprovalFile } from './entities/customerapprovalfile.entity';
import { CustomerApprovalHistory } from './entities/customerapprovalhistory.entity';
import { CustomerApprovalService } from './services/customerapproval.service';
import { CustomerApprovalController } from './controllers/customerapproval.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerApproval, CustomerApprovalFile, CustomerApprovalHistory])],
  controllers: [CustomerApprovalController],
  providers: [CustomerApprovalService],
  exports: [CustomerApprovalService, TypeOrmModule],
})
export class CustomerModule {}
