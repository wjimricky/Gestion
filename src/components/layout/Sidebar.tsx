import React, { useRef } from 'react';
import { NAV_ITEMS } from './navItems';
import {
  MENU_ITEM_BASE_CLASSES,
  MENU_ITEM_STATE_CLASSES,
  MENU_SECTION_LABEL_CLASSES,
} from '../ui/menuTokens';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleNavKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const isDesktopVertical =
      typeof window !== 'undefined' ? window.innerWidth >= 1024 : true;
    const nextKeys = isDesktopVertical ? ['ArrowDown'] : ['ArrowRight'];
    const prevKeys = isDesktopVertical ? ['ArrowUp'] : ['ArrowLeft'];

    let targetIndex: number | null = null;
    if (nextKeys.includes(e.key)) {
      targetIndex = (index + 1) % NAV_ITEMS.length;
    } else if (prevKeys.includes(e.key)) {
      targetIndex = (index - 1 + NAV_ITEMS.length) % NAV_ITEMS.length;
    } else if (e.key === 'Home') {
      targetIndex = 0;
    } else if (e.key === 'End') {
      targetIndex = NAV_ITEMS.length - 1;
    }

    if (targetIndex !== null) {
      e.preventDefault();
      e.stopPropagation();
      navRefs.current[targetIndex]?.focus();
    }
  };

  return (
    <aside className="hidden sm:block w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-white/[0.08] bg-slate-50/75 dark:bg-[#0B0A16]/80 p-3 no-print">
      <div className={`hidden lg:block mb-1.5 ${MENU_SECTION_LABEL_CLASSES}`}>
        Modules d’analyse
      </div>
      <nav
        aria-label="Navigation des modules financiers"
        className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 scrollbar-none"
      >
        {NAV_ITEMS.map((item, idx) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              ref={(el) => {
                navRefs.current[idx] = el;
              }}
              type="button"
              onClick={() => onSelectTab(item.id)}
              onKeyDown={(e) => handleNavKeyDown(e, idx)}
              aria-current={isActive ? 'page' : undefined}
              className={`${MENU_ITEM_BASE_CLASSES} min-h-11 px-3 py-2 text-xs whitespace-nowrap shrink-0 lg:w-full ${
                isActive ? MENU_ITEM_STATE_CLASSES.active : MENU_ITEM_STATE_CLASSES.idle
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <Icon
                  aria-hidden="true"
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-300'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                />
                <div className="min-w-0">
                  <div className="leading-tight text-xs sm:text-[13px] truncate">
                    {item.label}
                  </div>
                  <div
                    className={`hidden lg:block text-[11px] font-normal leading-tight mt-0.5 truncate ${
                      isActive
                        ? 'text-indigo-900/75 dark:text-zinc-300'
                        : 'text-zinc-500 dark:text-zinc-400'
                    }`}
                  >
                    {item.desc}
                  </div>
                </div>
              </div>
              {isActive && (
                <span
                  aria-hidden="true"
                  className="hidden lg:block w-1.5 h-1.5 rounded-full bg-teal-500 dark:bg-teal-400 shrink-0"
                />
              )}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};
