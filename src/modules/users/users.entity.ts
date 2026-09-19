import { USER_ROLES } from '../../shared/enums/user-roles';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';
import { Restaurant } from '../restaurants/entities/restaurant.entity';

@Entity({ name: 'users_table' })
@Index(['phone'], { unique: true, where: '"deletedAt" IS NULL' })
export class User extends BaseEntity {
  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column()
  email: string;

  @Column()
  phone: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  // Plain 4-digit mobile login PIN for SERVER/CASHIER roles — deliberately
  // not hashed, unlike `password`, because the "Afficher" action needs to
  // show it back to the admin on demand, not just at creation time.
  @Column({ name: 'access_code', type: 'varchar', length: 4, nullable: true })
  accessCode?: string | null;

  @Column({ nullable: true })
  address: string;
  @Column({ nullable: true })
  isActivate: boolean;

  @Column({ default: false })
  isAdmin: boolean;

  @Column({
    type: 'enum',
    enum: USER_ROLES,
    nullable: true,
  })
  role: USER_ROLES;

  // Null only for SUPER_ADMIN (isAdmin = true) — enforced in the DB by
  // CHK_users_restaurant_required, not by this column's own nullability.
  @Column({ name: 'restaurant_id', type: 'uuid', nullable: true })
  restaurantId: string | null;

  @ManyToOne(() => Restaurant, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant?: Restaurant;
}
