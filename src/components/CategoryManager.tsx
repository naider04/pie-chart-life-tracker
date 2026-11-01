import React, { useState } from 'react';
import { Category } from '../types';
import { getNextColor, PALETTE } from '../utils/ahp';
import { Plus, X, Trash2, AlertTriangle } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onRemoveCategory: (id: string) => void;
  onClearAll: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onClearAll,
}) => {
  const [inputValue, setInputValue] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  
  // Confirmation states
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const color = getNextColor(categories.length);
    onAddCategory(trimmed, color);
    setInputValue('');
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      onRemoveCategory(categoryToDelete.id);
      setCategoryToDelete(null);
    }
  };

  const confirmClearAll = () => {
    onClearAll();
    setShowClearConfirm(false);
  };

  return (
    <div className="bg-neutral-900/60 border border-neutral-800 rounded-2xl p-3 md:p-3.5 shadow-sm">
      {/* Input bar */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleAdd} className="flex items-center gap-1.5 flex-1">
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Add category (e.g. Work, Sleep, Fitness)..."
            maxLength={35}
            className="flex-1 bg-neutral-950/80 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 transition-all"
          />

          <Tooltip content="Add category to comparison" position="top">
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
              aria-label="Add category"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </Tooltip>
        </form>

        {categories.length > 0 && (
          <Tooltip content="Clear all categories" position="top">
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="p-1.5 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
              aria-label="Clear all categories"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>
        )}
      </div>

      {/* Category Chips - compact scrollable list */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 max-h-24 overflow-y-auto pr-1">
          {categories.map(cat => {
            const isPickerOpen = activeColorPicker === cat.id;
            return (
              <div
                key={cat.id}
                className="relative flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg pl-2 pr-1.5 py-1 text-xs transition-all hover:border-neutral-700"
              >
                {/* Color Dot with Picker Trigger */}
                <Tooltip content="Change color" position="top">
                  <button
                    type="button"
                    onClick={() => setActiveColorPicker(isPickerOpen ? null : cat.id)}
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 hover:scale-110 transition-transform"
                    style={{ backgroundColor: cat.color }}
                    aria-label={`Change color for ${cat.name}`}
                  />
                </Tooltip>

                {/* Category Name */}
                <span className="font-medium text-neutral-200 select-none max-w-[120px] truncate">
                  {cat.name}
                </span>

                {/* Remove button (triggers confirmation modal) */}
                <Tooltip content={`Delete ${cat.name}`} position="top">
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(cat)}
                    className="text-neutral-500 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Tooltip>

                {/* Color swatch popup */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-40 bg-neutral-900 border border-neutral-700 rounded-xl p-2 shadow-2xl flex flex-wrap gap-1 w-40 animate-in fade-in zoom-in-95">
                    {PALETTE.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          onUpdateCategory(cat.id, { color: c });
                          setActiveColorPicker(null);
                        }}
                        className={`w-5 h-5 rounded-md transition-transform hover:scale-110 ${
                          c === cat.color ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900' : ''
                        }`}
                        style={{ backgroundColor: c }}
                        aria-label={`Select color ${c}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog: Delete Single Category */}
      {categoryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 mb-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-semibold text-neutral-100 text-sm">Delete Category?</h4>
            </div>
            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              Are you sure you want to delete <span className="font-bold text-white">"{categoryToDelete.name}"</span>? Its pairwise comparisons will be removed across all 3 charts.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Clear All Categories */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 mb-2 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="font-semibold text-neutral-100 text-sm">Clear All Categories?</h4>
            </div>
            <p className="text-xs text-neutral-300 mb-4 leading-relaxed">
              Are you sure you want to delete all <span className="font-bold text-white">{categories.length}</span> categories? This will reset all comparisons and charts on this board.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmClearAll}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
