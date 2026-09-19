import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MenuCategoriesService } from './menu-categories.service';
import { MenuCategory } from './entities/menu-category.entity';
import { MenuItem } from './entities/menu-item.entity';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  softDelete: jest.fn(),
  count: jest.fn(),
  metadata: { name: 'MenuCategory' } as never,
});

const RESTAURANT_A = 'test-restaurant-id';

describe('MenuCategoriesService', () => {
  let service: MenuCategoriesService;
  let categoryRepository: MockRepository<MenuCategory>;
  let itemRepository: MockRepository<MenuItem>;
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;

  beforeEach(async () => {
    tenantContext = { getRestaurantIdOrThrow: jest.fn().mockReturnValue(RESTAURANT_A) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuCategoriesService,
        { provide: getRepositoryToken(MenuCategory), useValue: createMockRepository() },
        { provide: getRepositoryToken(MenuItem), useValue: createMockRepository() },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<MenuCategoriesService>(MenuCategoriesService);
    categoryRepository = module.get(getRepositoryToken(MenuCategory));
    itemRepository = module.get(getRepositoryToken(MenuItem));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns categories ordered ascending, scoped to the current restaurant', async () => {
      const categories = [{ id: '1', order: 0, restaurantId: RESTAURANT_A }];
      categoryRepository.find!.mockResolvedValue(categories);

      const result = await service.findAll();

      expect(categoryRepository.find).toHaveBeenCalledWith({
        order: { order: 'ASC' },
        where: { restaurantId: RESTAURANT_A },
      });
      expect(result).toBe(categories);
    });

    it('throws when there is no tenant context', async () => {
      tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(service.findAll()).rejects.toThrow(ForbiddenException);
      expect(categoryRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates a category scoped to the current restaurant when the slug is not taken', async () => {
      const dto = { name: 'Pizza', slug: 'pizza' };
      categoryRepository.findOne!.mockResolvedValue(null);
      categoryRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const result = await service.create(dto as any);

      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { slug: 'pizza', restaurantId: RESTAURANT_A },
      });
      expect(categoryRepository.create).toHaveBeenCalledWith({
        ...dto,
        restaurantId: RESTAURANT_A,
      });
      expect(result).toEqual({ ...dto, restaurantId: RESTAURANT_A });
    });

    it('rejects a duplicate slug within the same restaurant', async () => {
      categoryRepository.findOne!.mockResolvedValue({
        id: 'existing',
        slug: 'pizza',
        restaurantId: RESTAURANT_A,
      });

      await expect(service.create({ name: 'Pizza', slug: 'pizza' } as any)).rejects.toThrow(
        ConflictException,
      );
      expect(categoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404s when the category belongs to another restaurant (or does not exist)', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

      await expect(service.update('other-tenant-id', { slug: 'burgers' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects renaming a slug to one already used within the same restaurant', async () => {
      categoryRepository
        .findOne!.mockResolvedValueOnce({ id: '1', slug: 'pizza', restaurantId: RESTAURANT_A }) // findOneScopedOrFail(id)
        .mockResolvedValueOnce({ id: '2', slug: 'burgers', restaurantId: RESTAURANT_A }); // clash lookup

      await expect(service.update('1', { slug: 'burgers' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the category does not exist in this restaurant', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete a category that still has menu items', async () => {
      categoryRepository.findOne!.mockResolvedValue({
        id: '1',
        slug: 'pizza',
        restaurantId: RESTAURANT_A,
      });
      itemRepository.count!.mockResolvedValue(3);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
      expect(categoryRepository.softDelete).not.toHaveBeenCalled();
    });

    it('deletes an empty category', async () => {
      const category = { id: '1', slug: 'pizza', restaurantId: RESTAURANT_A };
      categoryRepository.findOne!.mockResolvedValue(category);
      itemRepository.count!.mockResolvedValue(0);

      await service.remove('1');

      expect(itemRepository.count).toHaveBeenCalledWith({
        where: { categoryId: '1', restaurantId: RESTAURANT_A },
      });
      expect(categoryRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });
  });
});
