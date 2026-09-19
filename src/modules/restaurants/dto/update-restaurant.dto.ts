import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRestaurantDto } from './create-restaurant.dto';

/**
 * `plan` is deliberately excluded — it's immutable via PATCH /restaurants/:id
 * for every caller. Still readable on every response (drives MRR), just not
 * settable here; ValidationPipe({ whitelist: true }) also strips it from the
 * request body if a client still sends it, so this isn't type-only.
 */
export class UpdateRestaurantDto extends PartialType(
  OmitType(CreateRestaurantDto, ['plan'] as const),
) {}
