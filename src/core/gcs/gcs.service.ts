import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Storage } from '@google-cloud/storage';
import { extname, join } from 'path';
import { randomBytes } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class GcsService {
  private readonly logger = new Logger(GcsService.name);
  private readonly storage: Storage | null;
  private readonly bucket: string | null;

  constructor(private readonly config: ConfigService) {
    this.bucket = this.config.get<string>('GCS_BUCKET_NAME') ?? null;

    if (this.bucket) {
      // GCS mode — uses Workload Identity on GKE, or ADC (gcloud auth application-default login) locally
      this.storage = new Storage();
      this.logger.log(`GCS mode: bucket=${this.bucket}`);
    } else {
      // Local disk fallback — images survive only until process restart
      this.storage = null;
      this.logger.warn('GCS_BUCKET_NAME not set — falling back to local disk storage (local dev only)');
    }
  }

  /**
   * Upload a file buffer.
   * - GCS mode  → stores in GCS, returns a permanent public https://storage.googleapis.com/... URL
   * - Disk mode → stores in ./uploads, returns /api/v1/profile/file/<filename> (local dev only)
   */
  async uploadFile(
    buffer: Buffer,
    originalname: string,
    mimetype: string,
    folder = 'uploads',
  ): Promise<string> {
    const ext = extname(originalname);
    const unique = `${Date.now()}-${randomBytes(8).toString('hex')}${ext}`;

    if (this.storage && this.bucket) {
      // ── GCS ────────────────────────────────────────────────────────────────
      const filename = `${folder}/${unique}`;
      const file = this.storage.bucket(this.bucket).file(filename);
      await file.save(buffer, {
        metadata: { contentType: mimetype },
        resumable: false,
      });
      return `https://storage.googleapis.com/${this.bucket}/${filename}`;
    }

    // ── Local disk fallback ─────────────────────────────────────────────────
    const uploadsDir = join(process.cwd(), 'uploads');
    mkdirSync(uploadsDir, { recursive: true });
    writeFileSync(join(uploadsDir, unique), buffer);
    return `/api/v1/profile/file/${unique}`;
  }
}
