import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Addition } from './entities/addition.entity';
import { AdditionItem } from './entities/addition-item.entity';
import { Table } from '../tables/entities/table.entity';
import { AdditionsController } from './additions.controller';
import { AdditionsService } from './additions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Addition, AdditionItem, Table])],
  controllers: [AdditionsController],
  providers: [AdditionsService],
  exports: [AdditionsService],
})
export class AdditionsModule {}
