'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { visibleNavItems } from '@/lib/nav';
import { useAuthStore } from '@/store/auth-store';
import { LogoutIcon, XIcon } from '@/components/ui/icons';

export function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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

      <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                active ? 'bg-white text-mims-800 shadow-hover' : 'text-mims-100/80 hover:bg-white/[0.08] hover:text-white'
              }`}
            >
              <Icon width={19} height={19} className={active ? 'text-mims-700' : 'text-mims-200 group-hover:text-white'} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative border-t border-white/10 p-3">
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
      <div className="absolute inset-y-0 left-0 w-72 animate-fade-up shadow-lift">
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white"
          aria-label="Fermer le menu"
        >
          <XIcon width={16} height={16} />
        </button>
        <SidebarContent onNavigate={onClose} />
      </div>
    </div>
  );
}
