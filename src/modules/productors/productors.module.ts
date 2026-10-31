import { Module } from '@nestjs/common';
import { ProductorsController } from './productors.controller.js';
import { ProductorsService } from './productors.service.js';

@Module({
  controllers: [ProductorsController],
  providers: [ProductorsService],
  exports: [ProductorsService],
})
export class ProductorsModule {}
