import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { RestaurantsService } from './restaurants.service';
import { Restaurant, RESTAURANT_PLAN, RESTAURANT_STATUS } from './entities/restaurant.entity';
import { MinioService } from '@modules/storage/minio.service';
import { RESTAURANT_LOGO_UPLOAD_PATH } from './restaurants.constants';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  remove: jest.fn(),
  softDelete: jest.fn(),
});

describe('RestaurantsService', () => {
  let service: RestaurantsService;
  let restaurantRepository: MockRepository<Restaurant>;
  let minioService: { uploadFile: jest.Mock; deleteFile: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RestaurantsService,
        { provide: getRepositoryToken(Restaurant), useValue: createMockRepository() },
        { provide: MinioService, useValue: { uploadFile: jest.fn(), deleteFile: jest.fn() } },
      ],
    }).compile();

    service = module.get<RestaurantsService>(RestaurantsService);
    restaurantRepository = module.get(getRepositoryToken(Restaurant));
    minioService = module.get(MinioService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('update', () => {
    it('leaves plan untouched when it is not part of the update payload', async () => {
      const restaurant = {
        id: '1',
        slug: 'le-bangui-chic',
        plan: RESTAURANT_PLAN.PRO,
        status: RESTAURANT_STATUS.ACTIVE,
      };
      restaurantRepository.findOne!.mockResolvedValue(restaurant);
      restaurantRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const result = await service.update('1', { city: 'Bimbo' } as never);

      expect(result.plan).toBe(RESTAURANT_PLAN.PRO);
      expect(result.mrr).toBe(25000);
    });
  });

  describe('remove', () => {
    it('deletes the stored logo before removing a restaurant that has one', async () => {
      const restaurant = { id: '1', logoObjectKey: 'restaurant-logo/old.jpg' };
      restaurantRepository.findOne!.mockResolvedValue(restaurant);
      minioService.deleteFile.mockResolvedValue(undefined);

      await service.remove('1');

      expect(minioService.deleteFile).toHaveBeenCalledWith('1', 'restaurant-logo/old.jpg');
      expect(restaurantRepository.softDelete).toHaveBeenCalledWith('1');
    });

    it('does not call MinIO when the restaurant has no logo', async () => {
      const restaurant = { id: '1', logoObjectKey: null };
      restaurantRepository.findOne!.mockResolvedValue(restaurant);

      await service.remove('1');

      expect(minioService.deleteFile).not.toHaveBeenCalled();
      expect(restaurantRepository.softDelete).toHaveBeenCalledWith('1');
    });
  });

  describe('uploadLogo', () => {
    it('replaces an existing logo and persists the new URL/object key', async () => {
      const restaurant = {
        id: '1',
        logoObjectKey: 'restaurant-logo/old.jpg',
        status: RESTAURANT_STATUS.TRIAL,
        plan: RESTAURANT_PLAN.ESSENTIEL,
      };
      const file = { buffer: Buffer.from(''), originalname: 'new.jpg' } as Express.Multer.File;
      restaurantRepository.findOne!.mockResolvedValue(restaurant);
      restaurantRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));
      minioService.deleteFile.mockResolvedValue(undefined);
      minioService.uploadFile.mockResolvedValue({
        objectKey: 'restaurant-logo/new.jpg',
        url: 'http://minio/1/restaurant-logo/new.jpg',
        size: 10,
        mimeType: 'image/jpeg',
      });

      const result = await service.uploadLogo('1', file);

      expect(minioService.deleteFile).toHaveBeenCalledWith('1', 'restaurant-logo/old.jpg');
      expect(minioService.uploadFile).toHaveBeenCalledWith('1', file, RESTAURANT_LOGO_UPLOAD_PATH);
      expect(restaurantRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          logoUrl: 'http://minio/1/restaurant-logo/new.jpg',
          logoObjectKey: 'restaurant-logo/new.jpg',
        }),
      );
      expect(result.logoUrl).toBe('http://minio/1/restaurant-logo/new.jpg');
    });

    it('does not call deleteFile when there was no existing logo', async () => {
      const restaurant = {
        id: '1',
        logoObjectKey: null,
        status: RESTAURANT_STATUS.TRIAL,
        plan: RESTAURANT_PLAN.ESSENTIEL,
      };
      const file = { buffer: Buffer.from(''), originalname: 'first.jpg' } as Express.Multer.File;
      restaurantRepository.findOne!.mockResolvedValue(restaurant);
      restaurantRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));
      minioService.uploadFile.mockResolvedValue({
        objectKey: 'restaurant-logo/first.jpg',
        url: 'http://minio/1/restaurant-logo/first.jpg',
        size: 10,
        mimeType: 'image/jpeg',
      });

      await service.uploadLogo('1', file);

      expect(minioService.deleteFile).not.toHaveBeenCalled();
    });

    it('still uploads the new logo if deleting the old one fails', async () => {
      const restaurant = {
        id: '1',
        logoObjectKey: 'restaurant-logo/broken.jpg',
        status: RESTAURANT_STATUS.TRIAL,
        plan: RESTAURANT_PLAN.ESSENTIEL,
      };
      const file = { buffer: Buffer.from(''), originalname: 'new.jpg' } as Express.Multer.File;
      restaurantRepository.findOne!.mockResolvedValue(restaurant);
      restaurantRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));
      minioService.deleteFile.mockRejectedValue(new Error('bucket unreachable'));
      minioService.uploadFile.mockResolvedValue({
        objectKey: 'restaurant-logo/new.jpg',
        url: 'http://minio/1/restaurant-logo/new.jpg',
        size: 10,
        mimeType: 'image/jpeg',
      });

      const result = await service.uploadLogo('1', file);

      expect(result.logoObjectKey).toBe('restaurant-logo/new.jpg');
    });

    it('404s when the restaurant does not exist', async () => {
      restaurantRepository.findOne!.mockResolvedValue(null);

      await expect(service.uploadLogo('missing', {} as Express.Multer.File)).rejects.toThrow(
        NotFoundException,
      );
      expect(minioService.uploadFile).not.toHaveBeenCalled();
    });
  });
});
