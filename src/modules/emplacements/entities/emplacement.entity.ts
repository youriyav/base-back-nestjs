import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { Table } from '../../tables/entities/table.entity';

@Entity({ name: 'emplacements' })
@Index(['restaurantId', 'name'], { unique: true, where: '"deletedAt" IS NULL' })
export class Emplacement extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'int', default: 0 })
  order: number;

  @OneToMany(() => Table, (table) => table.emplacement)
  tables?: Table[];
}
