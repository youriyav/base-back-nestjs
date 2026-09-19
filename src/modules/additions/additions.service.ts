import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Addition } from './entities/addition.entity';
import { Table } from '../tables/entities/table.entity';
import { CreateAdditionDto } from './dto/create-addition.dto';
import { QueryAdditionsDto } from './dto/query-additions.dto';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

@Injectable()
export class AdditionsService extends TenantScopedBaseService<Addition> {
  constructor(
    @InjectRepository(Addition)
    private readonly additionRepository: Repository<Addition>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    tenantContext: TenantContextService,
  ) {
    super(additionRepository, tenantContext);
  }

  /**
   * Idempotent by clientId: the mobile offline queue may retry the same
   * addition after a send whose response never made it back (timeout,
   * dropped connection right after the server persisted it) — returning the
   * existing row instead of erroring or duplicating makes that safe.
   */
  async create(dto: CreateAdditionDto, cashierId: string): Promise<Addition> {
    const existing = await this.additionRepository.findOne({
      where: { restaurantId: this.tenantContext.getRestaurantIdOrThrow(), clientId: dto.clientId },
      relations: ['items'],
    });
    if (existing) {
      return existing;
    }

    if (dto.tableId) {
      await this.assertTableBelongsToRestaurant(dto.tableId);
    }

    return this.saveScoped({
      clientId: dto.clientId,
      tableId: dto.tableId ?? null,
      tableLabel: dto.tableLabel,
      serverName: dto.serverName ?? null,
      cashierId,
      total: dto.total,
      printedAt: new Date(dto.printedAt),
      items: dto.items.map((item) => ({
        menuItemId: item.menuItemId ?? null,
        name: item.name,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      })),
    });
  }

  async findAll(query: QueryAdditionsDto): Promise<{
    data: Addition[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { date, cashierId, page = 1, limit = 50 } = query;

    const where: FindOptionsWhere<Addition> = {
      restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
    };
    if (cashierId) where.cashierId = cashierId;
    if (date) {
      where.printedAt = Between(new Date(`${date}T00:00:00.000`), new Date(`${date}T23:59:59.999`));
    }

    const [data, total] = await this.additionRepository.findAndCount({
      where,
      relations: ['items', 'cashier'],
      order: { printedAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private async assertTableBelongsToRestaurant(tableId: string): Promise<void> {
    const table = await this.tableRepository.findOne({
      where: { id: tableId, restaurantId: this.tenantContext.getRestaurantIdOrThrow() },
    });

    if (!table) {
      throw new BadRequestException('Table not found in this restaurant');
    }
  }
}
