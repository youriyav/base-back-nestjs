import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import { Readable } from 'stream';

export interface UploadResult {
  objectKey: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface PresignedUrlOptions {
  expiry?: number; // Expiration time in seconds
  requestDate?: Date; // Request date for the signature
  versionId?: string; // Version ID of the object
  partNumber?: number; // Part number for multipart upload
  extraQueryParams?: Record<string, string>; // Additional query parameters
  extraHeaders?: Record<string, string>; // Additional headers
}

export interface PresignedPostUrlResult {
  url: string;
  fields: Record<string, string>;
}

@Injectable()
export class MinioService {
  private readonly logger = new Logger(MinioService.name);
  private minioClient: Minio.Client;
  private bucketPrefix: string;

  constructor(private readonly configService: ConfigService) {
    const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
    const port = this.configService.get<number>('MINIO_PORT', 9000);
    const accessKey = this.configService.get<string>('MINIO_ACCESS_KEY', 'minioadmin');
    const secretKey = this.configService.get<string>('MINIO_SECRET_KEY', 'minioadmin');
    // Ensure useSSL is a boolean (handle string values from env)
    const useSSLValue = this.configService.get<string | boolean>('MINIO_USE_SSL', false);
    const useSSL = useSSLValue === true || useSSLValue === 'true' || useSSLValue === '1';
    this.bucketPrefix = this.configService.get<string>('MINIO_BUCKET_PREFIX', 'workspace');

    this.minioClient = new Minio.Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });

    this.logger.log(`MinIO client initialized: ${endpoint}:${port} (SSL: ${useSSL})`);
  }

  /**
   * Check MinIO connection by listing buckets
   * @returns true if connection is successful, throws error otherwise
   */
  async checkConnection(): Promise<boolean> {
    try {
      await this.minioClient.listBuckets();
      this.logger.debug('MinIO connection check successful');
      return true;
    } catch (error) {
      this.logger.error(`MinIO connection check failed: ${error.message}`, error.stack);
      throw new InternalServerErrorException(`MinIO connection is not available: ${error.message}`);
    }
  }

  /**
   * Get bucket name for a tenant
   */
  private getBucketName(tenantId: string): string {
    return `${this.bucketPrefix}-${tenantId}`;
  }

  /**
   * Ensure bucket exists, create if it doesn't
   * Automatically makes the bucket public for read access
   */
  async ensureBucket(tenantId: string): Promise<void> {
    const bucketName = this.getBucketName(tenantId);
    const exists = await this.minioClient.bucketExists(bucketName);

    if (!exists) {
      await this.minioClient.makeBucket(bucketName);
      this.logger.log(`Created bucket: ${bucketName}`);
      await this.setBucketPublic(tenantId);
    }
  }

  /**
   * Set bucket policy to make it public (read-only access)
   */
  async setBucketPublic(tenantId: string): Promise<void> {
    try {
      const bucketName = this.getBucketName(tenantId);

      const exists = await this.minioClient.bucketExists(bucketName);
      if (!exists) {
        await this.minioClient.makeBucket(bucketName);
        this.logger.log(`Created bucket: ${bucketName}`);
      }

      try {
        const existingPolicy = await this.minioClient.getBucketPolicy(bucketName);
        if (existingPolicy) {
          const policy = JSON.parse(existingPolicy);
          const hasPublicRead = policy.Statement?.some(
            (stmt: { Effect?: string; Principal?: { AWS?: string[] }; Action?: string[] }) =>
              stmt.Effect === 'Allow' &&
              stmt.Principal?.AWS?.includes('*') &&
              stmt.Action?.includes('s3:GetObject'),
          );

          if (hasPublicRead) {
            this.logger.debug(`Bucket ${bucketName} is already public`);
            return;
          }
        }
      } catch {
        this.logger.debug(`No existing policy found for ${bucketName}, will set public policy`);
      }

      const publicPolicy = {
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: {
              AWS: ['*'],
            },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucketName}/*`],
          },
        ],
      };

      await this.minioClient.setBucketPolicy(bucketName, JSON.stringify(publicPolicy));

      this.logger.log(`Bucket ${bucketName} is now public (read-only access enabled)`);
    } catch (error) {
      this.logger.error(`Error setting bucket policy to public: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la configuration de la politique publique du bucket: ${error.message}`,
      );
    }
  }

  /**
   * Remove public access from bucket (make it private)
   */
  async setBucketPrivate(tenantId: string): Promise<void> {
    try {
      const bucketName = this.getBucketName(tenantId);
      await this.minioClient.setBucketPolicy(bucketName, '');
      this.logger.log(`Bucket ${bucketName} is now private`);
    } catch (error) {
      this.logger.error(`Error setting bucket policy to private: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la configuration de la politique privee du bucket: ${error.message}`,
      );
    }
  }

  /**
   * Upload a file to MinIO
   */
  async uploadFile(
    tenantId: string,
    file: Express.Multer.File,
    path: string,
  ): Promise<UploadResult> {
    try {
      await this.ensureBucket(tenantId);
      const bucketName = this.getBucketName(tenantId);

      const timestamp = Date.now();
      const random = Math.round(Math.random() * 1e9);
      const ext = file.originalname.split('.').pop() || '';
      const fileName = `${timestamp}-${random}.${ext}`;
      const objectKey = `${path}/${fileName}`;

      const fileStream = Readable.from(file.buffer);
      await this.minioClient.putObject(bucketName, objectKey, fileStream, file.size, {
        'Content-Type': file.mimetype || 'application/octet-stream',
        'X-Original-Name': file.originalname,
      });

      const publicUrl = this.configService.get<string>('MINIO_PUBLIC_URL');

      let url: string;
      if (publicUrl) {
        url = `${publicUrl}/${bucketName}/${objectKey}`;
      } else {
        const endpoint = this.configService.get<string>('MINIO_ENDPOINT', 'localhost');
        const port = this.configService.get<number>('MINIO_PORT', 9000);
        const useSSLValue = this.configService.get<string | boolean>('MINIO_USE_SSL', false);
        const useSSL = useSSLValue === true || useSSLValue === 'true' || useSSLValue === '1';
        const protocol = useSSL ? 'https' : 'http';
        url = `${protocol}://${endpoint}:${port}/${bucketName}/${objectKey}`;
      }

      this.logger.log(`File uploaded to MinIO: ${objectKey} (${file.size} bytes)`);

      return {
        objectKey,
        url,
        size: file.size,
        mimeType: file.mimetype || 'application/octet-stream',
      };
    } catch (error) {
      this.logger.error(`Error uploading file to MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de l'upload du fichier vers MinIO: ${error.message}`,
      );
    }
  }

  /**
   * Upload multiple files to MinIO
   */
  async uploadFiles(
    tenantId: string,
    files: Express.Multer.File[],
    path = 'uploads',
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(tenantId, file, path));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete a file from MinIO
   */
  async deleteFile(tenantId: string, objectKey: string): Promise<void> {
    try {
      const bucketName = this.getBucketName(tenantId);
      await this.minioClient.removeObject(bucketName, objectKey);
      this.logger.log(`File deleted from MinIO: ${objectKey}`);
    } catch (error) {
      this.logger.error(`Error deleting file from MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la suppression du fichier depuis MinIO: ${error.message}`,
      );
    }
  }

  /**
   * Get a file from MinIO
   */
  async getFile(tenantId: string, objectKey: string): Promise<Readable> {
    try {
      const bucketName = this.getBucketName(tenantId);
      return await this.minioClient.getObject(bucketName, objectKey);
    } catch (error) {
      this.logger.error(`Error getting file from MinIO: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la recuperation du fichier depuis MinIO: ${error.message}`,
      );
    }
  }

  /**
   * Get presigned URL for GET operation (download/read)
   */
  async getPresignedUrl(
    tenantId: string,
    objectKey: string,
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<string> {
    try {
      const bucketName = this.getBucketName(tenantId);
      return await this.minioClient.presignedGetObject(bucketName, objectKey, expiry);
    } catch (error) {
      this.logger.error(`Error generating presigned GET URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la generation de l'URL signee GET: ${error.message}`,
      );
    }
  }

  /**
   * Get presigned URL for PUT operation (upload)
   */
  async getPresignedPutUrl(
    tenantId: string,
    objectKey: string,
    expiry: number = 60 * 60,
  ): Promise<string> {
    try {
      const bucketName = this.getBucketName(tenantId);
      await this.ensureBucket(tenantId);
      return await this.minioClient.presignedPutObject(bucketName, objectKey, expiry);
    } catch (error) {
      this.logger.error(`Error generating presigned PUT URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la generation de l'URL signee PUT: ${error.message}`,
      );
    }
  }

  /**
   * Get presigned URL with advanced options
   */
  async getPresignedUrlAdvanced(
    tenantId: string,
    objectKey: string,
    options: PresignedUrlOptions = {},
  ): Promise<string> {
    try {
      const bucketName = this.getBucketName(tenantId);
      const expiry = options.expiry || 7 * 24 * 60 * 60;
      return await this.minioClient.presignedGetObject(bucketName, objectKey, expiry);
    } catch (error) {
      this.logger.error(`Error generating advanced presigned URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la generation de l'URL signee avancee: ${error.message}`,
      );
    }
  }

  /**
   * Generate presigned POST URL for direct browser uploads
   */
  async getPresignedPostUrl(
    tenantId: string,
    objectKey: string,
    expiry: number = 60 * 60,
    contentType?: string,
    maxSize?: number,
  ): Promise<PresignedPostUrlResult> {
    try {
      const bucketName = this.getBucketName(tenantId);
      await this.ensureBucket(tenantId);

      const policy = {
        expiration: new Date(Date.now() + expiry * 1000).toISOString(),
        conditions: [{ bucket: bucketName }, ['starts-with', '$key', objectKey]] as Array<
          Record<string, string> | [string, string, string] | [string, number, number]
        >,
      };

      if (contentType) {
        policy.conditions.push({ 'Content-Type': contentType });
      }

      if (maxSize) {
        policy.conditions.push(['content-length-range', 0, maxSize]);
      }

      const url = await this.minioClient.presignedPutObject(bucketName, objectKey, expiry);

      return {
        url,
        fields: {
          key: objectKey,
          ...(contentType && { 'Content-Type': contentType }),
        },
      };
    } catch (error) {
      this.logger.error(`Error generating presigned POST URL: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la generation de l'URL signee POST: ${error.message}`,
      );
    }
  }

  /**
   * Generate multiple presigned URLs at once
   */
  async getPresignedUrlsBatch(
    tenantId: string,
    objectKeys: string[],
    expiry: number = 7 * 24 * 60 * 60,
  ): Promise<Record<string, string>> {
    try {
      const results: Record<string, string> = {};
      const promises = objectKeys.map(async (objectKey) => {
        const url = await this.getPresignedUrl(tenantId, objectKey, expiry);
        results[objectKey] = url;
      });

      await Promise.all(promises);
      return results;
    } catch (error) {
      this.logger.error(`Error generating batch presigned URLs: ${error.message}`, error.stack);
      throw new InternalServerErrorException(
        `Erreur lors de la generation des URLs signees en lot: ${error.message}`,
      );
    }
  }

  /**
   * Get presigned URL with custom expiration in hours
   */
  async getPresignedUrlHours(tenantId: string, objectKey: string, hours = 24): Promise<string> {
    return this.getPresignedUrl(tenantId, objectKey, hours * 60 * 60);
  }

  /**
   * Get presigned URL with custom expiration in days
   */
  async getPresignedUrlDays(tenantId: string, objectKey: string, days = 7): Promise<string> {
    return this.getPresignedUrl(tenantId, objectKey, days * 24 * 60 * 60);
  }
}
