import type { ComponentType, SVGProps } from 'react';
import {
  BellIcon,
  BrainIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  InboxIcon,
  MegaphoneIcon,
  PollIcon,
  ReceiptIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/ui/icons';

export type NavSection = 'perso' | 'groupe' | 'bureau';

export const NAV_SECTIONS: Record<NavSection, string> = {
  perso: 'Mon espace',
  groupe: 'Vie du groupe',
  bureau: 'Bureau',
};

export interface NavItem {
  href: string;
  /** Emoji de la page, affiché devant son titre : un seul par page, partout le même. */
  emoji: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  section: NavSection;
  roles?: string[];
  description: string;
}

export const STAFF_ROLES = ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];
export const ANNOUNCEMENT_AUTHOR_ROLES = ['PASTEUR_ENCADREUR', 'PRESIDENT_ADMIN', 'SECRETAIRE'];

const NAV_ITEMS: NavItem[] = [
  { href: '/tableau-de-bord', emoji: '👋', label: 'Accueil', icon: HomeIcon, section: 'perso', description: "Ce qui se passe dans le groupe aujourd'hui." },
  { href: '/cotisations', emoji: '💰', label: 'Cotisations', icon: WalletIcon, section: 'perso', description: 'Tes échéances, tes paiements et tes reçus.' },
  { href: '/notifications', emoji: '🔔', label: 'Notifications', icon: BellIcon, section: 'perso', description: 'Tes rappels, tes reçus et les messages du bureau.' },
  { href: '/mon-profil', emoji: '😊', label: 'Mon profil', icon: UserIcon, section: 'perso', description: 'Tes informations et ta photo.' },
  { href: '/annonces', emoji: '📢', label: 'Annonces', icon: MegaphoneIcon, section: 'groupe', description: 'Les messages du bureau.' },
  { href: '/evenements', emoji: '📅', label: 'Événements', icon: CalendarIcon, section: 'groupe', description: 'Les prochains rendez-vous et assises.' },
  { href: '/historique', emoji: '🕰️', label: 'Historique', icon: ClockIcon, section: 'groupe', description: 'Assises, comptes rendus, événements passés, documents et caisse, par date.' },
  { href: '/documents', emoji: '📚', label: 'Documents', icon: FileTextIcon, section: 'groupe', description: 'Le règlement intérieur et les procès-verbaux.' },
  { href: '/sondages', emoji: '🗳️', label: 'Sondages', icon: PollIcon, section: 'groupe', description: 'Donne ton avis sur les décisions du groupe.' },
  { href: '/plaintes', emoji: '📮', label: 'Plaintes & suggestions', icon: InboxIcon, section: 'groupe', description: 'Signale un problème ou propose une idée au bureau.' },
  { href: '/quiz', emoji: '🧠', label: 'Quiz', icon: BrainIcon, section: 'groupe', description: 'Teste tes connaissances.' },
  { href: '/membres', emoji: '👥', label: 'Membres', icon: UsersIcon, section: 'bureau', roles: STAFF_ROLES, description: 'La liste des membres et la fiche de chacun.' },
  { href: '/transactions', emoji: '🧾', label: 'Transactions', icon: ReceiptIcon, section: 'bureau', roles: ['TRESORIER', 'PRESIDENT_ADMIN'], description: 'Toutes les entrées et sorties de la caisse, avec un export Excel.' },
  { href: '/administration', emoji: '🛡️', label: 'Administration', icon: ShieldIcon, section: 'bureau', roles: ['PRESIDENT_ADMIN'], description: 'Rôles et journal des actions.' },
];

export const NAV_ITEMS_HREFS = NAV_ITEMS.map((i) => i.href);

/** Raccourcis de la barre du bas sur mobile (le reste est dans « Menu »). */
export const MOBILE_TABS = ['/tableau-de-bord', '/evenements', '/historique', '/cotisations'];

/** Aide du bouton « ? » de chaque page : ce qu'on peut y faire, en mots simples. */
const PAGE_HELP: Record<string, string> = {
  '/tableau-de-bord': "C'est la page d'accueil. Tu y vois ta cotisation, la dernière annonce et les prochains rendez-vous. Touche une carte pour en savoir plus.",
  '/cotisations': 'Tu vois ici ce que tu dois et ce que tu as déjà payé. Touche « Reçu » pour ouvrir le reçu d\'un paiement. Le Trésorier encaisse les paiements depuis cette page.',
  '/notifications': 'Tous les messages que le groupe t\'a envoyés. Touche un message pour ouvrir la page qui le concerne.',
  '/mon-profil': 'Change ta photo, ton téléphone ou ton mot de passe. Tu peux aussi activer les notifications et le gros texte.',
  '/annonces': 'Les messages du bureau. Les responsables peuvent publier une annonce avec le bouton en haut : tout le monde est prévenu.',
  '/evenements': 'Les prochaines rencontres. Touche un événement puis réponds « Je serai là » ou « Pas dispo ».',
  '/historique': 'Tout ce qui s\'est passé, classé par date : séances, rapports, documents et caisse. Utilise les onglets ou la recherche pour retrouver quelque chose.',
  '/documents': 'Le règlement et les rapports de séance. Touche un document pour le lire ou l\'ouvrir. La Secrétaire ajoute les rapports avec le bouton « Rapport de séance ».',
  '/sondages': 'Le bureau te demande ton avis. Touche simplement la réponse que tu choisis : ton vote est enregistré.',
  '/plaintes': 'Un problème ou une idée ? Écris au bureau. Le Président et le Pasteur te répondent ici, en toute discrétion.',
  '/quiz': 'Un petit quiz chaque semaine pour apprendre en s\'amusant. Touche le quiz du moment pour commencer.',
  '/membres': 'La liste du groupe. Touche un membre pour voir sa fiche. « Ajouter un membre » crée son compte et peut enregistrer son inscription en caisse.',
  '/transactions': 'Toutes les entrées et sorties d\'argent. Filtre par date ou par type, et télécharge le rapport Excel.',
  '/administration': 'Donne ou retire les rôles du bureau, lis les retours sur l\'appli et le journal de ce qui a été fait.',
};

export function pageHelp(pathname: string | null) {
  const href = NAV_ITEMS.find((i) => pathname === i.href || pathname?.startsWith(`${i.href}/`))?.href;
  return href ? PAGE_HELP[href] : undefined;
}

/** Emoji de la page en cours (ou d'une de ses sous-pages, ex. /evenements/123). */
export function pageEmoji(pathname: string | null) {
  return NAV_ITEMS.find((i) => pathname === i.href || pathname?.startsWith(`${i.href}/`))?.emoji;
}

export function visibleNavItems(roles: string[] = []) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
}
