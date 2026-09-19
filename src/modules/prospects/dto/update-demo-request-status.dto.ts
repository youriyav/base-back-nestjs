import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { PROSPECT_STATUS } from '../entities/demo-request.entity';

export class UpdateDemoRequestStatusDto {
  @ApiProperty({ description: 'New status', enum: PROSPECT_STATUS })
  @IsNotEmpty()
  @IsEnum(PROSPECT_STATUS)
  status: PROSPECT_STATUS;
}
