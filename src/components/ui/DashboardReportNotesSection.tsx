import React from 'react';
import { FileDown, FileText, Sparkles, Trash2 } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';

interface DashboardReportNotesSectionProps {
  onExportPdf?: () => void;
  isExportingPdf?: boolean;
}

export const DashboardReportNotesSection: React.FC<DashboardReportNotesSectionProps> = ({
  onExportPdf,
  isExportingPdf = false,
}) => {
  const {
    activeProject,
    model,
    assumptions,
    dashboardReportNotes,
    setDashboardReportNotes,
    savedScenarios,
    activeScenarioId,
    notify,
  } = useFinancial();

  const scenarioName =
    savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';

  const handleInsertExecutiveTemplate = () => {
    const irrText = Number.isFinite(model.irr.irrValue)
      ? formatPercent(model.irr.irrValue, 1)
      : 'N/A';
    const marginText = formatPercent(model.year1.netMarginAfterTaxRate, 1);
    const npvText = formatAriary(model.npv.npvAr, { inMillions: true });
    const caText = formatAriary(model.year1.totalTurnoverAr, { inMillions: true });
    const paybackText = formatMonths(model.payback.paybackMonths);

    const template = [
      `Synthèse Comité Crédit — ${activeProject.name} (${scenarioName})`,
      `• Performance Année 1 : Chiffre d'affaires de ${caText} pour une marge nette après IR de ${marginText}.`,
      `• Création de valeur (3 ans, r = ${formatPercent(assumptions.discountRate, 0)}) : VAN de ${npvText}, TRI de ${irrText} et délai de récupération de ${paybackText}.`,
      `• Points d'attention filière riz : sécurisation des volumes de paddy dès la Haute Saison, suivi des coûts carburant/collecte et maîtrise du taux d'humidité en stockage.`,
    ].join('\n');

    const nextValue = dashboardReportNotes.trim()
      ? `${dashboardReportNotes.trim()}\n\n${template}`
      : template;
    setDashboardReportNotes(nextValue);
    notify('success', 'Trame de synthèse comité ajoutée aux notes PDF.');
  };

  const handleClearNotes = () => {
    setDashboardReportNotes('');
    notify('info', 'Notes du rapport PDF effacées.');
  };

  const charCount = dashboardReportNotes.length;
  const lineCount = dashboardReportNotes.trim()
    ? dashboardReportNotes.trim().split(/\r?\n/).length
    : 0;

  return (
    <section
      aria-label="Notes textuelles éditables pour le rapport PDF"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-3.5 transition-colors duration-200"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <FileText
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Notes &amp; Commentaires du Rapport (Inclus dans l’export PDF)
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Rédigez vos observations analyste, hypothèses terrain ou recommandations comité. Ce texte
            est sauvegardé par projet et intégré automatiquement en fin de rapport PDF.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print shrink-0">
          <button
            type="button"
            onClick={handleInsertExecutiveTemplate}
            className="min-h-8 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
            <span>Pré-remplir synthèse</span>
          </button>

          {charCount > 0 && (
            <button
              type="button"
              onClick={handleClearNotes}
              className="min-h-8 px-2.5 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
            >
              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Effacer</span>
            </button>
          )}

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isExportingPdf}
              className="min-h-8 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              <FileDown className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isExportingPdf ? 'Génération PDF...' : 'Exporter PDF'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Screen Editable Textarea */}
      <div className="no-print space-y-1.5">
        <label htmlFor="dashboard-report-notes-input" className="sr-only">
          Notes textuelles du tableau de bord incluses dans l’export PDF
        </label>
        <textarea
          id="dashboard-report-notes-input"
          value={dashboardReportNotes}
          onChange={(e) => setDashboardReportNotes(e.target.value)}
          rows={4}
          placeholder="Ex. : Validation des prix bord-champ Alaotra-Mangoro pour la Haute Saison, conditions du prêt de campagne BNI/BOA, remarques pour le dossier bancaire..."
          className="w-full rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50/70 dark:bg-[#161526] px-3.5 py-2.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500 transition-colors resize-y"
        />
        <div className="flex items-center justify-between text-[11px] text-zinc-500 dark:text-zinc-400">
          <span>
            {charCount > 0
              ? 'Ces notes seront ajoutées dans une section dédiée lors de l’export PDF.'
              : 'Laissez vide pour omettre la section notes dans le PDF.'}
          </span>
          <span className="font-mono tabular-nums">
            {lineCount} paragraphe(s) · {charCount} car.
          </span>
        </div>
      </div>

      {/* Print-only clean render if user prints via browser Ctrl+P */}
      {dashboardReportNotes.trim().length > 0 && (
        <div className="hidden print-only whitespace-pre-wrap text-xs text-zinc-900 leading-relaxed border border-zinc-300 rounded-lg p-3">
          {dashboardReportNotes}
        </div>
      )}
    </section>
  );
};
