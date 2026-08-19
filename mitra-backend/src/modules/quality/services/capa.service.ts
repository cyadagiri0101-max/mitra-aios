import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';
import { TenantAwareService } from '@common/services/tenant-aware.service';
import { CapaVerification, CapaStatus } from '../entities/capaverification.entity';
import { NcrRecord, NcrStatus } from '../entities/ncr-record.entity';
import { OutboxService } from '@modules/platform/services/outbox.service';
import { EngineeringDomainEventType } from '@modules/engineering/events/engineering.events';
import { AuthUser } from '@common/decorators/current-user.decorator';

@Injectable()
export class CapaService extends TenantAwareService<CapaVerification> {
  constructor(
    @InjectRepository(CapaVerification)
    repo: Repository<CapaVerification>,
    private readonly dataSource: DataSource,
    private readonly outboxService: OutboxService,
  ) {
    super(repo, 'CAPA');
  }

  async transition(
    id: string,
    toStatus: CapaStatus,
    user: AuthUser,
    dto: {
      verificationEvidence?: string;
      correctiveAction?: string;
      preventiveAction?: string;
      rootCause?: string;
      implementationDate?: string;
      verificationDate?: string;
    } = {},
  ) {
    const scopeTenant = this.requireTenant(user.tenantId);
    return this.dataSource.transaction(async (em) => {
      const capa = await em.getRepository(CapaVerification).findOne({
        where: { id, tenantId: scopeTenant, deletedAt: IsNull() },
      });
      if (!capa) throw new NotFoundException('CAPA not found');

      const allowed: Record<CapaStatus, CapaStatus[]> = {
        [CapaStatus.OPEN]: [CapaStatus.IN_PROGRESS, CapaStatus.REJECTED],
        [CapaStatus.IN_PROGRESS]: [CapaStatus.IMPLEMENTED, CapaStatus.REJECTED],
        [CapaStatus.IMPLEMENTED]: [CapaStatus.VERIFIED, CapaStatus.REJECTED],
        [CapaStatus.VERIFIED]: [CapaStatus.CLOSED],
        [CapaStatus.CLOSED]: [],
        [CapaStatus.REJECTED]: [],
      };
      if (!allowed[capa.status]?.includes(toStatus)) {
        throw new BadRequestException(`Illegal CAPA transition ${capa.status} → ${toStatus}`);
      }

      const patch: Record<string, unknown> = { status: toStatus, updatedBy: user.id };
      if (dto.correctiveAction) patch.correctiveAction = dto.correctiveAction;
      if (dto.preventiveAction) patch.preventiveAction = dto.preventiveAction;
      if (dto.rootCause) patch.rootCause = dto.rootCause;
      if (toStatus === CapaStatus.IMPLEMENTED) {
        patch.implementationDate = dto.implementationDate ? new Date(dto.implementationDate) : new Date();
      }
      if (toStatus === CapaStatus.VERIFIED || toStatus === CapaStatus.CLOSED) {
        patch.verifiedBy = user.id;
        patch.verificationDate = dto.verificationDate ? new Date(dto.verificationDate) : new Date();
        if (dto.verificationEvidence) patch.verificationEvidence = dto.verificationEvidence;

        // Feedback loop: When CAPA is verified/closed, advance/close the linked NCR!
        if (capa.ncrId) {
          const ncr = await em.getRepository(NcrRecord).findOne({
            where: { id: capa.ncrId, tenantId: scopeTenant, deletedAt: IsNull() },
          });
          if (ncr && ncr.status !== NcrStatus.CLOSED) {
            await em.getRepository(NcrRecord).update(
              { id: ncr.id, tenantId: scopeTenant },
              {
                status: toStatus === CapaStatus.CLOSED ? NcrStatus.CLOSED : NcrStatus.VERIFIED,
                closedAt: toStatus === CapaStatus.CLOSED ? new Date() : undefined,
                updatedBy: user.id,
              } as any,
            );
            if (toStatus === CapaStatus.CLOSED) {
              await this.outboxService.append(
                EngineeringDomainEventType.NCR_CLOSED,
                'ncr_record',
                ncr.id,
                {
                  entityId: ncr.id,
                  ncrNumber: ncr.ncrNumber,
                  capaId: capa.id,
                  capaNumber: capa.capaNumber,
                  workOrderId: ncr.workOrderId,
                },
                { tenantId: scopeTenant, actorId: user.id, em },
              );
            }
          }
        }
      }

      await em.getRepository(CapaVerification).update({ id: capa.id, tenantId: scopeTenant }, patch as any);

      return em.getRepository(CapaVerification).findOne({ where: { id: capa.id, tenantId: scopeTenant } });
    });
  }
}
