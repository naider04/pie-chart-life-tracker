import React, { useMemo } from 'react';
import { Category, ChartType } from '../types';
import { DraggableSplitBar } from './DraggableSplitBar';
import { getPairValue } from '../utils/ahp';
import { RotateCcw, Copy, ArrowRightLeft, Target, Settings2 } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface PairwiseComparisonProps {
  categories: Category[];
  activeChart: ChartType;
  onChangeActiveChart: (type: ChartType) => void;
  pairs: Record<string, number>;
  onUpdatePair: (catAId: string, catBId: string, value: number) => void;
  onResetAllPairs: () => void;
  onCopyFromOtherChart: (sourceType: ChartType) => void;
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string) => void;
  clickOrder: string[]; // Category IDs in order of last clicked (most recent first)
  onOpenCategoryOptions?: () => void;
}

export const PairwiseComparison: React.FC<PairwiseComparisonProps> = ({
  categories,
  activeChart,
  onChangeActiveChart,
  pairs,
  onUpdatePair,
  onResetAllPairs,
  onCopyFromOtherChart,
  selectedCategoryId,
  onSelectCategory,
  clickOrder,
  onOpenCategoryOptions,
}) => {
  // Determine active target category (last clicked category, or first category by default)
  const activeFocusCategory = useMemo(() => {
    if (selectedCategoryId) {
      const found = categories.find(c => c.id === selectedCategoryId);
      if (found) return found;
    }
    return categories[0] || null;
  }, [categories, selectedCategoryId]);

  // Build the list of pairs: ONLY compare the activeFocusCategory against all others
  // And sort the other categories so the most recently clicked categories appear on top!
  const focusedPairs = useMemo(() => {
    if (!activeFocusCategory || categories.length < 2) return [];

    const otherCategories = categories.filter(c => c.id !== activeFocusCategory.id);

    // Sort other categories based on clickOrder (most recent first)
    otherCategories.sort((a, b) => {
      const idxA = clickOrder.indexOf(a.id);
      const idxB = clickOrder.indexOf(b.id);
      const rankA = idxA === -1 ? 9999 : idxA;
      const rankB = idxB === -1 ? 9999 : idxB;
      return rankA - rankB;
    });

    return otherCategories.map(other => ({
      catA: activeFocusCategory,
      catB: other,
    }));
  }, [activeFocusCategory, categories, clickOrder]);

  const chartMeta: Record<ChartType, { label: string; desc: string }> = {
    present: {
      label: '1. Present',
      desc: 'Evaluate how your time or resources are currently distributed',
    },
    focus: {
      label: '2. Focus',
      desc: 'Where you think you should direct your conscious attention now',
    },
    achieve: {
      label: '3. Achieve',
      desc: 'The long-term desired equilibrium you want to accomplish',
    },
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 md:p-4 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Chart Selector Tabs & Quick Actions */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-800/80 shrink-0">
        <div className="inline-flex p-0.5 rounded-xl bg-neutral-950 border border-neutral-800">
          {(['present', 'focus', 'achieve'] as ChartType[]).map(type => {
            const isActive = activeChart === type;
            const meta = chartMeta[type];
            return (
              <Tooltip key={type} content={meta.desc} position="bottom">
                <button
                  type="button"
                  onClick={() => onChangeActiveChart(type)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-neutral-800 text-neutral-100 shadow-sm border border-neutral-700/60'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  {meta.label}
                </button>
              </Tooltip>
            );
          })}
        </div>

        {/* Action Controls with Tooltips */}
        <div className="flex items-center gap-1.5">
          {activeChart !== 'present' && (
            <Tooltip
              content={`Copy weights from ${activeChart === 'focus' ? 'Present' : 'Focus'}`}
              position="top"
            >
              <button
                type="button"
                onClick={() =>
                  onCopyFromOtherChart(activeChart === 'focus' ? 'present' : 'focus')
                }
                className="px-2 py-1 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">
                  Copy {activeChart === 'focus' ? 'Present' : 'Focus'}
                </span>
              </button>
            </Tooltip>
          )}

          <Tooltip content="Reset all comparisons in this chart to 50/50" position="top">
            <button
              type="button"
              onClick={onResetAllPairs}
              className="px-2 py-1 rounded-lg border border-neutral-800 hover:border-neutral-700 bg-neutral-950 text-neutral-400 hover:text-neutral-200 text-xs font-medium flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Sliders Area - Only shows pairs for the active category compared to others, sorted with recently clicked on top */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-3 pr-1 space-y-3">
        {categories.length < 2 ? (
          <div className="h-full min-h-[140px] flex flex-col items-center justify-center p-4 border border-dashed border-neutral-800/80 rounded-xl text-center">
            <ArrowRightLeft className="w-6 h-6 text-neutral-600 mb-1.5 opacity-60" />
            <p className="text-xs font-medium text-neutral-400">
              Add at least 2 categories to compare pairs
            </p>
          </div>
        ) : (
          focusedPairs.map(({ catA, catB }) => {
            const currentValue = getPairValue(pairs, catA.id, catB.id);
            return (
              <DraggableSplitBar
                key={`${catA.id}_${catB.id}`}
                catA={catA}
                catB={catB}
                value={currentValue}
                onChange={newVal => onUpdatePair(catA.id, catB.id, newVal)}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
