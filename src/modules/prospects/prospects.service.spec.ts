import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { ProspectsService } from './prospects.service';
import { DemoRequest, DESIRED_PLAN, PROSPECT_STATUS } from './entities/demo-request.entity';
import { MailService } from '@modules/mail/mail.service';

type MockRepository<T = any> = Partial<Record<keyof Repository<T>, jest.Mock>>;

const createMockRepository = <T = any>(): MockRepository<T> => ({
  find: jest.fn(),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
  save: jest.fn(),
  remove: jest.fn(),
});

describe('ProspectsService', () => {
  let service: ProspectsService;
  let repository: MockRepository<DemoRequest>;
  let mailService: { sendDemoRequestNotification: jest.Mock };

  beforeEach(async () => {
    mailService = { sendDemoRequestNotification: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProspectsService,
        { provide: getRepositoryToken(DemoRequest), useValue: createMockRepository() },
        { provide: MailService, useValue: mailService },
      ],
    }).compile();

    service = module.get<ProspectsService>(ProspectsService);
    repository = module.get(getRepositoryToken(DemoRequest));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('persists a valid demo request and sends a notification email', async () => {
      const dto = {
        restaurantName: 'Le Bangui Chic',
        contactName: 'Aïcha Doumta',
        phone: '+236 70 12 34 56',
        city: 'Bangui',
        desiredPlan: DESIRED_PLAN.PRO,
      };
      const saved = { id: '1', ...dto };
      repository.save!.mockResolvedValue(saved);

      const result = await service.create(dto as any);

      expect(repository.save).toHaveBeenCalledWith(dto);
      expect(mailService.sendDemoRequestNotification).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });

    it('silently discards a submission when the honeypot field is filled', async () => {
      const dto = {
        restaurantName: 'Bot Restaurant',
        contactName: 'Bot',
        phone: '+236 70 12 34 56',
        honeypot: 'filled-by-a-bot',
      };

      const result = await service.create(dto as any);

      expect(repository.save).not.toHaveBeenCalled();
      expect(mailService.sendDemoRequestNotification).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('does not fail the request when the notification email fails to send', async () => {
      const dto = { restaurantName: 'Le Bangui Chic', contactName: 'Aïcha', phone: '+236701234' };
      repository.save!.mockResolvedValue({ id: '1', ...dto });
      mailService.sendDemoRequestNotification.mockRejectedValue(new Error('SMTP down'));

      const result = await service.create(dto as any);

      expect(result).toEqual({ id: '1', ...dto });
    });
  });

  describe('findAll', () => {
    it('paginates and filters by status', async () => {
      const rows = [{ id: '1', status: PROSPECT_STATUS.NEW }];
      repository.findAndCount!.mockResolvedValue([rows, 1]);

      const result = await service.findAll({ status: PROSPECT_STATUS.NEW, page: 1, limit: 20, sortOrder: 'DESC' });

      expect(repository.findAndCount).toHaveBeenCalledWith({
        where: { status: PROSPECT_STATUS.NEW },
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({ data: rows, meta: { total: 1, page: 1, limit: 20, totalPages: 1 } });
    });
  });

  describe('updateStatus', () => {
    it('throws NotFoundException when the demo request does not exist', async () => {
      repository.findOne!.mockResolvedValue(null);

      await expect(service.updateStatus('missing', PROSPECT_STATUS.CONTACTED)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates and persists the new status', async () => {
      const existing = { id: '1', status: PROSPECT_STATUS.NEW };
      repository.findOne!.mockResolvedValue(existing);
      repository.save!.mockImplementation((entity) => Promise.resolve(entity));

      const result = await service.updateStatus('1', PROSPECT_STATUS.CONTACTED);

      expect(result.status).toBe(PROSPECT_STATUS.CONTACTED);
    });
  });
});
