import { USER_ROLES } from '../../shared/enums/user-roles';
import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../shared/entities/base.entity';

@Entity({ name: 'users_table' })
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
}
