import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import request from 'supertest';
import { App } from 'supertest/types';
import * as bcrypt from 'bcryptjs';
import { AppModule } from '../src/app/app.module';
import { Restaurant, RESTAURANT_STATUS } from '@modules/restaurants/entities/restaurant.entity';
import { RestaurantsService } from '@modules/restaurants/restaurants.service';
import { User } from '@modules/users/users.entity';
import { MenuCategory } from '@modules/menu/entities/menu-category.entity';
import { MenuItem } from '@modules/menu/entities/menu-item.entity';
import { USER_ROLES } from '@shared/enums/user-roles';
import { CROSS_TENANT_KEY } from '@shared/tenant-context';
import { ROLES_KEY } from '@modules/auth/decorators/roles.decorator';
import { RestaurantsController } from '@modules/restaurants/restaurants.controller';
import { PublicMenuController } from '@modules/restaurants/public-menu.controller';
import { MenuCategoriesController } from '@modules/menu/menu-categories.controller';
import { MenuItemsController } from '@modules/menu/menu-items.controller';
import { UsersController } from '@modules/users/users.controller';
import { AuthController } from '@modules/auth/auth.controller';
import { ProspectsController } from '@modules/prospects/prospects.controller';
import { AppController } from '../src/app/app.controller';
import { StorageController } from '@modules/storage/storage.controller';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  message?: string;
}

function body<T>(res: request.Response): ApiEnvelope<T> {
  return res.body as ApiEnvelope<T>;
}

/**
 * The single most important test in the multi-tenant conversion: proves a
 * user from restaurant A can never read or write restaurant B's data, even
 * with B's real IDs in hand. Runs against the isolated `zoya_test` database
 * (see test/env-setup.ts / .env.test) — never the real Zoya data.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication<App>;
  let restaurantRepo: Repository<Restaurant>;
  let userRepo: Repository<User>;
  let categoryRepo: Repository<MenuCategory>;
  let itemRepo: Repository<MenuItem>;
  let restaurantsService: RestaurantsService;

  let restaurantA: Restaurant;
  let restaurantB: Restaurant;
  let suspendedRestaurant: Restaurant;
  let ownerA: User;
  let categoryA: MenuCategory;
  let categoryB: MenuCategory;
  let itemA: MenuItem;
  let itemB: MenuItem;
  let ownerAToken: string;

  const PASSWORD = 'Test-Password-123!';

  beforeAll(async () => {
    // Jest's default 5s hook timeout is too tight for this many sequential
    // DB/HTTP fixture steps (3 restaurants, 2 users, a real login, 2
    // categories, 2 items).
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    restaurantRepo = moduleFixture.get(getRepositoryToken(Restaurant));
    userRepo = moduleFixture.get(getRepositoryToken(User));
    categoryRepo = moduleFixture.get(getRepositoryToken(MenuCategory));
    itemRepo = moduleFixture.get(getRepositoryToken(MenuItem));
    restaurantsService = moduleFixture.get(RestaurantsService);

    // 1. Two active restaurants + one suspended one, created via the service
    // (bypassing HTTP — these are fixtures, not what's under test).
    restaurantA = await restaurantsService.create({
      name: 'E2E Resto A',
      slug: 'e2e-resto-a',
      status: RESTAURANT_STATUS.ACTIVE,
    } as never);
    restaurantB = await restaurantsService.create({
      name: 'E2E Resto B',
      slug: 'e2e-resto-b',
      status: RESTAURANT_STATUS.ACTIVE,
    } as never);
    suspendedRestaurant = await restaurantsService.create({
      name: 'E2E Resto Suspended',
      slug: 'e2e-resto-suspended',
      status: RESTAURANT_STATUS.SUSPENDED,
    } as never);

    // 2. An OWNER for A (and one for B, unused directly but completes the
    // fixture) — inserted directly via repository since UsersService.create()
    // requires a tenant context that doesn't exist outside an HTTP request.
    const hashedPassword = await bcrypt.hash(PASSWORD, 10);
    ownerA = await userRepo.save(
      userRepo.create({
        first_name: 'Owner',
        last_name: 'A',
        email: 'owner-a@e2e-test.local',
        phone: '+000000000001',
        password: hashedPassword,
        isAdmin: false,
        role: USER_ROLES.OWNER,
        restaurantId: restaurantA.id,
      }),
    );
    await userRepo.save(
      userRepo.create({
        first_name: 'Owner',
        last_name: 'B',
        email: 'owner-b@e2e-test.local',
        phone: '+000000000002',
        password: hashedPassword,
        isAdmin: false,
        role: USER_ROLES.OWNER,
        restaurantId: restaurantB.id,
      }),
    );

    // 3. Real login for A's owner — exercises the full guard chain, not a
    // hand-crafted token.
    const loginRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: ownerA.email, password: PASSWORD })
      .expect(200);
    ownerAToken = body<{ access_token: string }>(loginRes).data.access_token;

    // 4. Same slug ("boissons") in both restaurants — exercises the new
    // composite-unique (restaurant_id, slug) constraint, which the old
    // globally-unique constraint would have rejected.
    categoryA = await categoryRepo.save(
      categoryRepo.create({ name: 'Boissons A', slug: 'boissons', restaurantId: restaurantA.id }),
    );
    categoryB = await categoryRepo.save(
      categoryRepo.create({ name: 'Boissons B', slug: 'boissons', restaurantId: restaurantB.id }),
    );

    itemA = await itemRepo.save(
      itemRepo.create({
        name: 'Coca A',
        categoryId: categoryA.id,
        restaurantId: restaurantA.id,
        price: 500,
      }),
    );
    itemB = await itemRepo.save(
      itemRepo.create({
        name: 'Coca B',
        categoryId: categoryB.id,
        restaurantId: restaurantB.id,
        price: 500,
      }),
    );
  }, 30000);

  afterAll(async () => {
    // Defensive cleanup, by known fixture slugs/emails rather than by
    // object reference: if beforeAll fails partway through (e.g. colliding
    // with a leftover from an interrupted prior run, or a concurrent run of
    // this same suite), restaurantA/B/etc. may be undefined. Deleting by
    // slug/email self-heals any such leftover instead of leaving it to
    // permanently jam every future run at the same "slug already exists"
    // conflict. Never let a cleanup failure block app.close() below.
    try {
      const restaurants = await restaurantRepo.find({
        where: [{ slug: 'e2e-resto-a' }, { slug: 'e2e-resto-b' }, { slug: 'e2e-resto-suspended' }],
      });
      const restaurantIds = restaurants.map((r) => r.id);

      if (restaurantIds.length) {
        await itemRepo.delete({ restaurantId: In(restaurantIds) });
        await categoryRepo.delete({ restaurantId: In(restaurantIds) });
        await userRepo.delete({ restaurantId: In(restaurantIds) });
        await restaurantRepo.delete({ id: In(restaurantIds) });
      }
    } catch (error) {
      console.warn('tenant-isolation e2e cleanup failed:', error);
    }

    await app.close();
  }, 30000);

  describe('composite unique slug constraint', () => {
    it('allows two different restaurants to share the same category slug', () => {
      expect(categoryA.slug).toBe('boissons');
      expect(categoryB.slug).toBe('boissons');
      expect(categoryA.restaurantId).not.toBe(categoryB.restaurantId);
    });
  });

  describe('menu categories', () => {
    it("lists only A's own categories, never B's", async () => {
      const res = await request(app.getHttpServer())
        .get('/menu/categories')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const ids = body<MenuCategory[]>(res).data.map((c) => c.id);
      expect(ids).toContain(categoryA.id);
      expect(ids).not.toContain(categoryB.id);
    });

    it("404s updating B's category by its real ID", async () => {
      await request(app.getHttpServer())
        .patch(`/menu/categories/${categoryB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Hijacked' })
        .expect(404);
    });

    it("404s deleting B's category by its real ID", async () => {
      await request(app.getHttpServer())
        .delete(`/menu/categories/${categoryB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });
  });

  describe('menu items', () => {
    it("lists only A's own items, never B's", async () => {
      const res = await request(app.getHttpServer())
        .get('/menu/items/all')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const ids = body<MenuItem[]>(res).data.map((i) => i.id);
      expect(ids).toContain(itemA.id);
      expect(ids).not.toContain(itemB.id);
    });

    it("404s updating B's item by its real ID", async () => {
      await request(app.getHttpServer())
        .patch(`/menu/items/${itemB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Hijacked' })
        .expect(404);
    });

    it("404s deleting B's item by its real ID", async () => {
      await request(app.getHttpServer())
        .delete(`/menu/items/${itemB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it("rejects attaching a new item to B's category by guessing its ID", async () => {
      await request(app.getHttpServer())
        .post('/menu/items')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ name: 'Sneaky item', categoryId: categoryB.id, price: 100 })
        .expect(404);
    });
  });

  describe('users', () => {
    it("lists only A's own users, never B's", async () => {
      const res = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(200);

      const emails = body<Partial<User>[]>(res).data.map((u) => u.email);
      expect(emails).toContain(ownerA.email);
      expect(emails).not.toContain('owner-b@e2e-test.local');
    });

    it("404s fetching B's user by real ID", async () => {
      const ownerB = await userRepo.findOneOrFail({
        where: { email: 'owner-b@e2e-test.local' },
      });

      await request(app.getHttpServer())
        .get(`/users/${ownerB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .expect(404);
    });

    it("404s updating B's user by real ID", async () => {
      const ownerB = await userRepo.findOneOrFail({
        where: { email: 'owner-b@e2e-test.local' },
      });

      await request(app.getHttpServer())
        .patch(`/users/${ownerB.id}`)
        .set('Authorization', `Bearer ${ownerAToken}`)
        .send({ first_name: 'Hijacked' })
        .expect(404);
    });
  });

  describe('public slug-resolved menu (/r/:slug/menu/...)', () => {
    it("returns only A's categories for A's slug", async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${restaurantA.slug}/menu/categories`)
        .expect(200);

      const ids = body<MenuCategory[]>(res).data.map((c) => c.id);
      expect(ids).toContain(categoryA.id);
      expect(ids).not.toContain(categoryB.id);
    });

    it("returns only B's categories for B's slug", async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${restaurantB.slug}/menu/categories`)
        .expect(200);

      const ids = body<MenuCategory[]>(res).data.map((c) => c.id);
      expect(ids).toContain(categoryB.id);
      expect(ids).not.toContain(categoryA.id);
    });

    it("returns only A's items for A's slug", async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${restaurantA.slug}/menu/items`)
        .expect(200);

      const ids = body<MenuItem[]>(res).data.map((i) => i.id);
      expect(ids).toContain(itemA.id);
      expect(ids).not.toContain(itemB.id);
    });

    it('404s for a slug that does not exist', async () => {
      const res = await request(app.getHttpServer())
        .get('/r/does-not-exist/menu/categories')
        .expect(404);
      expect(body<null>(res).message).toBe('Restaurant not found');
    });

    it('404s identically (not a different status/message) for a suspended restaurant', async () => {
      const res = await request(app.getHttpServer())
        .get(`/r/${suspendedRestaurant.slug}/menu/categories`)
        .expect(404);
      expect(body<null>(res).message).toBe('Restaurant not found');
    });
  });

  describe('@CrossTenant() route allowlist', () => {
    type ControllerClass = new (...args: never[]) => object;

    // Every exposed route grouped by controller and handler method name.
    const ROUTES: Array<[ControllerClass, string[]]> = [
      [
        RestaurantsController,
        [
          'findAll',
          'findOne',
          'create',
          'update',
          'remove',
          'uploadLogo',
          'impersonate',
          'stopImpersonate',
        ],
      ],
      [PublicMenuController, ['findCategories', 'findItems']],
      [MenuCategoriesController, ['findAll', 'create', 'update', 'remove']],
      [MenuItemsController, ['findAllAdmin', 'create', 'update', 'remove', 'uploadImage']],
      [
        UsersController,
        ['create', 'findAll', 'findAllAcrossAllRestaurants', 'findOne', 'update', 'remove'],
      ],
      [
        AuthController,
        [
          'login',
          'refreshToken',
          'getProfile',
          'requestPasswordReset',
          'resetPassword',
          'validateResetToken',
        ],
      ],
      [ProspectsController, ['create', 'findAll', 'updateStatus']],
      [AppController, ['getHello', 'check']],
      [StorageController, ['getPresignedUrl', 'getPresignedUploadUrl']],
    ];

    function getMethod(Controller: ControllerClass, methodName: string): object {
      return (Controller.prototype as Record<string, object>)[methodName];
    }

    function isCrossTenant(Controller: ControllerClass, methodName: string): boolean {
      const method = getMethod(Controller, methodName);
      if (Reflect.getMetadata(CROSS_TENANT_KEY, method)) return true;
      return !!Reflect.getMetadata(CROSS_TENANT_KEY, Controller);
    }

    function hasRole(Controller: ControllerClass, methodName: string, role: USER_ROLES): boolean {
      const method = getMethod(Controller, methodName);
      const methodRoles =
        (Reflect.getMetadata(ROLES_KEY, method) as USER_ROLES[] | undefined) ?? [];
      const classRoles =
        (Reflect.getMetadata(ROLES_KEY, Controller) as USER_ROLES[] | undefined) ?? [];
      return methodRoles.includes(role) || classRoles.includes(role);
    }

    it('marks exactly the RestaurantsController routes as cross-tenant, all SUPER_ADMIN-only', () => {
      const found: string[] = [];

      for (const [Controller, methods] of ROUTES) {
        for (const methodName of methods) {
          if (isCrossTenant(Controller, methodName)) {
            found.push(`${Controller.name}.${methodName}`);
            expect(hasRole(Controller, methodName, USER_ROLES.SUPER_ADMIN)).toBe(true);
          }
        }
      }

      expect(found.sort()).toEqual(
        [
          'RestaurantsController.findAll',
          'RestaurantsController.findOne',
          'RestaurantsController.create',
          'RestaurantsController.update',
          'RestaurantsController.remove',
          'RestaurantsController.uploadLogo',
          'RestaurantsController.impersonate',
          'RestaurantsController.stopImpersonate',
          'UsersController.findAllAcrossAllRestaurants',
        ].sort(),
      );
    });
  });
});
