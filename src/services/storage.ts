import { Board, BoardSnapshot, Category } from '../types';
import { calculateDistribution } from '../utils/ahp';
import { syncBoardToFirestore } from './firebase';

const STORAGE_KEY = 'triad_priorities_boards_v1';
const ACTIVE_BOARD_KEY = 'triad_priorities_active_board_id';

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
  };
}

export function loadBoards(): Board[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
 * Checks if 2 days (48 hours) have elapsed since the last snapshot.
 */
export function isSnapshotDue(board: Board): boolean {
  if (!board.snapshots || board.snapshots.length === 0) return true;
  const latest = board.snapshots[board.snapshots.length - 1];
  const elapsedMs = Date.now() - latest.timestamp;
  const twoDaysMs = 2 * 24 * 60 * 60 * 1000;
  return elapsedMs >= twoDaysMs;
}

/**
 * Creates a new historical snapshot representing the current distributions of all 3 charts.
 */
export function captureSnapshot(board: Board, note?: string): BoardSnapshot {
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

  return {
    id: 'snap_' + Math.random().toString(36).substring(2, 10),
    boardId: board.id,
    date: dateStr,
    timestamp: Date.now(),
    note,
    presentDist: presentMap,
    focusDist: focusMap,
    achieveDist: achieveMap,
    categories: [...board.categories],
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
