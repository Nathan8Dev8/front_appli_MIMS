'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface Me {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  birthDate?: string | null;
  avatarUrl?: string | null;
  whatsappActive: boolean;
  preferredChannel: 'PUSH' | 'WHATSAPP' | 'SMS' | 'EMAIL';
  joinedAt: string;
  status: string;
  roles: string[];
}

export function useMe() {
  return useQuery({ queryKey: ['auth', 'me'], queryFn: () => api.get<Me>('/auth/me') });
}

export function hasRole(me: Me | undefined, roles: string[]) {
  if (!me) return false;
  return me.roles.some((r) => roles.includes(r));
}
