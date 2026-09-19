import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { TABLE_ETAT } from '@shared/enums/table-etat';

export class CreateTableDto {
  @ApiProperty({
    description: 'Table display name',
    example: 'T1',
  })
  @IsNotEmpty()
  @IsString()
  nom: string;

  @ApiPropertyOptional({
    description: 'ID of the emplacement (location/zone) this table belongs to',
    example: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  })
  @IsOptional()
  @IsUUID()
  emplacementId?: string;

  @ApiProperty({
    description: 'Seating capacity',
    example: 4,
  })
  @IsInt()
  @Min(1)
  capacite: number;

  @ApiPropertyOptional({
    description: 'Table status',
    enum: TABLE_ETAT,
    default: TABLE_ETAT.LIBRE,
  })
  @IsOptional()
  @IsEnum(TABLE_ETAT)
  etat?: TABLE_ETAT;

  @ApiPropertyOptional({
    description: 'Staff member assigned to serve this table (null to unassign)',
    example: null,
  })
  @IsOptional()
  @IsUUID()
  assignedStaffId?: string | null;
}
