import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ServiceInstallation, ServiceInstallationStatus } from '../entities/serviceinstallation.entity';
import { ServiceWarranty, ServiceWarrantyStatus } from '../entities/servicewarranty.entity';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { OutboxService } from '../../platform/services/outbox.service';
import { EngineeringDomainEventType } from '../../engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

@Injectable()
export class InstallationService extends TenantAwareService<ServiceInstallation> {
  constructor(
    @InjectRepository(ServiceInstallation)
    repo: Repository<ServiceInstallation>,
    @InjectRepository(ServiceWarranty)
    private readonly warrantyRepo: Repository<ServiceWarranty>,
    private readonly outbox: OutboxService,
    private readonly dataSource: DataSource,
  ) {
    super(repo, 'ServiceInstallation');
  }

  async create(data: Record<string, unknown>, userId?: string, tenantId?: string | null) {
    const installationNumber = (data.installationNumber as string) ?? this.generateInstallationNumber();
    return super.create({ ...data, installationNumber }, userId, tenantId);
  }

  async completeInstallation(
    id: string,
    user: AuthUser,
    dto: {
      completionDate?: string;
      signoffBy: string;
      installationReport?: string;
      checklist?: Record<string, unknown>[];
      autoActivateWarranty?: boolean;
      coverageMonths?: number;
    },
  ) {
    const tenantId = user.tenantId ?? undefined;
    return this.dataSource.transaction(async (em) => {
      const inst = await em.getRepository(ServiceInstallation).findOne({
        where: { id, ...(tenantId ? { tenantId } : {}) },
      });
      if (!inst) throw new NotFoundException('Service installation record not found');

      if (inst.status === ServiceInstallationStatus.COMPLETED) {
        throw new BadRequestException('Installation is already completed');
      }

      if (!dto.signoffBy) {
        throw new BadRequestException('Customer sign-off is mandatory to complete an installation');
      }
      const commissioningReport = dto.installationReport ?? inst.installationReport;
      if (!commissioningReport) {
        throw new BadRequestException('Commissioning information (installation report) is mandatory to complete an installation');
      }
      const setupResults = dto.checklist && dto.checklist.length > 0 ? dto.checklist : inst.checklist;
      if (!setupResults || setupResults.length === 0) {
        throw new BadRequestException('Setup/test results (checklist) are mandatory to complete an installation');
      }

      inst.status = ServiceInstallationStatus.COMPLETED;
      inst.customerSignoff = true;
      inst.signoffBy = dto.signoffBy;
      inst.completionDate = dto.completionDate ? new Date(dto.completionDate) : new Date();
      if (dto.installationReport) inst.installationReport = dto.installationReport;
      if (dto.checklist) inst.checklist = dto.checklist;
      inst.updatedBy = user.id;

      const saved = await em.getRepository(ServiceInstallation).save(inst);

      let activatedWarranty: ServiceWarranty | null = null;
      if (dto.autoActivateWarranty !== false) {
        const existingWarranty = await em.getRepository(ServiceWarranty).findOne({
          where: {
            ...(inst.projectId ? { projectId: inst.projectId } : {}),
            ...(tenantId ? { tenantId } : {}),
            status: ServiceWarrantyStatus.ACTIVE,
          },
        });

        if (!existingWarranty) {
          const coverageMonths = dto.coverageMonths ?? 12;
          const startDate = new Date();
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + coverageMonths);

          const warranty = em.getRepository(ServiceWarranty).create({
            warrantyNumber: `WAR-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`,
            projectId: inst.projectId,
            customerId: inst.customerId,
            dispatchId: inst.dispatchId,
            warrantyStartDate: startDate,
            warrantyEndDate: endDate,
            coverageMonths,
            coverageTerms: 'Standard 12-month / 500,000-cycle comprehensive tooling warranty',
            maxCycles: 500000,
            currentCycles: 0,
            status: ServiceWarrantyStatus.ACTIVE,
            claimLimit: 50000,
            tenantId: tenantId ?? 'default',
            createdBy: user.id,
          });
          activatedWarranty = await em.getRepository(ServiceWarranty).save(warranty);

          await this.outbox.append(
            EngineeringDomainEventType.SERVICE_WARRANTY_ACTIVATED,
            'service_warranty',
            activatedWarranty.id,
            {
              warrantyId: activatedWarranty.id,
              warrantyNumber: activatedWarranty.warrantyNumber,
              projectId: activatedWarranty.projectId,
              installationId: saved.id,
            },
            { tenantId: tenantId ?? undefined, actorId: user.id },
          );
        }
      }

      await this.outbox.append(
        EngineeringDomainEventType.SERVICE_INSTALLATION_COMPLETED,
        'service_installation',
        saved.id,
        {
          installationId: saved.id,
          installationNumber: saved.installationNumber,
          projectId: saved.projectId,
          signoffBy: saved.signoffBy,
          warrantyId: activatedWarranty?.id,
        },
        { tenantId: tenantId ?? undefined, actorId: user.id },
      );

      return {
        installation: saved,
        warranty: activatedWarranty,
      };
    });
  }

  private generateInstallationNumber(): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.floor(Math.random() * 900 + 100);
    return `INST-${ts}-${rand}`;
  }
}
