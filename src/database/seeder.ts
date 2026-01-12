import 'reflect-metadata';
import * as dotenv from 'dotenv';
import dataSource from './data-source';
import { MainSeeder } from './seeds/main.seeder';

dotenv.config();

async function runSeeders() {
  const seedName = process.argv[2];

  try {
    console.log('Initializing database connection...');
    await dataSource.initialize();
    console.log('Database connection established.');

    console.log('Running seeders...');
    const mainSeeder = new MainSeeder(seedName);
    await mainSeeder.run(dataSource);

    console.log('Seeding completed successfully!');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error during seeding:', error);
    process.exit(1);
  }
}

runSeeders();
