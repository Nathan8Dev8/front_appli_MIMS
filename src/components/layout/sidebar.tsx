'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { MOBILE_TABS, NAV_SECTIONS, NavSection, visibleNavItems } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';
import { GridIcon, LogoutIcon, XIcon } from '@/components/ui/icons';
import { openFeedback } from '@/components/feedback/feedback';

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const roles = useAuthStore((s) => s.member?.roles ?? []);
  const logout = useAuthStore((s) => s.logout);

  const items = visibleNavItems(roles);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-mims-gradient-soft">
      <div className="bg-noise pointer-events-none absolute inset-0 opacity-[0.15]" />

      <div className="relative flex items-center gap-3 px-6 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-soft">
          <Image src="/logo.png" alt="Jeunes MIMS" width={26} height={26} />
        </div>
        <div>
          <p className="font-display text-base font-semibold tracking-tight text-white">Jeunes MIMS</p>
          <p className="text-[11px] font-medium text-mims-200">Espace membre</p>
        </div>
      </div>

      <nav className="relative flex-1 overflow-y-auto px-3 py-2">
        {(Object.keys(NAV_SECTIONS) as NavSection[]).map((section) => {
          const sectionItems = items.filter((i) => i.section === section);
          if (!sectionItems.length) return null;
          return (
            <div key={section} className="mb-4">
              <p className="px-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-widest text-mims-300/80">{NAV_SECTIONS[section]}</p>
              <div className="space-y-0.5">
                {sectionItems.map((item) => {
                  const active = isActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                        active ? 'bg-white text-mims-800 shadow-hover' : 'text-mims-100/80 hover:bg-white/[0.08] hover:text-white'
                      }`}
                    >
                      <Icon width={19} height={19} className={active ? 'text-mims-700' : 'text-mims-200 group-hover:text-white'} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="relative space-y-0.5 border-t border-white/10 p-3">
        <button
          onClick={() => {
            onNavigate?.();
            openFeedback();
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mims-100/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <span className="w-[19px] text-center" aria-hidden="true">🐞</span>
          Signaler un bug ou une idée
        </button>
        <button
          onClick={() => {
            logout();
            router.replace('/connexion');
          }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-mims-100/80 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <LogoutIcon width={19} height={19} />
          Se déconnecter
        </button>
      </div>
    </div>
  );
}

export function DesktopSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 lg:block">
      <div className="fixed inset-y-0 w-64">
        <SidebarContent />
      </div>
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 left-0 w-[min(18rem,85vw)] animate-fade-up shadow-lift">
        <button
          onClick={onClose}
          className="absolute right-3 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Fermer le menu"
        >
          <XIcon width={16} height={16} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}

function isActive(pathname: string | null, href: string) {
  return pathname === href || !!pathname?.startsWith(`${href}/`);
}

/** Barre d'onglets fixée en bas sur mobile : les pages les plus utilisées à portée de pouce. */
export function MobileTabBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const pathname = usePathname();
  const roles = useAuthStore((s) => s.member?.roles ?? []);
  const tabs = visibleNavItems(roles).filter((i) => MOBILE_TABS.includes(i.href));
  const inMenu = !tabs.some((t) => isActive(pathname, t.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-300/40 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {tabs.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold transition ${active ? 'text-mims-700' : 'text-ink-500'}`}
            >
              <span className={`flex h-7 w-12 items-center justify-center rounded-full transition ${active ? 'bg-mims-100' : ''}`}>
                <Icon width={20} height={20} />
              </span>
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={onOpenMenu}
          className={`flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${inMenu ? 'text-mims-700' : 'text-ink-500'}`}
        >
          <span className={`flex h-7 w-12 items-center justify-center rounded-full ${inMenu ? 'bg-mims-100' : ''}`}>
            <GridIcon width={20} height={20} />
          </span>
          Menu
        </button>
      </div>
    </nav>
  );
}
