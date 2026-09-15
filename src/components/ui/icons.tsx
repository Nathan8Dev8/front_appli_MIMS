import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  ...props,
});

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" /></svg>
);
export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M2.5 20c0-3.5 3-6 6.5-6s6.5 2.5 6.5 6" /><circle cx="17.5" cy="9" r="2.6" /><path d="M15 14.3c2.9.4 5 2.5 5 5.7" /></svg>
);
export const WalletIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="2.5" y="6" width="19" height="13" rx="2.5" /><path d="M2.5 10h19" /><circle cx="17" cy="14.2" r="1.3" fill="currentColor" stroke="none" /><path d="M6 6V5a2 2 0 0 1 2-2h6.5" /></svg>
);
export const FileTextIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 2.5h8l4.5 4.5V20a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 20V4A1.5 1.5 0 0 1 6 2.5Z" /><path d="M14 2.5V7h4.5" /><path d="M8 12.5h8M8 16h8M8 9h3" /></svg>
);
export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="4.5" width="18" height="16" rx="2.2" /><path d="M3 9.5h18M8 2.5v4M16 2.5v4" /><circle cx="8.3" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="14" r="1" fill="currentColor" stroke="none" /><circle cx="15.7" cy="14" r="1" fill="currentColor" stroke="none" /></svg>
);
export const PollIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 20V10M12 20V4M20 20v-7" /><path d="M2.5 20h19" /></svg>
);
export const BrainIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 3.5a3 3 0 0 0-3 3v.3A3 3 0 0 0 4.5 9.5v.7A3 3 0 0 0 3 13a3 3 0 0 0 2 2.8v.7A3.5 3.5 0 0 0 8.5 20H9a2 2 0 0 0 2-2V6a2.5 2.5 0 0 0-2-2.5Z" /><path d="M15 3.5a3 3 0 0 1 3 3v.3a3 3 0 0 1 1.5 2.7v.7A3 3 0 0 1 21 13a3 3 0 0 1-2 2.8v.7a3.5 3.5 0 0 1-3.5 3.5H15a2 2 0 0 1-2-2V6a2.5 2.5 0 0 1 2-2.5Z" /></svg>
);
export const UserIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="8" r="3.6" /><path d="M4.5 20c0-4.1 3.4-7 7.5-7s7.5 2.9 7.5 7" /></svg>
);
export const BellIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 9.5a6 6 0 0 1 12 0c0 4.2 1.2 5.6 2 6.5H4c.8-.9 2-2.3 2-6.5Z" /><path d="M10 19a2 2 0 0 0 4 0" /></svg>
);
export const ShieldIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 2.8 19.5 6v6c0 5-3.2 8.3-7.5 9.5C7.7 20.3 4.5 17 4.5 12V6L12 2.8Z" /><path d="m8.7 12 2.3 2.3 4.3-4.3" /></svg>
);
export const LogoutIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 20H5.5A1.5 1.5 0 0 1 4 18.5v-13A1.5 1.5 0 0 1 5.5 4H9" /><path d="M16 16.5 21 12l-5-4.5M21 12H9" /></svg>
);
export const CameraIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h1.8l1-1.8A1.5 1.5 0 0 1 9.6 4.5h4.8a1.5 1.5 0 0 1 1.3.7l1 1.8h1.8A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z" /><circle cx="12" cy="13" r="3.4" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m4 12.5 5 5.5L20 6" /></svg>
);
export const XIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 5 14 14M19 5 5 19" /></svg>
);
export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 5 7 7-7 7" /></svg>
);
export const UploadIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 15.5V4M7 8.5 12 4l5 4.5" /><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
);
export const DownloadIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 4v11.5M7 11l5 5 5-5" /><path d="M4.5 16v2.5A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5V16" /></svg>
);
export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 5v14M5 12h14" /></svg>
);
export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.3-4.3" /></svg>
);
export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" /></svg>
);
export const ChartIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 4v16.5h16.5" /><path d="M8 16.5v-4M12.5 16.5V8M17 16.5v-7" /></svg>
);
export const SparkleIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 3.5 13.6 9l5.4 1.6-5.4 1.6L12 17.7l-1.6-5.5L5 10.6 10.4 9 12 3.5Z" /></svg>
);
export const MapPinIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 21s7-6.3 7-11.5A7 7 0 0 0 5 9.5C5 14.7 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.3" /></svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>
);
export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 12h16M13 5l7 7-7 7" /></svg>
);
export const EyeOffIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 3l18 18" /><path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.7M6.2 6.7C4.2 8 2.7 9.9 1.5 12c1.5 3 5.5 7 10.5 7 1.4 0 2.7-.3 3.9-.8" /><path d="M9.5 12a2.5 2.5 0 0 0 3.6 2.2" /></svg>
);
export const MegaphoneIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M3 10.5v3a1.5 1.5 0 0 0 1.5 1.5H6l1 5 2-.5-.8-4.5 8.3 3.2a1 1 0 0 0 1.35-.93V6.73a1 1 0 0 0-1.35-.93L8 9H4.5A1.5 1.5 0 0 0 3 10.5Z" /><path d="M19.8 9.5a4 4 0 0 1 0 5" /></svg>
);
export const EyeIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z" /><circle cx="12" cy="12" r="2.8" /></svg>
);
