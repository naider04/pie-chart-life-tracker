import React, { useState, useRef, useEffect } from 'react';
import { Category } from '../types';
import { getNextColor, PALETTE } from '../utils/ahp';
import { Plus, Trash2, AlertTriangle, Check, X, Pencil } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface CategoryManagerProps {
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onRemoveCategory: (id: string) => void;
  onClearAll: () => void;
  onEditCategory?: (category: Category) => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({
  categories,
  onAddCategory,
  onUpdateCategory,
  onRemoveCategory,
  onClearAll,
  onEditCategory,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Confirmation states
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    if (isAdding) {
      inputRef.current?.focus();
    }
  }, [isAdding]);

  const handleAdd = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    const color = getNextColor(categories.length);
    onAddCategory(trimmed, color);
    setInputValue('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsAdding(false);
      setInputValue('');
    }
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
      {/* Top action row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-neutral-300">Categories</span>
          <span className="text-[11px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-800 text-neutral-400">
            {categories.length}
          </span>
        </div>

        {/* Input field is hidden until user clicks 'Add' */}
        {!isAdding ? (
          <div className="flex items-center gap-1.5">
            <Tooltip content="Add a new category" position="top">
              <button
                type="button"
                onClick={() => setIsAdding(true)}
                className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </Tooltip>

            {categories.length > 0 && (
              <Tooltip content="Clear all categories" position="top">
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="p-1 rounded-xl text-neutral-500 hover:text-rose-400 hover:bg-rose-950/20 transition-colors"
                  aria-label="Clear all categories"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </Tooltip>
            )}
          </div>
        ) : (
          /* Expandable input form */
          <form onSubmit={handleAdd} className="flex items-center gap-1.5 flex-1 max-w-sm animate-in fade-in duration-150">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Category name (e.g. Work, Sleep)..."
              maxLength={35}
              className="flex-1 bg-neutral-950 border border-indigo-500/80 rounded-xl px-2.5 py-1 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-0.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setInputValue('');
              }}
              className="p-1 rounded-lg text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
              title="Cancel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </form>
        )}
      </div>

      {/* Category Chips with Trash icon for deletion */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 max-h-24 overflow-y-auto pr-1">
          {categories.map(cat => {
            const isPickerOpen = activeColorPicker === cat.id;
            return (
              <div
                key={cat.id}
                className="relative flex items-center gap-1.5 bg-neutral-950 border border-neutral-800 rounded-lg pl-2 pr-1.5 py-1 text-xs transition-all hover:border-neutral-700 group"
              >
                {/* Color Dot with Expanded Picker Trigger */}
                <Tooltip content="Choose color" position="top">
                  <button
                    type="button"
                    onClick={() => setActiveColorPicker(isPickerOpen ? null : cat.id)}
                    className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/10 hover:scale-125 transition-transform"
                    style={{ backgroundColor: cat.color }}
                    aria-label={`Change color for ${cat.name}`}
                  />
                </Tooltip>

                {/* Category Name */}
                <span className="font-medium text-neutral-200 select-none max-w-[120px] truncate">
                  {cat.name}
                </span>

                {/* Edit icon */}
                <Tooltip content={`Edit ${cat.name}`} position="top">
                  <button
                    type="button"
                    onClick={() => onEditCategory && onEditCategory(cat)}
                    className="text-neutral-500 hover:text-indigo-400 p-0.5 rounded transition-colors ml-0.5 cursor-pointer"
                    aria-label={`Edit ${cat.name}`}
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                </Tooltip>

                {/* Trash icon replacing 'x' for deleting category */}
                <Tooltip content={`Delete ${cat.name}`} position="top">
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(cat)}
                    className="text-neutral-500 hover:text-rose-400 p-0.5 rounded transition-colors ml-0.5 cursor-pointer"
                    aria-label={`Delete ${cat.name}`}
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </Tooltip>

                {/* Expanded Color Palette Grid (32 colors) */}
                {isPickerOpen && (
                  <div className="absolute top-full left-0 mt-1.5 z-40 bg-neutral-900 border border-neutral-700 rounded-xl p-2.5 shadow-2xl w-60 animate-in fade-in zoom-in-95">
                    <div className="text-[10px] text-neutral-400 mb-1.5 font-medium">Select Color:</div>
                    <div className="grid grid-cols-8 gap-1.5">
                      {PALETTE.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => {
                            onUpdateCategory(cat.id, { color: c });
                            setActiveColorPicker(null);
                          }}
                          className={`w-5 h-5 rounded-md transition-transform hover:scale-125 ${
                            c === cat.color ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110' : ''
                          }`}
                          style={{ backgroundColor: c }}
                          aria-label={`Select color ${c}`}
                        />
                      ))}
                    </div>
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
