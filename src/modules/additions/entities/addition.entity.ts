import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from '../../tables/entities/table.entity';
import { User } from '../../users/users.entity';
import { AdditionItem } from './addition-item.entity';

/**
 * An addition (the printed bill), recorded when the cashier prints it — a
 * snapshot of the order at that moment (table, items, total). Distinct from
 * Sale, which is recorded later, at actual payment confirmation — an
 * addition can be printed (and re-printed) without the table ever being
 * paid. clientId is generated on the mobile app and is the idempotency key:
 * the mobile offline queue may retry the same addition after a failed send,
 * and the soft-delete-aware unique index below on (restaurantId, clientId)
 * guarantees that never creates a duplicate.
 */
@Entity({ name: 'additions' })
@Index(['restaurantId', 'clientId'], { unique: true, where: '"deletedAt" IS NULL' })
export class Addition extends BaseEntity {
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

  @OneToMany(() => AdditionItem, (item) => item.addition, { cascade: true })
  items: AdditionItem[];
}
