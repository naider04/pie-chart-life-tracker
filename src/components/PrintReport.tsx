import React, { useRef } from 'react';
import { Board, CategoryDistribution } from '../types';
import { Printer, X, Download } from 'lucide-react';
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
            <h3 className="font-semibold text-neutral-100 text-sm">Print Charts & Alignment Report</h3>
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                1. Present Reality
              </h2>
              <PieChart
                title=""
                data={presentDist}
                size={180}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                2. Intended Focus
              </h2>
              <PieChart
                title=""
                data={focusDist}
                size={180}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>

            <div className="border border-neutral-200 rounded-xl p-4 bg-neutral-50/50 flex flex-col items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-700 mb-2">
                3. Target Goal
              </h2>
              <PieChart
                title=""
                data={achieveDist}
                size={180}
                className="bg-transparent border-0 p-0 shadow-none"
              />
            </div>
          </div>

          {/* Comprehensive Comparison Breakdown Table */}
          <div className="border border-neutral-200 rounded-xl overflow-hidden mb-6">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-100 text-neutral-700 border-b border-neutral-200 font-semibold">
                <tr>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-3 text-right">Present %</th>
                  <th className="py-2.5 px-3 text-right">Focus %</th>
                  <th className="py-2.5 px-3 text-right">Target %</th>
                  <th className="py-2.5 px-4 text-right">Net Shift (Target - Present)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {board.categories.map(cat => {
                  const p = presentDist.find(d => d.categoryId === cat.id)?.percentage || 0;
                  const f = focusDist.find(d => d.categoryId === cat.id)?.percentage || 0;
                  const a = achieveDist.find(d => d.categoryId === cat.id)?.percentage || 0;
                  const delta = Number((a - p).toFixed(1));

                  return (
                    <tr key={cat.id} className="hover:bg-neutral-50/80">
                      <td className="py-2.5 px-4 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-semibold text-neutral-900">{cat.name}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-700">{p}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-700">{f}%</td>
                      <td className="py-2.5 px-3 text-right font-mono text-neutral-900 font-bold">{a}%</td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold">
                        <span
                          className={
                            delta > 0
                              ? 'text-emerald-600'
                              : delta < 0
                              ? 'text-rose-600'
                              : 'text-neutral-500'
                          }
                        >
                          {delta > 0 ? `+${delta}%` : `${delta}%`}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-500">
            <span>Generated via Triad Priority System</span>
            <span>Relative paired comparison method</span>
          </div>
        </div>
      </div>
    </div>
  );
};
