import { PartialType } from '@nestjs/swagger';
import { CreateEmplacementDto } from './create-emplacement.dto';

export class UpdateEmplacementDto extends PartialType(CreateEmplacementDto) {}
