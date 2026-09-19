import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Table } from './entities/table.entity';
import { TableOrderItem } from './entities/table-order-item.entity';
import { User } from '../users/users.entity';
import { Emplacement } from '../emplacements/entities/emplacement.entity';
import { TablesController } from './tables.controller';
import { TablesService } from './tables.service';

@Module({
  imports: [TypeOrmModule.forFeature([Table, TableOrderItem, User, Emplacement])],
  controllers: [TablesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}
