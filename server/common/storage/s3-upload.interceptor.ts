import { BadRequestException, CallHandler, ExecutionContext, Injectable, mixin, NestInterceptor, PayloadTooLargeException } from '@nestjs/common';
import { StorageService } from './storage.service';

/**
 * À placer juste après FileInterceptor. Vercel refuse les requêtes de plus de
 * 4,5 Mo : pour un gros fichier, le navigateur l'envoie d'abord sur S3
 * (POST /uploads) puis transmet seulement sa référence dans le champ du
 * fichier. On le récupère ici pour que la suite du code reçoive `req.file`
 * comme d'habitude.
 */
export function S3Upload(field: string, maxBytes: number) {
  @Injectable()
  class S3UploadInterceptor implements NestInterceptor {
    constructor(private readonly storage: StorageService) {}

    async intercept(context: ExecutionContext, next: CallHandler) {
      const req = context.switchToHttp().getRequest();
      const raw = req.body?.[field];
      if (!req.file && typeof raw === 'string') {
        delete req.body[field];
        let ref: { key?: unknown; name?: unknown; type?: unknown };
        try {
          ref = JSON.parse(raw);
        } catch {
          throw new BadRequestException('Fichier invalide.');
        }
        if (typeof ref?.key !== 'string' || !/^tmp\/[0-9a-f-]{36}$/.test(ref.key)) throw new BadRequestException('Fichier invalide.');
        const buffer = await this.storage.get(ref.key).catch(() => {
          throw new BadRequestException("Le fichier envoyé est introuvable, réessaie.");
        });
        await this.storage.delete(ref.key).catch(() => undefined);
        if (buffer.length > maxBytes) throw new PayloadTooLargeException('Fichier trop volumineux.');
        req.file = {
          fieldname: field,
          originalname: typeof ref.name === 'string' ? ref.name : 'fichier',
          mimetype: typeof ref.type === 'string' && ref.type ? ref.type : 'application/octet-stream',
          size: buffer.length,
          buffer,
        };
      }
      return next.handle();
    }
  }
  return mixin(S3UploadInterceptor);
}
