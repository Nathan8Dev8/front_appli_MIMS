import type { NextApiRequest, NextApiResponse } from 'next';
import { getHandler } from '../../../server/app';

// Le corps des requêtes est lu par NestJS (JSON, fichiers), pas par Next.js.
export const config = { api: { bodyParser: false, externalResolver: true, responseLimit: false }, maxDuration: 60 };

export default async function api(req: NextApiRequest, res: NextApiResponse) {
  const handle = await getHandler();
  // /files/... (adresses enregistrées en base) arrive ici par la réécriture de next.config.js.
  if (req.url && !req.url.startsWith('/api/')) req.url = `/api${req.url}`;
  await new Promise<void>((resolve) => {
    res.on('finish', resolve);
    res.on('close', resolve);
    handle(req, res);
  });
}
