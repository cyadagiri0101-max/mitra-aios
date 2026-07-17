import {
  EventSubscriber, EntitySubscriberInterface,
  InsertEvent, UpdateEvent, SoftRemoveEvent,
} from 'typeorm';
import { IndustrialBaseEntity } from '../entities/industrial-base.entity';
import { getRequestContext } from '../context/request-context';

/**
 * TypeORM subscriber that automatically stamps createdBy / updatedBy on every
 * IndustrialBaseEntity insert, update, and soft-delete.
 *
 * Uses AsyncLocalStorage (via getRequestContext()) to read the current request's
 * userId without needing DI or HTTP request injection.
 * Returns null values when called outside an HTTP request (seed scripts, etc.).
 */
@EventSubscriber()
export class IndustrialSubscriber
  implements EntitySubscriberInterface<IndustrialBaseEntity>
{
  listenTo() { return IndustrialBaseEntity; }

  beforeInsert(event: InsertEvent<IndustrialBaseEntity>) {
    const { userId, tenantId } = getRequestContext();
    if (userId && event.entity) {
      event.entity.createdBy = userId;
      event.entity.updatedBy = userId;
    }
    // Auto-scope every new row to the requesting user's tenant unless the
    // entity already explicitly set one (e.g. platform-level seed scripts).
    // Without this, tenant_id stays NULL and the isolation checks in
    // service findOne()/update()/remove() methods (which only compare when
    // project.tenantId !== null) are silently bypassed — any authenticated
    // user from any tenant could then read/modify/delete the row.
    if (tenantId && event.entity && event.entity.tenantId == null) {
      event.entity.tenantId = tenantId;
    }
  }

  beforeUpdate(event: UpdateEvent<IndustrialBaseEntity>) {
    const { userId } = getRequestContext();
    if (userId && event.entity) {
      (event.entity as IndustrialBaseEntity).updatedBy = userId;
    }
  }

  beforeSoftRemove(event: SoftRemoveEvent<IndustrialBaseEntity>) {
    const { userId } = getRequestContext();
    if (userId && event.entity) {
      event.entity.updatedBy = userId;
    }
  }
}
