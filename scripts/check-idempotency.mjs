// Lancer avec le serveur local sur le port 3010 et la base LOCALE : node scripts/check-idempotency.mjs
// Vérifie qu'une même Idempotency-Key ne crée qu'un seul encaissement.
import { createRequire } from 'module';
const require = createRequire(process.cwd() + '/package.json');
process.loadEnvFile('.env');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const assert = (c, m) => { if (!c) { console.error('ÉCHEC:', m); process.exit(1); } };

const treso = await prisma.member.findFirst({ where: { roles: { some: { role: { code: 'TRESORIER' } } } }, include: { account: true } });
const target = await prisma.member.findFirst({ where: { status: 'ACTIF', id: { not: treso.id } } });
const token = jwt.sign({ sub: treso.id, username: treso.account?.username ?? 'x', roles: ['TRESORIER'] }, process.env.JWT_SECRET);
const key = crypto.randomUUID();
const send = () => fetch('http://localhost:3010/api/payments', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'Idempotency-Key': key },
  body: JSON.stringify({ memberId: target.id, amount: 500, method: 'CASH', nature: 'COTISATION', paidAt: '2026-11-26', note: 'TEST-IDEM' }),
});
await (async () => { for (const p of await prisma.payment.findMany({ where: { note: 'TEST-IDEM' } })) { await prisma.paymentAllocation.deleteMany({ where: { paymentId: p.id } }); await prisma.receipt.deleteMany({ where: { paymentId: p.id } }); await prisma.payment.delete({ where: { id: p.id } }); } })();
const before = await prisma.payment.count({ where: { note: 'TEST-IDEM' } });
const r1 = await send(); const b1 = await r1.text();
const r2 = await send(); const b2 = await r2.text();
const after = await prisma.payment.count({ where: { note: 'TEST-IDEM' } });
console.log(r1.status, r2.status, 'créés:', after - before);
assert(r1.ok && r2.ok, `statuts ${r1.status} ${r2.status} ${b1.slice(0,200)}`);
assert(after - before === 1, 'doublon créé');
if (b1 !== b2) console.log('DIFF\n', b1.slice(0,400), '\n', b2.slice(0,400));
assert(JSON.parse(b1).id === JSON.parse(b2).id, 'réponse rejouée différente');
// nettoyage (base locale uniquement)
const p = await prisma.payment.findFirst({ where: { note: 'TEST-IDEM' } });
await prisma.paymentAllocation.deleteMany({ where: { paymentId: p.id } });
await prisma.receipt.deleteMany({ where: { paymentId: p.id } });
await prisma.payment.delete({ where: { id: p.id } });
await prisma.idempotencyKey.delete({ where: { key } });
console.log('OK : un seul encaissement pour deux envois');
await prisma.$disconnect();
