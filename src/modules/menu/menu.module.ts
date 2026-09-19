import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategoriesController } from './menu-categories.controller';
import { MenuCategoriesService } from './menu-categories.service';
import { MenuItemsController } from './menu-items.controller';
import { MenuItemsService } from './menu-items.service';
import { StorageModule } from '../storage/storage.module';

@Module({
  imports: [TypeOrmModule.forFeature([MenuCategory, MenuItem]), StorageModule],
  controllers: [MenuCategoriesController, MenuItemsController],
  providers: [MenuCategoriesService, MenuItemsService],
  exports: [MenuCategoriesService, MenuItemsService],
})
export class MenuModule {}
