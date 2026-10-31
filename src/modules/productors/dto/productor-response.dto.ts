import { ApiProperty } from '@nestjs/swagger';

export class ProductorResponseDto {
  @ApiProperty({
    description: 'Productor unique identifier',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Productor name',
    example: 'Fazenda Santa Maria',
  })
  name!: string;

  @ApiProperty({
    description: 'Productor creation timestamp',
    example: '2026-10-31T12:00:00.000Z',
  })
  createdAt!: Date;

  @ApiProperty({
    description: 'Productor last update timestamp',
    example: '2026-10-31T12:00:00.000Z',
  })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Productor deletion timestamp',
    example: null,
    nullable: true,
  })
  deletedAt!: Date | null;
}
