import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { User } from './users.entity';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed-password'),
}));

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  softDelete: jest.fn(),
  metadata: { name: 'User' } as never,
});

const RESTAURANT_A = 'test-restaurant-id';

describe('UsersService', () => {
  let service: UsersService;
  let userRepository: MockRepository<User>;
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;

  beforeEach(async () => {
    tenantContext = { getRestaurantIdOrThrow: jest.fn().mockReturnValue(RESTAURANT_A) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userRepository = module.get(getRepositoryToken(User));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns users scoped to the current restaurant, without passwords', async () => {
      userRepository.find!.mockResolvedValue([
        { id: '1', email: 'a@test.com', password: 'secret', restaurantId: RESTAURANT_A },
      ]);

      const result = await service.findAll();

      expect(userRepository.find).toHaveBeenCalledWith({ where: { restaurantId: RESTAURANT_A } });
      expect(result).toEqual([{ id: '1', email: 'a@test.com', restaurantId: RESTAURANT_A }]);
    });

    it('throws when there is no tenant context (e.g. SUPER_ADMIN)', async () => {
      tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(service.findAll()).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findAllAcrossAllRestaurants', () => {
    it('is unscoped and never touches tenant context', async () => {
      userRepository.find!.mockResolvedValue([
        { id: '1', password: 'secret', restaurantId: RESTAURANT_A },
        { id: '2', password: 'secret', restaurantId: 'restaurant-b' },
      ]);

      const result = await service.findAllAcrossAllRestaurants();

      expect(userRepository.find).toHaveBeenCalledWith();
      expect(tenantContext.getRestaurantIdOrThrow).not.toHaveBeenCalled();
      expect(result).toEqual([
        { id: '1', restaurantId: RESTAURANT_A },
        { id: '2', restaurantId: 'restaurant-b' },
      ]);
    });
  });

  describe('create', () => {
    it('rejects a duplicate email regardless of restaurant', async () => {
      userRepository.findOne!.mockResolvedValue({ id: 'existing', email: 'a@test.com' });

      await expect(
        service.create({ email: 'a@test.com', password: 'password123' } as any),
      ).rejects.toThrow(ConflictException);
      expect(userRepository.save).not.toHaveBeenCalled();
    });

    it('creates the user stamped with the current restaurant, hashed password, no password in result', async () => {
      const dto = { email: 'new@test.com', password: 'password123', first_name: 'A' };
      userRepository.findOne!.mockResolvedValue(null);
      userRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const result = await service.create(dto as any);

      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
      expect(userRepository.create).toHaveBeenCalledWith({
        ...dto,
        password: 'hashed-password',
        restaurantId: RESTAURANT_A,
      });
      expect(result).not.toHaveProperty('password');
      expect(result).toMatchObject({ email: 'new@test.com', restaurantId: RESTAURANT_A });
    });

    it('ignores any client-supplied restaurantId — tenant context always wins', async () => {
      userRepository.findOne!.mockResolvedValue(null);
      userRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      await service.create({
        email: 'x@test.com',
        password: 'password123',
        restaurantId: 'attacker-supplied-id',
      } as any);

      expect(userRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ restaurantId: RESTAURANT_A }),
      );
    });
  });

  describe('findOne', () => {
    it('404s when the user belongs to another restaurant (or does not exist)', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(service.findOne('other-tenant-id')).rejects.toThrow(NotFoundException);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'other-tenant-id', restaurantId: RESTAURANT_A },
      });
    });
  });

  describe('findByEmail', () => {
    it('is unscoped (used at login, before tenant context exists)', async () => {
      userRepository.findOne!.mockResolvedValue({ id: '1', email: 'a@test.com' });

      await service.findByEmail('a@test.com');

      expect(userRepository.findOne).toHaveBeenCalledWith({ where: { email: 'a@test.com' } });
      expect(tenantContext.getRestaurantIdOrThrow).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404s when the user belongs to another restaurant (or does not exist)', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(service.update('other-tenant-id', { first_name: 'x' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects renaming to an email already used by another user', async () => {
      userRepository
        .findOne!.mockResolvedValueOnce({
          id: '1',
          email: 'old@test.com',
          restaurantId: RESTAURANT_A,
        }) // findOneScopedOrFail
        .mockResolvedValueOnce({ id: '2', email: 'taken@test.com' }); // email clash lookup

      await expect(service.update('1', { email: 'taken@test.com' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('404s when the user belongs to another restaurant (or does not exist)', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('other-tenant-id')).rejects.toThrow(NotFoundException);
      expect(userRepository.softDelete).not.toHaveBeenCalled();
    });

    it('removes a user within the current restaurant', async () => {
      const user = { id: '1', email: 'a@test.com', restaurantId: RESTAURANT_A };
      userRepository.findOne!.mockResolvedValue(user);

      await service.remove('1');

      expect(userRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });
  });
});
