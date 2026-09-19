import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, FindOptionsWhere, Repository } from 'typeorm';
import { Sale } from './entities/sale.entity';
import { Table } from '../tables/entities/table.entity';
import { TableOrderItem } from '../tables/entities/table-order-item.entity';
import { CreateSaleDto } from './dto/create-sale.dto';
import { QuerySalesDto } from './dto/query-sales.dto';
import { TenantScopedBaseService } from '@shared/services/tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';
import { TABLE_ETAT } from '@shared/enums/table-etat';

@Injectable()
export class SalesService extends TenantScopedBaseService<Sale> {
  constructor(
    @InjectRepository(Sale)
    private readonly saleRepository: Repository<Sale>,
    @InjectRepository(Table)
    private readonly tableRepository: Repository<Table>,
    @InjectRepository(TableOrderItem)
    private readonly orderItemRepository: Repository<TableOrderItem>,
    tenantContext: TenantContextService,
  ) {
    super(saleRepository, tenantContext);
  }

  /**
   * Idempotent by clientId: the mobile offline queue may retry the same
   * sale after a send whose response never made it back (timeout, dropped
   * connection right after the server persisted it) — returning the
   * existing row instead of erroring or duplicating makes that safe.
   */
  async create(dto: CreateSaleDto, cashierId: string): Promise<Sale> {
    const existing = await this.saleRepository.findOne({
      where: { restaurantId: this.tenantContext.getRestaurantIdOrThrow(), clientId: dto.clientId },
      relations: ['items'],
    });
    if (existing) {
      return existing;
    }

    if (dto.tableId) {
      await this.assertTableBelongsToRestaurant(dto.tableId);
    }

    const sale = await this.saveScoped({
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

    // Payment confirmed: the table's in-progress order is now this sale, so
    // clear the live order-item log and free the table — mirrors what the
    // mobile app already does to its own local state in payTable().
    if (dto.tableId) {
      const restaurantId = this.tenantContext.getRestaurantIdOrThrow();
      await this.orderItemRepository.delete({ restaurantId, tableId: dto.tableId });
      await this.tableRepository.update({ id: dto.tableId, restaurantId }, { etat: TABLE_ETAT.LIBRE });
    }

    return sale;
  }

  async findAll(query: QuerySalesDto): Promise<{
    data: Sale[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { date, cashierId, page = 1, limit = 50 } = query;

    const where: FindOptionsWhere<Sale> = {
      restaurantId: this.tenantContext.getRestaurantIdOrThrow(),
    };
    if (cashierId) where.cashierId = cashierId;
    if (date) {
      where.printedAt = Between(new Date(`${date}T00:00:00.000`), new Date(`${date}T23:59:59.999`));
    }

    const [data, total] = await this.saleRepository.findAndCount({
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
