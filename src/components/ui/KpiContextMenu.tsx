import React, { useEffect, useRef, useState } from 'react';
import {
  MessageSquarePlus,
  MessageSquareText,
  Copy,
  ArrowUpRight,
} from 'lucide-react';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SURFACE_CLASSES,
} from './menuTokens';

export interface KpiContextTarget {
  kpiId: string;
  kpiLabel: string;
  kpiValueText: string;
  targetTab?: string;
}

export interface KpiContextMenuState {
  x: number;
  y: number;
  target: KpiContextTarget;
}

interface KpiContextMenuProps {
  menu: KpiContextMenuState | null;
  noteCount: number;
  onClose: () => void;
  onAddNote: (target: KpiContextTarget) => void;
  onViewNotes: (target: KpiContextTarget) => void;
  onCopyValue: (target: KpiContextTarget) => void;
  onNavigateTab?: (tabId: string) => void;
}

export const KpiContextMenu: React.FC<KpiContextMenuProps> = ({
  menu,
  noteCount,
  onClose,
  onAddNote,
  onViewNotes,
  onCopyValue,
  onNavigateTab,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [focusedIndex, setFocusedIndex] = useState(0);

  useEffect(() => {
    if (!menu) return;
    setFocusedIndex(0);

    const handleMouseDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    const handleScroll = () => {
      onClose();
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('scroll', handleScroll, true);

    const timer = window.setTimeout(() => {
      itemRefs.current[0]?.focus();
    }, 10);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const menuWidth = 272;
  const menuHeight = menu.target.targetTab && onNavigateTab ? 236 : 196;
  const left = Math.max(12, Math.min(menu.x, vw - menuWidth - 12));
  const top = Math.max(12, Math.min(menu.y, vh - menuHeight - 12));

  const actions: Array<{
    id: string;
    label: string;
    sub?: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    accent?: boolean;
  }> = [
    {
      id: 'add-note',
      label: 'Ajouter une note d’analyse',
      sub: 'Commentaire collaboratif sur cet indicateur',
      icon: MessageSquarePlus,
      accent: true,
      onClick: () => {
        onAddNote(menu.target);
        onClose();
      },
    },
    {
      id: 'view-notes',
      label: noteCount > 0 ? `Voir les notes (${noteCount})` : 'Consulter le fil des notes',
      sub:
        noteCount > 0
          ? 'Relire ou résoudre les commentaires existants'
          : 'Aucune note encore sur cet indicateur',
      icon: MessageSquareText,
      onClick: () => {
        onViewNotes(menu.target);
        onClose();
      },
    },
    {
      id: 'copy-val',
      label: 'Copier l’indicateur et sa valeur',
      sub: menu.target.kpiValueText,
      icon: Copy,
      onClick: () => {
        onCopyValue(menu.target);
        onClose();
      },
    },
    ...(menu.target.targetTab && onNavigateTab
      ? [
          {
            id: 'open-tab',
            label: 'Ouvrir l’onglet d’analyse détaillé',
            icon: ArrowUpRight,
            onClick: () => {
              onNavigateTab(menu.target.targetTab!);
              onClose();
            },
          },
        ]
      : []),
  ];

  const handleMenuKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = (focusedIndex + 1) % actions.length;
      setFocusedIndex(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = (focusedIndex - 1 + actions.length) % actions.length;
      setFocusedIndex(prev);
      itemRefs.current[prev]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      setFocusedIndex(0);
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      const last = actions.length - 1;
      setFocusedIndex(last);
      itemRefs.current[last]?.focus();
    }
  };

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Actions contextuelles : ${menu.target.kpiLabel}`}
      onKeyDown={handleMenuKeyDown}
      style={{ top, left, width: menuWidth }}
      className={`fixed z-50 p-1.5 no-print ${MENU_SURFACE_CLASSES}`}
    >
      <div className="px-2.5 py-2 border-b border-zinc-200 dark:border-white/[0.08] mb-1">
        <div className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100 truncate">
          {menu.target.kpiLabel}
        </div>
        <div className="text-xs font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300 truncate mt-0.5">
          {menu.target.kpiValueText}
        </div>
      </div>

      <div className="space-y-0.5">
        {actions.map((action, idx) => {
          const Icon = action.icon;
          const isFocused = focusedIndex === idx;
          return (
            <button
              key={action.id}
              ref={(el) => {
                itemRefs.current[idx] = el;
              }}
              type="button"
              role="menuitem"
              onMouseEnter={() => setFocusedIndex(idx)}
              onClick={action.onClick}
              className={`${MENU_ITEM_BASE_CLASSES} px-2.5 py-2 ${
                isFocused
                  ? MENU_ITEM_STATE_CLASSES.highlighted
                  : MENU_ITEM_STATE_CLASSES.idle
              }`}
            >
              <div className="flex items-start gap-2.5 min-w-0 flex-1">
                <Icon
                  className={`w-4 h-4 shrink-0 mt-0.5 ${
                    action.accent
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-snug truncate">
                    {action.label}
                  </div>
                  {action.sub && (
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-mono tabular-nums">
                      {action.sub}
                    </div>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
