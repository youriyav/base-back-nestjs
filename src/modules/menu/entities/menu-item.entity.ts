import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { MenuCategory } from './menu-category.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity({ name: 'menu_items' })
export class MenuItem extends BaseEntity {
  @Column()
  name: string;

  @Column({ name: 'category_id' })
  categoryId: string;

  @ManyToOne(() => MenuCategory, (category) => category.items, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'category_id' })
  category: MenuCategory;

  // Stored directly (not only derivable via category_id) so tenant scoping
  // never depends on a join being present or correct.
  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ type: 'int' })
  price: number;

  @Column({ nullable: true })
  unit?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;

  @Column({ name: 'image_object_key', nullable: true })
  imageObjectKey?: string;

  @Column({ default: true })
  isAvailable: boolean;

  @Column({ type: 'int', default: 0 })
  order: number;
}
