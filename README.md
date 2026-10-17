# Jeunes MIMS — appli (front + API)

Un seul projet Next.js, hébergé sur Vercel :
- `src/` : le site (Next.js).
- `server/` : l'API NestJS, servie par la route `src/pages/api/[...path].ts` (toutes les adresses `/api/*`, plus `/files/*`).
- `prisma/` : schéma et migrations de la base (Neon).

## En local

```bash
npm install
cp .env.example .env   # puis remplir
npm run dev            # site + API sur http://localhost:3000
```

## Sur Vercel

- Variables : voir `.env.example` (S3 obligatoire, `CRON_SECRET` obligatoire).
- `npm run vercel-build` applique les migrations Prisma puis construit le site.
- Tâches automatiques : `vercel.json` (une fois par jour max en gratuit) et cron-job.org pour
  `/api/cron/hourly` toutes les heures, avec l'en-tête `Authorization: Bearer <CRON_SECRET>`.
- Vercel limite requêtes et réponses à 4,5 Mo : les gros fichiers passent directement par S3
  (le bucket doit autoriser GET et PUT depuis le domaine du site, voir CORS).
