'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthMember {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  roles: string[];
}

interface AuthState {
  token: string | null;
  member: AuthMember | null;
  mustChangePassword: boolean;
  hydrated: boolean;
  setHydrated: () => void;
  login: (token: string, member: AuthMember, mustChangePassword: boolean) => void;
  updateMember: (patch: Partial<AuthMember>) => void;
  clearMustChangePassword: () => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      member: null,
      mustChangePassword: false,
      hydrated: false,
      setHydrated: () => set({ hydrated: true }),
      login: (token, member, mustChangePassword) => set({ token, member, mustChangePassword }),
      updateMember: (patch) => set((state) => ({ member: state.member ? { ...state.member, ...patch } : state.member })),
      clearMustChangePassword: () => set({ mustChangePassword: false }),
      logout: () => set({ token: null, member: null, mustChangePassword: false }),
    }),
    {
      name: 'jeunes-mims-auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

export const ROLE_LABELS: Record<string, string> = {
  MEMBRE: 'Membre',
  SECRETAIRE: 'Secrétaire',
  TRESORIER: 'Trésorier',
  PRESIDENT_ADMIN: 'Président / Administrateur',
  PASTEUR_ENCADREUR: 'Pasteur / Encadreur',
};

export function hasAnyRole(roles: string[] | undefined, allowed: string[]) {
  if (!roles) return false;
  return roles.some((r) => allowed.includes(r));
}
