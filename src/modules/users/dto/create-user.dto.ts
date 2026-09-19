import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsEmail,
  IsBoolean,
  IsOptional,
  IsEnum,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { USER_ROLES } from '../../../shared/enums/user-roles';

/** SERVER/CASHIER accounts get a server-generated 4-digit access code instead — no password field required from the client. */
const MOBILE_PIN_ROLES: USER_ROLES[] = [USER_ROLES.SERVER, USER_ROLES.CASHIER];

export class CreateUserDto {
  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  @IsNotEmpty()
  @IsString()
  first_name: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  @IsNotEmpty()
  @IsString()
  last_name: string;

  @ApiPropertyOptional({
    description:
      'User email address. Not used for SERVER/CASHIER roles — those only need phone + access code.',
    example: 'john.doe@example.com',
  })
  @ValidateIf((dto) => !MOBILE_PIN_ROLES.includes(dto.role))
  @IsNotEmpty()
  @IsEmail()
  email?: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+33 6 12 34 56 78',
  })
  @IsNotEmpty()
  @IsString()
  phone: string;

  @ApiPropertyOptional({
    description:
      'User password (min 8 chars). Not used for SERVER/CASHIER roles — those get a server-generated 4-digit access code instead.',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @ValidateIf((dto) => !MOBILE_PIN_ROLES.includes(dto.role))
  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  password?: string;

  @ApiPropertyOptional({
    description: 'User address',
    example: '123 Main St, Paris, France',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    description: 'Whether the user account is activated',
    example: true,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isActivate?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the user is an admin',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isAdmin?: boolean;

  @ApiPropertyOptional({
    description: 'User role (admin role if isAdmin=true, gym role otherwise)',
    example: USER_ROLES.SUPER_ADMIN,
  })
  @IsOptional()
  @IsString()
  role?: USER_ROLES;
}
