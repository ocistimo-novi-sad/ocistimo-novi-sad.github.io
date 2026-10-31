export type Category =
  | 'unwanted_graffiti'
  | 'fan_graffiti'
  | 'stickers_posters'
  | 'illegal_dump'
  | 'damaged_infrastructure'
  | 'other';

export type ReportStatus =
  | 'new'
  | 'verified'
  | 'planned'
  | 'in_progress'
  | 'resolved'
  | 'not_suitable';

export type ActionStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled';

export type FlagReason = 'spam' | 'duplicate' | 'misleading' | 'inappropriate' | 'other';

/** Visibility of a report. Only approved reports are public. */
export type ModerationState = 'pending' | 'approved' | 'rejected';

/**
 * The author's proof that a problem was fixed, confirmed by a moderator.
 * A moderator may also mark a report resolved without proof.
 */
export interface Resolution {
  state: 'pending' | 'approved' | 'rejected';
  /** "After" photos, 1 to 3 when the author submits proof. */
  imageUrls: string[];
  note: string;
  submittedAt: Date | null;
  submittedBy?: string;
  reviewedAt: Date | null;
  reviewedBy?: string;
  rejectionReason?: string;
  byModerator?: boolean;
}

/** Admins are set in the Firebase console; moderators are granted by admins. */
export type UserRole = 'user' | 'moderator' | 'admin';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

/** Where a record came from. Demo records never claim to be in the database. */
export type DataSource = 'firestore' | 'demo';

/** The part of a report its author writes and may later edit. */
export interface ReportContent extends Coordinates {
  title: string;
  description: string;
  category: Category;
  imageUrls: string[];
  address?: string;
  /** What the neighbourhood can do on its own. Missing on older reports. */
  communityCan?: string;
  /** What the neighbourhood needs help with. Missing on older reports. */
  helpNeeded?: string;
}

export interface Report extends ReportContent {
  id: string;
  status: ReportStatus;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  /** Set when the author edited the report after it was published. */
  editedAt?: Date | null;
  /** A published report's edit is live but waits for a moderator's look. */
  editReview?: 'pending';
  /** Last approved content, kept while an edit waits for review. */
  previousVersion?: ReportContent;
  resolution?: Resolution;
  moderation: ModerationState;
  rejectionReason?: string;
  moderatedBy?: string;
  moderatedByName?: string;
  moderatedAt?: Date | null;
  source: DataSource;
}

export interface CleanupAction extends Coordinates {
  id: string;
  title: string;
  description: string;
  date: Date;
  meetingPoint: string;
  status: ActionStatus;
  reportIds: string[];
  supplies: string[];
  organizerName: string;
  organizerNote: string;
  createdAt: Date;
  createdBy: string;
  source: DataSource;
}

export interface NewReportInput {
  title: string;
  description: string;
  category: Category;
  latitude: number;
  longitude: number;
  address?: string;
  communityCan: string;
  helpNeeded: string;
  createdByName?: string;
}

export interface NewActionInput {
  title: string;
  description: string;
  date: Date;
  meetingPoint: string;
  latitude: number;
  longitude: number;
  status: ActionStatus;
  reportIds: string[];
  supplies: string[];
  organizerName: string;
  organizerNote: string;
}

export interface ContentFlag {
  id: string;
  reportId: string;
  reason: FlagReason;
  note: string;
  status: 'open' | 'dismissed' | 'resolved';
  createdBy: string;
  createdAt: Date;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email?: string;
  photoURL?: string;
  createdAt: Date | null;
  lastSeenAt: Date | null;
  role: UserRole;
}

export type SortMode ='newest' | 'oldest' | 'nearest' | 'status';

export interface Filters {
  query: string;
  categories: Category[];
  statuses: ReportStatus[];
  sort: SortMode;
  viewportOnly: boolean;
  bounds: Bounds | null;
}

export type View = 'map' | 'actions';

export interface StoredImage {
  url: string;
  publicId?: string;
}
