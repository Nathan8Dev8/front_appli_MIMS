import { Injectable, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../database/prisma.service';
import { jwtSecret } from './jwt-secret';

interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
  /** Ticket de téléchargement : valable quelques minutes, pour ce seul chemin (voir AuthService.downloadTicket). */
  dl?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prisma: PrismaService) {
    super({
      // ?dl=… : un lien ouvert directement par le navigateur (téléchargement sur iPhone) ne peut pas envoyer d'en-tête.
      jwtFromRequest: ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), ExtractJwt.fromUrlQueryParameter('dl')]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret(),
      passReqToCallback: true,
    });
  }

  /**
   * Un token peut rester valide (non expiré) alors que le membre a été
   * supprimé ou désactivé entre-temps. On vérifie donc systématiquement
   * son existence ici plutôt que de laisser chaque contrôleur planter sur
   * un "record not found" — toute route protégée reçoit alors un 401 propre.
   */
  async validate(req: Request, payload: JwtPayload) {
    // Un ticket ne vaut que pour lire son fichier ; un jeton de session ne passe jamais dans l'URL.
    const fromQuery = !req.headers.authorization && typeof req.query.dl === 'string';
    if (payload.dl || fromQuery) {
      if (!payload.dl || req.method !== 'GET' || req.originalUrl.split('?')[0] !== `/api${payload.dl}`) {
        throw new UnauthorizedException('Lien de téléchargement invalide ou expiré.');
      }
    }
    const member = await this.prisma.member.findUnique({
      where: { id: payload.sub },
      include: { account: { select: { mustChangePassword: true } }, roles: { where: { actif: true }, select: { role: { select: { code: true } } } } },
    });
    if (!member || member.status !== 'ACTIF') {
      throw new UnauthorizedException('Ta session a expiré, reconnecte-toi.');
    }
    // Rôles relus en base à chaque requête : un rôle retiré cesse de compter immédiatement,
    // même si le jeton (90 j) a été émis avant.
    return {
      memberId: payload.sub,
      username: payload.username,
      roles: member.roles.map((r) => r.role.code),
      mustChangePassword: member.account?.mustChangePassword ?? false,
    };
  }
}
