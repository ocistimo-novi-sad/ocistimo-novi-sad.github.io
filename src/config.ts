import type {
  ActionStatus,
  Category,
  Coordinates,
  ModerationState,
  ReportStatus,
  SortMode,
  UserRole,
} from './types';

/**
 * Application identity. Rename the project here (and in index.html / README)
 * if the name ever changes again.
 */
export const APP = {
  name: 'Kuka i Motika',
  wordmark: 'KUKA I MOTIKA',
  city: 'Novi Sad',
  tagline: 'Mapa problema i akcija čišćenja u Novom Sadu',
  center: { latitude: 45.2671, longitude: 19.8335 } satisfies Coordinates,
  initialZoom: 13,
  focusZoom: 16,
  /** Novi Sad municipality with a small margin (also enforced in Firestore Rules). */
  bounds: { south: 45.05, west: 19.55, north: 45.45, east: 20.05 },
  openStreetMap: 'https://www.openstreetmap.org',
} as const;

export interface CategoryMeta {
  id: Category;
  label: string;
  hint: string;
}

export const CATEGORIES: CategoryMeta[] = [
  {
    id: 'unwanted_graffiti',
    label: 'Nepoželjni grafiti',
    hint: 'Šaranje, tagovi i uvredljive poruke na fasadama',
  },
  {
    id: 'fan_graffiti',
    label: 'Navijački grafiti',
    hint: 'Navijački natpisi, simboli i poruke',
  },
  {
    id: 'stickers_posters',
    label: 'Nalepnice i posteri',
    hint: 'Nalepnice, plakati i oglasi na javnim površinama',
  },
  {
    id: 'illegal_dump',
    label: 'Divlja deponija',
    hint: 'Nelegalno odložen otpad, šut i krupno smeće',
  },
  {
    id: 'damaged_infrastructure',
    label: 'Oštećena infrastruktura',
    hint: 'Klupe, staze, igrališta, oprema',
  },
  {
    id: 'other',
    label: 'Ostalo',
    hint: 'Drugi vidljivi problemi u javnom prostoru',
  },
];

/** Category preselected when a new report is opened. */
export const DEFAULT_CATEGORY: Category = 'unwanted_graffiti';

export const CATEGORY_MAP: Record<Category, CategoryMeta> = Object.fromEntries(
  CATEGORIES.map((category) => [category.id, category]),
) as Record<Category, CategoryMeta>;

export interface StatusMeta {
  id: ReportStatus;
  label: string;
  description: string;
  /** Lower value sorts first. */
  weight: number;
}

export const REPORT_STATUSES: StatusMeta[] = [
  {
    id: 'new',
    label: 'Nova',
    description: 'Objavljena, još bez plana akcije.',
    weight: 1,
  },
  {
    id: 'verified',
    label: 'Proverena',
    description: 'Problem je potvrđen na terenu.',
    weight: 2,
  },
  {
    id: 'planned',
    label: 'Planirana akcija',
    description: 'Prijava je uključena u planirano čišćenje.',
    weight: 3,
  },
  {
    id: 'in_progress',
    label: 'U toku',
    description: 'Radovi ili akcija su počeli.',
    weight: 4,
  },
  {
    id: 'resolved',
    label: 'Rešeno',
    description: 'Problem je uklonjen.',
    weight: 5,
  },
  {
    id: 'not_suitable',
    label: 'Nije za akciju',
    description: 'Problem nije pogodan za volontersko čišćenje.',
    weight: 6,
  },
];

export const STATUS_MAP: Record<ReportStatus, StatusMeta> = Object.fromEntries(
  REPORT_STATUSES.map((status) => [status.id, status]),
) as Record<ReportStatus, StatusMeta>;

export const ACTION_STATUSES: { id: ActionStatus; label: string }[] = [
  { id: 'planned', label: 'Planirano' },
  { id: 'in_progress', label: 'U toku' },
  { id: 'completed', label: 'Završeno' },
  { id: 'cancelled', label: 'Otkazano' },
];

export const ACTION_STATUS_MAP: Record<ActionStatus, string> = Object.fromEntries(
  ACTION_STATUSES.map((status) => [status.id, status.label]),
) as Record<ActionStatus, string>;

export const SORT_OPTIONS: { id: SortMode; label: string }[] = [
  { id: 'newest', label: 'Najnovije' },
  { id: 'oldest', label: 'Najstarije' },
  { id: 'nearest', label: 'Najbliže' },
  { id: 'status', label: 'Po statusu' },
];

export const FLAG_REASONS: { id: string; label: string }[] = [
  { id: 'spam', label: 'Spam ili reklama' },
  { id: 'duplicate', label: 'Dupla prijava' },
  { id: 'misleading', label: 'Netačna ili obmanjujuća prijava' },
  { id: 'inappropriate', label: 'Neprimeren sadržaj' },
  { id: 'other', label: 'Drugo' },
];

export const ROLE_LABELS: Record<UserRole, string> = {
  user: 'Član zajednice',
  moderator: 'Moderator',
  admin: 'Administrator',
};

export const MODERATION_LABELS: Record<ModerationState, { label: string; description: string }> = {
  pending: {
    label: 'Na pregledu',
    description: 'Moderator još nije pregledao prijavu. Vidite je samo vi i moderatori.',
  },
  approved: { label: 'Objavljena', description: 'Prijava je javna i vidljiva na mapi.' },
  rejected: {
    label: 'Odbijena',
    description: 'Moderator je odbio prijavu. Razlog je naveden uz prijavu.',
  },
};

/** Quick picks appended to the "what can we do / what do we need" fields. */
export const COMMUNITY_CAN_PRESETS = [
  'Čišćenje i sakupljanje otpada',
  'Krečenje i farbanje',
  'Skidanje nalepnica i plakata',
  'Ništa, potrebna je stručna pomoć',
];

export const HELP_NEEDED_PRESETS = [
  'Odvoz krupnog otpada',
  'Alat i materijal (džakovi, rukavice, boja)',
  'Nadležna služba ili JKP',
  'Više volontera',
];

export const REJECT_REASONS = [
  'Fotografija ne prikazuje problem.',
  'Dupla prijava, problem je već prijavljen.',
  'Lokacija nije tačna.',
  'Prijava sadrži lične podatke.',
  'Problem nije u javnom prostoru.',
];

export const RESOLUTION_REJECT_REASONS = [
  'Fotografija ne prikazuje isto mesto.',
  'Problem se na fotografiji još vidi.',
  'Fotografija nije dovoljno jasna.',
  'Rešen je samo deo problema.',
];

export const LIMITS = {
  titleMin: 5,
  titleMax: 90,
  descriptionMin: 20,
  descriptionMax: 1200,
  communityMin: 10,
  communityMax: 600,
  rejectReasonMin: 10,
  rejectReasonMax: 500,
  resolutionNoteMax: 500,
  addressMax: 160,
  imagesMax: 3,
  imageMaxBytes: 5 * 1024 * 1024,
  imageTypes: ['image/jpeg', 'image/png', 'image/webp'],
  reportsPageSize: 80,
  actionsPageSize: 60,
} as const;

export const DEFAULT_FILTERS = {
  query: '',
  categories: [] as Category[],
  statuses: [] as ReportStatus[],
  sort: 'newest' as SortMode,
  viewportOnly: false,
  bounds: null,
};
