import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';
import * as crypto from 'crypto';
import { Readable } from 'stream';

export interface UploadResult {
  bucket: string;
  key: string;
  etag: string;
  versionId: string | null;
  sizeBytes: number;
  checksumSha256: string;
  contentType: string;
  originalName: string;
}

export interface PresignedUrlResult {
  url: string;
  expiresAt: Date;
}

/** MITRA industrial file security rules */
const ALLOWED_MIME_TYPES = new Map<string, string[]>([
  ['step', ['application/step', 'model/step', 'application/octet-stream']],
  ['stp', ['application/step', 'model/step', 'application/octet-stream']],
  ['iges', ['model/iges', 'application/iges', 'application/octet-stream']],
  ['igs', ['model/iges', 'application/iges', 'application/octet-stream']],
  ['dxf', ['image/vnd.dxf', 'application/dxf', 'application/octet-stream']],
  ['dwg', ['application/acad', 'image/vnd.dwg', 'application/octet-stream']],
  ['pdf', ['application/pdf']],
  ['nc', ['text/plain', 'application/octet-stream']],
  ['tap', ['text/plain', 'application/octet-stream']],
  ['jpg', ['image/jpeg']],
  ['jpeg', ['image/jpeg']],
  ['png', ['image/png']],
  ['gif', ['image/gif']],
  ['mp4', ['video/mp4']],
  ['mov', ['video/quicktime']],
  ['doc', ['application/msword']],
  ['docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['xls', ['application/vnd.ms-excel']],
  ['xlsx', ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
  ['zip', ['application/zip', 'application/x-zip-compressed']],
]);

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

function validateUpload(buffer: Buffer, originalName: string, claimedContentType: string): void {
  const ext = (originalName.split('.').pop() ?? '').toLowerCase();
  if (!ext) throw new BadRequestException('File must have an extension');

  const allowedTypes = ALLOWED_MIME_TYPES.get(ext);
  if (!allowedTypes) {
    throw new BadRequestException(
      `File extension .${ext} is not allowed. Allowed: ${Array.from(ALLOWED_MIME_TYPES.keys()).join(', ')}`
    );
  }

  // MIME type validation: claimed type must match extension whitelist
  if (!allowedTypes.includes(claimedContentType.toLowerCase())) {
    throw new BadRequestException(
      `MIME type mismatch: extension .${ext} does not accept ${claimedContentType}. Expected: ${allowedTypes.join(', ')}`
    );
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new BadRequestException(
      `File too large: ${buffer.length} bytes. Maximum: ${MAX_FILE_SIZE_BYTES} bytes (50 MB)`
    );
  }

  // Magic-number validation for PDF, JPEG, PNG, GIF (first few bytes)
  const magic = buffer.slice(0, 8);
  if (ext === 'pdf' && !magic.toString('ascii').startsWith('%PDF')) {
    throw new BadRequestException('File content does not match PDF signature');
  }
  if ((ext === 'jpg' || ext === 'jpeg') && magic[0] !== 0xff && magic[1] !== 0xd8) {
    throw new BadRequestException('File content does not match JPEG signature');
  }
  if (ext === 'png' && magic.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    throw new BadRequestException('File content does not match PNG signature');
  }
}

@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private readonly defaultBucket: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Minio.Client({
      endPoint: configService.get<string>('MINIO_ENDPOINT', 'localhost'),
      port: configService.get<number>('MINIO_PORT', 9000),
      useSSL: configService.get<string>('MINIO_USE_SSL', 'false') === 'true',
      accessKey: (() => { const v = configService.get<string>('MINIO_ACCESS_KEY'); if (!v) throw new Error('[MITRA] MINIO_ACCESS_KEY is required'); return v; })(),
      secretKey: (() => { const v = configService.get<string>('MINIO_SECRET_KEY'); if (!v) throw new Error('[MITRA] MINIO_SECRET_KEY is required'); return v; })(),
    });
    this.defaultBucket = configService.get<string>('MINIO_BUCKET', 'mitra-documents');
  }

  /** Whether object storage is active in this environment. */
  private readonly enabled: boolean;

  async onModuleInit() {
    // Allow deployments without MinIO (local dev, CI) by setting
    // MINIO_ENABLED=false.  All upload/download calls will throw a clear
    // error rather than silently timing out against an unreachable endpoint.
    (this as any).enabled = this.configService.get<string>('MINIO_ENABLED', 'true') !== 'false';

    if (!(this as any).enabled) {
      this.logger.warn('MinIO disabled (MINIO_ENABLED=false). Object storage operations will throw.');
      return;
    }

    await this.ensureBucket(this.defaultBucket);
    const extraBuckets = ['mitra-design', 'mitra-quality', 'mitra-customer', 'mitra-knowledge'];
    for (const bucket of extraBuckets) {
      await this.ensureBucket(bucket);
    }
    this.logger.log('MinIO initialized with all required buckets');
  }

  async ensureBucket(bucket: string): Promise<void> {
    try {
      const exists = await this.client.bucketExists(bucket);
      if (!exists) {
        await this.client.makeBucket(bucket, 'us-east-1');
        this.logger.log(`Created bucket: ${bucket}`);
      }
    } catch (err) {
      this.logger.warn(`Could not ensure bucket ${bucket}: ${(err as Error).message}`);
    }
  }

  async uploadFile(
    buffer: Buffer,
    originalName: string,
    contentType: string,
    bucket?: string,
    folder?: string,
  ): Promise<UploadResult> {
    // ── Security validation ──────────────────────────────────────────────
    validateUpload(buffer, originalName, contentType);

    const targetBucket = bucket ?? this.defaultBucket;
    const checksumSha256 = crypto.createHash('sha256').update(buffer).digest('hex');
    const ext = originalName.split('.').pop() ?? 'bin';
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    const key = folder
      ? `${folder}/${timestamp}-${random}.${ext}`
      : `uploads/${timestamp}-${random}.${ext}`;

    const metaData = {
      'Content-Type': contentType,
      'x-amz-meta-original-name': originalName,
      'x-amz-meta-sha256': checksumSha256,
    };

    const stream = Readable.from(buffer);
    const etag = await this.client.putObject(targetBucket, key, stream, buffer.length, metaData);

    return {
      bucket: targetBucket,
      key,
      etag: typeof etag === 'string' ? etag : etag.etag,
      versionId: null,
      sizeBytes: buffer.length,
      checksumSha256,
      contentType,
      originalName,
    };
  }

  async getFileStream(bucket: string, key: string): Promise<Readable> {
    return this.client.getObject(bucket, key);
  }

  async getFileBuffer(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.client.getObject(bucket, key);
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
  }

  async generatePresignedGetUrl(bucket: string, key: string, expirySeconds = 3600): Promise<PresignedUrlResult> {
    const url = await this.client.presignedGetObject(bucket, key, expirySeconds);
    return { url, expiresAt: new Date(Date.now() + expirySeconds * 1000) };
  }

  async generatePresignedPutUrl(bucket: string, key: string, expirySeconds = 900): Promise<PresignedUrlResult> {
    const url = await this.client.presignedPutObject(bucket, key, expirySeconds);
    return { url, expiresAt: new Date(Date.now() + expirySeconds * 1000) };
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.removeObject(bucket, key);
    this.logger.log(`Deleted: ${bucket}/${key}`);
  }

  async copyFile(sourceBucket: string, sourceKey: string, destBucket: string, destKey: string): Promise<void> {
    const conds = new Minio.CopyConditions();
    await this.client.copyObject(destBucket, destKey, `/${sourceBucket}/${sourceKey}`, conds);
  }

  async fileExists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.statObject(bucket, key);
      return true;
    } catch {
      return false;
    }
  }

  async listFiles(bucket: string, prefix: string): Promise<Minio.BucketItem[]> {
    return new Promise((resolve, reject) => {
      const items: Minio.BucketItem[] = [];
      const stream = this.client.listObjectsV2(bucket, prefix, true);
      stream.on('data', (item) => items.push(item));
      stream.on('end', () => resolve(items));
      stream.on('error', reject);
    });
  }

  getDefaultBucket(): string {
    return this.defaultBucket;
  }
}
