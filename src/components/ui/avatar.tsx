import Image from 'next/image';
import { fileUrl } from '@/lib/api-client';
import { initials } from '@/lib/format';

const SIZES = { sm: 32, md: 40, lg: 56, xl: 96 } as const;

export function Avatar({
  firstName,
  lastName,
  avatarUrl,
  size = 'md',
  className = '',
}: {
  firstName?: string;
  lastName?: string;
  avatarUrl?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const px = SIZES[size];
  const url = fileUrl(avatarUrl);

  if (url) {
    return (
      <div
        className={`relative overflow-hidden rounded-full ring-2 ring-white shadow-soft ${className}`}
        style={{ width: px, height: px }}
      >
        <Image src={url} alt={`${firstName ?? ''} ${lastName ?? ''}`} fill sizes={`${px}px`} className="object-cover" />
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-mims-100 font-display font-semibold text-mims-700 ring-2 ring-white shadow-soft ${className}`}
      style={{ width: px, height: px, fontSize: px * 0.38 }}
    >
      {initials(firstName, lastName)}
    </div>
  );
}
