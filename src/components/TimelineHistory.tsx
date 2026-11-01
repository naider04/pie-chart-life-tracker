import React, { useMemo, useState } from 'react';
import { BoardSnapshot, Category, ChartType, CHART_TYPES, SnapshotIntervals } from '../types';
import {
  Calendar,
  Plus,
  Clock,
  ChevronRight,
  Trash2,
  AlertCircle,
  Timer,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { PieChart } from './PieChart';
import { getChartLastCapturedAt, MIN_SNAPSHOT_INTERVAL_DAYS, MAX_SNAPSHOT_INTERVAL_DAYS } from '../services/storage';

interface TimelineHistoryProps {
  snapshots: BoardSnapshot[];
  categories: Category[];
  intervals: SnapshotIntervals;
  dueCharts: ChartType[];
  onUpdateInterval: (chart: ChartType, days: number) => void;
  onCaptureSnapshot: (note?: string, charts?: ChartType[]) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

const CHART_META: Record<ChartType, { label: string; short: string; dot: string; chip: string }> = {
  present: {
    label: '1. Present',
    short: 'Present',
    dot: 'bg-sky-400',
    chip: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
  },
  focus: {
    label: '2. Focus',
    short: 'Focus',
    dot: 'bg-amber-400',
    chip: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  },
  achieve: {
    label: '3. Achieve',
    short: 'Achieve',
    dot: 'bg-emerald-400',
    chip: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  },
};

const INTERVAL_PRESETS = [1, 2, 3, 7, 14, 30];

function formatRelative(timestamp: number | null): string {
  if (timestamp === null) return 'never recorded';
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export const TimelineHistory: React.FC<TimelineHistoryProps> = ({
  snapshots,
  categories,
  intervals,
  dueCharts,
  onUpdateInterval,
  onCaptureSnapshot,
  onDeleteSnapshot,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<BoardSnapshot | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [chartsToCapture, setChartsToCapture] = useState<ChartType[]>([]);

  const lastCapturedByChart = useMemo(() => {
    const boardLike = { snapshots };
    return CHART_TYPES.reduce((acc, chart) => {
      acc[chart] = getChartLastCapturedAt(boardLike, chart);
      return acc;
    }, {} as Record<ChartType, number | null>);
  }, [snapshots]);

  const openCaptureModal = () => {
    setChartsToCapture(dueCharts.length > 0 ? [...dueCharts] : [...CHART_TYPES]);
    setShowNoteModal(true);
  };

  const toggleChartToCapture = (chart: ChartType) => {
    setChartsToCapture(prev =>
      prev.includes(chart) ? prev.filter(c => c !== chart) : [...prev, chart]
    );
  };

  const handleCapture = () => {
    if (chartsToCapture.length === 0) return;
    onCaptureSnapshot(noteInput.trim() || undefined, chartsToCapture);
    setNoteInput('');
    setChartsToCapture([]);
    setShowNoteModal(false);
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-sm">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-neutral-100 text-sm tracking-tight">Timeline & Snapshots</span>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
            {snapshots.length}
          </span>
          {dueCharts.map(chart => (
            <span
              key={chart}
              className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full border ${CHART_META[chart].chip}`}
            >
              <AlertCircle className="w-3 h-3" />
              {CHART_META[chart].short} due
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Record a snapshot for the charts you choose" position="top">
            <button
              type="button"
              onClick={openCaptureModal}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Check-in</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Per-chart cadence controls */}
      <div className="pt-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Timer className="w-3.5 h-3.5 text-indigo-400" />
          <span className="text-xs font-semibold text-neutral-300">Check-in frequency</span>
          <span className="text-[10px] text-neutral-500">— set how often each chart is snapshotted</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {CHART_TYPES.map(chart => {
            const meta = CHART_META[chart];
            const days = intervals?.[chart] ?? 2;
            const isDue = dueCharts.includes(chart);
            const last = lastCapturedByChart[chart];
            return (
              <div
                key={chart}
                className={`rounded-xl border p-2.5 transition-colors ${
                  isDue
                    ? 'border-amber-500/40 bg-amber-500/5'
                    : 'border-neutral-800 bg-neutral-950/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-200">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    {meta.label}
                  </span>
                  {isDue && (
                    <span className="text-[10px] font-semibold text-amber-400">Due</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 mt-2">
                  <span className="text-[10px] text-neutral-500">Every</span>
                  <input
                    type="number"
                    min={MIN_SNAPSHOT_INTERVAL_DAYS}
                    max={MAX_SNAPSHOT_INTERVAL_DAYS}
                    value={days}
                    onChange={e => {
                      const next = Number(e.target.value);
                      if (!Number.isNaN(next)) onUpdateInterval(chart, next);
                    }}
                    className="w-14 bg-neutral-900 border border-neutral-800 rounded-lg px-2 py-1 text-xs text-neutral-100 font-mono focus:outline-none focus:border-indigo-500"
                    aria-label={`Snapshot interval in days for ${meta.label}`}
                  />
                  <span className="text-[10px] text-neutral-500">days</span>
                  <div className="flex flex-wrap gap-1 ml-auto">
                    {INTERVAL_PRESETS.filter(p => p !== days)
                      .slice(0, 3)
                      .map(p => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => onUpdateInterval(chart, p)}
                          className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[10px] text-neutral-400 hover:text-neutral-200 hover:border-neutral-700"
                          title={`Set to ${p} day${p === 1 ? '' : 's'}`}
                        >
                          {p}d
                        </button>
                      ))}
                  </div>
                </div>

                <p className="text-[10px] text-neutral-500 mt-1.5">
                  Last: {formatRelative(last)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Note / chart-picker modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="font-semibold text-neutral-100 text-sm mb-2">Record Check-in</h4>
            <p className="text-xs text-neutral-400 mb-3">
              Choose which charts to snapshot. Charts that are due are pre-selected.
            </p>
            <div className="space-y-1.5 mb-3">
              {CHART_TYPES.map(chart => {
                const meta = CHART_META[chart];
                const checked = chartsToCapture.includes(chart);
                return (
                  <label
                    key={chart}
                    className={`flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-colors ${
                      checked
                        ? 'border-indigo-500/50 bg-indigo-500/10'
                        : 'border-neutral-800 bg-neutral-950/60 hover:border-neutral-700'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-xs font-medium text-neutral-200">
                      <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                      {meta.label}
                    </span>
                    <span className="flex items-center gap-2">
                      {dueCharts.includes(chart) && (
                        <span className="text-[10px] font-semibold text-amber-400">Due</span>
                      )}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleChartToCapture(chart)}
                        className="accent-indigo-500"
                      />
                    </span>
                  </label>
                );
              })}
            </div>
            <input
              type="text"
              value={noteInput}
              onChange={e => setNoteInput(e.target.value)}
              placeholder="Optional check-in note..."
              maxLength={80}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowNoteModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCapture}
                disabled={chartsToCapture.length === 0}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold"
              >
                Save Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots list */}
      <div className="pt-4">
        {snapshots.length === 0 ? (
          <div className="text-center py-8 text-neutral-500 text-xs border border-dashed border-neutral-800/80 rounded-xl">
            No snapshots recorded yet. Click "Record Check-in" to save your charts.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...snapshots].reverse().map(snap => {
              const isSelected = selectedSnapshot?.id === snap.id;
              const dateObj = new Date(snap.timestamp);
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
              const captured = snap.capturedCharts ?? CHART_TYPES;

              return (
                <div
                  key={snap.id}
                  onClick={() => setSelectedSnapshot(isSelected ? null : snap)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-neutral-800/90 border-indigo-500/80 shadow-md ring-1 ring-indigo-500/30'
                      : 'bg-neutral-950/60 border-neutral-800/80 hover:border-neutral-700 hover:bg-neutral-900/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-neutral-400" />
                      <span className="text-xs font-bold text-neutral-200">{snap.date}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">{formattedTime}</span>
                    </div>

                    <Tooltip content="Delete snapshot" position="top">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          if (selectedSnapshot?.id === snap.id) setSelectedSnapshot(null);
                          onDeleteSnapshot(snap.id);
                        }}
                        className="text-neutral-500 hover:text-rose-400 p-1 rounded transition-colors"
                        aria-label="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </Tooltip>
                  </div>

                  {snap.note && (
                    <p className="text-xs text-neutral-300 italic mb-2 line-clamp-1">"{snap.note}"</p>
                  )}

                  <div className="flex flex-wrap gap-1 mb-2">
                    {captured.map(chart => (
                      <span
                        key={chart}
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${CHART_META[chart].chip}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${CHART_META[chart].dot}`} />
                        {CHART_META[chart].short}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1">
                    <span>{isSelected ? 'Viewing comparison' : 'Click to inspect'}</span>
                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isSelected ? 'rotate-90 text-indigo-400' : ''}`} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Snapshot Inspector Modal / Drawer */}
      {selectedSnapshot && (
        <div className="mt-5 pt-5 border-t border-neutral-800 animate-in fade-in">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold text-sm text-neutral-200">
              Historical Snapshot: <span className="text-indigo-400">{selectedSnapshot.date}</span>
            </h4>
            <button
              type="button"
              onClick={() => setSelectedSnapshot(null)}
              className="text-xs text-neutral-400 hover:text-neutral-100 px-2 py-1 rounded bg-neutral-800"
            >
              Close Inspector
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PieChart
              title="1. Present (Snapshot)"
              data={categories.map(c => ({
                categoryId: c.id,
                name: c.name,
                color: c.color,
                weight: selectedSnapshot.presentDist[c.id] || 0,
                percentage: selectedSnapshot.presentDist[c.id] || 0,
              }))}
              size={180}
            />
            <PieChart
              title="2. Focus (Snapshot)"
              data={categories.map(c => ({
                categoryId: c.id,
                name: c.name,
                color: c.color,
                weight: selectedSnapshot.focusDist[c.id] || 0,
                percentage: selectedSnapshot.focusDist[c.id] || 0,
              }))}
              size={180}
            />
            <PieChart
              title="3. Achieve (Snapshot)"
              data={categories.map(c => ({
                categoryId: c.id,
                name: c.name,
                color: c.color,
                weight: selectedSnapshot.achieveDist[c.id] || 0,
                percentage: selectedSnapshot.achieveDist[c.id] || 0,
              }))}
              size={180}
            />
          </div>
        </div>
      )}
    </div>
  );
};
