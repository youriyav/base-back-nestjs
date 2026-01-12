import { DataSource } from 'typeorm';
import { Seeder } from 'typeorm-extension';
import { User } from '../../modules/users/users.entity';
import * as bcrypt from 'bcrypt';
import { USER_ROLES } from 'src/shared/enums/user-roles';

export class UserSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const userRepository = dataSource.getRepository(User);

    // Check if users already exist to avoid duplicates
    const existingUsers = await userRepository.count();

    if (existingUsers > 0) {
      console.log('Users already exist, skipping seed...');
      return;
    }

    // Create sample users
    const users: Partial<User>[] = [
      {
        first_name: 'admin',
        last_name: 'admin',
        email: 'admin@admin.com',
        password: await bcrypt.hash('password123', 10),
        address: '123 Main St, New York, NY 10001',
        isActivate: true,
        isAdmin: true,
        phone: '778399435',
        role: USER_ROLES.SUPER_ADMIN,
      },
    ];

    // Insert users
    await userRepository.save(users);

    console.log('Users seeded successfully!');
  }
}
