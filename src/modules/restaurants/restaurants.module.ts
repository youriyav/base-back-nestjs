import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Restaurant } from './entities/restaurant.entity';
import { RestaurantsController } from './restaurants.controller';
import { RestaurantsService } from './restaurants.service';
import { PublicMenuController } from './public-menu.controller';
import { SlugTenantResolverGuard } from './guards/slug-tenant-resolver.guard';
import { MenuModule } from '@modules/menu/menu.module';
import { AuthModule } from '@modules/auth/auth.module';
import { StorageModule } from '@modules/storage/storage.module';

@Module({
  // Depends on MenuModule (restaurants -> menu), never the reverse — keeps
  // slug-resolution logic in one place without menu needing to know about
  // Restaurant. Depends on AuthModule too, for AuthService.impersonate().
  // StorageModule for MinioService (restaurant logo upload) — MenuModule uses
  // MinioService internally but doesn't export it, so it's imported directly.
  imports: [TypeOrmModule.forFeature([Restaurant]), MenuModule, AuthModule, StorageModule],
  controllers: [RestaurantsController, PublicMenuController],
  providers: [RestaurantsService, SlugTenantResolverGuard],
  exports: [RestaurantsService],
})
export class RestaurantsModule {}
