import { BadRequestException, CallHandler, ExecutionContext, Injectable, NestInterceptor, ServiceUnavailableException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Observable, catchError, from, mergeMap, of, throwError } from 'rxjs';
import { PrismaService } from '../database/prisma.service';

/** Au-delà, une clé restée « en cours » vient d'un envoi interrompu (instance coupée) : on la libère. */
const STALE_MS = 2 * 60 * 1000;

/**
 * En-tête Idempotency-Key (file hors ligne du téléphone) : la première requête
 * s'exécute, une même clé renvoyée ensuite reçoit la réponse déjà donnée. Sans
 * ça, un encaissement renvoyé après une coupure réseau serait compté deux fois.
 * Une action refusée (erreur) libère sa clé : le serveur reste le seul arbitre.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(ctx: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = ctx.switchToHttp().getRequest<{ method: string; headers: Record<string, unknown> }>();
    const key = req.headers['idempotency-key'];
    if (req.method === 'GET' || typeof key !== 'string') return next.handle();
    if (!/^[\w-]{8,100}$/.test(key)) throw new BadRequestException("Clé d'envoi invalide.");

    return from(this.reserve(key)).pipe(
      mergeMap((previous) => {
        if (previous) return of(previous.body ?? undefined);
        return next.handle().pipe(
          mergeMap((body) =>
            from(
              this.prisma.idempotencyKey.update({
                where: { key },
                data: { done: true, body: body === undefined ? Prisma.JsonNull : (body as Prisma.InputJsonValue) },
              }),
            ).pipe(mergeMap(() => of(body))),
          ),
          catchError((err) =>
            from(this.prisma.idempotencyKey.delete({ where: { key } }).catch(() => undefined)).pipe(mergeMap(() => throwError(() => err))),
          ),
        );
      }),
    );
  }

  /** null = première fois (clé réservée) ; sinon la réponse déjà donnée. */
  private async reserve(key: string): Promise<{ body: unknown } | null> {
    try {
      await this.prisma.idempotencyKey.create({ data: { key } });
      return null;
    } catch (err) {
      if (!(err instanceof Prisma.PrismaClientKnownRequestError) || err.code !== 'P2002') throw err;
    }
    const existing = await this.prisma.idempotencyKey.findUnique({ where: { key } });
    if (!existing) return this.reserve(key); // libérée entre-temps
    if (existing.done) return { body: existing.body };
    if (Date.now() - existing.createdAt.getTime() > STALE_MS) {
      await this.prisma.idempotencyKey.deleteMany({ where: { key, done: false } });
      return this.reserve(key);
    }
    throw new ServiceUnavailableException("Cette action est déjà en cours d'envoi.");
  }
}
