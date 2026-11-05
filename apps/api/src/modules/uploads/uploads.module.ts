import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';

/** Files are written to UPLOAD_DIR and served statically at /api/uploads (see main.ts). */
@Module({ controllers: [UploadsController] })
export class UploadsModule {}
