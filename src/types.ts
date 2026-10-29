export type Category =
  | 'waste'
  | 'graffiti'
  | 'damaged_infrastructure'
  | 'neglected_area'
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

export interface Report extends Coordinates {
  id: string;
  title: string;
  description: string;
  category: Category;
  status: ReportStatus;
  createdAt: Date;
  createdBy: string;
  createdByName?: string;
  imageUrls: string[];
  address?: string;
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

export type SortMode = 'newest' | 'oldest' | 'nearest' | 'status';

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
