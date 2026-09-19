import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emplacement } from './entities/emplacement.entity';
import { Table } from '../tables/entities/table.entity';
import { EmplacementsController } from './emplacements.controller';
import { EmplacementsService } from './emplacements.service';

@Module({
  imports: [TypeOrmModule.forFeature([Emplacement, Table])],
  controllers: [EmplacementsController],
  providers: [EmplacementsService],
  exports: [EmplacementsService],
})
export class EmplacementsModule {}
