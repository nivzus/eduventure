import { BadRequestException, Controller, HttpCode, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { uploadDir } from '../../common/env';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

/** Allowed image types: mimetype → stored extension. */
const IMAGE_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/pjpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
};

/** Sniff the real type from magic bytes so a renamed file can't slip through. */
export function sniffImage(buf: Buffer): string | null {
  if (buf.length >= 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length >= 6 && /^GIF8[79]a$/.test(buf.subarray(0, 6).toString('latin1'))) return 'gif';
  if (buf.length >= 12 && buf.subarray(0, 4).toString('latin1') === 'RIFF' && buf.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  const head = buf.subarray(0, 1024).toString('utf8').replace(/^﻿/, '').trimStart();
  if (/^(<\?xml[^>]*>\s*)?(<!--[\s\S]*?-->\s*)*(<!DOCTYPE svg[^>]*>\s*)?<svg[\s>]/i.test(head)) return 'svg';
  return null;
}

@Controller('uploads')
export class UploadsController {
  /** Any signed-in user (avatars, covers, question images). Returns `{url}` relative to the site root. */
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 } }))
  async upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Fayl göndərilməyib (multipart sahəsi: file)');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException('Fayl 5 MB-dan böyük ola bilməz');
    const declared = IMAGE_TYPES[file.mimetype?.toLowerCase()];
    const real = sniffImage(file.buffer);
    if (!declared || !real || (real !== declared && !(real === 'svg' && declared === 'svg'))) {
      throw new BadRequestException('Yalnız şəkil faylları (png, jpg, webp, gif, svg) qəbul olunur');
    }
    const name = `${randomBytes(16).toString('hex')}.${real}`;
    await writeFile(join(uploadDir(), name), file.buffer);
    return { url: `/api/uploads/${name}` };
  }
}
