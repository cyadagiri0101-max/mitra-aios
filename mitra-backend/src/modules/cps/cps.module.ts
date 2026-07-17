import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CPSReview } from './entities/cpsreview.entity';
import { CPSReviewItem } from './entities/cpsreviewitem.entity';
import { CPSChecklist } from './entities/cpschecklist.entity';
import { CPSApproval } from './entities/cpsapproval.entity';
import { CPSRequirement } from './entities/cpsrequirement.entity';
import { CpsReviewService } from './services/cpsreview.service';
import { CPSReviewController } from './controllers/cpsreview.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CPSReview, CPSReviewItem, CPSChecklist, CPSApproval, CPSRequirement])],
  controllers: [CPSReviewController],
  providers: [CpsReviewService],
  exports: [CpsReviewService, TypeOrmModule],
})
export class CPSModule {}
