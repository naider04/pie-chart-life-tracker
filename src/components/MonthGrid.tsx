import React, { useState, useMemo } from 'react';
import { Board, CategoryDistribution, BoardSnapshot } from '../types';
import { getLocalDateKey, getSnapshotForDay } from '../services/storage';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  X,
  CheckCircle2,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { PieChart } from './PieChart';

interface MonthGridProps {
  board: Board;
  presentDist: CategoryDistribution[];
}

interface MiniPieSlice {
  color: string;
  percentage: number;
}

/**
 * Minimalist mini pie chart for day tiles:
 * Strictly visual geometry — NO levels, NO percentages, and NO names on the chart.
 */
const MiniPresentPie: React.FC<{
  slices: MiniPieSlice[];
  size?: number;
}> = ({ slices, size = 48 }) => {
  const valid = slices.filter(s => s.percentage > 0);
  if (valid.length === 0) return null;

  const center = size / 2;
  const radius = (size / 2) * 0.90;

  // Single category circle
  if (valid.length === 1) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill={valid[0].color}
          stroke="#0a0a0a"
          strokeWidth={1.5}
        />
      </svg>
    );
  }

  let cumulativeAngle = -Math.PI / 2;
  const total = valid.reduce((sum, s) => sum + s.percentage, 0);

  const arcSlices = valid.map(item => {
    const fraction = total > 0 ? item.percentage / total : 0;
    const angle = fraction * 2 * Math.PI;
    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const largeArc = angle > Math.PI ? 1 : 0;
    const x1 = center + radius * Math.cos(startAngle);
    const y1 = center + radius * Math.sin(startAngle);
    const x2 = center + radius * Math.cos(endAngle);
    const y2 = center + radius * Math.sin(endAngle);

    const pathData = `M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;

    return { color: item.color, pathData };
  });

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible drop-shadow-sm transition-transform duration-200 group-hover:scale-105"
    >
      <g>
        {arcSlices.map((slice, i) => (
          <path
            key={i}
            d={slice.pathData}
            fill={slice.color}
            stroke="#0a0a0a"
            strokeWidth={1.2}
          />
        ))}
      </g>
    </svg>
  );
};

interface DayCellData {
  dateKey: string;
  dayNum: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  hasData: boolean;
  distribution: CategoryDistribution[];
  snapshot: BoardSnapshot | null;
  dateObj: Date;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const MonthGrid: React.FC<MonthGridProps> = ({ board, presentDist }) => {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [inspectedDay, setInspectedDay] = useState<DayCellData | null>(null);

  const todayDate = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => getLocalDateKey(todayDate), [todayDate]);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const monthName = useMemo(() => {
    return viewDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }, [viewDate]);

  const isCurrentViewingMonth = useMemo(() => {
    return todayDate.getFullYear() === year && todayDate.getMonth() === month;
  }, [todayDate, year, month]);

  const prevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const jumpToToday = () => {
    setViewDate(new Date());
  };

  // Build grid calendar cells (Monday-based weeks)
  const calendarCells = useMemo((): DayCellData[] => {
    const firstDayOfMonth = new Date(year, month, 1);
    // (day + 6) % 7 maps Sunday(0)->6, Monday(1)->0
    const startOffset = (firstDayOfMonth.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;
    const cells: DayCellData[] = [];

    for (let i = 0; i < totalCells; i++) {
      let cellYear = year;
      let cellMonth = month;
      let dayNum: number;
      let isCurrentMonth = true;

      if (i < startOffset) {
        // Prev month leading day
        isCurrentMonth = false;
        cellMonth = month - 1;
        if (cellMonth < 0) {
          cellMonth = 11;
          cellYear = year - 1;
        }
        dayNum = daysInPrevMonth - startOffset + i + 1;
      } else if (i < startOffset + daysInMonth) {
        // Current month day
        isCurrentMonth = true;
        dayNum = i - startOffset + 1;
      } else {
        // Next month trailing day
        isCurrentMonth = false;
        cellMonth = month + 1;
        if (cellMonth > 11) {
          cellMonth = 0;
          cellYear = year + 1;
        }
        dayNum = i - startOffset - daysInMonth + 1;
      }

      const dateObj = new Date(cellYear, cellMonth, dayNum);
      const dateKey = `${cellYear}-${String(cellMonth + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const isToday = dateKey === todayKey;
      const isPast = dateKey < todayKey;
      const isFuture = dateKey > todayKey;

      let hasData = false;
      let distribution: CategoryDistribution[] = [];
      let snapshot: BoardSnapshot | null = null;

      if (isCurrentMonth) {
        if (isToday) {
          // Today: automatically displays the latest state of the present graph
          distribution = presentDist;
          hasData = presentDist.some(d => d.percentage > 0);
          snapshot = getSnapshotForDay(board.snapshots || [], dateKey);
        } else {
          // Other days: pick the last snapshot the user had that day
          snapshot = getSnapshotForDay(board.snapshots || [], dateKey);
          if (snapshot && snapshot.presentDist) {
            const snapCats =
              snapshot.categories && snapshot.categories.length > 0
                ? snapshot.categories
                : board.categories;

            distribution = snapCats.map(cat => ({
              categoryId: cat.id,
              name: cat.name,
              color: cat.color,
              weight: snapshot!.presentDist[cat.id] || 0,
              percentage: snapshot!.presentDist[cat.id] || 0,
            }));
            hasData = distribution.some(d => d.percentage > 0);
          }
        }
      }

      cells.push({
        dateKey,
        dayNum,
        isCurrentMonth,
        isToday,
        isPast,
        isFuture,
        hasData,
        distribution,
        snapshot,
        dateObj,
      });
    }

    return cells;
  }, [year, month, todayKey, board.snapshots, board.categories, presentDist]);

  // Count days with recorded data in the viewed month
  const recordedDaysCount = useMemo(() => {
    return calendarCells.filter(c => c.isCurrentMonth && c.hasData).length;
  }, [calendarCells]);

  return (
    <div className="h-full flex flex-col min-h-0 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 md:p-4 shadow-sm overflow-hidden select-none">
      {/* Top Controls: Month Navigation & Today Jump */}
      <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-neutral-800/80">
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950/80 border border-neutral-800 rounded-xl p-1 shadow-inner">
            <Tooltip content="Previous Month" position="bottom">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                aria-label="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </Tooltip>

            <span className="font-bold text-sm md:text-base text-neutral-100 px-3 tracking-tight min-w-[140px] text-center">
              {monthName}
            </span>

            <Tooltip content="Next Month" position="bottom">
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
                aria-label="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>

          {!isCurrentViewingMonth && (
            <button
              type="button"
              onClick={jumpToToday}
              className="px-2.5 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 hover:bg-neutral-850 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Jump to Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs text-neutral-400 bg-neutral-950/70 border border-neutral-800/90 rounded-xl px-2.5 py-1 font-mono">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-neutral-200">{recordedDaysCount}</span>
            <span>recorded</span>
          </span>
        </div>
      </div>

      {/* Colors & Levels Single Reference Bar (Displayed once for the whole grid, NO month averages) */}
      <div className="shrink-0 py-2.5 px-3 my-2.5 bg-neutral-950/80 border border-neutral-800/90 rounded-xl flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider uppercase text-neutral-400">
            Colors & Present Levels:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {board.categories.length === 0 ? (
            <span className="text-xs text-neutral-500 italic">
              No categories configured. Add categories to see daily charts.
            </span>
          ) : (
            presentDist.map(item => (
              <div
                key={item.categoryId}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-neutral-900 border border-neutral-800 text-xs shadow-sm"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-neutral-200 text-[11px]">{item.name}</span>
                <span className="font-mono font-bold text-neutral-300 text-[11px] ml-0.5">
                  {Math.round(item.percentage)}%
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Weekday Header Row */}
      <div className="shrink-0 grid grid-cols-7 gap-1.5 md:gap-2 mb-1.5">
        {WEEKDAYS.map((day, idx) => (
          <div
            key={day}
            className={`text-center text-[11px] font-bold uppercase tracking-wider py-1 ${
              idx >= 5 ? 'text-neutral-500' : 'text-neutral-400'
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Main Month Grid (Fills remaining height) */}
      <div className="flex-1 min-h-0 grid grid-cols-7 gap-1.5 md:gap-2 auto-rows-fr overflow-y-auto">
        {calendarCells.map(cell => {
          const { dateKey, dayNum, isCurrentMonth, isToday, hasData, distribution } = cell;

          if (!isCurrentMonth) {
            return (
              <div
                key={dateKey}
                className="h-full min-h-[58px] p-1.5 rounded-xl border border-neutral-900/60 bg-neutral-950/20 opacity-30 flex flex-col items-center justify-between pointer-events-none"
              >
                <span className="text-[11px] font-mono text-neutral-600 self-start ml-0.5">
                  {dayNum}
                </span>
                <div className="w-7 h-7 rounded-full border border-dashed border-neutral-800/40 my-auto" />
                <div className="h-2" />
              </div>
            );
          }

          return (
            <div
              key={dateKey}
              onClick={() => {
                if (hasData) setInspectedDay(cell);
              }}
              className={`group relative h-full min-h-[64px] p-1.5 md:p-2 rounded-xl border flex flex-col items-center justify-between transition-all duration-150 ${
                isToday
                  ? 'border-indigo-500/80 bg-indigo-950/20 ring-1 ring-indigo-500/40 shadow-sm shadow-indigo-950/30'
                  : hasData
                  ? 'border-neutral-800 bg-neutral-950/70 hover:border-neutral-700 hover:bg-neutral-900/70 cursor-pointer shadow-sm'
                  : 'border-neutral-850/60 bg-neutral-950/40 opacity-70'
              }`}
            >
              {/* Day Number Header */}
              <div className="w-full flex items-center justify-between">
                <span
                  className={`text-[11px] md:text-xs font-mono font-bold leading-none ${
                    isToday
                      ? 'text-indigo-400 bg-indigo-500/20 px-1.5 py-0.5 rounded-md'
                      : 'text-neutral-300'
                  }`}
                >
                  {dayNum}
                </span>

                {isToday && (
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-300 bg-indigo-500/20 px-1 rounded">
                    Today
                  </span>
                )}
              </div>

              {/* Minimalist Day Pie Chart (NO text, NO numbers, NO names on chart) */}
              <div className="my-auto flex items-center justify-center py-0.5">
                {hasData ? (
                  <MiniPresentPie
                    slices={distribution.map(d => ({
                      color: d.color,
                      percentage: d.percentage,
                    }))}
                    size={46}
                  />
                ) : (
                  <div
                    className="w-8 h-8 md:w-9 md:h-9 rounded-full border border-dashed border-neutral-800/80 flex items-center justify-center"
                    title="No recorded snapshot for this day"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-neutral-800" />
                  </div>
                )}
              </div>

              {/* Bottom Subtle Status Pill */}
              <div className="w-full flex items-center justify-center h-3">
                {hasData ? (
                  <span className="text-[9px] font-mono text-neutral-500 group-hover:text-neutral-300 transition-colors">
                    {isToday ? 'Live' : 'Last state'}
                  </span>
                ) : (
                  <span className="text-[9px] text-neutral-600">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Day Inspector Modal: Opens when clicking any day with data */}
      {inspectedDay && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setInspectedDay(null)}
        >
          <div
            className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-md w-full shadow-2xl relative"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-indigo-400" />
                <div>
                  <h4 className="font-bold text-neutral-100 text-sm">
                    {inspectedDay.dateObj.toLocaleDateString(undefined, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </h4>
                  <p className="text-[10px] text-neutral-400">
                    {inspectedDay.isToday
                      ? 'Live graph state from today'
                      : inspectedDay.snapshot?.isAuto
                      ? 'Last automatic state saved on this day'
                      : 'Recorded snapshot for this day'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content: Large Pie Chart & Breakdown */}
            <div className="py-4 flex flex-col items-center">
              <div className="w-full flex justify-center mb-4">
                <PieChart
                  title="Present Chart Distribution"
                  subtitle={
                    inspectedDay.isToday
                      ? 'Current live configuration'
                      : inspectedDay.snapshot
                      ? `Last state at ${new Date(inspectedDay.snapshot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                      : undefined
                  }
                  data={inspectedDay.distribution}
                  size={190}
                />
              </div>

              {/* Category Breakdown Table */}
              <div className="w-full space-y-1.5 pt-2 border-t border-neutral-800">
                <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-1">
                  Category Breakdown
                </div>
                {inspectedDay.distribution.map(item => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-neutral-950/60 border border-neutral-800/80 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="font-medium text-neutral-200">{item.name}</span>
                    </div>
                    <span className="font-mono font-bold text-neutral-100">
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                ))}
              </div>

              {inspectedDay.snapshot?.note && (
                <div className="w-full mt-3 p-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-neutral-300 italic">
                  "{inspectedDay.snapshot.note}"
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-800">
              <button
                type="button"
                onClick={() => setInspectedDay(null)}
                className="px-3.5 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
