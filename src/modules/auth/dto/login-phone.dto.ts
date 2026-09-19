import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

/**
 * DTO for mobile login by phone number + 4-digit access code, as an
 * alternative to email+password (LoginDto).
 */
export class LoginPhoneDto {
  @ApiProperty({
    description: 'User phone number',
    example: '77123456',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({
    description: '4-digit mobile access code',
    example: '0472',
  })
  @IsString()
  @Length(4, 4, { message: 'Code must be exactly 4 digits' })
  code: string;
}
