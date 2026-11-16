import React, { useEffect, useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  Copy,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  Lock,
  LogOut,
  Share2,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { Modal } from './Modal';
import { useFinancial } from '../../context/FinancialContext';
import {
  getCurrentGoogleUser,
  getInMemoryGoogleAccessToken,
  signInWithGoogleForSheets,
  signOutGoogleSheets,
  subscribeGoogleAuthUser,
} from '../../services/googleSheetsAuth';
import {
  exportModelToGoogleSheets,
  GoogleSheetsAuthError,
  GoogleSheetsExportResult,
  GoogleSheetsShareMode,
} from '../../services/googleSheetsExport';

interface GoogleSheetsExportModalProps {
  open: boolean;
  onClose: () => void;
}

export const GoogleSheetsExportModal: React.FC<GoogleSheetsExportModalProps> = ({
  open,
  onClose,
}) => {
  const { activeProject, model, savedScenarios, activeScenarioId, notify } = useFinancial();
  const activeScenarioName =
    savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';

  const [user, setUser] = useState<User | null>(() => getCurrentGoogleUser());
  const [hasValidToken, setHasValidToken] = useState<boolean>(() =>
    Boolean(getInMemoryGoogleAccessToken())
  );
  const [authLoading, setAuthLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [exportResult, setExportResult] = useState<GoogleSheetsExportResult | null>(null);

  const defaultTitle = `RizMadagascar — ${activeProject.name} (${activeScenarioName})`;
  const [spreadsheetTitle, setSpreadsheetTitle] = useState(defaultTitle);
  const [shareMode, setShareMode] = useState<GoogleSheetsShareMode>('link_reader');
  const [collaboratorEmail, setCollaboratorEmail] = useState('');
  const [collaboratorRole, setCollaboratorRole] = useState<'reader' | 'writer'>('reader');

  useEffect(() => {
    const unsub = subscribeGoogleAuthUser((nextUser) => {
      setUser(nextUser);
      setHasValidToken(Boolean(getInMemoryGoogleAccessToken()));
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (open) {
      setSpreadsheetTitle(`RizMadagascar — ${activeProject.name} (${activeScenarioName})`);
      setErrorMsg(null);
      setExportResult(null);
      setHasValidToken(Boolean(getInMemoryGoogleAccessToken()));
    }
  }, [open, activeProject.name, activeScenarioName]);

  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setErrorMsg(null);
    try {
      const res = await signInWithGoogleForSheets();
      setUser(res.user);
      setHasValidToken(Boolean(res.accessToken));
      notify('success', `Connecté à Google (${res.user.email || 'compte vérifié'}).`);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible de finaliser la connexion Google.';
      setErrorMsg(msg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignOut = async () => {
    await signOutGoogleSheets();
    setHasValidToken(false);
    setExportResult(null);
  };

  const handleConfirmExport = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (shareMode === 'collaborator' && !collaboratorEmail.trim().includes('@')) {
      setErrorMsg('Veuillez saisir une adresse e-mail valide pour le collaborateur.');
      return;
    }

    const token = getInMemoryGoogleAccessToken();
    if (!token) {
      setHasValidToken(false);
      setErrorMsg(
        'Votre autorisation temporaire Google Sheets doit être renouvelée. Cliquez sur « Se connecter avec Google ».'
      );
      return;
    }

    setExportLoading(true);
    try {
      const result = await exportModelToGoogleSheets(token, model, {
        spreadsheetTitle,
        shareMode,
        collaboratorEmail,
        collaboratorRole,
        projectName: activeProject.name,
        scenarioName: activeScenarioName,
      });
      setExportResult(result);
      notify('success', 'Feuille Google Sheets créée et alimentée avec succès.');
    } catch (err) {
      if (err instanceof GoogleSheetsAuthError) {
        setHasValidToken(false);
      }
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erreur lors de la création de la feuille Google Sheets.'
      );
    } finally {
      setExportLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!exportResult?.spreadsheetUrl) return;
    try {
      await navigator.clipboard.writeText(exportResult.spreadsheetUrl);
      notify('success', 'Lien Google Sheets copié dans le presse-papiers.');
    } catch {
      notify('info', 'Copiez manuellement le lien affiché ci-dessus.');
    }
  };

  const needsAuth = !user || !hasValidToken;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exporter vers Google Sheets"
      description="Créez une feuille de calcul Google Sheets partagée avec les 4 onglets clés du modèle financier."
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4">
        {/* Summary of sheets that will be generated */}
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#141323] space-y-1.5">
          <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span>4 onglets générés automatiquement</span>
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono text-zinc-600 dark:text-zinc-400">
            <div>1. Synthèse KPI</div>
            <div>2. Compte de Résultat</div>
            <div>3. Projections 5 ans</div>
            <div>4. Hypothèses</div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Step 1: Google Sign-In Gate (Official Google Sign-In Button) */}
        {needsAuth ? (
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424] space-y-3">
            <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {user && !hasValidToken
                ? `Reconnectez le compte ${user.email || ''} pour obtenir un jeton d'accès actif en mémoire.`
                : 'Autorisez l’accès à Google Sheets et aux fichiers créés par cette application (Google Drive) pour générer votre classeur en ligne.'}
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="gsi-material-button w-full min-h-11 px-4 rounded-lg border border-[#747775] bg-white hover:bg-[#f8f9fa] text-[#1f1f1f] font-medium text-sm inline-flex items-center justify-center gap-3 shadow-xs transition-colors disabled:opacity-60"
            >
              {authLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-zinc-700" aria-hidden="true" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 48 48" aria-hidden="true">
                  <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                  />
                  <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                  />
                  <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                  />
                </svg>
              )}
              <span>{authLoading ? 'Connexion en cours…' : 'Se connecter avec Google'}</span>
            </button>
          </div>
        ) : exportResult ? (
          /* Step 3: Success Card (No window.open — direct safe anchor + copy URL) */
          <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-500/10 space-y-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <div className="text-sm font-bold text-emerald-900 dark:text-emerald-200">
                  Feuille Google Sheets créée !
                </div>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  <strong>{exportResult.title}</strong>
                </p>
                <p className="text-[11px] text-emerald-800/90 dark:text-emerald-300/90">
                  Partage : {exportResult.shareSummary}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <a
                href={exportResult.spreadsheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-10 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Ouvrir dans Google Sheets</span>
              </a>

              <button
                type="button"
                onClick={handleCopyUrl}
                className="min-h-10 px-3 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.15] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#23213D] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Copier le lien</span>
              </button>
            </div>
          </div>
        ) : (
          /* Step 2: Confirmation Form Before Creating & Sharing */
          <form onSubmit={handleConfirmExport} className="space-y-4">
            <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#151424] text-xs">
              <span className="truncate text-zinc-700 dark:text-zinc-300">
                Connecté : <strong className="text-zinc-900 dark:text-white">{user?.email || user?.displayName}</strong>
              </span>
              <button
                type="button"
                onClick={handleGoogleSignOut}
                className="text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1 shrink-0 font-medium"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Déconnecter</span>
              </button>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="gsheets-title"
                className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
              >
                Nom de la feuille Google Sheets
              </label>
              <input
                id="gsheets-title"
                type="text"
                required
                value={spreadsheetTitle}
                onChange={(e) => setSpreadsheetTitle(e.target.value)}
                className="w-full min-h-10 px-3 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                Permissions de partage Google Drive
              </div>
              <div className="grid grid-cols-1 gap-2">
                {(
                  [
                    {
                      id: 'link_reader',
                      label: 'Partage par lien (Lecture seule)',
                      desc: 'Toute personne disposant du lien peut consulter le modèle',
                      icon: Share2,
                    },
                    {
                      id: 'collaborator',
                      label: 'Partager avec un collaborateur précis',
                      desc: 'Envoie une invitation Drive à une adresse e-mail spécifique',
                      icon: Users,
                    },
                    {
                      id: 'private',
                      label: 'Privé (Votre compte Google uniquement)',
                      desc: 'Aucun partage externe appliqué à la création',
                      icon: Lock,
                    },
                  ] as const
                ).map((opt) => {
                  const Icon = opt.icon;
                  const active = shareMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setShareMode(opt.id)}
                      aria-pressed={active}
                      className={`p-2.5 rounded-lg border text-left transition-colors flex items-start gap-2.5 ${
                        active
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-zinc-950 dark:text-white'
                          : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0 mt-0.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold">{opt.label}</div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">{opt.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {shareMode === 'collaborator' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                <div className="sm:col-span-2 space-y-1">
                  <label htmlFor="gsheets-email" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    E-mail du collaborateur
                  </label>
                  <input
                    id="gsheets-email"
                    type="email"
                    required
                    placeholder="partenaire@exemple.com"
                    value={collaboratorEmail}
                    onChange={(e) => setCollaboratorEmail(e.target.value)}
                    className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="gsheets-role" className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                    Rôle Drive
                  </label>
                  <select
                    id="gsheets-role"
                    value={collaboratorRole}
                    onChange={(e) => setCollaboratorRole(e.target.value as 'reader' | 'writer')}
                    className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.14] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="reader">Lecteur</option>
                    <option value="writer">Éditeur</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 px-3.5 py-2 rounded-lg border border-zinc-300 dark:border-white/[0.12] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={exportLoading}
                className="min-h-10 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors disabled:opacity-60"
              >
                {exportLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    <span>Création en cours…</span>
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                    <span>Créer et partager sur Google Sheets</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};
