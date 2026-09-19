import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { EmplacementsService } from './emplacements.service';
import { Emplacement } from './entities/emplacement.entity';
import { Table } from '../tables/entities/table.entity';
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
  metadata: { name: 'Emplacement' } as never,
});

const RESTAURANT_A = 'test-restaurant-id';

describe('EmplacementsService', () => {
  let service: EmplacementsService;
  let emplacementRepository: MockRepository<Emplacement>;
  let tableRepository: MockRepository<Table>;
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;

  beforeEach(async () => {
    tenantContext = { getRestaurantIdOrThrow: jest.fn().mockReturnValue(RESTAURANT_A) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmplacementsService,
        { provide: getRepositoryToken(Emplacement), useValue: createMockRepository() },
        { provide: getRepositoryToken(Table), useValue: createMockRepository() },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<EmplacementsService>(EmplacementsService);
    emplacementRepository = module.get(getRepositoryToken(Emplacement));
    tableRepository = module.get(getRepositoryToken(Table));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('returns emplacements ordered ascending, scoped to the current restaurant', async () => {
      const emplacements = [{ id: '1', order: 0, restaurantId: RESTAURANT_A }];
      emplacementRepository.find!.mockResolvedValue(emplacements);

      const result = await service.findAll();

      expect(emplacementRepository.find).toHaveBeenCalledWith({
        order: { order: 'ASC' },
        where: { restaurantId: RESTAURANT_A },
      });
      expect(result).toBe(emplacements);
    });

    it('throws when there is no tenant context', async () => {
      tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(service.findAll()).rejects.toThrow(ForbiddenException);
      expect(emplacementRepository.find).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('creates an emplacement scoped to the current restaurant when the name is not taken', async () => {
      const dto = { name: 'Terrasse' };
      emplacementRepository.findOne!.mockResolvedValue(null);
      emplacementRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const result = await service.create(dto as any);

      expect(emplacementRepository.findOne).toHaveBeenCalledWith({
        where: { name: 'Terrasse', restaurantId: RESTAURANT_A },
      });
      expect(emplacementRepository.create).toHaveBeenCalledWith({
        ...dto,
        restaurantId: RESTAURANT_A,
      });
      expect(result).toEqual({ ...dto, restaurantId: RESTAURANT_A });
    });

    it('rejects a duplicate name within the same restaurant', async () => {
      emplacementRepository.findOne!.mockResolvedValue({
        id: 'existing',
        name: 'Terrasse',
        restaurantId: RESTAURANT_A,
      });

      await expect(service.create({ name: 'Terrasse' } as any)).rejects.toThrow(ConflictException);
      expect(emplacementRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('404s when the emplacement belongs to another restaurant (or does not exist)', async () => {
      emplacementRepository.findOne!.mockResolvedValue(null);

      await expect(service.update('other-tenant-id', { name: 'Salle' } as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects renaming to a name already used within the same restaurant', async () => {
      emplacementRepository
        .findOne!.mockResolvedValueOnce({ id: '1', name: 'Terrasse', restaurantId: RESTAURANT_A }) // findOneScopedOrFail(id)
        .mockResolvedValueOnce({ id: '2', name: 'Salle', restaurantId: RESTAURANT_A }); // clash lookup

      await expect(service.update('1', { name: 'Salle' } as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('throws NotFoundException when the emplacement does not exist in this restaurant', async () => {
      emplacementRepository.findOne!.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('refuses to delete an emplacement that still has tables', async () => {
      emplacementRepository.findOne!.mockResolvedValue({
        id: '1',
        name: 'Terrasse',
        restaurantId: RESTAURANT_A,
      });
      tableRepository.count!.mockResolvedValue(3);

      await expect(service.remove('1')).rejects.toThrow(ConflictException);
      expect(emplacementRepository.softDelete).not.toHaveBeenCalled();
    });

    it('deletes an empty emplacement', async () => {
      const emplacement = { id: '1', name: 'Terrasse', restaurantId: RESTAURANT_A };
      emplacementRepository.findOne!.mockResolvedValue(emplacement);
      tableRepository.count!.mockResolvedValue(0);

      await service.remove('1');

      expect(tableRepository.count).toHaveBeenCalledWith({
        where: { emplacementId: '1', restaurantId: RESTAURANT_A },
      });
      expect(emplacementRepository.softDelete).toHaveBeenCalledWith({ id: '1', restaurantId: RESTAURANT_A });
    });
  });
});
