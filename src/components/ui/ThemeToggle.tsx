import React from 'react';
import { Monitor, Moon, Sun } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';

export const ThemeToggle: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { theme, themeMode, systemPrefersDark, toggleTheme, setThemeMode } = useFinancial();

  const isAuto = themeMode === 'system';
  const systemLabel = systemPrefersDark ? 'Sombre' : 'Clair';

  return (
    <div
      role="group"
      aria-label="Sélecteur de thème (automatique système ou manuel)"
      className="inline-flex items-center rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#141323] p-0.5 gap-0.5"
    >
      <button
        type="button"
        onClick={() => setThemeMode('system')}
        aria-pressed={isAuto}
        title={`Suivre automatiquement les préférences système (actuellement : ${systemLabel})`}
        aria-label={`Mode thème automatique système (actuellement ${systemLabel})`}
        className={`min-h-9 px-2 rounded-lg text-[11px] font-semibold inline-flex items-center gap-1 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 ${
          isAuto
            ? 'bg-indigo-600/15 dark:bg-indigo-500/25 text-indigo-700 dark:text-indigo-200 border border-indigo-500/30'
            : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] border border-transparent'
        }`}
      >
        <Monitor className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        {!compact && <span className="hidden xl:inline">Auto</span>}
      </button>

      <button
        type="button"
        onClick={toggleTheme}
        aria-pressed={!isAuto}
        title={
          isAuto
            ? `Système (${systemLabel}) — Cliquer pour forcer le mode ${
                theme === 'dark' ? 'clair' : 'sombre'
              }`
            : `Thème forcé : ${theme === 'dark' ? 'Sombre' : 'Clair'} — Cliquer pour basculer`
        }
        aria-label={
          theme === 'dark'
            ? 'Basculer vers le thème clair manuel'
            : 'Basculer vers le thème sombre manuel'
        }
        className={`min-h-9 min-w-9 px-2 rounded-lg inline-flex items-center justify-center gap-1 text-xs font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 ${
          !isAuto
            ? 'bg-white dark:bg-[#22203A] text-zinc-900 dark:text-white shadow-xs border border-zinc-200 dark:border-white/[0.1]'
            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-white/[0.06] border border-transparent'
        }`}
      >
        {theme === 'dark' ? (
          <Sun className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" aria-hidden="true" />
        ) : (
          <Moon className="w-4 h-4 text-indigo-700 shrink-0" aria-hidden="true" />
        )}
      </button>
    </div>
  );
};
