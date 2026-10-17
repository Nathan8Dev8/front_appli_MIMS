import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'http';
import helmet from 'helmet';
import { AppModule } from './app.module';

type Handler = (req: IncomingMessage, res: ServerResponse) => void;

/**
 * Démarre l'API NestJS sans écouter de port : c'est Next.js (route src/pages/api)
 * qui lui passe les requêtes. Démarrée une fois par instance, puis réutilisée.
 */
async function createApp(): Promise<Handler> {
  const app = await NestFactory.create(AppModule, { cors: false });
  app.use(helmet());
  // Front et API sont maintenant sur le même domaine : CORS seulement si on le demande.
  if (process.env.CORS_ORIGIN) app.enableCors({ origin: process.env.CORS_ORIGIN.split(','), credentials: true });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
  const express = app.getHttpAdapter().getInstance();
  // Vraie adresse du visiteur (Vercel la met dans x-forwarded-for et empêche de la falsifier) :
  // sinon tout le monde partage la même limite de tentatives de connexion.
  express.set('trust proxy', true);
  await app.init();
  return express;
}

let handler: Promise<Handler> | undefined;

export function getHandler() {
  handler ??= createApp().catch((err) => {
    handler = undefined; // nouvel essai à la prochaine requête
    throw err;
  });
  return handler;
}
