import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OutboxProductorResponseDto } from './dto/outbox-productor-response.dto.js';
import { OutboxProductor } from './entities/outbox-productor.entity.js';
import { OutboxProductorService } from './outbox-productor.service.js';

@ApiTags('outbox-productor')
@Controller('outbox-productor')
export class OutboxProductorController {
  constructor(
    private readonly outboxProductorService: OutboxProductorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Find all outbox productor events' })
  @ApiOkResponse({
    description: 'List of outbox events',
    type: OutboxProductorResponseDto,
    isArray: true,
  })
  async findAll(): Promise<OutboxProductor[]> {
    return await this.outboxProductorService.findAll();
  }
}
