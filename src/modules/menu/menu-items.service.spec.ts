import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { MenuItemsService } from './menu-items.service';
import { MenuItem } from './entities/menu-item.entity';
import { MenuCategory } from './entities/menu-category.entity';
import { MinioService } from '@modules/storage/minio.service';
import { MENU_IMAGE_UPLOAD_PATH } from './menu.constants';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  remove: jest.fn(),
  softDelete: jest.fn(),
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
  metadata: { name: 'MenuItem' } as never,
});

const createMockQueryBuilder = () => ({
  leftJoinAndSelect: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  addOrderBy: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
});

const RESTAURANT_A = 'test-restaurant-id';

describe('MenuItemsService', () => {
  let service: MenuItemsService;
  let itemRepository: MockRepository<MenuItem>;
  let categoryRepository: MockRepository<MenuCategory>;
  let minioService: { uploadFile: jest.Mock; deleteFile: jest.Mock };
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;

  beforeEach(async () => {
    tenantContext = { getRestaurantIdOrThrow: jest.fn().mockReturnValue(RESTAURANT_A) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuItemsService,
        { provide: getRepositoryToken(MenuItem), useValue: createMockRepository() },
        { provide: getRepositoryToken(MenuCategory), useValue: createMockRepository() },
        {
          provide: MinioService,
          useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() },
        },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<MenuItemsService>(MenuItemsService);
    itemRepository = module.get(getRepositoryToken(MenuItem));
    categoryRepository = module.get(getRepositoryToken(MenuCategory));
    minioService = module.get(MinioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findPublicScoped', () => {
    it('filters by availability, restaurant, category slug and search term', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([{ id: '1' }]);
      itemRepository.createQueryBuilder!.mockReturnValue(qb);

      const result = await service.findPublicScoped({ category: 'pizza', search: 'margherita' });

      expect(qb.where).toHaveBeenCalledWith('item.isAvailable = :isAvailable', {
        isAvailable: true,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('item.restaurantId = :restaurantId', {
        restaurantId: RESTAURANT_A,
      });
      expect(qb.andWhere).toHaveBeenCalledWith('category.slug = :slug', { slug: 'pizza' });
      expect(qb.andWhere).toHaveBeenCalledWith('item.name ILIKE :search', {
        search: '%margherita%',
      });
      expect(result).toEqual([{ id: '1' }]);
    });

    it('applies no optional filters when none are given', async () => {
      const qb = createMockQueryBuilder();
      qb.getMany.mockResolvedValue([]);
      itemRepository.createQueryBuilder!.mockReturnValue(qb);

      await service.findPublicScoped({});

      expect(qb.andWhere).toHaveBeenCalledWith('item.restaurantId = :restaurantId', {
        restaurantId: RESTAURANT_A,
      });
      expect(qb.andWhere).toHaveBeenCalledTimes(1);
    });

    it('throws when there is no tenant context (e.g. an invalid/suspended slug slipped through)', async () => {
      tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(service.findPublicScoped({})).rejects.toThrow(ForbiddenException);
    });
  });

  describe('create', () => {
    it('throws NotFoundException when the category does not exist in this restaurant', async () => {
      categoryRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.create({ name: 'Margherita', categoryId: 'missing', price: 5000 } as any),
      ).rejects.toThrow(NotFoundException);
      expect(categoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'missing', restaurantId: RESTAURANT_A },
      });
      expect(itemRepository.save).not.toHaveBeenCalled();
    });

    it('creates the item scoped to the current restaurant when the category exists', async () => {
      const dto = { name: 'Margherita', categoryId: 'cat-1', price: 5000 };
      categoryRepository.findOne!.mockResolvedValue({ id: 'cat-1', restaurantId: RESTAURANT_A });
      itemRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));
      itemRepository.findOne!.mockResolvedValue({
        id: 'item-1',
        ...dto,
        restaurantId: RESTAURANT_A,
      });

      const result = await service.create(dto as any);

      expect(itemRepository.create).toHaveBeenCalledWith({ ...dto, restaurantId: RESTAURANT_A });
      expect(result).toEqual({ id: 'item-1', ...dto, restaurantId: RESTAURANT_A });
    });

    it('throws when there is no tenant context', async () => {
      categoryRepository.findOne!.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(
        service.create({ name: 'x', categoryId: 'cat-1', price: 1 } as any),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('remove', () => {
    it('deletes the stored image before removing an item that has one', async () => {
      const item = {
        id: '1',
        imageObjectKey: 'menu-items/1234-abc.jpg',
        restaurantId: RESTAURANT_A,
      };
      itemRepository.findOne!.mockResolvedValue(item);
      minioService.deleteFile.mockResolvedValue(undefined);

      await service.remove('1');

      expect(minioService.deleteFile).toHaveBeenCalledWith(RESTAURANT_A, item.imageObjectKey);
      expect(itemRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });

    it('404s when the item belongs to another restaurant (or does not exist)', async () => {
      itemRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('other-tenant-id')).rejects.toThrow(NotFoundException);
      expect(itemRepository.softDelete).not.toHaveBeenCalled();
    });

    it('does not call MinIO when the item has no image', async () => {
      const item = { id: '1', imageObjectKey: null, restaurantId: RESTAURANT_A };
      itemRepository.findOne!.mockResolvedValue(item);

      await service.remove('1');

      expect(minioService.deleteFile).not.toHaveBeenCalled();
      expect(itemRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });

    it('still removes the item if the MinIO delete fails', async () => {
      const item = {
        id: '1',
        imageObjectKey: 'menu-items/broken.jpg',
        restaurantId: RESTAURANT_A,
      };
      itemRepository.findOne!.mockResolvedValue(item);
      minioService.deleteFile.mockRejectedValue(new Error('bucket unreachable'));

      await service.remove('1');

      expect(itemRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });
  });

  describe('uploadImage', () => {
    it('replaces an existing image and updates the item, scoped to the current restaurant', async () => {
      const item = {
        id: '1',
        imageObjectKey: 'menu-items/old.jpg',
        restaurantId: RESTAURANT_A,
      };
      const file = { buffer: Buffer.from(''), originalname: 'new.jpg' } as Express.Multer.File;
      itemRepository.findOne!.mockResolvedValue(item);
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({
        objectKey: 'menu-items/new.jpg',
        url: 'http://minio/zoya-restaurant/menu-items/new.jpg',
        size: 10,
        mimeType: 'image/jpeg',
      });

      await service.uploadImage('1', file);

      expect(minioService.deleteFile).toHaveBeenCalledWith(RESTAURANT_A, 'menu-items/old.jpg');
      expect(minioService.uploadFile).toHaveBeenCalledWith(
        RESTAURANT_A,
        file,
        MENU_IMAGE_UPLOAD_PATH,
      );
      expect(itemRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          imageUrl: 'http://minio/zoya-restaurant/menu-items/new.jpg',
          imageObjectKey: 'menu-items/new.jpg',
        }),
      );
    });
  });
});
