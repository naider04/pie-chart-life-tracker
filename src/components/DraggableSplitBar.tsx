import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Category } from '../types';
import { RotateCcw } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface DraggableSplitBarProps {
  catA: Category;
  catB: Category;
  value: number; // 1 to 99: percent allocated to Cat A (50 = equal)
  onChange: (newValue: number) => void;
}

export const DraggableSplitBar: React.FC<DraggableSplitBarProps> = ({
  catA,
  catB,
  value,
  onChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const rawPct = ((clientX - rect.left) / rect.width) * 100;
      let clamped = Math.round(Math.max(5, Math.min(95, rawPct)));
      // Snap to 50% if within 48-52%
      if (clamped >= 48 && clamped <= 52) {
        clamped = 50;
      }
      setLocalValue(clamped);
      onChange(clamped);
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const handleDoubleClick = () => {
    setLocalValue(50);
    onChange(50);
  };

  const pctA = localValue;
  const pctB = 100 - localValue;

  return (
    <div className="flex items-center gap-2 w-full group">
      {/* Draggable Rectangle Container - Taller as requested (h-14 md:h-16) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        className={`relative flex-1 h-14 md:h-16 rounded-2xl overflow-hidden cursor-ew-resize select-none border border-neutral-800 bg-neutral-900 shadow-md transition-shadow ${
          isDragging ? 'ring-2 ring-indigo-500 shadow-indigo-950/60 shadow-xl' : 'hover:border-neutral-700'
        }`}
        title="Drag the middle line to adjust relative weight. Double-click to equalize (50/50)."
      >
        {/* Left Segment: Category A */}
        <div
          className="absolute top-0 bottom-0 left-0 flex items-center px-4 transition-all duration-75 overflow-hidden"
          style={{
            width: `${pctA}%`,
            backgroundColor: `${catA.color}22`,
            borderRight: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Subtle colored accent glow bar */}
          <div
            className="absolute left-0 top-0 bottom-0 w-2"
            style={{ backgroundColor: catA.color }}
          />

          <div className="flex items-center gap-2.5 truncate z-10">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: catA.color }}
            />
            <span className="font-semibold text-sm md:text-base text-neutral-100 truncate">
              {catA.name}
            </span>
            <span
              className="text-xs md:text-sm font-mono font-bold px-2 py-0.5 rounded-md ml-1 shadow-sm"
              style={{
                backgroundColor: `${catA.color}33`,
                color: catA.color,
              }}
            >
              {pctA}%
            </span>
          </div>
        </div>

        {/* Right Segment: Category B */}
        <div
          className="absolute top-0 bottom-0 right-0 flex items-center justify-end px-4 transition-all duration-75 overflow-hidden"
          style={{
            width: `${pctB}%`,
            backgroundColor: `${catB.color}22`,
            borderLeft: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {/* Subtle colored accent glow bar */}
          <div
            className="absolute right-0 top-0 bottom-0 w-2"
            style={{ backgroundColor: catB.color }}
          />

          <div className="flex items-center gap-2.5 truncate z-10 flex-row-reverse">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: catB.color }}
            />
            <span className="font-semibold text-sm md:text-base text-neutral-100 truncate">
              {catB.name}
            </span>
            <span
              className="text-xs md:text-sm font-mono font-bold px-2 py-0.5 rounded-md mr-1 shadow-sm"
              style={{
                backgroundColor: `${catB.color}33`,
                color: catB.color,
              }}
            >
              {pctB}%
            </span>
          </div>
        </div>

        {/* Center 50% tick marker */}
        <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-neutral-700/50 pointer-events-none" />

        {/* Draggable Divider Line in the Middle */}
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-neutral-200 z-20 flex items-center justify-center pointer-events-none -translate-x-1/2"
          style={{ left: `${pctA}%` }}
        >
          {/* Tactile Handle Grip - taller & wider */}
          <div
            className={`w-5 h-10 rounded-full border border-neutral-700 bg-neutral-900 shadow-lg flex items-center justify-center transition-all ${
              isDragging ? 'scale-110 bg-white border-white text-neutral-900' : 'text-neutral-400 group-hover:border-neutral-500'
            }`}
          >
            <div className="flex flex-col gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
            </div>
          </div>
        </div>
      </div>

      {/* Quick Equalize 50/50 button */}
      <Tooltip content="Equalize 50/50 balance" position="top">
        <button
          type="button"
          onClick={handleDoubleClick}
          className={`p-2.5 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800/80 transition-colors ${
            pctA === 50 ? 'opacity-30 pointer-events-none' : 'opacity-70 group-hover:opacity-100'
          }`}
          aria-label="Equalize balance to 50/50"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </Tooltip>
    </div>
  );
};
