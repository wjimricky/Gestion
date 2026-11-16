import React from 'react';
import { LayoutList, Table } from 'lucide-react';

interface ViewToggleProps {
  mode: 'cards' | 'table';
  onChange: (mode: 'cards' | 'table') => void;
  label?: string;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  mode,
  onChange,
  label = 'Mode d’affichage mobile',
}) => {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex sm:hidden items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800/80 p-1"
    >
      <button
        type="button"
        onClick={() => onChange('cards')}
        aria-pressed={mode === 'cards'}
        className={`min-h-10 px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
          mode === 'cards'
            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
            : 'text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <LayoutList className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Cartes</span>
      </button>
      <button
        type="button"
        onClick={() => onChange('table')}
        aria-pressed={mode === 'table'}
        className={`min-h-10 px-3 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors ${
          mode === 'table'
            ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
            : 'text-zinc-600 dark:text-zinc-400'
        }`}
      >
        <Table className="w-3.5 h-3.5" aria-hidden="true" />
        <span>Tableau</span>
      </button>
    </div>
  );
};
