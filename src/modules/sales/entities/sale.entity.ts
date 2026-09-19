import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/users.entity';
import { SaleItem } from './sale-item.entity';

/**
 * A sale, recorded when the cashier prints the addition — a snapshot of the
 * order at that moment (table, items, total), independent from the later
 * "Encaisser" (payment) step. clientId is generated on the mobile app and is
 * the idempotency key: the mobile offline queue may retry the same sale
 * after a failed send, and the soft-delete-aware unique index below on
 * (restaurantId, clientId) guarantees that never creates a duplicate.
 */
@Entity({ name: 'sales' })
@Index(['restaurantId', 'clientId'], { unique: true, where: '"deletedAt" IS NULL' })
export class Sale extends BaseEntity {
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'client_id' })
  clientId: string;

  @Column({ name: 'table_id', type: 'uuid', nullable: true })
  tableId?: string | null;

  @ManyToOne(() => Table, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'table_id' })
  table?: Table | null;

  @Column({ name: 'table_label' })
  tableLabel: string;

  @Column({ name: 'server_name', type: 'varchar', nullable: true })
  serverName?: string | null;

  @Column({ name: 'cashier_id', type: 'uuid', nullable: true })
  cashierId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cashier_id' })
  cashier?: User | null;

  @Column({ type: 'int' })
  total: number;

  @Column({ name: 'printed_at', type: 'timestamp' })
  printedAt: Date;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];
}
