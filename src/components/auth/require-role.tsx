'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMe, hasRole } from '@/hooks/use-me';
import { FullPageSpinner } from '@/components/ui/spinner';

export function RequireRole({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { data: me, isLoading } = useMe();
  const router = useRouter();
  const authorized = hasRole(me, roles);

  useEffect(() => {
    if (!isLoading && me && !authorized) router.replace('/tableau-de-bord');
  }, [isLoading, me, authorized, router]);

  if (isLoading || !me) return <FullPageSpinner />;
  if (!authorized) return null;
  return <>{children}</>;
}
