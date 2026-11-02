/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Board, Category, ChartType, CHART_TYPES, FirebaseSyncConfig } from './types';
import {
  loadBoards,
  saveBoards,
  getActiveBoardId,
  setActiveBoardId,
  createEmptyBoard,
  captureSnapshot,
  persistBoard,
  getDueCharts,
  clampSnapshotInterval,
  syncTodaySnapshot,
} from './services/storage';
import { calculateDistribution, setPairValue } from './utils/ahp';
import { PieChart } from './components/PieChart';
import { PairwiseComparison } from './components/PairwiseComparison';
import { CategoryManager } from './components/CategoryManager';
import { TimelineHistory } from './components/TimelineHistory';
import { PrintReport } from './components/PrintReport';
import { CategoryOptionsModal } from './components/CategoryOptionsModal';
import { BoardSelector } from './components/BoardSelector';
import { MonthGrid } from './components/MonthGrid';
import { Tooltip } from './components/Tooltip';
import { Printer, Cloud, Sparkles, SlidersHorizontal, History, TrendingUp, Settings2, CalendarDays } from 'lucide-react';
import {
  initFirebase,
  saveFirebaseConfig,
  getSavedFirebaseConfig,
  loadBoardsFromFirestore,
  syncBoardToFirestore,
  getFirebaseUser,
} from './services/firebase';

type FirebaseStatus = 'idle' | 'connecting' | 'connected' | 'error';

export default function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<string>('');
  const [activeChart, setActiveChart] = useState<ChartType>('present');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [clickOrder, setClickOrder] = useState<string[]>([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'timeline' | 'month'>('compare');
  const [showCategoryOptionsModal, setShowCategoryOptionsModal] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [firebaseConfigInput, setFirebaseConfigInput] = useState<FirebaseSyncConfig>({});
  const [firebaseStatus, setFirebaseStatus] = useState<FirebaseStatus>('idle');
  const [firebaseError, setFirebaseError] = useState('');

  // Pull cloud boards and reconcile them with the locally stored ones
  const reconcileWithCloud = async (localBoards: Board[]) => {
    const cloudBoards = await loadBoardsFromFirestore();
    if (!cloudBoards) return;
    if (cloudBoards.length === 0) {
      setFirebaseStatus('connected');
      return;
    }

    const merged = new Map(localBoards.map(b => [b.id, b]));
    const cloudIds = new Set(cloudBoards.map(b => b.id));

    for (const cloudBoard of cloudBoards) {
      const local = merged.get(cloudBoard.id);
      if (!local || (cloudBoard.updatedAt || 0) > (local.updatedAt || 0)) {
        merged.set(cloudBoard.id, cloudBoard);
      }
    }

    const nextBoards = Array.from(merged.values());
    setBoards(nextBoards);
    saveBoards(nextBoards);
    setActiveBoardIdState(prev =>
      nextBoards.some(b => b.id === prev) ? prev : nextBoards[0]?.id || ''
    );

    // Upload any boards that only exist locally
    localBoards
      .filter(board => !cloudIds.has(board.id))
      .forEach(board => {
        syncBoardToFirestore(board).catch(() => {});
      });

    setFirebaseStatus('connected');
  };

  // Initial load
  useEffect(() => {
    const loaded = loadBoards();
    setBoards(loaded);
    const savedActiveId = getActiveBoardId();
    if (savedActiveId && loaded.some(b => b.id === savedActiveId)) {
      setActiveBoardIdState(savedActiveId);
    } else if (loaded.length > 0) {
      setActiveBoardIdState(loaded[0].id);
      setActiveBoardId(loaded[0].id);
    }

    const conf = getSavedFirebaseConfig();
    if (conf?.projectId) {
      setFirebaseConfigInput(conf);
      setFirebaseStatus('connecting');
      initFirebase(conf)
        .then(ok => {
          if (ok) return reconcileWithCloud(loaded);
          setFirebaseStatus('error');
          setFirebaseError('Could not connect with the saved Firebase config.');
        })
        .catch(() => setFirebaseStatus('error'));
    }
  }, []);

  const activeBoard = useMemo(() => {
    return boards.find(b => b.id === activeBoardId) || boards[0] || null;
  }, [boards, activeBoardId]);

  // Keep selected category valid when board or categories change
  useEffect(() => {
    if (activeBoard && activeBoard.categories.length > 0) {
      if (!selectedCategoryId || !activeBoard.categories.some(c => c.id === selectedCategoryId)) {
        setSelectedCategoryId(activeBoard.categories[0].id);
      }
    } else {
      setSelectedCategoryId(null);
    }
  }, [activeBoard, selectedCategoryId]);

  // Handle clicking a category from any pie chart, legend, or list
  const handleSelectCategory = (catId: string) => {
    setSelectedCategoryId(catId);
    setClickOrder(prev => [catId, ...prev.filter(id => id !== catId)]);
  };

  const selectedCategory = useMemo(() => {
    if (!activeBoard || !selectedCategoryId) return null;
    return activeBoard.categories.find(c => c.id === selectedCategoryId) || null;
  }, [activeBoard, selectedCategoryId]);

  // Distributions for each of the 3 pie charts
  const presentDist = useMemo(() => {
    if (!activeBoard) return [];
    return calculateDistribution(activeBoard.categories, activeBoard.presentPairs);
  }, [activeBoard]);

  const focusDist = useMemo(() => {
    if (!activeBoard) return [];
    return calculateDistribution(activeBoard.categories, activeBoard.focusPairs);
  }, [activeBoard]);

  const achieveDist = useMemo(() => {
    if (!activeBoard) return [];
    return calculateDistribution(activeBoard.categories, activeBoard.achievePairs);
  }, [activeBoard]);

  const dueCharts = useMemo(() => {
    if (!activeBoard) return [] as ChartType[];
    return getDueCharts(activeBoard);
  }, [activeBoard]);

  // Automatically capture / update today's snapshot with whatever the user currently has in their graph,
  // so the last configuration of each day automatically remains recorded for that day.
  useEffect(() => {
    if (!activeBoard || activeBoard.categories.length === 0) return;

    const timer = setTimeout(() => {
      setBoards(prevBoards => {
        const board = prevBoards.find(b => b.id === activeBoard.id);
        if (!board) return prevBoards;

        const syncedBoard = syncTodaySnapshot(board);
        if (JSON.stringify(syncedBoard.snapshots) === JSON.stringify(board.snapshots)) {
          return prevBoards;
        }

        saveBoards(prevBoards.map(b => (b.id === syncedBoard.id ? syncedBoard : b)));
        return prevBoards.map(b => (b.id === syncedBoard.id ? syncedBoard : b));
      });
    }, 500);

    return () => clearTimeout(timer);
  }, [
    activeBoard?.id,
    activeBoard?.categories,
    activeBoard?.presentPairs,
    activeBoard?.focusPairs,
    activeBoard?.achievePairs,
  ]);

  // Board operations
  const handleSelectBoard = (id: string) => {
    setActiveBoardIdState(id);
    setActiveBoardId(id);
  };

  const handleCreateBoard = (title: string) => {
    const newBoard = createEmptyBoard(title);
    const updated = [...boards, newBoard];
    setBoards(updated);
    saveBoards(updated);
    setActiveBoardIdState(newBoard.id);
    setActiveBoardId(newBoard.id);
  };

  const handleRenameBoard = (boardId: string, newTitle: string) => {
    if (!activeBoard) return;
    const updated = boards.map(b => (b.id === boardId ? { ...b, title: newTitle, updatedAt: Date.now() } : b));
    setBoards(updated);
    saveBoards(updated);
  };

  const handleDeleteBoard = (boardId: string) => {
    if (boards.length <= 1) return;
    const remaining = boards.filter(b => b.id !== boardId);
    setBoards(remaining);
    saveBoards(remaining);
    if (activeBoardId === boardId) {
      setActiveBoardIdState(remaining[0].id);
      setActiveBoardId(remaining[0].id);
    }
  };

  // Category operations
  const handleAddCategory = (name: string, color: string) => {
    if (!activeBoard) return;
    const newCat: Category = {
      id: 'cat_' + Math.random().toString(36).substring(2, 9),
      name,
      color,
    };
    const updatedBoard: Board = {
      ...activeBoard,
      categories: [...activeBoard.categories, newCat],
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
    handleSelectCategory(newCat.id);
  };

  const handleUpdateCategory = (catId: string, updates: Partial<Category>) => {
    if (!activeBoard) return;
    const updatedCats = activeBoard.categories.map(c => (c.id === catId ? { ...c, ...updates } : c));
    const updatedBoard: Board = {
      ...activeBoard,
      categories: updatedCats,
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleRemoveCategory = (catId: string) => {
    if (!activeBoard) return;
    const remainingCats = activeBoard.categories.filter(c => c.id !== catId);
    const updatedBoard: Board = {
      ...activeBoard,
      categories: remainingCats,
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
    if (selectedCategoryId === catId) {
      setSelectedCategoryId(remainingCats[0]?.id || null);
    }
  };

  const handleClearAllCategories = () => {
    if (!activeBoard) return;
    const updatedBoard: Board = {
      ...activeBoard,
      categories: [],
      presentPairs: {},
      focusPairs: {},
      achievePairs: {},
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
    setSelectedCategoryId(null);
  };

  // Pair comparison operations
  const handleUpdatePair = (catAId: string, catBId: string, value: number) => {
    if (!activeBoard) return;
    const pairKeyMap = {
      present: 'presentPairs' as const,
      focus: 'focusPairs' as const,
      achieve: 'achievePairs' as const,
    };
    const targetKey = pairKeyMap[activeChart];
    const updatedPairs = setPairValue(activeBoard[targetKey], catAId, catBId, value);

    const updatedBoard: Board = {
      ...activeBoard,
      [targetKey]: updatedPairs,
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleResetAllPairs = () => {
    if (!activeBoard) return;
    const pairKeyMap = {
      present: 'presentPairs' as const,
      focus: 'focusPairs' as const,
      achieve: 'achievePairs' as const,
    };
    const targetKey = pairKeyMap[activeChart];
    const updatedBoard: Board = {
      ...activeBoard,
      [targetKey]: {},
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleCopyFromOtherChart = (sourceType: ChartType) => {
    if (!activeBoard) return;
    const pairKeyMap = {
      present: 'presentPairs' as const,
      focus: 'focusPairs' as const,
      achieve: 'achievePairs' as const,
    };
    const sourcePairs = activeBoard[pairKeyMap[sourceType]];
    const targetKey = pairKeyMap[activeChart];

    const updatedBoard: Board = {
      ...activeBoard,
      [targetKey]: { ...sourcePairs },
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  // Snapshot operations (independent per-chart cadence)
  const handleCaptureSnapshot = (note?: string, charts: ChartType[] = CHART_TYPES) => {
    if (!activeBoard) return;
    const targets = charts.length > 0 ? charts : [...CHART_TYPES];
    const snap = captureSnapshot(activeBoard, note, targets);
    const updatedBoard: Board = {
      ...activeBoard,
      snapshots: [...(activeBoard.snapshots || []), snap],
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleUpdateSnapshotInterval = (chart: ChartType, days: number) => {
    if (!activeBoard) return;
    const updatedBoard: Board = {
      ...activeBoard,
      snapshotIntervals: {
        ...activeBoard.snapshotIntervals,
        [chart]: clampSnapshotInterval(days),
      },
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    if (!activeBoard) return;
    const updatedSnaps = (activeBoard.snapshots || []).filter(s => s.id !== snapshotId);
    const updatedBoard: Board = {
      ...activeBoard,
      snapshots: updatedSnaps,
      updatedAt: Date.now(),
    };
    const nextBoards = persistBoard(updatedBoard, boards);
    setBoards(nextBoards);
  };

  const handleSaveFirebaseConfig = async () => {
    setFirebaseError('');
    const cleaned: FirebaseSyncConfig = {};
    (Object.keys(firebaseConfigInput) as (keyof FirebaseSyncConfig)[]).forEach(key => {
      const value = firebaseConfigInput[key];
      if (typeof value === 'string' && value.trim()) {
        cleaned[key] = value.trim();
      }
    });

    if (!cleaned.projectId || !cleaned.apiKey || !cleaned.appId) {
      setFirebaseError('Project ID, API Key and App ID are required.');
      return;
    }

    saveFirebaseConfig(cleaned);
    setFirebaseStatus('connecting');
    const ok = await initFirebase(cleaned);
    if (!ok) {
      setFirebaseStatus('error');
      setFirebaseError('Could not initialize Firebase. Check the project config.');
      return;
    }

    await reconcileWithCloud(boards);
    setShowCloudModal(false);
  };

  const handleDisconnectFirebase = () => {
    saveFirebaseConfig(null);
    setFirebaseConfigInput({});
    setFirebaseStatus('idle');
    setFirebaseError('');
  };

  if (!activeBoard) {
    return (
      <div className="h-screen bg-neutral-950 flex items-center justify-center text-neutral-500">
        Loading...
      </div>
    );
  }

  const currentPairs =
    activeChart === 'present'
      ? activeBoard.presentPairs
      : activeChart === 'focus'
      ? activeBoard.focusPairs
      : activeBoard.achievePairs;

  return (
    <div className="h-screen max-h-screen overflow-hidden bg-neutral-950 text-neutral-100 flex flex-col">
      {/* Top Navigation - Compact */}
      <header className="shrink-0 h-13 border-b border-neutral-800/80 bg-neutral-950 px-3 md:px-5 flex items-center justify-between no-print">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md shadow-indigo-950/50">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs md:text-sm tracking-tight text-neutral-100 hidden sm:inline">
              Triad
            </span>
            <BoardSelector
              boards={boards}
              activeBoardId={activeBoard.id}
              onSelectBoard={handleSelectBoard}
              onCreateBoard={handleCreateBoard}
              onRenameBoard={handleRenameBoard}
              onDeleteBoard={handleDeleteBoard}
            />
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-2">
          <div className="inline-flex p-0.5 rounded-xl bg-neutral-900 border border-neutral-800">
            <Tooltip content="Paired Comparison Sliders" position="bottom">
              <button
                type="button"
                onClick={() => setActiveTab('compare')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'compare'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Sliders</span>
              </button>
            </Tooltip>

            <Tooltip content="Timeline & per-chart historical check-ins" position="bottom">
              <button
                type="button"
                onClick={() => setActiveTab('timeline')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all relative ${
                  activeTab === 'timeline'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Timeline</span>
                {dueCharts.length > 0 && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 ring-2 ring-neutral-900" />
                )}
              </button>
            </Tooltip>

            <Tooltip content="Month Grid - Full Screen Daily Present History" position="bottom">
              <button
                type="button"
                onClick={() => setActiveTab('month')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  activeTab === 'month'
                    ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/60'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Month Grid</span>
              </button>
            </Tooltip>
          </div>

          <Tooltip content="Print 3 charts report" position="bottom">
            <button
              type="button"
              onClick={() => setIsPrintOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
              aria-label="Print charts"
            >
              <Printer className="w-3.5 h-3.5 text-neutral-400" />
              <span className="hidden sm:inline">Print</span>
            </button>
          </Tooltip>

          <Tooltip content="Firebase Cloud Sync" position="bottom">
            <button
              type="button"
              onClick={() => setShowCloudModal(true)}
              className="p-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-neutral-400 hover:text-neutral-200 transition-colors"
              aria-label="Cloud sync"
            >
              <Cloud className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        </div>
      </header>

      {/* Main View: Full-Screen Month Grid OR Dual-Pane Dashboard */}
      {activeTab === 'month' ? (
        <main className="flex-1 min-h-0 p-3 md:p-4 overflow-hidden flex flex-col">
          <MonthGrid board={activeBoard} presentDist={presentDist} />
        </main>
      ) : (
        <main className="flex-1 min-h-0 p-3 md:p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 overflow-hidden">
        {/* Left Column: Categories + Sliders OR Timeline (45% on desktop) */}
        <section className="lg:col-span-5 flex flex-col h-full min-h-0 gap-2.5 overflow-hidden">
          {/* Categories Quick Input & Badges */}
          <CategoryManager
            categories={activeBoard.categories}
            onAddCategory={handleAddCategory}
            onUpdateCategory={handleUpdateCategory}
            onRemoveCategory={handleRemoveCategory}
            onClearAll={handleClearAllCategories}
            onEditCategory={(cat) => {
              handleSelectCategory(cat.id);
              setShowCategoryOptionsModal(true);
            }}
          />

          {/* Active Mode: Sliders OR Timeline */}
          {activeTab === 'compare' ? (
            <PairwiseComparison
              categories={activeBoard.categories}
              activeChart={activeChart}
              onChangeActiveChart={setActiveChart}
              pairs={currentPairs}
              onUpdatePair={handleUpdatePair}
              onResetAllPairs={handleResetAllPairs}
              onCopyFromOtherChart={handleCopyFromOtherChart}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={handleSelectCategory}
              clickOrder={clickOrder}
              onOpenCategoryOptions={() => setShowCategoryOptionsModal(true)}
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TimelineHistory
                snapshots={activeBoard.snapshots || []}
                categories={activeBoard.categories}
                intervals={activeBoard.snapshotIntervals}
                dueCharts={dueCharts}
                onUpdateInterval={handleUpdateSnapshotInterval}
                onCaptureSnapshot={handleCaptureSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
              />
            </div>
          )}
        </section>

        {/* Right Column: The 3 Pie Charts + Shared Category Legend (55% on desktop) */}
        <section className="lg:col-span-7 flex flex-col h-full min-h-0 gap-2.5 overflow-hidden">
          {/* Selected Category Options Bar */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                SELECTED:
              </span>
              {selectedCategory ? (
                <Tooltip content={`Edit "${selectedCategory.name}" (change name, color, delete)`} position="bottom">
                  <button
                    type="button"
                    onClick={() => setShowCategoryOptionsModal(true)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold shadow-sm transition-all cursor-pointer animate-in fade-in"
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: selectedCategory.color }}
                    />
                    <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
                    <span className="max-w-[140px] truncate">{selectedCategory.name} Options</span>
                  </button>
                </Tooltip>
              ) : (
                <span className="text-xs text-neutral-500 italic">Click any pie slice</span>
              )}
            </div>
          </div>

          {/* The 3 Pie Charts Side by Side */}
          <div className="grid grid-cols-3 gap-2.5 flex-1 min-h-0 items-stretch">
            {/* Chart 1: Present */}
            <div
              onClick={() => setActiveChart('present')}
              className={`cursor-pointer transition-all rounded-2xl h-full flex flex-col ${
                activeChart === 'present'
                  ? 'ring-2 ring-sky-500/80 shadow-lg shadow-sky-950/20'
                  : 'hover:border-neutral-700'
              }`}
            >
              <PieChart
                title="1. Present"
                subtitle="Current Reality"
                data={presentDist}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                className={activeChart === 'present' ? 'bg-sky-950/15 border-sky-500/30' : ''}
              />
            </div>

            {/* Chart 2: Focus */}
            <div
              onClick={() => setActiveChart('focus')}
              className={`cursor-pointer transition-all rounded-2xl h-full flex flex-col ${
                activeChart === 'focus'
                  ? 'ring-2 ring-amber-500/80 shadow-lg shadow-amber-950/20'
                  : 'hover:border-neutral-700'
              }`}
            >
              <PieChart
                title="2. Focus"
                subtitle="Intended Focus"
                data={focusDist}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                className={activeChart === 'focus' ? 'bg-amber-950/15 border-amber-500/30' : ''}
              />
            </div>

            {/* Chart 3: Achieve */}
            <div
              onClick={() => setActiveChart('achieve')}
              className={`cursor-pointer transition-all rounded-2xl h-full flex flex-col ${
                activeChart === 'achieve'
                  ? 'ring-2 ring-emerald-500/80 shadow-lg shadow-emerald-950/20'
                  : 'hover:border-neutral-700'
              }`}
            >
              <PieChart
                title="3. Achieve"
                subtitle="Target Goal"
                data={achieveDist}
                selectedCategoryId={selectedCategoryId}
                onSelectCategory={handleSelectCategory}
                className={activeChart === 'achieve' ? 'bg-emerald-950/15 border-emerald-500/30' : ''}
              />
            </div>
          </div>

          {/* Compact Alignment Shift Bar: Shows Net Shift from Present to Target */}
          {activeBoard.categories.length > 0 && (
            <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl px-3.5 py-2 shrink-0">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-300">
                  <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Target vs Present Shift</span>
                </div>
                <span className="text-[10px] text-neutral-500">
                  Click a pie slice to focus its slider comparisons
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 max-h-16 overflow-y-auto">
                {activeBoard.categories.map(cat => {
                  const p = presentDist.find(d => d.categoryId === cat.id)?.percentage || 0;
                  const a = achieveDist.find(d => d.categoryId === cat.id)?.percentage || 0;
                  const delta = Number((a - p).toFixed(1));

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-neutral-950 border border-neutral-800/80 text-xs hover:border-neutral-700 transition-colors cursor-pointer"
                      title={`Click to focus comparisons on ${cat.name}`}
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="font-medium text-neutral-300">{cat.name}:</span>
                      <span
                        className={`font-mono font-bold text-[11px] ${
                          delta > 0
                            ? 'text-emerald-400'
                            : delta < 0
                            ? 'text-rose-400'
                            : 'text-neutral-500'
                        }`}
                      >
                        {delta > 0 ? `+${delta}%` : `${delta}%`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </section>
      </main>
      )}

      {/* Cloud Sync Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-indigo-400" />
              <h4 className="font-semibold text-neutral-100 text-sm">Firebase Cloud Sync</h4>
            </div>
            <p className="text-xs text-neutral-400 mb-3">
              Boards and snapshots are always saved locally. Paste your Firebase web app config to
              sync them to Firestore. You are signed in anonymously, so no login screen is needed.
            </p>

            <div className="mb-3 flex items-center gap-1.5 text-[11px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  firebaseStatus === 'connected'
                    ? 'bg-emerald-400'
                    : firebaseStatus === 'connecting'
                    ? 'bg-amber-400 animate-pulse'
                    : firebaseStatus === 'error'
                    ? 'bg-rose-400'
                    : 'bg-neutral-500'
                }`}
              />
              <span className="text-neutral-400">
                {firebaseStatus === 'connected'
                  ? `Connected${getFirebaseUser()?.uid ? ` as ${getFirebaseUser()!.uid.slice(0, 10)}…` : ''}`
                  : firebaseStatus === 'connecting'
                  ? 'Connecting…'
                  : firebaseStatus === 'error'
                  ? 'Connection error'
                  : 'Not connected'}
              </span>
            </div>

            <div className="space-y-2 mb-3">
              {(
                [
                  { key: 'projectId', label: 'Project ID', required: true, placeholder: 'my-app-12345' },
                  { key: 'apiKey', label: 'API Key', required: true, placeholder: 'AIza...' },
                  { key: 'authDomain', label: 'Auth Domain', placeholder: 'my-app.firebaseapp.com' },
                  { key: 'appId', label: 'App ID', required: true, placeholder: '1:1234567890:web:abcdef' },
                  { key: 'storageBucket', label: 'Storage Bucket', placeholder: 'my-app.appspot.com' },
                  { key: 'messagingSenderId', label: 'Messaging Sender ID', placeholder: '1234567890' },
                  { key: 'firestoreDatabaseId', label: 'Firestore Database ID', placeholder: '(default)' },
                ] as const
              ).map(field => (
                <label key={field.key} className="block">
                  <span className="block text-[11px] font-medium text-neutral-400 mb-1">
                    {field.label}
                    {'required' in field && field.required ? (
                      <span className="text-rose-400"> *</span>
                    ) : (
                      <span className="text-neutral-600"> (optional)</span>
                    )}
                  </span>
                  <input
                    type="text"
                    value={firebaseConfigInput[field.key] || ''}
                    onChange={e =>
                      setFirebaseConfigInput(prev => ({ ...prev, [field.key]: e.target.value }))
                    }
                    placeholder={field.placeholder}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500"
                  />
                </label>
              ))}
            </div>

            {firebaseError && (
              <p className="text-[11px] text-rose-400 mb-3">{firebaseError}</p>
            )}

            <div className="flex items-center justify-between gap-2">
              {firebaseStatus === 'connected' || getSavedFirebaseConfig() ? (
                <button
                  type="button"
                  onClick={handleDisconnectFirebase}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:text-rose-300"
                >
                  Disconnect
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowCloudModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveFirebaseConfig}
                  disabled={firebaseStatus === 'connecting'}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold"
                >
                  {firebaseStatus === 'connecting' ? 'Connecting…' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Report Modal */}
      <PrintReport
        board={activeBoard}
        presentDist={presentDist}
        focusDist={focusDist}
        achieveDist={achieveDist}
        isOpen={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
      />

      {/* Category Options Modal (Name, Color, Delete with Confirmation) */}
      <CategoryOptionsModal
        category={selectedCategory}
        isOpen={showCategoryOptionsModal}
        onClose={() => setShowCategoryOptionsModal(false)}
        onUpdateCategory={handleUpdateCategory}
        onDeleteCategory={handleRemoveCategory}
      />
    </div>
  );
}
