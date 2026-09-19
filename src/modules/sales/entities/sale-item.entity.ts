import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Sale } from './sale.entity';

/**
 * A line of a Sale, snapshotted at print time — menuItemId is kept only as a
 * loose reference (no FK) since the underlying menu item may since have been
 * edited or deleted; name/unitPrice must reflect what was actually sold.
 */
@Entity({ name: 'sale_items' })
export class SaleItem extends BaseEntity {
  @Column({ name: 'sale_id', type: 'uuid' })
  saleId: string;

  @ManyToOne(() => Sale, (sale) => sale.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'sale_id' })
  sale: Sale;

  @Column({ name: 'menu_item_id', type: 'uuid', nullable: true })
  menuItemId?: string | null;

  @Column()
  name: string;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;
}
