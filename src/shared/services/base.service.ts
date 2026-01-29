import { Repository, DeepPartial } from 'typeorm';

export abstract class BaseService<T extends { id: string }> {
  constructor(protected readonly repo: Repository<T>) {}

  async save(data: DeepPartial<T>): Promise<T> {
    const entity = this.repo.create(data);
    return this.repo.save(entity);
  }

  async update(id: string, data: DeepPartial<T>): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    await this.repo.update(id, data as any);
    return this.findOne(id);
  }

  async softDelete(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }

  async restore(id: string): Promise<void> {
    await this.repo.restore(id);
  }

  async findOne(id: string): Promise<T> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    return this.repo.findOneOrFail({ where: { id } as any });
  }
}
