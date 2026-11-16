import React, { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SECTION_LABEL_CLASSES,
  MENU_SURFACE_CLASSES,
  MENU_TRIGGER_BASE_CLASSES,
} from './menuTokens';

export interface SelectMenuOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  badge?: string;
  disabled?: boolean;
}

export interface SelectMenuProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectMenuOption[];
  placeholder?: string;
  ariaLabel?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  tone?: 'default' | 'indigo' | 'emerald';
  align?: 'left' | 'right';
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  leadingIcon?: React.ReactNode;
  footerAction?: {
    label: string;
    icon?: React.ReactNode;
    onClick: () => void;
  };
}

interface MenuCoords {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
  minWidth: number;
  maxHeight: number;
}

export const SelectMenu: React.FC<SelectMenuProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Sélectionner...',
  ariaLabel,
  disabled = false,
  size = 'md',
  tone = 'default',
  align = 'left',
  className = '',
  buttonClassName = '',
  menuClassName = '',
  leadingIcon,
  footerAction,
}) => {
  const generatedId = useId();
  const triggerId = id || `select-menu-${generatedId}`;
  const listboxId = `${triggerId}-listbox`;

  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [coords, setCoords] = useState<MenuCoords | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(
    () => options.find((opt) => opt.value === value),
    [options, value]
  );

  const groupedSections = useMemo(() => {
    const sections: Array<{
      group: string | null;
      items: Array<{ opt: SelectMenuOption; flatIdx: number }>;
    }> = [];
    const groupMap = new Map<
      string | null,
      Array<{ opt: SelectMenuOption; flatIdx: number }>
    >();

    options.forEach((opt, flatIdx) => {
      const grp = opt.group ?? null;
      if (!groupMap.has(grp)) {
        const arr: Array<{ opt: SelectMenuOption; flatIdx: number }> = [];
        groupMap.set(grp, arr);
        sections.push({ group: grp, items: arr });
      }
      groupMap.get(grp)!.push({ opt, flatIdx });
    });

    return sections;
  }, [options]);

  const findNextEnabledIndex = (start: number, delta: 1 | -1): number => {
    if (options.length === 0) return -1;
    let idx = start;
    for (let i = 0; i < options.length; i++) {
      idx = (idx + delta + options.length) % options.length;
      if (!options[idx].disabled) return idx;
    }
    return -1;
  };

  const findFirstEnabledIndex = (): number => options.findIndex((o) => !o.disabled);
  const findLastEnabledIndex = (): number => {
    for (let i = options.length - 1; i >= 0; i--) {
      if (!options[i].disabled) return i;
    }
    return -1;
  };

  const computePosition = useCallback(() => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const gap = 6;
    const margin = 10;

    const spaceBelow = vh - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const openUpward = spaceBelow < 220 && spaceAbove > spaceBelow;
    const availableVertical = Math.max(150, openUpward ? spaceAbove : spaceBelow);
    const maxHeight = Math.min(300, availableVertical - (footerAction ? 48 : 8));

    const nextCoords: MenuCoords = {
      minWidth: Math.min(Math.max(rect.width, 200), vw - margin * 2),
      maxHeight: Math.max(120, maxHeight),
    };

    if (openUpward) {
      nextCoords.bottom = vh - rect.top + gap;
    } else {
      nextCoords.top = rect.bottom + gap;
    }

    if (align === 'right') {
      const rightOffset = Math.max(margin, vw - rect.right);
      nextCoords.right = Math.min(rightOffset, vw - nextCoords.minWidth - margin);
    } else {
      const maxLeft = vw - nextCoords.minWidth - margin;
      nextCoords.left = Math.max(margin, Math.min(rect.left, maxLeft));
    }

    setCoords(nextCoords);
  }, [align, footerAction]);

  useLayoutEffect(() => {
    if (!open) {
      setCoords(null);
      return;
    }
    computePosition();
  }, [open, computePosition]);

  useEffect(() => {
    if (!open) return;
    const selectedIdx = options.findIndex((o) => o.value === value && !o.disabled);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : findFirstEnabledIndex());
  }, [open, options, value]);

  // Close on outside click, capture-phase Escape (prevents closing parent Modal), and track scroll/resize
  useEffect(() => {
    if (!open) return;

    const handleOutside = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
      }
    };

    const handleCaptureKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setOpen(false);
        buttonRef.current?.focus();
      }
    };

    const handleReposition = () => {
      computePosition();
    };

    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('keydown', handleCaptureKeyDown, true);
    window.addEventListener('resize', handleReposition);
    window.addEventListener('scroll', handleReposition, true);

    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('keydown', handleCaptureKeyDown, true);
      window.removeEventListener('resize', handleReposition);
      window.removeEventListener('scroll', handleReposition, true);
    };
  }, [open, computePosition]);

  // Scroll highlighted option into view
  useEffect(() => {
    if (!open || highlightedIndex < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(
      `[data-option-index="${highlightedIndex}"]`
    );
    el?.scrollIntoView({ block: 'nearest' });
  }, [open, highlightedIndex]);

  const handleSelectOption = (opt: SelectMenuOption) => {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? -1 : prev, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => findNextEnabledIndex(prev < 0 ? 0 : prev, -1));
        break;
      case 'Home':
        e.preventDefault();
        setHighlightedIndex(findFirstEnabledIndex());
        break;
      case 'End':
        e.preventDefault();
        setHighlightedIndex(findLastEnabledIndex());
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          options[highlightedIndex] &&
          !options[highlightedIndex].disabled
        ) {
          handleSelectOption(options[highlightedIndex]);
        }
        break;
      case 'Tab':
        setOpen(false);
        break;
    }
  };

  const sizeClass =
    size === 'sm'
      ? 'min-h-9 px-2.5 py-1.5 text-xs rounded-xl'
      : 'min-h-10 px-3 py-2 text-xs sm:text-[13px] rounded-xl';

  const toneClass =
    tone === 'indigo'
      ? 'border-indigo-500/35 dark:border-indigo-400/30 bg-indigo-500/[0.06] dark:bg-indigo-500/[0.1] hover:bg-indigo-500/[0.11] dark:hover:bg-indigo-500/[0.16] text-zinc-900 dark:text-white'
      : tone === 'emerald'
      ? 'border-emerald-600/35 dark:border-emerald-500/35 bg-emerald-500/[0.06] dark:bg-emerald-500/[0.1] hover:bg-emerald-500/[0.11] dark:hover:bg-emerald-500/[0.16] text-emerald-900 dark:text-emerald-200'
      : 'border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1C1A30] text-zinc-900 dark:text-zinc-100';

  const portalMenu =
    open && coords && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={menuRef}
            id={listboxId}
            role="listbox"
            aria-label={ariaLabel || 'Options'}
            style={{
              position: 'fixed',
              top: coords.top !== undefined ? `${coords.top}px` : undefined,
              bottom: coords.bottom !== undefined ? `${coords.bottom}px` : undefined,
              left: coords.left !== undefined ? `${coords.left}px` : undefined,
              right: coords.right !== undefined ? `${coords.right}px` : undefined,
              minWidth: `${coords.minWidth}px`,
            }}
            className={`z-[90] w-max max-w-[min(92vw,360px)] overflow-hidden no-print ${MENU_SURFACE_CLASSES} ${menuClassName}`}
          >
            <div
              ref={listRef}
              style={{ maxHeight: `${coords.maxHeight}px` }}
              className="overflow-y-auto p-1.5 space-y-1"
            >
              {options.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  Aucune option disponible
                </div>
              ) : (
                groupedSections.map((section, sIdx) => (
                  <div key={section.group ?? `section-${sIdx}`} className="space-y-0.5">
                    {section.group && (
                      <div className={MENU_SECTION_LABEL_CLASSES}>{section.group}</div>
                    )}
                    {section.items.map(({ opt, flatIdx }) => {
                      const isSelected = opt.value === value;
                      const isHighlighted = flatIdx === highlightedIndex;
                      const stateCls = opt.disabled
                        ? 'opacity-45 cursor-not-allowed text-zinc-400 dark:text-zinc-600 border border-transparent'
                        : isSelected
                        ? MENU_ITEM_STATE_CLASSES.active
                        : isHighlighted
                        ? MENU_ITEM_STATE_CLASSES.highlighted
                        : MENU_ITEM_STATE_CLASSES.idle;

                      return (
                        <button
                          key={opt.value}
                          id={`${listboxId}-opt-${flatIdx}`}
                          data-option-index={flatIdx}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          aria-disabled={opt.disabled || undefined}
                          disabled={opt.disabled}
                          onMouseEnter={() => !opt.disabled && setHighlightedIndex(flatIdx)}
                          onClick={() => handleSelectOption(opt)}
                          className={`${MENU_ITEM_BASE_CLASSES} px-2.5 py-2 text-xs ${stateCls}`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate">{opt.label}</span>
                              {opt.badge && (
                                <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono bg-zinc-200/80 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300">
                                  {opt.badge}
                                </span>
                              )}
                            </div>
                            {opt.description && (
                              <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                                {opt.description}
                              </div>
                            )}
                          </div>
                          {isSelected && (
                            <Check
                              aria-hidden="true"
                              className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0"
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {footerAction && (
              <div className="p-1.5 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/90 dark:bg-[#0B0A16]">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    footerAction.onClick();
                  }}
                  className="w-full min-h-9 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-500/10 inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75"
                >
                  {footerAction.icon}
                  <span>{footerAction.label}</span>
                </button>
              </div>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-label={ariaLabel}
        aria-activedescendant={
          open && highlightedIndex >= 0 ? `${listboxId}-opt-${highlightedIndex}` : undefined
        }
        disabled={disabled}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleTriggerKeyDown}
        className={`w-full ${MENU_TRIGGER_BASE_CLASSES} ${sizeClass} ${toneClass} ${buttonClassName}`}
      >
        <span className="flex items-center gap-2 min-w-0">
          {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
          <span className="truncate">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          {selectedOption?.badge && (
            <span className="hidden sm:inline-flex shrink-0 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-semibold bg-indigo-500/12 text-indigo-700 dark:bg-indigo-400/15 dark:text-indigo-300 border border-indigo-500/20">
              {selectedOption.badge}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`w-3.5 h-3.5 shrink-0 text-zinc-500 dark:text-zinc-400 transition-transform duration-150 ${
            open ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {portalMenu}
    </div>
  );
};
