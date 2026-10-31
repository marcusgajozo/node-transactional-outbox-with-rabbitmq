import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Test, type TestingModule } from '@nestjs/testing';
import { ProductorsController } from './productors.controller.js';
import { ProductorsService } from './productors.service.js';
import type { Productor } from './entities/productor.entity.js';

describe('ProductorsController', () => {
  let controller: ProductorsController;
  let service: ProductorsService;

  const mockProductorsService = {
    create: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductorsController],
      providers: [
        {
          provide: ProductorsService,
          useValue: mockProductorsService,
        },
      ],
    }).compile();

    controller = module.get<ProductorsController>(ProductorsController);
    service = module.get<ProductorsService>(ProductorsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call productorsService.create and return the created productor', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      const expectedProductor: Productor = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        name: 'Fazenda Santa Maria',
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };

      mockProductorsService.create.mockResolvedValue(expectedProductor);

      const result = await controller.create(dto);

      expect(mockProductorsService.create).toHaveBeenCalledTimes(1);
      expect(mockProductorsService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedProductor);
    });

    it('should propagate errors from productorsService.create', async () => {
      const dto = { name: 'Fazenda Santa Maria' };
      const error = new Error('Database error');

      mockProductorsService.create.mockRejectedValue(error);

      await expect(controller.create(dto)).rejects.toThrow('Database error');
      expect(mockProductorsService.create).toHaveBeenCalledTimes(1);
      expect(mockProductorsService.create).toHaveBeenCalledWith(dto);
    });
  });
});
