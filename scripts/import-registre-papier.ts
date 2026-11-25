/**
 * Reprise des dettes du registre papier (liste à jour au 25/11/2026).   npm run import:papier
 * Relançable sans doublon : une personne déjà reprise est sautée.
 * - Inscrit dans l'appli (EXISTING) : on ajoute seulement l'arriéré, moins ce que l'appli lui compte déjà.
 * - Les autres : fiche « sans compte » (pas d'identifiant), qui doit ensuite 500 F/mois comme tout le monde.
 */
import { PrismaClient } from '@prisma/client';
import { firstOfMonthUtc, lastOverdueMonth, secondSundayUtc } from '../server/payments/cotisation-allocation';

const NOTE = 'Reprise registre papier';
const REPRISE_MONTH = new Date(Date.UTC(2026, 8, 1)); // septembre 2026 : le mois d'avant l'appli

const REGISTRE: [string, number][] = [
  ['Nathan', 9500], ['Kevin', 14000], ['Sonia', 22500], ['Serge', 18000], ['D Alex', 15000],
  ['Doriane', 19000], ['Trésor .g', 24000], ['Prisca', 23500], ['Rose', 21000], ['Elvira', 10000],
  ['Daquin', 22000], ['William', 17000], ['Saurel', 20500], ['Maffo grâce', 24500], ['Enderson', 17500],
  ['Nadia', 21000], ['Schekina', 14500], ['Trésor .f', 15000], ['Erica', 14000], ['Daïna .b', 13000],
  ['D. Daïna', 2000],
];

/** Personnes du registre qui ont déjà leur fiche dans l'appli (base de prod) : nom du registre → id du membre. */
const EXISTING: Record<string, string> = {
  Nathan: '50bae9f6-c897-4d15-a143-dd0d2451e787', // Nathan Pichele, Président
  Enderson: '9238680c-d0e3-42e5-bdd1-50466525bf69', // Enderson L'éternel
  'D. Daïna': '55e907c5-53c2-423c-bafa-81ec6278eab3', // compte de la Secrétaire (Esther Dossou)
};

async function main() {
  const prisma = new PrismaClient();
  const memberRole = await prisma.role.upsert({ where: { code: 'MEMBRE' }, update: {}, create: { code: 'MEMBRE', label: 'Membre' } });
  const year = new Date().getFullYear();

  for (const [name, total] of REGISTRE) {
    let memberId = EXISTING[name];

    if (memberId && !(await prisma.member.findUnique({ where: { id: memberId } }))) throw new Error(`Fiche introuvable pour ${name}.`);
    if (!memberId) {
      const found = await prisma.member.findFirst({ where: { firstName: name, lastName: '' } });
      if (found) memberId = found.id;
      else {
        const count = await prisma.member.count();
        const created = await prisma.member.create({
          data: {
            memberCode: `JM-${year}-${String(count + 1).padStart(4, '0')}`,
            firstName: name,
            lastName: '',
            phone: '',
            roles: { create: [{ roleId: memberRole.id }] },
          },
        });
        memberId = created.id;
      }
    }

    if (await prisma.monthlyDue.findFirst({ where: { memberId, note: NOTE } })) {
      console.log(`= ${name} : déjà repris`);
      continue;
    }

    // La liste papier est à jour : ce que l'appli compte déjà comme dette en fait partie.
    const already = await prisma.monthlyDue.aggregate({
      where: { memberId, status: { in: ['A_PAYER', 'PARTIEL'] }, dueMonth: { lte: lastOverdueMonth() } },
      _sum: { balance: true },
    });
    const amount = total - (already._sum.balance ?? 0);
    if (amount <= 0) {
      console.log(`= ${name} : rien à ajouter (l'appli compte déjà ${already._sum.balance} F)`);
      continue;
    }
    await prisma.monthlyDue.create({
      data: {
        memberId,
        dueMonth: firstOfMonthUtc(REPRISE_MONTH),
        dueDate: secondSundayUtc(REPRISE_MONTH),
        amountDue: amount,
        balance: amount,
        status: 'A_PAYER',
        note: NOTE,
      },
    });
    console.log(`+ ${name} : ${amount} F`);
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
