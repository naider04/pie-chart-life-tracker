/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Board, Category, ChartType } from './types';
import {
  loadBoards,
  saveBoards,
  getActiveBoardId,
  setActiveBoardId,
  createEmptyBoard,
  isSnapshotDue,
  captureSnapshot,
  persistBoard,
} from './services/storage';
import { calculateDistribution, setPairValue } from './utils/ahp';
import { PieChart } from './components/PieChart';
import { PairwiseComparison } from './components/PairwiseComparison';
import { CategoryManager } from './components/CategoryManager';
import { TimelineHistory } from './components/TimelineHistory';
import { PrintReport } from './components/PrintReport';
import { BoardSelector } from './components/BoardSelector';
import { Tooltip } from './components/Tooltip';
import { Printer, Cloud, Sparkles, SlidersHorizontal, History, TrendingUp } from 'lucide-react';
import { initFirebase, saveFirebaseConfig, getSavedFirebaseConfig } from './services/firebase';

export default function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [activeBoardId, setActiveBoardIdState] = useState<string>('');
  const [activeChart, setActiveChart] = useState<ChartType>('present');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [clickOrder, setClickOrder] = useState<string[]>([]);
  const [isPrintOpen, setIsPrintOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'compare' | 'timeline'>('compare');
  const [showCloudModal, setShowCloudModal] = useState(false);
  const [firebaseProjectInput, setFirebaseProjectInput] = useState('');

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
      setFirebaseProjectInput(conf.projectId);
      initFirebase(conf);
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

  const snapshotDue = useMemo(() => {
    if (!activeBoard) return false;
    return isSnapshotDue(activeBoard);
  }, [activeBoard]);

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

  // Snapshot operations (every 2 days)
  const handleCaptureSnapshot = (note?: string) => {
    if (!activeBoard) return;
    const snap = captureSnapshot(activeBoard, note);
    const updatedBoard: Board = {
      ...activeBoard,
      snapshots: [...(activeBoard.snapshots || []), snap],
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

  const handleSaveFirebaseConfig = () => {
    if (!firebaseProjectInput.trim()) {
      saveFirebaseConfig(null);
    } else {
      const conf = { projectId: firebaseProjectInput.trim() };
      saveFirebaseConfig(conf);
      initFirebase(conf);
    }
    setShowCloudModal(false);
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

            <Tooltip content="Timeline & 2-day historical check-ins" position="bottom">
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
                {snapshotDue && (
                  <span className="w-2 h-2 rounded-full bg-amber-400 absolute -top-0.5 -right-0.5 ring-2 ring-neutral-900" />
                )}
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

      {/* Main Dual-Pane Dashboard: Sliders on the Left, 3 Pie Charts on the Right */}
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
            />
          ) : (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <TimelineHistory
                snapshots={activeBoard.snapshots || []}
                categories={activeBoard.categories}
                isDue={snapshotDue}
                onCaptureSnapshot={handleCaptureSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
              />
            </div>
          )}
        </section>

        {/* Right Column: The 3 Pie Charts + Shared Category Legend (55% on desktop) */}
        <section className="lg:col-span-7 flex flex-col h-full min-h-0 gap-2.5 overflow-hidden">
          {/* Single Shared Category Legend Bar (Categories are not repeated across each pie chart) */}
          <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl px-3 py-2 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                Categories:
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-0.5 flex-1 justify-end">
              {activeBoard.categories.length === 0 ? (
                <span className="text-xs text-neutral-500">None added yet</span>
              ) : (
                activeBoard.categories.map(cat => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                        isSelected
                          ? 'bg-neutral-800 text-white ring-2 ring-indigo-500/80 shadow-sm'
                          : 'text-neutral-300 hover:bg-neutral-800/60 bg-neutral-950/80 border border-neutral-800'
                      }`}
                      title={`Click to focus comparisons on ${cat.name}`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="max-w-[100px] truncate">{cat.name}</span>
                    </button>
                  );
                })
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

      {/* Cloud Sync Modal */}
      {showCloudModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="w-5 h-5 text-indigo-400" />
              <h4 className="font-semibold text-neutral-100 text-sm">Firebase Cloud Sync</h4>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Your boards and periodic check-in snapshots are saved locally. Enter your Firebase project ID to enable real-time cloud synchronization.
            </p>
            <input
              type="text"
              value={firebaseProjectInput}
              onChange={e => setFirebaseProjectInput(e.target.value)}
              placeholder="Firebase Project ID..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 mb-4"
            />
            <div className="flex justify-end gap-2">
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
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
              >
                Save
              </button>
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
    </div>
  );
}
