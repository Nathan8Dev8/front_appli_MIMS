import type { ComponentType, SVGProps } from 'react';
import {
  BrainIcon,
  CalendarIcon,
  ClockIcon,
  FileTextIcon,
  HomeIcon,
  MegaphoneIcon,
  PollIcon,
  ShieldIcon,
  UserIcon,
  UsersIcon,
  WalletIcon,
} from '@/components/ui/icons';

export interface NavItem {
  href: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  roles?: string[];
  description: string;
}

export const STAFF_ROLES = ['SECRETAIRE', 'TRESORIER', 'PRESIDENT_ADMIN', 'PASTEUR_ENCADREUR'];
export const ANNOUNCEMENT_AUTHOR_ROLES = ['PASTEUR_ENCADREUR', 'PRESIDENT_ADMIN', 'SECRETAIRE'];

export const NAV_ITEMS: NavItem[] = [
  { href: '/tableau-de-bord', label: 'Tableau de bord', icon: HomeIcon, description: "L'essentiel de ta vie de communauté, en un clin d'œil." },
  { href: '/annonces', label: 'Annonces', icon: MegaphoneIcon, description: 'Les messages importants du bureau.' },
  { href: '/membres', label: 'Membres', icon: UsersIcon, roles: STAFF_ROLES, description: 'Le registre vivant de notre communauté.' },
  { href: '/cotisations', label: 'Cotisations', icon: WalletIcon, description: 'Tes échéances, tes paiements, tes reçus.' },
  { href: '/documents', label: 'Documents', icon: FileTextIcon, description: 'Règlement intérieur et procès-verbaux.' },
  { href: '/evenements', label: 'Événements', icon: CalendarIcon, description: 'Les rendez-vous qui rythment notre communauté.' },
  { href: '/sondages', label: 'Sondages', icon: PollIcon, description: 'Ton avis façonne nos décisions.' },
  { href: '/quiz', label: 'Quiz', icon: BrainIcon, description: 'Apprends en t’amusant, teste tes connaissances.' },
  { href: '/mon-profil', label: 'Mon profil', icon: UserIcon, description: 'Tes informations, ta photo, à jour.' },
  { href: '/historique', label: 'Historique', icon: ClockIcon, roles: STAFF_ROLES, description: 'Réunions, cotisations et membres — recherche et archives.' },
  { href: '/administration', label: 'Administration', icon: ShieldIcon, roles: ['PRESIDENT_ADMIN'], description: 'Rôles, bilans et journal d’audit.' },
];

export function visibleNavItems(roles: string[] = []) {
  return NAV_ITEMS.filter((item) => !item.roles || item.roles.some((r) => roles.includes(r)));
}
