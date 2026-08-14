import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Enquiry } from './entities/enquiry.entity';
import { Quotation } from './entities/quotation.entity';
import { QuotationItem } from './entities/quotationitem.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { Payment } from './entities/payment.entity';
import { CreditNote } from './entities/creditnote.entity';
import { SalesOrder } from './entities/sales-order.entity';
import { SalesOrderLine } from './entities/sales-order-line.entity';
import { Customer } from './entities/customer.entity';
import { Contact } from './entities/contact.entity';
import { CustomerType } from './entities/customer-type.entity';
import { CustomerCategory } from './entities/customer-category.entity';
import { CustomerAddress } from './entities/customer-address.entity';
import { CustomerNote } from './entities/customer-note.entity';
import { CustomerAttachment } from './entities/customer-attachment.entity';
import { CustomerActivity } from './entities/customer-activity.entity';
import { Lead } from './entities/lead.entity';
import { Rfq } from './entities/rfq.entity';
import { RfqProduct } from './entities/rfq-product.entity';
import { RfqRevision } from './entities/rfq-revision.entity';
import { AiDocumentMetadata } from './entities/ai-document-metadata.entity';
import { EnquiryService } from './services/enquiry.service';
import { CustomerService } from './services/customer.service';
import { QuotationService } from './services/quotation.service';
import { ContactService } from './services/contact.service';
import { LeadService } from './services/lead.service';
import { RfqService } from './services/rfq.service';
import { CommercialAiService } from './services/commercial-ai.service';
import { CustomerContactService } from './services/customer-contact.service';
import { CustomerAddressService } from './services/customer-address.service';
import { CustomerNoteService } from './services/customer-note.service';
import { CustomerActivityService } from './services/customer-activity.service';
import { CustomerImportService } from './services/customer-import.service';
import { QuotationPricingService } from './services/quotation-pricing.service';
import { QuotationItemService } from './services/quotation-item.service';
import { QuotationMarginService } from './services/quotation-margin.service';
import { QuotationApprovalService } from './services/quotation-approval.service';
import { QuotationRevisionService } from './services/quotation-revision.service';
import { QuotationAcceptanceService } from './services/quotation-acceptance.service';
import { CommercialEventBus } from './services/commercial-event-bus.service';
import { CommercialEventPublisherService } from './services/commercial-event-publisher.service';
import { CommercialOutboxRelayService } from './services/commercial-outbox-relay.service';
import { CommercialOutboxRelayScheduler } from './services/commercial-outbox-relay-scheduler.service';
import { SalesOrderService } from './services/sales-order.service';
import { InvoiceService } from './services/invoice.service';
import { PaymentService } from './services/payment.service';
import { CreditNoteService } from './services/credit-note.service';
import { EnquiryController } from './controllers/enquiry.controller';
import { CustomerController } from './controllers/customer.controller';
import { QuotationController } from './controllers/quotation.controller';
import { ContactController } from './controllers/contact.controller';
import { LeadController } from './controllers/lead.controller';
import { RfqController } from './controllers/rfq.controller';
import { SalesOrderController } from './controllers/sales-order.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { PaymentController } from './controllers/payment.controller';
import { CreditNoteController } from './controllers/credit-note.controller';
import { CommercialAiController } from './controllers/commercial-ai.controller';
import { ProjectModule } from '../project/project.module';
import { WorkflowModule } from '../workflow/workflow.module';
import { AuditModule } from '../audit/audit.module';
import { PlatformModule } from '../platform/platform.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Enquiry, Quotation, QuotationItem, Invoice, InvoiceLine, Payment, CreditNote,
      SalesOrder, SalesOrderLine,
      Customer, Contact, CustomerType, CustomerCategory, CustomerAddress,
      CustomerNote, CustomerAttachment, CustomerActivity,
      Lead, Rfq, RfqProduct, RfqRevision, AiDocumentMetadata,
    ]),
    ProjectModule,
    WorkflowModule,
    AuditModule,
    PlatformModule,
  ],
  controllers: [
    EnquiryController, CustomerController, QuotationController,
    ContactController, LeadController, RfqController, CommercialAiController,
    SalesOrderController, InvoiceController, PaymentController, CreditNoteController,
  ],
  providers: [
    EnquiryService, CustomerService, QuotationService,
    ContactService, LeadService, RfqService, CommercialAiService,
    CustomerContactService, CustomerAddressService, CustomerNoteService,
    CustomerActivityService, CustomerImportService,
    QuotationPricingService, QuotationItemService, QuotationMarginService,
    QuotationApprovalService, QuotationRevisionService, QuotationAcceptanceService,
    SalesOrderService, InvoiceService, PaymentService, CreditNoteService,
    CommercialEventBus, CommercialEventPublisherService,
    CommercialOutboxRelayService, CommercialOutboxRelayScheduler,
  ],
  exports: [
    EnquiryService, CustomerService, QuotationService,
    ContactService, LeadService, RfqService, CommercialAiService,
    CustomerContactService, CustomerAddressService, CustomerNoteService,
    CustomerActivityService, CustomerImportService,
    QuotationPricingService, QuotationItemService, QuotationMarginService,
    QuotationApprovalService, QuotationRevisionService, QuotationAcceptanceService,
    SalesOrderService, InvoiceService, PaymentService, CreditNoteService,
    CommercialEventBus, CommercialEventPublisherService, CommercialOutboxRelayService,
    TypeOrmModule,
  ],
})
export class CommercialModule {}
