import React, { useState } from 'react';
import { BoardSnapshot, Category } from '../types';
import { Calendar, Plus, Clock, ChevronRight, Trash2, ArrowUpRight, ArrowDownRight, Minus, AlertCircle } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { PieChart } from './PieChart';

interface TimelineHistoryProps {
  snapshots: BoardSnapshot[];
  categories: Category[];
  isDue: boolean;
  onCaptureSnapshot: (note?: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
}

export const TimelineHistory: React.FC<TimelineHistoryProps> = ({
  snapshots,
  categories,
  isDue,
  onCaptureSnapshot,
  onDeleteSnapshot,
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<BoardSnapshot | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);

  const handleCapture = () => {
    onCaptureSnapshot(noteInput.trim() || undefined);
    setNoteInput('');
    setShowNoteModal(false);
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-4 md:p-6 shadow-sm">
      {/* Header and Check-in Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-neutral-100 text-sm tracking-tight">Timeline & Snapshots</span>
          <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400">
            {snapshots.length}
          </span>
          {isDue && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
              <AlertCircle className="w-3 h-3" />
              Check-in Due (2+ days)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Tooltip content="Record a snapshot of all 3 charts to track your evolution" position="top">
            <button
              type="button"
              onClick={() => setShowNoteModal(true)}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Record Check-in</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Note modal */}
      {showNoteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="font-semibold text-neutral-100 text-sm mb-2">Record 2-Day Check-in</h4>
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
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
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
            No snapshots recorded yet. Click "Record Check-in" to save your current 3 charts.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[...snapshots].reverse().map((snap, idx) => {
              const isSelected = selectedSnapshot?.id === snap.id;
              const dateObj = new Date(snap.timestamp);
              const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

                  {/* Category color strip */}
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-neutral-800 mb-2">
                    {categories.map(c => {
                      const pct = snap.presentDist[c.id] || 0;
                      return (
                        <div
                          key={c.id}
                          style={{ width: `${pct}%`, backgroundColor: c.color }}
                          title={`${c.name}: ${pct}%`}
                        />
                      );
                    })}
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
