import { Global, Module } from '@nestjs/common';
import { ClsModule } from 'nestjs-cls';
import { TenantContextService } from './tenant-context.service';

/**
 * Mounted as global middleware (not an interceptor): Nest's request lifecycle
 * is middleware -> guards -> interceptors, and TenantContextGuard needs a live
 * CLS store to write into by the time it runs. Middleware-mount guarantees the
 * ALS context exists before any guard runs, regardless of whether guards are
 * global or per-controller.
 */
@Global()
@Module({
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: { mount: true, generateId: true },
    }),
  ],
  providers: [TenantContextService],
  exports: [TenantContextService],
})
export class TenantContextModule {}
