import React from 'react';
import { Board, CategoryDistribution } from '../types';
import { Printer, X } from 'lucide-react';
import { PieChart } from './PieChart';
import { Tooltip } from './Tooltip';

interface PrintReportProps {
  board: Board;
  presentDist: CategoryDistribution[];
  focusDist: CategoryDistribution[];
  achieveDist: CategoryDistribution[];
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReport: React.FC<PrintReportProps> = ({
  board,
  presentDist,
  focusDist,
  achieveDist,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const todayStr = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
      {/* Modal Container */}
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Top Control Bar (Hidden when printing via CSS @media print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800 bg-neutral-950 no-print">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-indigo-400" />
            <h3 className="font-semibold text-neutral-100 text-sm">Print Charts</h3>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip content="Send to printer or save as PDF" position="bottom">
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print / Save PDF</span>
              </button>
            </Tooltip>

            <Tooltip content="Close preview" position="bottom">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </Tooltip>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div
          id="printable-report"
          className="flex-1 overflow-y-auto p-6 md:p-8 bg-white text-neutral-900 selection:bg-indigo-100 print:p-0 print:m-0"
        >
          {/* Document Header */}
          <div className="border-b-2 border-neutral-200 pb-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-neutral-950">
                  {board.title}
                </h1>
                <p className="text-xs text-neutral-500 mt-1">
                  Triad Priority Distribution: Present vs Focus vs Target
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-medium text-neutral-600 block">
                  {todayStr}
                </span>
                <span className="text-[10px] text-neutral-400 block mt-0.5">
                  {board.categories.length} Categories Analyzed
                </span>
              </div>
            </div>
          </div>

          {/* The 3 Pie Charts Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
                1. Present Reality
              </h2>
              <PieChart
                title=""
                data={presentDist}
                size={200}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
                2. Intended Focus
              </h2>
              <PieChart
                title=""
                data={focusDist}
                size={200}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-3">
                3. Target Goal
              </h2>
              <PieChart
                title=""
                data={achieveDist}
                size={200}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
