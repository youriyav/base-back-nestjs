import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { MenuItem } from './menu-item.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

@Entity({ name: 'menu_categories' })
@Index(['restaurantId', 'slug'], { unique: true })
export class MenuCategory extends BaseEntity {
  @Column()
  name: string;

  // Unique per restaurant, not globally — see the @Index above.
  @Column()
  slug: string;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ nullable: true })
  icon?: string;

  @Column({ type: 'int', default: 0 })
  order: number;

  @OneToMany(() => MenuItem, (item) => item.category)
  items?: MenuItem[];
}
