import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { BaseService } from '@shared/services/base.service';
import { DemoRequest, PROSPECT_STATUS } from './entities/demo-request.entity';
import { CreateDemoRequestDto } from './dto/create-demo-request.dto';
import { QueryDemoRequestsDto } from './dto/query-demo-requests.dto';
import { MailService } from '@modules/mail/mail.service';

@Injectable()
export class ProspectsService extends BaseService<DemoRequest> {
  private readonly logger = new Logger(ProspectsService.name);

  constructor(
    @InjectRepository(DemoRequest)
    private readonly demoRequestRepository: Repository<DemoRequest>,
    private readonly mailService: MailService,
  ) {
    super(demoRequestRepository);
  }

  async create(dto: CreateDemoRequestDto): Promise<DemoRequest | null> {
    if (dto.honeypot) {
      this.logger.warn('Honeypot triggered on a demo request submission — discarded silently');
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { honeypot, ...data } = dto;
    const saved = await this.demoRequestRepository.save(data);

    // Fire-and-forget: a notification email (or a slow/unreachable mail queue)
    // must never block or fail the prospect's request.
    this.mailService
      .sendDemoRequestNotification({
        restaurantName: saved.restaurantName,
        contactName: saved.contactName,
        phone: saved.phone,
        email: saved.email,
        city: saved.city,
        desiredPlan: saved.desiredPlan,
        message: saved.message,
      })
      .catch((error: Error) => {
        this.logger.error(`Failed to send demo request notification: ${error.message}`);
      });

    return saved;
  }

  async findAll(query: QueryDemoRequestsDto): Promise<{
    data: DemoRequest[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const { status, page = 1, limit = 20, sortOrder = 'DESC' } = query;

    const where: FindOptionsWhere<DemoRequest> = {};
    if (status) where.status = status;

    const [data, total] = await this.demoRequestRepository.findAndCount({
      where,
      order: { createdAt: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string): Promise<DemoRequest> {
    const demoRequest = await this.demoRequestRepository.findOne({ where: { id } });

    if (!demoRequest) {
      throw new NotFoundException(`Demo request with ID ${id} not found`);
    }

    return demoRequest;
  }

  async updateStatus(id: string, status: PROSPECT_STATUS): Promise<DemoRequest> {
    const demoRequest = await this.findOne(id);
    demoRequest.status = status;
    return this.demoRequestRepository.save(demoRequest);
  }
}
