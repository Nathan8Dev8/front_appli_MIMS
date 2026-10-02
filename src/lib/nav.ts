import type { ComponentType, SVGProps } from 'react';
import {
  BellIcon,
  BrainIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
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
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  section: NavSection;
  roles?: string[];
  description: string;
}

export const STAFF_ROLES = ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];
export const ANNOUNCEMENT_AUTHOR_ROLES = ['PASTEUR_ENCADREUR', 'PRESIDENT_ADMIN', 'SECRETAIRE'];

const NAV_ITEMS: NavItem[] = [
  { href: '/tableau-de-bord', label: 'Accueil', icon: HomeIcon, section: 'perso', description: "Ce qui se passe dans le groupe aujourd'hui." },
  { href: '/cotisations', label: 'Cotisations', icon: WalletIcon, section: 'perso', description: 'Tes échéances, tes paiements et tes reçus.' },
  { href: '/notifications', label: 'Notifications', icon: BellIcon, section: 'perso', description: 'Tes rappels, tes reçus et les messages du bureau.' },
  { href: '/mon-profil', label: 'Mon profil', icon: UserIcon, section: 'perso', description: 'Tes informations et ta photo.' },
  { href: '/annonces', label: 'Annonces', icon: MegaphoneIcon, section: 'groupe', description: 'Les messages du bureau.' },
  { href: '/evenements', label: 'Événements', icon: CalendarIcon, section: 'groupe', description: 'Les prochains rendez-vous et assises.' },
  { href: '/historique', label: 'Historique', icon: ClockIcon, section: 'groupe', description: 'Assises, comptes rendus, événements passés, documents et caisse, par date.' },
  { href: '/documents', label: 'Documents', icon: FileTextIcon, section: 'groupe', description: 'Le règlement intérieur et les procès-verbaux.' },
  { href: '/sondages', label: 'Sondages', icon: PollIcon, section: 'groupe', description: 'Donne ton avis sur les décisions du groupe.' },
  { href: '/quiz', label: 'Quiz', icon: BrainIcon, section: 'groupe', description: 'Teste tes connaissances.' },
  { href: '/membres', label: 'Membres', icon: UsersIcon, section: 'bureau', roles: STAFF_ROLES, description: 'La liste des membres et la fiche de chacun.' },
  { href: '/transactions', label: 'Transactions', icon: ReceiptIcon, section: 'bureau', roles: ['TRESORIER', 'PRESIDENT_ADMIN'], description: 'Toutes les entrées et sorties de la caisse, avec un export Excel.' },
  { href: '/administration', label: 'Administration', icon: ShieldIcon, section: 'bureau', roles: ['PRESIDENT_ADMIN'], description: 'Rôles et journal des actions.' },
];

/** Raccourcis de la barre du bas sur mobile (le reste est dans « Menu »). */
export const MOBILE_TABS = ['/tableau-de-bord', '/evenements', '/historique', '/cotisations'];

export function visibleNavItems(roles: string[] = []) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
}
