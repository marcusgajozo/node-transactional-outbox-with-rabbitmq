import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductorDto {
  @ApiProperty({
    description: 'Productor name',
    example: 'Fazenda Santa Maria',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;
}
