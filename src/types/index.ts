export interface Category {
  id: string;
  name: string;
  color: string;
}

export type ChartType = 'present' | 'focus' | 'achieve';

export const CHART_TYPES: ChartType[] = ['present', 'focus', 'achieve'];

export type SnapshotIntervals = Record<ChartType, number>;

export interface CategoryDistribution {
  categoryId: string;
  name: string;
  color: string;
  weight: number;      // raw mathematical weight
  percentage: number;  // normalized to 0-100%
}

export interface BoardSnapshot {
  id: string;
  boardId: string;
  date: string;         // YYYY-MM-DD
  timestamp: number;    // epoch ms
  note?: string;
  presentDist: Record<string, number>; // categoryId -> percentage
  focusDist: Record<string, number>;
  achieveDist: Record<string, number>;
  categories: Category[];
  capturedCharts?: ChartType[]; // which charts this check-in recorded
}

export interface Board {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  categories: Category[];
  // Pairwise slider values: key is `${catA_id}_${catB_id}`, value 1-99 (percent for A)
  presentPairs: Record<string, number>;
  focusPairs: Record<string, number>;
  achievePairs: Record<string, number>;
  snapshots: BoardSnapshot[];
  // How often (in days) a snapshot should be taken for each chart
  snapshotIntervals: SnapshotIntervals;
}

export interface FirebaseSyncConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  firestoreDatabaseId?: string;
}
