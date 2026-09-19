import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from './table.entity';

/**
 * One "add this dish to this table" event, recorded live as a server/cashier
 * builds up a table's order — insert-only, never updated in place. The
 * current order for a table is derived by summing quantity, grouped by
 * menuItemId (or name+unitPrice when menuItemId is null), across all rows
 * for that table (see TablesService.findAll). Insert-only + idempotent by
 * clientId (same soft-delete-aware partial unique index pattern as
 * Sale/Addition) is what makes the mobile offline queue's retries safe: a
 * retried add can never be double-counted, unlike an update-in-place
 * increment would risk under concurrent/retried writes.
 */
@Entity({ name: 'table_order_items' })
@Index(['restaurantId', 'clientId'], { unique: true, where: '"deletedAt" IS NULL' })
export class TableOrderItem extends BaseEntity {
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'table_id', type: 'uuid' })
  tableId: string;

  @ManyToOne(() => Table, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'table_id' })
  table: Table;

  @Column({ name: 'menu_item_id', type: 'uuid', nullable: true })
  menuItemId?: string | null;

  @Column()
  name: string;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;
}
