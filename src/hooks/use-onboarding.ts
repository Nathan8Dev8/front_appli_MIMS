'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export interface MyOnboarding {
  status: 'EN_ATTENTE' | 'BIENVENUE_ENVOYEE' | 'REGLEMENT_ENVOYE' | 'TERMINE';
  completedAt: string | null;
  regulation: { id: string; title: string; documentCode: string } | null;
}

export function useOnboarding() {
  return useQuery({ queryKey: ['onboarding', 'me'], queryFn: () => api.get<MyOnboarding>('/onboarding/me') });
}
