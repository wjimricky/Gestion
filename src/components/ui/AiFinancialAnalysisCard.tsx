import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  AiFinancialAnalysisResponse,
  AnalysisFocus,
  generateAiFinancialAnalysis,
} from '../../services/aiFinancialAnalysis';
import { formatAriary, formatPercent } from '../../utils/formatters';
import {
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Check,
  FilePlus2,
  ArrowRight,
} from 'lucide-react';

interface AiFinancialAnalysisCardProps {
  onInsertIntoNotes: (paragraph: string) => void;
}

const FOCUS_OPTIONS: Array<{ id: AnalysisFocus; label: string }> = [
  { id: 'executive', label: 'Synthèse dirigeant' },
  { id: 'banker', label: 'Comité bancaire' },
  { id: 'risks', label: 'Audit risques & marges' },
];

export const AiFinancialAnalysisCard: React.FC<AiFinancialAnalysisCardProps> = ({
  onInsertIntoNotes,
}) => {
  const { assumptions, model, kpiAlerts, activeProject, notify } = useFinancial();
  const [focus, setFocus] = useState<AnalysisFocus>('executive');
  const [customQuestion, setCustomQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<AiFinancialAnalysisResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [inserted, setInserted] = useState(false);

  const handleGenerate = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setInserted(false);
    try {
      const res = await generateAiFinancialAnalysis({
        projectName: activeProject.name,
        focus,
        customQuestion,
        assumptions,
        model,
        kpiAlerts,
      });
      setResult(res);
      notify('success', 'Analyse qualitative financière générée.');
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Erreur lors de la génération de l’analyse.';
      setErrorMsg(msg);
      notify('error', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!result) return;
    const text = [
      `Verdict : ${result.analysis.verdictLabel}`,
      '',
      result.analysis.executiveSummary,
      '',
      `VAN & TRI : ${result.analysis.vanTriInterpretation}`,
      '',
      'Points de vigilance :',
      ...result.analysis.vigilancePoints.map(
        (v) => `- ${v.title} (${v.metric}) : ${v.explanation} -> ${v.mitigation}`
      ),
      '',
      'Recommandations :',
      ...result.analysis.recommendations.map((r) => `- ${r}`),
    ].join('\n');

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      notify('info', 'Copie impossible dans cet environnement.');
    }
  };

  const handleInsertNotes = () => {
    if (!result) return;
    const block = [
      `[Analyse qualitative — ${result.analysis.verdictLabel}]`,
      result.analysis.reportReadyParagraph,
      '',
      'Points de vigilance prioritaires :',
      ...result.analysis.vigilancePoints.map(
        (v) => `• ${v.title} (${v.metric}) : ${v.mitigation}`
      ),
    ].join('\n');
    onInsertIntoNotes(block);
    setInserted(true);
    setTimeout(() => setInserted(false), 2500);
  };

  const verdictStyle =
    result?.analysis.verdictLevel === 'favorable'
      ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
      : result?.analysis.verdictLevel === 'critique'
        ? 'border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300'
        : 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300';

  return (
    <section
      aria-label="Analyse qualitative financière assistée par IA générative"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
    >
      {/* En-tête */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-indigo-500/[0.03] dark:bg-indigo-500/[0.05]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Analyse qualitative du rapport &amp; points de vigilance (VAN / TRI)
            </h2>
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            Base active : VAN {formatAriary(model.npv.npvAr, { inMillions: true })} · TRI{' '}
            {Number.isFinite(model.irr.irrValue) ? formatPercent(model.irr.irrValue, 1) : 'N/D'} · Marge nette{' '}
            {formatPercent(model.year1.netMarginAfterTaxRate, 1)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] p-0.5">
            {FOCUS_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFocus(opt.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  focus === opt.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className="min-h-9 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            {isLoading ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{result ? 'Actualiser l’analyse' : 'Rédiger l’analyse'}</span>
          </button>
        </div>
      </div>

      {/* Corps */}
      <div className="p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder="Orientation optionnelle (ex : impact si le prix du paddy monte à 1 400 Ar/kg ou délai de remboursement bancaire)..."
            aria-label="Orientation ou question spécifique pour l'analyse qualitative"
            className="flex-1 min-h-9 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl border border-rose-500/35 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {!result && !isLoading && !errorMsg && (
          <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-white/[0.1] bg-zinc-50/60 dark:bg-[#141322]/60 text-xs text-zinc-600 dark:text-zinc-400">
            Cliquez sur « Rédiger l’analyse » pour générer une note qualitative structurée à partir des indicateurs calculés (VAN, TRI, payback, marges HS/BS, point bas de trésorerie, logistique et BFR), puis l’insérer directement dans les notes de votre export PDF/DOCX.
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {/* Barre de verdict + actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-2 self-start ${verdictStyle}`}
              >
                {result.analysis.verdictLevel === 'favorable' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                ) : (
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                )}
                <span>{result.analysis.verdictLabel}</span>
                <span className="text-[10px] opacity-75 font-mono">
                  · {new Date(result.generatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-medium text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié' : 'Copier'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleInsertNotes}
                  className="min-h-8 px-3 py-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15 text-xs font-semibold text-emerald-800 dark:text-emerald-300 inline-flex items-center gap-1.5"
                >
                  {inserted ? <Check className="w-3.5 h-3.5" /> : <FilePlus2 className="w-3.5 h-3.5" />}
                  <span>
                    {inserted
                      ? 'Ajouté aux Notes du rapport'
                      : 'Insérer dans les Notes du rapport (PDF)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Synthèse + VAN/TRI */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Synthèse exécutive
                </div>
                <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {result.analysis.executiveSummary}
                </p>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Lecture VAN &amp; TRI
                </div>
                <p className="text-xs leading-relaxed text-zinc-800 dark:text-zinc-200">
                  {result.analysis.vanTriInterpretation}
                </p>
              </div>
            </div>

            {/* Points forts & Recommandations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141322]/70 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Points forts du modèle
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  {result.analysis.strengths.map((s, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#141322]/70 space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-400">
                  Plan d’actions recommandé
                </div>
                <ul className="space-y-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  {result.analysis.recommendations.map((r, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" aria-hidden="true" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Points de vigilance */}
            <div className="space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Points de vigilance prioritaires
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {result.analysis.vigilancePoints.map((vp, idx) => {
                  const sevClass =
                    vp.severity === 'elevee'
                      ? 'border-rose-500/35 bg-rose-500/[0.05]'
                      : vp.severity === 'moderee'
                        ? 'border-amber-500/35 bg-amber-500/[0.05]'
                        : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]';
                  return (
                    <div key={idx} className={`p-3 rounded-xl border ${sevClass} space-y-1.5`}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                          {vp.title}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-300 shrink-0">
                          {vp.metric}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                        {vp.explanation}
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-medium">
                        Mitigation : {vp.mitigation}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
