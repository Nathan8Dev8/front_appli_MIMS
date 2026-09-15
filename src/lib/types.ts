export interface MemberSummary {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  status: string;
  joinedAt: string;
  whatsappActive: boolean;
  preferredChannel: string;
  roles?: { role: { code: string; label: string } }[];
}

export interface MonthlyDue {
  id: string;
  memberId: string;
  dueMonth: string;
  amountDue: number;
  amountPaid: number;
  balance: number;
  status: 'A_PAYER' | 'PARTIEL' | 'PAYE' | 'ANNULE';
  dueDate: string;
  member?: MemberSummary;
}

export interface Receipt {
  id: string;
  receiptNo: string;
  generatedAt: string;
}

export interface Payment {
  id: string;
  paymentRef: string;
  memberId: string;
  amount: number;
  method: 'CASH' | 'MOBILE_MONEY' | 'VIREMENT' | 'AUTRE';
  status: 'EN_ATTENTE' | 'VALIDE' | 'ANNULE';
  paidAt: string;
  note?: string | null;
  member?: MemberSummary;
  receipt?: Receipt | null;
  allocations?: { due: MonthlyDue; amountAllocated: number }[];
}

export interface AppDocument {
  id: string;
  documentCode: string;
  type: 'REGLEMENT' | 'PV' | 'AUTRE';
  title: string;
  description?: string | null;
  status: 'BROUILLON' | 'PUBLIE' | 'ARCHIVE';
  publishedAt?: string | null;
  createdAt: string;
}

export interface EventParticipation {
  memberId: string;
  response: 'PRESENT' | 'ABSENT' | 'EN_ATTENTE';
  member?: MemberSummary;
}

export interface AppEvent {
  id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: string;
  participations?: EventParticipation[];
  _count?: { participations: number };
}

export interface PollOption {
  id: string;
  label: string;
  _count?: { votes: number };
}

export interface Poll {
  id: string;
  title: string;
  description?: string | null;
  anonymous: boolean;
  status: 'OUVERT' | 'CLOTURE';
  closesAt?: string | null;
  createdAt: string;
  options: PollOption[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  choices: string[];
  correctIndex?: number;
}

export interface Quiz {
  id: string;
  title: string;
  status: string;
  closesAt?: string | null;
  content: { questions: QuizQuestion[] };
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  attachmentKey?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  publishedAt: string;
  publishedBy: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
}

export interface AppNotification {
  id: string;
  type: string;
  channel: string;
  title: string;
  content: string;
  status: 'EN_ATTENTE' | 'ENVOYE' | 'ECHEC' | 'LU';
  createdAt: string;
}
