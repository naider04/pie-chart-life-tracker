import { Board, BoardSnapshot, Category, ChartType, CHART_TYPES, SnapshotIntervals } from '../types';
import { calculateDistribution } from '../utils/ahp';
import { syncBoardToFirestore } from './firebase';

const STORAGE_KEY = 'triad_priorities_boards_v1';
const ACTIVE_BOARD_KEY = 'triad_priorities_active_board_id';

export const DEFAULT_SNAPSHOT_INTERVAL_DAYS = 2;
export const MIN_SNAPSHOT_INTERVAL_DAYS = 1;
export const MAX_SNAPSHOT_INTERVAL_DAYS = 365;

const DAY_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_SNAPSHOT_INTERVALS: SnapshotIntervals = {
  present: DEFAULT_SNAPSHOT_INTERVAL_DAYS,
  focus: DEFAULT_SNAPSHOT_INTERVAL_DAYS,
  achieve: DEFAULT_SNAPSHOT_INTERVAL_DAYS,
};

export function clampSnapshotInterval(days: number): number {
  if (!Number.isFinite(days)) return DEFAULT_SNAPSHOT_INTERVAL_DAYS;
  return Math.min(
    MAX_SNAPSHOT_INTERVAL_DAYS,
    Math.max(MIN_SNAPSHOT_INTERVAL_DAYS, Math.round(days))
  );
}

/**
 * Fills in fields introduced after earlier app versions (e.g. per-chart
 * snapshot intervals) so old locally-stored boards keep working.
 */
export function normalizeBoard(board: Board): Board {
  const intervals = board.snapshotIntervals || ({} as Partial<SnapshotIntervals>);
  return {
    ...board,
    snapshots: board.snapshots || [],
    snapshotIntervals: {
      present: clampSnapshotInterval(intervals.present ?? DEFAULT_SNAPSHOT_INTERVAL_DAYS),
      focus: clampSnapshotInterval(intervals.focus ?? DEFAULT_SNAPSHOT_INTERVAL_DAYS),
      achieve: clampSnapshotInterval(intervals.achieve ?? DEFAULT_SNAPSHOT_INTERVAL_DAYS),
    },
  };
}

export function createEmptyBoard(title = 'New Priority Board'): Board {
  const id = 'board_' + Math.random().toString(36).substring(2, 10);
  const now = Date.now();
  return {
    id,
    title,
    createdAt: now,
    updatedAt: now,
    categories: [],
    presentPairs: {},
    focusPairs: {},
    achievePairs: {},
    snapshots: [],
    snapshotIntervals: { ...DEFAULT_SNAPSHOT_INTERVALS },
  };
}

export function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(normalizeBoard);
      }
    }
  } catch (err) {
    console.error('Failed to load boards from localStorage', err);
  }

  // Initial clean board without pre-filled categories as requested
  const initial = [createEmptyBoard('Time Distribution')];
  saveBoards(initial);
  return initial;
}

export function saveBoards(boards: Board[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boards));
  } catch (err) {
    console.error('Failed to save boards to localStorage', err);
  }
}

export function getActiveBoardId(): string | null {
  return localStorage.getItem(ACTIVE_BOARD_KEY);
}

export function setActiveBoardId(id: string): void {
  localStorage.setItem(ACTIVE_BOARD_KEY, id);
}

/**
 * Returns the timestamp of the most recent snapshot that recorded the given chart.
 * Legacy snapshots without `capturedCharts` are treated as having captured every chart.
 */
export function getChartLastCapturedAt(
  board: Pick<Board, 'snapshots'>,
  chart: ChartType
): number | null {
  let latest: number | null = null;
  for (const snap of board.snapshots || []) {
    const captured = snap.capturedCharts ?? CHART_TYPES;
    if (captured.includes(chart)) {
      if (latest === null || snap.timestamp > latest) latest = snap.timestamp;
    }
  }
  return latest;
}

/**
 * Checks if the stored interval (days) for a single chart has elapsed since its
 * last snapshot.
 */
export function isChartSnapshotDue(
  board: Board,
  chart: ChartType,
  now = Date.now()
): boolean {
  const intervalDays = clampSnapshotInterval(
    board.snapshotIntervals?.[chart] ?? DEFAULT_SNAPSHOT_INTERVAL_DAYS
  );
  const last = getChartLastCapturedAt(board, chart);
  if (last === null) return true;
  return now - last >= intervalDays * DAY_MS;
}

/**
 * Returns every chart whose own check-in interval has elapsed.
 */
export function getDueCharts(board: Board, now = Date.now()): ChartType[] {
  return CHART_TYPES.filter(chart => isChartSnapshotDue(board, chart, now));
}

/**
 * Checks if any of the 3 charts is due for a snapshot.
 */
export function isSnapshotDue(board: Board): boolean {
  return getDueCharts(board).length > 0;
}

/**
 * Returns a local date key in YYYY-MM-DD format based on the user's timezone.
 */
export function getLocalDateKey(dateOrTimestamp: number | Date = Date.now()): string {
  const d = typeof dateOrTimestamp === 'number' ? new Date(dateOrTimestamp) : dateOrTimestamp;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns the last snapshot recorded on a specific date (YYYY-MM-DD).
 * If multiple snapshots were taken on that day, the one with the latest timestamp is returned.
 */
export function getSnapshotForDay(
  snapshots: BoardSnapshot[],
  dateKey: string
): BoardSnapshot | null {
  if (!snapshots || snapshots.length === 0) return null;
  const matches = snapshots.filter(s => {
    if (s.dateKey) return s.dateKey === dateKey;
    return getLocalDateKey(s.timestamp) === dateKey;
  });
  if (matches.length === 0) return null;
  return matches.reduce((latest, curr) => (curr.timestamp > latest.timestamp ? curr : latest));
}

/**
 * Creates a new historical snapshot. The distributions of all 3 charts are
 * stored, but `capturedCharts` records which ones this check-in was for.
 */
export function captureSnapshot(
  board: Board,
  note?: string,
  charts: ChartType[] = CHART_TYPES
): BoardSnapshot {
  const presentDist = calculateDistribution(board.categories, board.presentPairs);
  const focusDist = calculateDistribution(board.categories, board.focusPairs);
  const achieveDist = calculateDistribution(board.categories, board.achievePairs);

  const presentMap: Record<string, number> = {};
  presentDist.forEach(d => { presentMap[d.categoryId] = d.percentage; });

  const focusMap: Record<string, number> = {};
  focusDist.forEach(d => { focusMap[d.categoryId] = d.percentage; });

  const achieveMap: Record<string, number> = {};
  achieveDist.forEach(d => { achieveMap[d.categoryId] = d.percentage; });

  const now = new Date();
  const dateStr = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const dateKey = getLocalDateKey(now);

  return {
    id: 'snap_' + Math.random().toString(36).substring(2, 10),
    boardId: board.id,
    date: dateStr,
    dateKey,
    timestamp: Date.now(),
    note,
    presentDist: presentMap,
    focusDist: focusMap,
    achieveDist: achieveMap,
    categories: [...board.categories],
    capturedCharts: charts.length > 0 ? [...charts] : [...CHART_TYPES],
  };
}

/**
 * Automatically captures or updates today's snapshot with whatever the user currently
 * has in their graph, ensuring the last state of today is preserved for this day.
 */
export function syncTodaySnapshot(board: Board): Board {
  if (!board.categories || board.categories.length === 0) return board;

  const now = new Date();
  const todayKey = getLocalDateKey(now);
  const dateStr = now.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const presentDist = calculateDistribution(board.categories, board.presentPairs);
  const focusDist = calculateDistribution(board.categories, board.focusPairs);
  const achieveDist = calculateDistribution(board.categories, board.achievePairs);

  const presentMap: Record<string, number> = {};
  presentDist.forEach(d => { presentMap[d.categoryId] = d.percentage; });

  const focusMap: Record<string, number> = {};
  focusDist.forEach(d => { focusMap[d.categoryId] = d.percentage; });

  const achieveMap: Record<string, number> = {};
  achieveDist.forEach(d => { achieveMap[d.categoryId] = d.percentage; });

  const snapshots = [...(board.snapshots || [])];
  // Check if today already has a snapshot
  const existingIndex = snapshots.findIndex(s => {
    if (s.dateKey) return s.dateKey === todayKey;
    return getLocalDateKey(s.timestamp) === todayKey;
  });

  const snapshotRecord: BoardSnapshot = {
    id: existingIndex >= 0 ? snapshots[existingIndex].id : 'snap_' + Math.random().toString(36).substring(2, 10),
    boardId: board.id,
    date: dateStr,
    dateKey: todayKey,
    timestamp: Date.now(),
    isAuto: true,
    note: existingIndex >= 0 ? snapshots[existingIndex].note : undefined,
    presentDist: presentMap,
    focusDist: focusMap,
    achieveDist: achieveMap,
    categories: [...board.categories],
    capturedCharts: [...CHART_TYPES],
  };

  if (existingIndex >= 0) {
    snapshots[existingIndex] = snapshotRecord;
  } else {
    snapshots.push(snapshotRecord);
  }

  return {
    ...board,
    snapshots,
    updatedAt: Date.now(),
  };
}

/**
 * Updates a board and triggers cloud sync if configured.
 */
export function persistBoard(updatedBoard: Board, allBoards: Board[]): Board[] {
  const next = allBoards.map(b => (b.id === updatedBoard.id ? updatedBoard : b));
  saveBoards(next);
  syncBoardToFirestore(updatedBoard).catch(() => {});
  return next;
}
