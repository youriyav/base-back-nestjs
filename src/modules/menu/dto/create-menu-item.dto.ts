import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateMenuItemDto {
  @ApiProperty({
    description: 'Menu item name',
    example: 'Margherita',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Menu category ID (UUID)',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsNotEmpty()
  @IsUUID()
  categoryId: string;

  @ApiProperty({
    description: 'Price in FCFA (integer, no decimals)',
    example: 5000,
  })
  @IsNotEmpty()
  @IsInt()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Unit label (e.g. "500 g", "1 kg", "Plat", "Suppl.")',
    example: 'Plat',
  })
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional({
    description: 'Short description of the dish',
    example: 'Tomate, mozzarella, basilic',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Whether the item is currently available',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isAvailable?: boolean;

  @ApiPropertyOptional({
    description: 'Display order within its category (ascending)',
    example: 0,
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;
}
