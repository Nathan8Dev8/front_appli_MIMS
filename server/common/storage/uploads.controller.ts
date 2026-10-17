import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { IsInt, IsString, Max, MaxLength, Min } from 'class-validator';
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { StorageService } from './storage.service';

/** Plus gros fichier accepté par l'appli (documents, comptes rendus). */
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

class PresignDto {
  @IsString()
  @MaxLength(200)
  contentType!: string;

  @IsInt()
  @Min(1)
  @Max(MAX_UPLOAD_BYTES)
  size!: number;
}

/** Lien d'envoi direct sur S3 pour un fichier trop gros pour passer par Vercel (voir S3Upload). */
@UseGuards(JwtAuthGuard)
@Controller('uploads')
export class UploadsController {
  constructor(private readonly storage: StorageService) {}

  @Post()
  async presign(@Body() dto: PresignDto) {
    const key = `tmp/${randomUUID()}`;
    const url = await this.storage.signedPutUrl(key, dto.contentType, dto.size);
    return url ? { key, url } : { key: null, url: null };
  }
}
