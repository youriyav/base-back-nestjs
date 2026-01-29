import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MinioService } from './minio.service';
import { User } from '@modules/auth/decorators';
import { User as UserEntity } from '@modules/users/users.entity';
import { JwtAuthGuard } from '@modules/auth/guards/jwt-auth.guard';
import { ApiResponse as SharedApiResponse } from '@shared/types';

@ApiTags('Storage')
@Controller('storage')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StorageController {
  constructor(private readonly minioService: MinioService) {}

  /**
   * Get presigned URL for file download
   * GET /storage/presigned-url
   */
  @Get('presigned-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir une URL signee pour telecharger un fichier',
    description:
      "Genere une URL signee temporaire pour telecharger un fichier depuis MinIO. L'URL expire apres la duree specifiee.",
  })
  @ApiQuery({
    name: 'objectKey',
    type: String,
    required: true,
    description: "Cle de l'objet (chemin du fichier dans le bucket)",
    example: 'uploads/1234567890-123456789.pdf',
  })
  @ApiQuery({
    name: 'expiry',
    type: Number,
    required: false,
    description: "Duree d'expiration en secondes (defaut: 7 jours = 604800)",
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'URL signee generee avec succes',
  })
  @ApiResponse({
    status: 400,
    description: 'Parametres invalides (objectKey manquant)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifie',
  })
  async getPresignedUrl(
    @Query('objectKey') objectKey: string,
    @Query('expiry') expiry?: string,
    @User() user?: UserEntity,
  ): Promise<
    SharedApiResponse<{
      url: string;
      objectKey: string;
      expiry: number;
    }>
  > {
    if (!objectKey) {
      throw new BadRequestException({
        code: 'MISSING_OBJECT_KEY',
        message: 'Le parametre objectKey est requis',
      });
    }

    // Parse expiry (default: 7 days in seconds)
    const expirySeconds = expiry ? parseInt(expiry, 10) : 7 * 24 * 60 * 60;

    if (isNaN(expirySeconds) || expirySeconds <= 0) {
      throw new BadRequestException({
        code: 'INVALID_EXPIRY',
        message: 'Le parametre expiry doit etre un nombre positif',
      });
    }

    // Maximum expiry: 7 days
    const maxExpiry = 7 * 24 * 60 * 60;
    const finalExpiry = Math.min(expirySeconds, maxExpiry);

    const url = await this.minioService.getPresignedUrl(user!.id, objectKey, finalExpiry);

    return {
      success: true,
      data: {
        url,
        objectKey,
        expiry: finalExpiry,
      },
    };
  }

  /**
   * Get presigned URL for file upload
   * GET /storage/presigned-upload-url
   */
  @Get('presigned-upload-url')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Obtenir une URL signee pour uploader un fichier',
    description:
      "Genere une URL signee temporaire pour uploader un fichier vers MinIO. L'URL expire apres la duree specifiee.",
  })
  @ApiQuery({
    name: 'objectKey',
    type: String,
    required: true,
    description: "Cle de l'objet (chemin ou le fichier sera stocke)",
    example: 'uploads/new-file.pdf',
  })
  @ApiQuery({
    name: 'expiry',
    type: Number,
    required: false,
    description: "Duree d'expiration en secondes (defaut: 1 heure = 3600)",
    example: 3600,
  })
  @ApiResponse({
    status: 200,
    description: 'URL signee generee avec succes',
  })
  @ApiResponse({
    status: 400,
    description: 'Parametres invalides (objectKey manquant)',
  })
  @ApiResponse({
    status: 401,
    description: 'Non authentifie',
  })
  async getPresignedUploadUrl(
    @Query('objectKey') objectKey: string,
    @Query('expiry') expiry?: string,
    @User() user?: UserEntity,
  ): Promise<
    SharedApiResponse<{
      url: string;
      objectKey: string;
      expiry: number;
    }>
  > {
    if (!objectKey) {
      throw new BadRequestException({
        code: 'MISSING_OBJECT_KEY',
        message: 'Le parametre objectKey est requis',
      });
    }

    // Parse expiry (default: 1 hour in seconds)
    const expirySeconds = expiry ? parseInt(expiry, 10) : 60 * 60;

    if (isNaN(expirySeconds) || expirySeconds <= 0) {
      throw new BadRequestException({
        code: 'INVALID_EXPIRY',
        message: 'Le parametre expiry doit etre un nombre positif',
      });
    }

    // Maximum expiry: 24 hours for uploads
    const maxExpiry = 24 * 60 * 60;
    const finalExpiry = Math.min(expirySeconds, maxExpiry);

    const url = await this.minioService.getPresignedPutUrl(user!.id, objectKey, finalExpiry);

    return {
      success: true,
      data: {
        url,
        objectKey,
        expiry: finalExpiry,
      },
    };
  }
}
