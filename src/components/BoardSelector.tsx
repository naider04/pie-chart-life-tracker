import React, { useState, useRef, useEffect } from 'react';
import { Board } from '../types';
import { ChevronDown, Plus, Edit2, Trash2, Check, X, Layers } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface BoardSelectorProps {
  boards: Board[];
  activeBoardId: string;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (title: string) => void;
  onRenameBoard: (boardId: string, newTitle: string) => void;
  onDeleteBoard: (boardId: string) => void;
}

export const BoardSelector: React.FC<BoardSelectorProps> = ({
  boards,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0];

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  const handleCreate = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newTitle.trim();
    if (!title) return;
    onCreateBoard(title);
    setNewTitle('');
    setShowCreateModal(false);
    setIsOpen(false);
  };

  const startRename = (board: Board) => {
    setEditingId(board.id);
    setEditTitle(board.title);
  };

  const saveRename = (boardId: string) => {
    const trimmed = editTitle.trim();
    if (trimmed) {
      onRenameBoard(boardId, trimmed);
    }
    setEditingId(null);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Board Selector Trigger Pill */}
      <Tooltip content="Switch or manage boards" position="bottom">
        <button
          type="button"
          onClick={() => setIsOpen(prev => !prev)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-neutral-100 transition-all text-xs md:text-sm font-semibold shadow-sm"
        >
          <Layers className="w-3.5 h-3.5 text-indigo-400" />
          <span className="max-w-[140px] md:max-w-[200px] truncate">{activeBoard?.title || 'Boards'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </Tooltip>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 w-64 rounded-2xl bg-neutral-900 border border-neutral-700/80 shadow-2xl p-2 animate-in fade-in zoom-in-95">
          <div className="text-[11px] font-mono text-neutral-400 px-2 py-1 uppercase tracking-wider">
            Your Boards ({boards.length})
          </div>

          <div className="max-h-60 overflow-y-auto space-y-1 my-1">
            {boards.map(b => {
              const isSelected = b.id === activeBoardId;
              const isEditing = editingId === b.id;

              if (isEditing) {
                return (
                  <div key={b.id} className="flex items-center gap-1 p-1 bg-neutral-950 rounded-lg">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      className="flex-1 bg-transparent text-xs text-neutral-100 px-2 py-1 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => saveRename(b.id)}
                      className="p-1 text-emerald-400 hover:bg-neutral-800 rounded"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 text-neutral-400 hover:bg-neutral-800 rounded"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={b.id}
                  className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs cursor-pointer transition-colors group ${
                    isSelected
                      ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30'
                      : 'text-neutral-300 hover:bg-neutral-800/60'
                  }`}
                  onClick={() => {
                    onSelectBoard(b.id);
                    setIsOpen(false);
                  }}
                >
                  <span className="truncate flex-1">{b.title}</span>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip content="Rename board" position="top">
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          startRename(b);
                        }}
                        className="p-1 text-neutral-400 hover:text-neutral-100 rounded"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                    </Tooltip>

                    {boards.length > 1 && (
                      <Tooltip content="Delete board" position="top">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            onDeleteBoard(b.id);
                          }}
                          className="p-1 text-neutral-400 hover:text-rose-400 rounded"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </Tooltip>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-neutral-800 mt-1">
            <button
              type="button"
              onClick={() => {
                setShowCreateModal(true);
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-750 text-neutral-200 text-xs font-semibold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-indigo-400" />
              <span>Create New Board</span>
            </button>
          </div>
        </div>
      )}

      {/* New Board Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleCreate}
            className="bg-neutral-900 border border-neutral-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95"
          >
            <h4 className="font-semibold text-neutral-100 text-sm mb-3">Create New Board</h4>
            <input
              type="text"
              value={newTitle}
              onChange={e => setNewTitle(e.target.value)}
              placeholder="Board name (e.g. Fitness, Study, Body Focus)..."
              maxLength={60}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3.5 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-400 hover:text-neutral-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-semibold"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
