import React from 'react';
import { Settings, SlidersHorizontal } from 'lucide-react';
import { ThemeMode, useFinancial } from '../../context/FinancialContext';
import { GmailIntegrationSettingsCard } from '../ui/GmailIntegrationSettingsCard';
import { AuditTrailPanel } from '../ui/AuditTrailPanel';

export const SettingsTab: React.FC = () => {
  const {
    analystName,
    setAnalystName,
    unitDisplay,
    toggleUnitDisplay,
    themeMode,
    setThemeMode,
    autoBalanceSeasons,
    setAutoBalanceSeasons,
  } = useFinancial();

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          <span>Paramètres, Intégration Gmail &amp; Journal d’Audit</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
          Gérez la connexion API Gmail, les destinataires des rapports, les tests d’envoi et la traçabilité complète des décisions financières.
        </p>
      </div>

      {/* General Display & Modeling Preferences */}
      <section
        aria-label="Préférences générales"
        className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
          <SlidersHorizontal
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400"
            aria-hidden="true"
          />
          <span>Préférences de travail</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <label className="space-y-1.5">
            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Nom de l’analyste (notes &amp; rapports)
            </span>
            <input
              type="text"
              value={analystName}
              onChange={(e) => setAnalystName(e.target.value)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
            />
          </label>

          <div className="space-y-1.5">
            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Unité monétaire affichée
            </span>
            <button
              type="button"
              onClick={toggleUnitDisplay}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] hover:bg-zinc-100 dark:hover:bg-[#191828] text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 text-left transition-colors"
            >
              {unitDisplay === 'millions'
                ? 'Millions d’Ariary (M Ar)'
                : 'Ariary bruts (Ar)'}
            </button>
          </div>

          <label className="space-y-1.5">
            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Thème de l’interface
            </span>
            <select
              value={themeMode}
              onChange={(e) => setThemeMode(e.target.value as ThemeMode)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
            >
              <option value="system">Automatique (Système)</option>
              <option value="dark">Sombre (Faible éblouissement)</option>
              <option value="light">Clair</option>
            </select>
          </label>

          <div className="space-y-1.5">
            <span className="block font-semibold text-zinc-700 dark:text-zinc-300">
              Équilibrage saisons (HS + BS = 12m)
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={autoBalanceSeasons}
              onClick={() => setAutoBalanceSeasons((prev) => !prev)}
              className={`w-full min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold text-left transition-colors ${
                autoBalanceSeasons
                  ? 'border-emerald-500/45 bg-emerald-500/12 text-emerald-800 dark:text-emerald-300'
                  : 'border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#0D0C18] text-zinc-700 dark:text-zinc-300'
              }`}
            >
              {autoBalanceSeasons ? 'Activé (12 mois automatiques)' : 'Désactivé (saisie libre)'}
            </button>
          </div>
        </div>
      </section>

      {/* Gmail API Configuration & Test Module */}
      <GmailIntegrationSettingsCard />

      {/* Audit Trail Component */}
      <AuditTrailPanel />
    </div>
  );
};
