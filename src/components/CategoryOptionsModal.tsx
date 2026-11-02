import React, { useState, useEffect } from 'react';
import { Category } from '../types';
import { PALETTE } from '../utils/ahp';
import { Settings2, Trash2, X, Check, AlertTriangle } from 'lucide-react';

interface CategoryOptionsModalProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateCategory: (id: string, updates: Partial<Category>) => void;
  onDeleteCategory: (id: string) => void;
}

export const CategoryOptionsModal: React.FC<CategoryOptionsModalProps> = ({
  category,
  isOpen,
  onClose,
  onUpdateCategory,
  onDeleteCategory,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (category) {
      setName(category.name);
      setColor(category.color);
      setShowDeleteConfirm(false);
    }
  }, [category, isOpen]);

  if (!isOpen || !category) return null;

  const handleSave = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onUpdateCategory(category.id, {
      name: trimmed,
      color: color || category.color,
    });
    onClose();
  };

  const handleSelectColor = (newColor: string) => {
    setColor(newColor);
    onUpdateCategory(category.id, { color: newColor });
  };

  const confirmDelete = () => {
    onDeleteCategory(category.id);
    setShowDeleteConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
          <div className="flex items-center gap-2">
            <span
              className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: color || category.color }}
            />
            <h3 className="font-semibold text-neutral-100 text-sm">
              Category Options
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-200 p-1 rounded-lg hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Edit Form */}
        <form onSubmit={handleSave} className="py-4 space-y-4">
          {/* Category Name */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Category Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Category name..."
              maxLength={35}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-1.5 text-xs text-neutral-100 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Color Palette */}
          <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">
              Choose Color
            </label>
            <div className="grid grid-cols-8 gap-1.5 p-2 bg-neutral-950 border border-neutral-800 rounded-xl max-h-32 overflow-y-auto">
              {PALETTE.map(c => {
                const isCurrent = (color || category.color) === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => handleSelectColor(c)}
                    className={`w-6 h-6 rounded-md transition-transform hover:scale-115 ${
                      isCurrent
                        ? 'ring-2 ring-white ring-offset-1 ring-offset-neutral-900 scale-110'
                        : ''
                    }`}
                    style={{ backgroundColor: c }}
                    aria-label={`Select color ${c}`}
                  />
                );
              })}
            </div>
          </div>

          {/* Delete Option with Confirmation */}
          <div className="pt-2 border-t border-neutral-800/80">
            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full py-1.5 px-3 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-950/20 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Category</span>
              </button>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/40 text-left animate-in fade-in">
                <div className="flex items-center gap-2 text-rose-400 mb-1 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Confirm Deletion</span>
                </div>
                <p className="text-[11px] text-neutral-300 mb-3 leading-relaxed">
                  Delete <span className="font-bold text-white">"{category.name}"</span>? All comparisons involving this category will be removed across all 3 charts.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmDelete}
                    className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer Save / Close Buttons */}
          <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold flex items-center gap-1 shadow-sm"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
