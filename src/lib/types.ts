export interface MemberSummary {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  avatarUrl?: string | null;
  birthDate?: string | null;
  status: string;
  joinedAt: string;
  roles?: { role: { code: string; label: string } }[];
  onboarding?: { status: 'EN_ATTENTE' | 'BIENVENUE_ENVOYEE' | 'REGLEMENT_ENVOYE' | 'TERMINE'; completedAt: string | null } | null;
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
  nature?: 'COTISATION' | 'INSCRIPTION' | 'COLLECTE';
  member?: MemberSummary;
  receipt?: Receipt | null;
  allocations?: { due: MonthlyDue; amountAllocated: number }[];
}

export interface AppDocument {
  id: string;
  documentCode: string;
  type: 'REGLEMENT' | 'PV' | 'ASSISE' | 'AUTRE';
  title: string;
  description?: string | null;
  documentDate?: string | null;
  status: 'BROUILLON' | 'PUBLIE' | 'ARCHIVE';
  publishedAt?: string | null;
  createdAt: string;
  /** Renseigné quand le document est le PV d'une assise / d'un événement. */
  reportFor?: { id: string } | null;
}

export interface EventParticipation {
  memberId: string;
  response: 'PRESENT' | 'ABSENT' | 'EN_ATTENTE';
  /** Présence réelle pointée après l'événement (null = pas encore pointé). */
  attended: boolean | null;
  member?: Pick<MemberSummary, 'id' | 'firstName' | 'lastName' | 'avatarUrl' | 'status'>;
}

export type EventKind = 'ASSISE' | 'ACTIVITE' | 'AUTRE';

export interface AppEvent {
  id: string;
  kind: EventKind;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  agenda?: string | null;
  decisions?: string | null;
  startsAt: string;
  endsAt?: string | null;
  status: 'PLANIFIE' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  participations: EventParticipation[];
  reportDocument?: { id: string; title: string; documentCode: string; status: string } | null;
  createdBy?: { firstName: string; lastName: string };
}

export interface FinanceReport {
  year: number;
  byMonth: { month: number; total: number; count: number; exits: number }[];
  totalCollected: number;
  totalExits: number;
  totalDue: number;
  totalOutstanding: number;
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

export type QuizAnswer = number[] | string;

/** CHOIX : cases à cocher (correctIndexes) ; TEXTE : réponse écrite (answer). Bonnes réponses absentes tant que le quiz est ouvert. */
export interface QuizQuestion {
  id: string;
  type: 'CHOIX' | 'TEXTE';
  question: string;
  choices?: string[];
  correctIndexes?: number[];
  answer?: string;
}

export interface QuizSummary {
  id: string;
  title: string;
  comment?: string | null;
  publishedAt: string;
  closesAt: string | null;
  closed: boolean;
  questionCount: number;
  myAttempt: { score: number; total: number; submittedAt: string } | null;
  participants?: number;
}

export interface QuizDetail extends Omit<QuizSummary, 'questionCount' | 'myAttempt' | 'participants'> {
  questions: QuizQuestion[];
  myAttempt: {
    score: number;
    total: number;
    submittedAt: string;
    answers: Record<string, QuizAnswer>;
    results?: Record<string, boolean>;
  } | null;
}

export interface QuizResults {
  questions: QuizQuestion[];
  attempts: {
    id: string;
    member: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
    answers: Record<string, QuizAnswer>;
    results: Record<string, boolean>;
    score: number;
    total: number;
    submittedAt: string;
  }[];
}

export interface QuizRewards {
  year: number;
  month: number;
  quizCount: number;
  winners: { memberId: string; quizzes: number; score: number; total: number; member: { id: string; firstName: string; lastName: string; avatarUrl?: string | null } }[];
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
  url?: string | null;
  status: 'EN_ATTENTE' | 'ENVOYE' | 'ECHEC' | 'LU';
  createdAt: string;
}

// ————————————————————————————————————————————————————————————
// Caisse : entrées, sorties, collectes
// ————————————————————————————————————————————————————————————

export type TxNature =
  | 'INSCRIPTION'
  | 'COTISATION'
  | 'COLLECTE'
  | 'REMISE_COLLECTE'
  | 'FONCTIONNEMENT'
  | 'ACTIVITE'
  | 'AUTRE_DEPENSE';

export interface CashSummary {
  balance: number;
  totalEntries: number;
  totalExits: number;
  monthEntries: number;
  monthExits: number;
  entriesByNature: Record<string, number>;
  exitsByCategory: Record<string, number>;
  arrears: { total: number; debtors: number };
  earmarkedForCollectes: number;
  currentMonth: string;
}

export interface MemberFinanceRow {
  id: string;
  memberCode: string;
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl?: string | null;
  status: string;
  monthsLate: number;
  totalDebt: number;
  advanceCredit: number;
  advanceMonths: number;
  lastPaymentAt: string | null;
  inscriptionPaid: boolean;
  situation: 'EN_DETTE' | 'A_JOUR';
}

export type CollecteKind = 'MARIAGE' | 'NAISSANCE' | 'DECES' | 'AUTRE';

export interface CollecteSummary {
  id: string;
  title: string;
  kind: CollecteKind;
  beneficiary?: string | null;
  description?: string | null;
  status: 'OUVERTE' | 'CLOTUREE';
  createdAt: string;
  closedAt?: string | null;
  collected: number;
  contributors: number;
  remitted: number;
  remaining: number;
}

export interface CollecteDetail extends CollecteSummary {
  contributions: { id: string; memberName: string; amount: number; method: string; paidAt: string }[];
  remittances: { id: string; label: string; amount: number; spentAt: string }[];
}

export interface TransactionRow {
  id: string;
  kind: 'PAYMENT' | 'EXPENSE';
  reference: string;
  date: string;
  direction: 'ENTREE' | 'SORTIE';
  nature: TxNature;
  label: string;
  detail: string | null;
  memberId: string | null;
  amount: number;
  method: string;
  status: 'VALIDE' | 'ANNULE' | 'EN_ATTENTE';
  note: string | null;
  enteredByName: string;
  receiptId: string | null;
  cancelReason: string | null;
}

export interface TransactionsPage {
  items: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totals: { entries: number; exits: number; net: number };
}

export interface CotisationPreview {
  paidAt: string;
  steps: { month: string; label: string; kind: 'MOIS_EN_COURS' | 'ARRIERE' | 'AVANCE'; amount: number; balanceAfter: number }[];
  debtBefore: number;
  debtAfter: number;
  advanceAmount: number;
}

export interface ReminderPreview {
  debtors: number;
  toSend: number;
  skipped: number;
  withPush: number;
  sample: { firstName: string; message: string } | null;
}

export interface ReminderResult {
  debtors: number;
  skipped: number;
  sent: number;
  failed: number;
  pushed: number;
}

// ————————————————————————————————————————————————————————————
// Plaintes & suggestions
// ————————————————————————————————————————————————————————————

export type ComplaintKind = 'PLAINTE' | 'SUGGESTION';
export type ComplaintCategory = 'ACTIVITES' | 'COTISATIONS' | 'COMPORTEMENT' | 'BUREAU' | 'AUTRE';
export type ComplaintStatus = 'RECUE' | 'EN_COURS' | 'RESOLUE' | 'CLASSEE';

export interface ComplaintPerson {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string | null;
  roles: { role: { code: string } }[];
}

export interface Complaint {
  id: string;
  reference: string;
  kind: ComplaintKind;
  category: ComplaintCategory;
  subject: string;
  description: string;
  status: ComplaintStatus;
  authorId: string;
  author: ComplaintPerson;
  attachmentName?: string | null;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  _count?: { messages: number };
}

export interface ComplaintDetail extends Complaint {
  canHandle: boolean;
  messages: { id: string; authorId: string; author: ComplaintPerson; content: string | null; newStatus: ComplaintStatus | null; createdAt: string }[];
}

export type FeedbackStatus = 'NOUVEAU' | 'PRIS_EN_COMPTE' | 'TERMINE' | 'NON_RETENU';

export interface AppFeedback {
  id: string;
  kind: 'BUG' | 'AMELIORATION';
  title: string;
  description: string;
  page?: string | null;
  device?: string | null;
  screenshotName?: string | null;
  status: FeedbackStatus;
  adminNote?: string | null;
  createdAt: string;
  author?: { id: string; firstName: string; lastName: string; avatarUrl?: string | null };
}
