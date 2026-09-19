import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../shared/entities/base.entity';

export enum DESIRED_PLAN {
  ESSENTIEL = 'essentiel',
  PRO = 'pro',
  BUSINESS = 'business',
  UNSURE = 'unsure',
}

export enum PROSPECT_STATUS {
  NEW = 'new',
  CONTACTED = 'contacted',
  CONVERTED = 'converted',
  DISCARDED = 'discarded',
}

@Entity({ name: 'demo_requests' })
export class DemoRequest extends BaseEntity {
  @Column()
  restaurantName: string;

  @Column()
  contactName: string;

  @Column()
  phone: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ default: 'Bangui' })
  city: string;

  @Column({
    type: 'enum',
    enum: DESIRED_PLAN,
    default: DESIRED_PLAN.UNSURE,
  })
  desiredPlan: DESIRED_PLAN;

  @Column({ type: 'text', nullable: true })
  message?: string;

  @Column({
    type: 'enum',
    enum: PROSPECT_STATUS,
    default: PROSPECT_STATUS.NEW,
  })
  status: PROSPECT_STATUS;
}
