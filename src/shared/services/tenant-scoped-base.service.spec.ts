import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { TenantScopedBaseService } from './tenant-scoped-base.service';
import { TenantContextService } from '@shared/tenant-context/tenant-context.service';

interface FakeEntity {
  id: string;
  restaurantId: string;
  name: string;
}

class FakeService extends TenantScopedBaseService<FakeEntity> {}

type MockRepository = Partial<Record<keyof Repository<FakeEntity>, jest.Mock>>;

const createMockRepository = (): MockRepository => ({
  find: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn((data: unknown) => data),
  save: jest.fn(),
  update: jest.fn(),
  softDelete: jest.fn(),
  metadata: { name: 'FakeEntity' } as never,
});

const RESTAURANT_A = 'restaurant-a';

describe('TenantScopedBaseService', () => {
  let repo: MockRepository;
  let tenantContext: jest.Mocked<Pick<TenantContextService, 'getRestaurantIdOrThrow'>>;
  let service: FakeService;

  beforeEach(() => {
    repo = createMockRepository();
    tenantContext = { getRestaurantIdOrThrow: jest.fn() };
    service = new FakeService(repo as unknown as Repository<FakeEntity>, tenantContext as never);
  });

  it('throws when there is no tenant context', async () => {
    tenantContext.getRestaurantIdOrThrow.mockImplementation(() => {
      throw new ForbiddenException('No tenant context available for this operation');
    });

    await expect(service.findAllScoped()).rejects.toThrow(ForbiddenException);
    await expect(service.saveScoped({ name: 'x' } as never)).rejects.toThrow(ForbiddenException);
    expect(repo.find).not.toHaveBeenCalled();
    expect(repo.save).not.toHaveBeenCalled();
  });

  it('stamps restaurantId from context on create', async () => {
    tenantContext.getRestaurantIdOrThrow.mockReturnValue(RESTAURANT_A);
    repo.save!.mockImplementation((entity) => Promise.resolve(entity));

    const result = await service.saveScoped({ name: 'Pizza' } as never);

    expect(repo.create).toHaveBeenCalledWith({ name: 'Pizza', restaurantId: RESTAURANT_A });
    expect(result).toEqual({ name: 'Pizza', restaurantId: RESTAURANT_A });
  });

  it('scopes findAllScoped to the current restaurant', async () => {
    tenantContext.getRestaurantIdOrThrow.mockReturnValue(RESTAURANT_A);
    repo.find!.mockResolvedValue([]);

    await service.findAllScoped({ name: 'Pizza' } as never, { order: { name: 'ASC' } as never });

    expect(repo.find).toHaveBeenCalledWith({
      order: { name: 'ASC' },
      where: { restaurantId: RESTAURANT_A, name: 'Pizza' },
    });
  });

  it('404s findOneScopedOrFail when the row belongs to another tenant (or does not exist)', async () => {
    tenantContext.getRestaurantIdOrThrow.mockReturnValue(RESTAURANT_A);
    repo.findOne!.mockResolvedValue(null);

    await expect(service.findOneScopedOrFail('some-id')).rejects.toThrow(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({
      where: { id: 'some-id', restaurantId: RESTAURANT_A },
    });
  });

  it('updateScoped 404s before writing when the row is out of scope', async () => {
    tenantContext.getRestaurantIdOrThrow.mockReturnValue(RESTAURANT_A);
    repo.findOne!.mockResolvedValue(null);

    await expect(service.updateScoped('other-tenant-id', { name: 'x' } as never)).rejects.toThrow(
      NotFoundException,
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it('softDeleteScoped only deletes rows within the current tenant', async () => {
    tenantContext.getRestaurantIdOrThrow.mockReturnValue(RESTAURANT_A);
    repo.findOne!.mockResolvedValue({ id: 'x', restaurantId: RESTAURANT_A, name: 'Pizza' });

    await service.softDeleteScoped('x');

    expect(repo.softDelete).toHaveBeenCalledWith({ id: 'x', restaurantId: RESTAURANT_A });
  });
});
