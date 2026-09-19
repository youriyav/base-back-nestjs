import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Emplacement } from './entities/emplacement.entity';
import { Table } from '../tables/entities/table.entity';
import { CreateEmplacementDto } from './dto/create-emplacement.dto';
import { UpdateEmplacementDto } from './dto/update-emplacement.dto';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

@Injectable()
export class EmplacementsService extends TenantScopedBaseService<Emplacement> {
  constructor(
    @InjectRepository(Emplacement)
    private readonly emplacementRepository: Repository<Emplacement>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    tenantContext: TenantContextService,
  ) {
    super(emplacementRepository, tenantContext);
  }

  async findAll(): Promise<Emplacement[]> {
    return this.findAllScoped(undefined, { order: { order: 'ASC' } });
  }

  async findOne(id: string): Promise<Emplacement> {
    return this.findOneScopedOrFail(id);
  }

  async create(createEmplacementDto: CreateEmplacementDto): Promise<Emplacement> {
    const existing = await this.emplacementRepository.findOne({
      where: {
        name: createEmplacementDto.name,
        restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
      },
    });

    if (existing) {
      throw new ConflictException(
        `Emplacement with name ${createEmplacementDto.name} already exists`,
      );
    }

    return this.saveScoped(createEmplacementDto);
  }

  async update(id: string, updateEmplacementDto: UpdateEmplacementDto): Promise<Emplacement> {
    const emplacement = await this.findOneScopedOrFail(id);

    if (updateEmplacementDto.name && updateEmplacementDto.name !== emplacement.name) {
      const clash = await this.emplacementRepository.findOne({
        where: {
          name: updateEmplacementDto.name,
          restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
        },
      });

      if (clash) {
        throw new ConflictException(
          `Emplacement with name ${updateEmplacementDto.name} already exists`,
        );
      }
    }

    return this.updateScoped(id, updateEmplacementDto);
  }

  async remove(id: string): Promise<void> {
    const emplacement = await this.findOneScopedOrFail(id);
    const tableCount = await this.tableRepository.count({
      where: { emplacementId: id, restaurantId: emplacement.restaurantId },
    });

    if (tableCount > 0) {
      throw new ConflictException(
        'Cannot delete an emplacement that still has tables. Move or delete its tables first.',
      );
    }

    // Soft delete (not repository.remove()): a hard delete here can hit the
    // physical FK_tables_emplacement constraint raw (as an unhandled
    // QueryFailedError) whenever a table pointing at this emplacement was
    // itself only soft-deleted — its row, and the FK, are still there. A
    // soft delete never touches that row, so the constraint can't fire.
    await this.softDeleteScoped(id);
  }
}
