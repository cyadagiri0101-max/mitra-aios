import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enquiry } from './entities/enquiry.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotationitem.entity';
import { Invoice } from './entities/invoice.entity';
import { Payment } from './entities/payment.entity';
import { CreditNote } from './entities/creditnote.entity';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { EnquiryService } from './services/enquiry.service';
import { CustomerService } from './services/customer.service';
import { QuotationService } from './services/quotation.service';
import { EnquiryController } from './controllers/enquiry.controller';
import { CustomerController } from './controllers/customer.controller';
import { QuotationController } from './controllers/quotation.controller';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Enquiry, Quotation, QuotationItem, Invoice, Payment, CreditNote, Customer, Contact]),
    forwardRef(() => ProjectModule),
  ],
  controllers: [EnquiryController, CustomerController, QuotationController],
  providers: [EnquiryService, CustomerService, QuotationService],
  exports: [EnquiryService, CustomerService, QuotationService, TypeOrmModule],
})
export class CommercialModule {}
