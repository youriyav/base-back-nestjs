import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Addition } from './addition.entity';

/**
 * A line of an Addition, snapshotted at print time — menuItemId is kept only
 * as a loose reference (no FK) since the underlying menu item may since have
 * been edited or deleted; name/unitPrice must reflect what was actually on
 * the printed bill.
 */
@Entity({ name: 'addition_items' })
export class AdditionItem extends BaseEntity {
  @Column({ name: 'addition_id', type: 'uuid' })
  additionId: string;

  @ManyToOne(() => Addition, (addition) => addition.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'addition_id' })
  addition: Addition;

  @Column({ name: 'menu_item_id', type: 'uuid', nullable: true })
  menuItemId?: string | null;

  @Column()
  name: string;

  @Column({ name: 'unit_price', type: 'int' })
  unitPrice: number;

  @Column({ type: 'int' })
  quantity: number;
}
