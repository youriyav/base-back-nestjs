import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class AddTableOrderItemDto {
  @ApiProperty({ description: 'Mobile offline-queue idempotency key', example: 'orderitem-<tableId>-<timestamp>' })
  @IsNotEmpty()
  @IsString()
  clientId: string;

  @ApiPropertyOptional({ description: 'Menu item ID this line was ordered from, if still known' })
  @IsOptional()
  @IsUUID()
  menuItemId?: string;

  @ApiProperty({ description: 'Item name, snapshotted at add time', example: 'Tawouk' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ description: 'Unit price (FCFA), snapshotted at add time', example: 10000 })
  @IsInt()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ description: 'Quantity added in this event', example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;
}
