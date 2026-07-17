import {
  Injectable, NestInterceptor, ExecutionContext, CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { MetricsService } from './metrics.service';

/**
 * Global interceptor that records Prometheus RED metrics for every request.
 *
 * Route normalization:
 * - Replaces UUIDs with :id placeholder so metrics are not exploded by cardinality
 * - Replaces numeric IDs the same way
 *
 * Registered as APP_INTERCEPTOR in MetricsModule so it captures every route.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req    = ctx.switchToHttp().getRequest();
    const start  = Date.now();
    const method = req.method as string;
    const route  = this.normalizeRoute(req.route?.path ?? req.url);

    return next.handle().pipe(
      tap(() => {
        const status = ctx.switchToHttp().getResponse().statusCode as number;
        this.metrics.recordRequest(method, route, status, Date.now() - start);
      }),
      catchError((err) => {
        const status = err?.status ?? err?.statusCode ?? 500;
        this.metrics.recordRequest(method, route, status, Date.now() - start);
        return throwError(() => err);
      }),
    );
  }

  private normalizeRoute(path: string): string {
    return path
      // Replace UUID params
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      // Replace numeric IDs
      .replace(/\/\d+/g, '/:id');
  }
}
