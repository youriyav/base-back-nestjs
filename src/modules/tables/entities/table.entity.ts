import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';
import { User } from '../../users/users.entity';
import { Emplacement } from '../../emplacements/entities/emplacement.entity';
import { TABLE_ETAT } from '../../../shared/enums/table-etat';

@Entity({ name: 'tables' })
export class Table extends BaseEntity {
  @Column()
  nom: string;

  @Column({ name: 'emplacement_id', type: 'uuid', nullable: true })
  emplacementId?: string | null;

  @ManyToOne(() => Emplacement, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'emplacement_id' })
  emplacement?: Emplacement | null;

  @Column()
  capacite: number;

  @Column({ type: 'enum', enum: TABLE_ETAT, default: TABLE_ETAT.LIBRE })
  etat: TABLE_ETAT;

  @Column({ name: 'restaurant_id', type: 'uuid' })
  restaurantId: string;

  @ManyToOne(() => Restaurant, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'restaurant_id' })
  restaurant: Restaurant;

  @Column({ name: 'assigned_staff_id', type: 'uuid', nullable: true })
  assignedStaffId?: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: User | null;
}
