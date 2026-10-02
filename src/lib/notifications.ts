/** Page à ouvrir pour une notification ; les anciennes (sans adresse enregistrée) sont déduites de leur type. */
const BY_TYPE: Record<string, string> = {
  RAPPEL_COTISATION: '/cotisations',
  RELANCE_DETTE: '/cotisations',
  RECU: '/cotisations',
  DOCUMENT_PUBLIE: '/documents',
  EVENEMENT: '/evenements',
  SONDAGE: '/sondages',
  ANNONCE: '/annonces',
  BIENVENUE: '/bienvenue',
  ANNIVERSAIRE: '/tableau-de-bord',
};

export function notificationUrl(n: { url?: string | null; type?: string }) {
  return n.url || BY_TYPE[n.type ?? ''] || '/notifications';
}
