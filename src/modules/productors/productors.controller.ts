import { Body, Controller, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ProductorsService } from './productors.service.js';
import { CreateProductorDto } from './dto/create-productor.dto.js';
import { ProductorResponseDto } from './dto/productor-response.dto.js';
import type { Productor } from './entities/productor.entity.js';

@ApiTags('productors')
@Controller('productors')
export class ProductorsController {
  constructor(private readonly productorsService: ProductorsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new productor' })
  @ApiCreatedResponse({
    description: 'The productor has been successfully created.',
    type: ProductorResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid payload provided',
  })
  async create(@Body() body: CreateProductorDto): Promise<Productor> {
    return await this.productorsService.create(body);
  }
}
