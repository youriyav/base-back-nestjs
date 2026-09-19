import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateAdditionItemDto {
  @ApiPropertyOptional({ description: 'Menu item ID this line was ordered from, if still known' })
  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @ApiProperty({ description: 'Item name, snapshotted at print time', example: 'Tawouk' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unit price (FCFA), snapshotted at print time', example: 10000 })
  @IsInt()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Quantity', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}
