import React, { useRef } from 'react';
import {
  Settings,
  SlidersHorizontal,
  Download,
  Upload,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
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
    activeProject,
    exportFullBackupJson,
    importFullBackupJson,
    cloudUser,
    cloudSyncStatus,
    signInCloud,
    signOutCloud,
    syncActiveProjectToCloud,
    notify,
  } = useFinancial();

  const backupFileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadFullBackup = () => {
    const jsonStr = exportFullBackupJson();
    const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSlug = activeProject.name.toLowerCase().replace(/[^a-z0-9]+/gi, '_');
    a.download = `sauvegarde_complete_${safeSlug}_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    notify('success', 'Sauvegarde complète du projet (.json) téléchargée.');
  };

  const handleRestoreFullBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        importFullBackupJson(reader.result);
      } else {
        notify('error', 'Impossible de lire le fichier de sauvegarde sélectionné.');
      }
    };
    reader.onerror = () => {
      notify('error', 'Erreur lors de la lecture du fichier de sauvegarde.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const syncStatusBadge =
    cloudSyncStatus === 'synced'
      ? {
          label: 'Synchronisé',
          cls: 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
          Icon: CheckCircle2,
        }
      : cloudSyncStatus === 'syncing'
      ? {
          label: 'Synchronisation…',
          cls: 'border-indigo-500/35 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300',
          Icon: RefreshCw,
        }
      : cloudSyncStatus === 'error'
      ? {
          label: 'Erreur de synchro',
          cls: 'border-rose-500/35 bg-rose-500/10 text-rose-800 dark:text-rose-300',
          Icon: AlertTriangle,
        }
      : {
          label: 'Hors ligne (local)',
          cls: 'border-zinc-300 dark:border-white/[0.12] bg-zinc-100 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300',
          Icon: CloudOff,
        };
  const SyncIcon = syncStatusBadge.Icon;

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

      {/* Full Project Backup & Restore (.json) + Firebase Cloud Sync */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section
          aria-label="Sauvegarde et restauration complète JSON"
          className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
              <Download className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
              <span>Sauvegarde &amp; Restauration Complète (.json)</span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Exportez l’intégralité du modèle financier actif (hypothèses, scénarios enregistrés, analyse PESTEL, notes KPI et journal d’audit) dans un fichier portable pour le partager ou le réimporter sur un autre poste.
            </p>
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D0C18] text-xs flex items-center justify-between gap-2">
              <span className="text-zinc-600 dark:text-zinc-400">Projet actif inclus :</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {activeProject.name}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleDownloadFullBackup}
              className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Download className="w-4 h-4" aria-hidden="true" />
              <span>Télécharger sauvegarde complète (.json)</span>
            </button>

            <button
              type="button"
              onClick={() => backupFileInputRef.current?.click()}
              className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] text-zinc-800 dark:text-zinc-100 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Restaurer depuis un fichier (.json)</span>
            </button>

            <input
              ref={backupFileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleRestoreFullBackup}
              className="hidden"
              aria-hidden="true"
            />
          </div>
        </section>

        <section
          aria-label="Synchronisation Cloud Firebase Firestore"
          className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 flex flex-col justify-between"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                <Cloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                <span>Synchronisation Cloud (Firebase Firestore)</span>
              </div>
              <span
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 ${syncStatusBadge.cls}`}
              >
                <SyncIcon
                  className={`w-3.5 h-3.5 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`}
                  aria-hidden="true"
                />
                <span>{syncStatusBadge.label}</span>
              </span>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Connectez votre compte Google pour sauvegarder automatiquement vos projets, scénarios et paramètres dans le Cloud et les retrouver sur tous vos appareils.
            </p>

            {cloudUser ? (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D0C18] flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {cloudUser.photoURL ? (
                    <img
                      src={cloudUser.photoURL}
                      alt={cloudUser.displayName || 'Utilisateur'}
                      className="w-8 h-8 rounded-lg object-cover shrink-0 border border-zinc-300 dark:border-white/[0.12]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0">
                      {(cloudUser.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white truncate">
                      {cloudUser.displayName || 'Compte Google connecté'}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 truncate">
                      {cloudUser.email || cloudUser.uid}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D0C18] text-xs text-zinc-600 dark:text-zinc-400">
                Mode local actif. Connectez-vous pour activer la sauvegarde Cloud temps réel.
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            {cloudUser ? (
              <>
                <button
                  type="button"
                  onClick={() => void syncActiveProjectToCloud()}
                  disabled={cloudSyncStatus === 'syncing'}
                  className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <RefreshCw
                    className={`w-4 h-4 ${cloudSyncStatus === 'syncing' ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>Forcer la synchro Cloud</span>
                </button>
                <button
                  type="button"
                  onClick={() => void signOutCloud()}
                  className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] text-zinc-800 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  <span>Déconnexion</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => void signInCloud()}
                className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <LogIn className="w-4 h-4" aria-hidden="true" />
                <span>Se connecter avec Google (Cloud Sync)</span>
              </button>
            )}
          </div>
        </section>
      </div>

      {/* Gmail API Configuration & Test Module */}
      <GmailIntegrationSettingsCard />

      {/* Audit Trail Component */}
      <AuditTrailPanel />
    </div>
  );
};
