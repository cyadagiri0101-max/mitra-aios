import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enquiry } from './entities/enquiry.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotationitem.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { CreditNote } from './entities/creditnote.entity';
import { EnquiryService } from './services/enquiry.service';
import { EnquiryController } from './controllers/enquiry.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Enquiry, Quotation, QuotationItem, Invoice, Payment, CreditNote])],
  controllers: [EnquiryController],
  providers: [EnquiryService],
  exports: [EnquiryService, TypeOrmModule],
})
export class CommercialModule {}
