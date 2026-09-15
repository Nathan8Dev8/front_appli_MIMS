const VARIANTS = {
  neutral: 'bg-ink-300/25 text-ink-700',
  info: 'bg-mims-100 text-mims-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-rose-100 text-rose-700',
  gold: 'bg-gold-100 text-gold-500',
} as const;

export function Badge({
  children,
  variant = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  variant?: keyof typeof VARIANTS;
  className?: string;
}) {
  return <span className={`badge ${VARIANTS[variant]} ${className}`}>{children}</span>;
}

const DUE_STATUS: Record<string, { label: string; variant: keyof typeof VARIANTS }> = {
  A_PAYER: { label: 'À payer', variant: 'warning' },
  PARTIEL: { label: 'Partiel', variant: 'info' },
  PAYE: { label: 'Payé', variant: 'success' },
  ANNULE: { label: 'Annulé', variant: 'neutral' },
};

const PAYMENT_STATUS: Record<string, { label: string; variant: keyof typeof VARIANTS }> = {
  EN_ATTENTE: { label: 'En attente', variant: 'warning' },
  VALIDE: { label: 'Validé', variant: 'success' },
  ANNULE: { label: 'Annulé', variant: 'danger' },
};

const MEMBER_STATUS: Record<string, { label: string; variant: keyof typeof VARIANTS }> = {
  ACTIF: { label: 'Actif', variant: 'success' },
  INACTIF: { label: 'Inactif', variant: 'neutral' },
  SUSPENDU: { label: 'Suspendu', variant: 'danger' },
  DEMISSIONNAIRE: { label: 'Démissionnaire', variant: 'neutral' },
};

const DOCUMENT_STATUS: Record<string, { label: string; variant: keyof typeof VARIANTS }> = {
  BROUILLON: { label: 'Brouillon', variant: 'neutral' },
  PUBLIE: { label: 'Publié', variant: 'success' },
  ARCHIVE: { label: 'Archivé', variant: 'neutral' },
};

export function DueStatusBadge({ status }: { status: string }) {
  const s = DUE_STATUS[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function PaymentStatusBadge({ status }: { status: string }) {
  const s = PAYMENT_STATUS[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function MemberStatusBadge({ status }: { status: string }) {
  const s = MEMBER_STATUS[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
export function DocumentStatusBadge({ status }: { status: string }) {
  const s = DOCUMENT_STATUS[status] ?? { label: status, variant: 'neutral' as const };
  return <Badge variant={s.variant}>{s.label}</Badge>;
}
