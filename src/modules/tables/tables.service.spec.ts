import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TablesService } from './tables.service';
import { Table } from './entities/table.entity';
import { User } from '../users/users.entity';
import { Emplacement } from '../emplacements/entities/emplacement.entity';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  metadata: { name: 'Table' } as never,
});

const RESTAURANT_A = 'test-restaurant-id';

describe('TablesService', () => {
  let service: TablesService;
  let tableRepository: MockRepository<Table>;
  let userRepository: MockRepository<User>;
  let emplacementRepository: MockRepository<Emplacement>;
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;

  beforeEach(async () => {
    tenantContext = { getRestaurantIdOrThrow: jest.fn().mockReturnValue(RESTAURANT_A) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TablesService,
        { provide: getRepositoryToken(Table), useValue: createMockRepository() },
        { provide: getRepositoryToken(User), useValue: createMockRepository() },
        { provide: getRepositoryToken(Emplacement), useValue: createMockRepository() },
        { provide: TenantContextService, useValue: tenantContext },
      ],
    }).compile();

    service = module.get<TablesService>(TablesService);
    tableRepository = module.get(getRepositoryToken(Table));
    userRepository = module.get(getRepositoryToken(User));
    emplacementRepository = module.get(getRepositoryToken(Emplacement));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('loads tables scoped to the current restaurant with staff and emplacement relations', async () => {
      const tables = [
        { id: '1', restaurantId: RESTAURANT_A, assignedStaff: null, emplacement: null },
      ];
      tableRepository.find!.mockResolvedValue(tables);

      const result = await service.findAll();

      expect(tableRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC' },
        relations: ['assignedStaff', 'emplacement'],
        where: { restaurantId: RESTAURANT_A },
      });
      expect(result).toEqual(tables);
    });

    it('throws when there is no tenant context', async () => {
      tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
        throw new ForbiddenException('No tenant context available for this operation');
      });

      await expect(service.findAll()).rejects.toThrow(ForbiddenException);
    });

    it('strips the assigned staff down to safe fields', async () => {
      const tables = [
        {
          id: '1',
          restaurantId: RESTAURANT_A,
          assignedStaff: {
            id: 'staff-1',
            first_name: 'Ada',
            last_name: 'Lovelace',
            email: 'a@b.com',
          },
          emplacement: null,
        },
      ];
      tableRepository.find!.mockResolvedValue(tables);

      const [result] = await service.findAll();

      expect(result.assignedStaff).toEqual({
        id: 'staff-1',
        first_name: 'Ada',
        last_name: 'Lovelace',
      });
    });
  });

  describe('create', () => {
    it('creates a table when no staff or emplacement is provided', async () => {
      const dto = { nom: 'T1', capacite: 4 };
      tableRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const result = await service.create(dto as any);

      expect(userRepository.findOne).not.toHaveBeenCalled();
      expect(emplacementRepository.findOne).not.toHaveBeenCalled();
      expect(result).toEqual({ ...dto, restaurantId: RESTAURANT_A });
    });

    it('rejects an emplacementId that does not belong to the caller restaurant', async () => {
      emplacementRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.create({
          nom: 'T1',
          capacite: 4,
          emplacementId: 'other-restaurant-emplacement',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(tableRepository.save).not.toHaveBeenCalled();
    });

    it('accepts an emplacementId that belongs to the caller restaurant', async () => {
      emplacementRepository.findOne!.mockResolvedValue({ id: 'e1', restaurantId: RESTAURANT_A });
      tableRepository.save!.mockImplementation((entity: unknown) => Promise.resolve(entity));

      const dto = { nom: 'T1', capacite: 4, emplacementId: 'e1' };
      const result = await service.create(dto as any);

      expect(emplacementRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'e1', restaurantId: RESTAURANT_A },
      });
      expect(result).toEqual({ ...dto, restaurantId: RESTAURANT_A });
    });

    it('rejects an assignedStaffId that does not belong to the caller restaurant', async () => {
      userRepository.findOne!.mockResolvedValue(null);

      await expect(
        service.create({
          nom: 'T1',
          capacite: 4,
          assignedStaffId: 'other-restaurant-staff',
        } as any),
      ).rejects.toThrow(BadRequestException);
      expect(tableRepository.save).not.toHaveBeenCalled();
    });
  });
});
