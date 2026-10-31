import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Knex } from 'knex';
import { KNEX_CONNECTION } from '../database/database.constants.js';
import { ProductorsService } from './productors.service.js';
import type { ProductorRow } from './entities/productor.entity.js';

describe('ProductorsService', () => {
  let service: ProductorsService;

  const mockProductorsInsert = vi.fn();
  const mockProductorsReturning = vi.fn();
  const mockOutboxInsert = vi.fn();

  const mockTrx = vi.fn((table: string) => {
    if (table === 'productors') {
      return {
        insert: mockProductorsInsert.mockReturnValue({
          returning: mockProductorsReturning,
        }),
      };
    }
    if (table === 'outbox_productor') {
      return {
        insert: mockOutboxInsert,
      };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  const mockKnex = {
    transaction: vi.fn((callback: (trx: unknown) => Promise<unknown>) =>
      callback(mockTrx),
    ),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductorsService,
        {
          provide: KNEX_CONNECTION,
          useValue: mockKnex as unknown as Knex,
        },
      ],
    }).compile();

    service = module.get<ProductorsService>(ProductorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should insert productor and outbox event in a transaction and return the mapped productor', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      const simulatedCreatedAt = new Date('2026-10-31T12:00:00Z');
      const simulatedUpdatedAt = new Date('2026-10-31T12:00:00Z');
      const simulatedRow: ProductorRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: dto.name,
        created_at: simulatedCreatedAt,
        updated_at: simulatedUpdatedAt,
        deleted_at: null,
      };

      mockProductorsReturning.mockResolvedValue([simulatedRow]);
      mockOutboxInsert.mockResolvedValue([1]);

      const result = await service.create(dto);

      expect(mockKnex.transaction).toHaveBeenCalledTimes(1);
      expect(mockTrx).toHaveBeenCalledWith('productors');
      expect(mockProductorsInsert).toHaveBeenCalledWith({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        name: dto.name,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        deleted_at: null,
      });
      expect(mockProductorsReturning).toHaveBeenCalledWith('*');

      expect(mockTrx).toHaveBeenCalledWith('outbox_productor');
      expect(mockOutboxInsert).toHaveBeenCalledWith({
        id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        event_key: 'productor.created',
        payload: {
          id: simulatedRow.id,
          name: simulatedRow.name,
        },
        status: 'pending',
        locked_at: null,
        locked_by: null,
        failure_reason: null,
        failed_at: null,
        created_at: expect.any(Date),
      });

      expect(result).toEqual({
        id: simulatedRow.id,
        name: simulatedRow.name,
        createdAt: simulatedCreatedAt,
        updatedAt: simulatedUpdatedAt,
        deletedAt: null,
      });
    });

    it('should throw an error if inserting productor returns no row', async () => {
      const dto = { name: 'Fazenda Santa Maria' };

      mockProductorsReturning.mockResolvedValue([]);

      await expect(service.create(dto)).rejects.toThrow(
        'Failed to insert productor',
      );
      expect(mockTrx).toHaveBeenCalledWith('productors');
      expect(mockOutboxInsert).not.toHaveBeenCalled();
    });

    it('should propagate errors and not insert into outbox if productor insert fails', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      const error = new Error('Productors table write failure');

      mockProductorsReturning.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(
        'Productors table write failure',
      );
      expect(mockTrx).toHaveBeenCalledWith('productors');
      expect(mockOutboxInsert).not.toHaveBeenCalled();
    });

    it('should propagate errors if outbox_productor insert fails', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      const simulatedRow: ProductorRow = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: dto.name,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      const error = new Error('Outbox write failure');

      mockProductorsReturning.mockResolvedValue([simulatedRow]);
      mockOutboxInsert.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow('Outbox write failure');
      expect(mockTrx).toHaveBeenCalledWith('productors');
      expect(mockTrx).toHaveBeenCalledWith('outbox_productor');
    });

    it('should propagate error if transaction itself fails', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      mockKnex.transaction.mockRejectedValueOnce(
        new Error('Transaction aborted'),
      );

      await expect(service.create(dto)).rejects.toThrow('Transaction aborted');
    });
  });
});
