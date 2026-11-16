import React, { useMemo, useRef, useState } from 'react';
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { Download, Globe2, RotateCcw, Save } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { PestelAnalysisSection } from '../ui/PestelAnalysisSection';
import { ChartExportButtons } from '../ui/ChartExportButtons';
import {
  PESTEL_CATEGORIES_META,
  PESTEL_HORIZON_LABELS,
  PESTEL_IMPACT_LABELS,
} from '../../utils/pestelDefaults';
import { PestelAnalysisData } from '../../types/project';

type PestelRadarMode = 'both' | 'risks' | 'opportunities';

export interface PestelRadarDatum {
  pillar: string;
  letter: string;
  impactLabel: string;
  riskScore: number;
  opportunityScore: number;
  severity: number;
}

export function buildPestelRadarData(pestelAnalysis: PestelAnalysisData): PestelRadarDatum[] {
  return PESTEL_CATEGORIES_META.map((meta) => {
    const entry = pestelAnalysis[meta.key];
    return {
      pillar: meta.title,
      letter: meta.letter,
      impactLabel: PESTEL_IMPACT_LABELS[entry.impact],
      riskScore: entry.impact === 'menace' ? entry.severity : 0,
      opportunityScore: entry.impact === 'opportunite' ? entry.severity : 0,
      severity: entry.severity,
    };
  });
}

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildPestelCsvContent(
  pestelAnalysis: PestelAnalysisData,
  projectName: string
): string {
  const headers = [
    'Projet',
    'Pilier',
    'Code',
    'Orientation',
    'Criticité (/5)',
    'Score Risque (/5)',
    'Score Opportunité (/5)',
    'Horizon',
    'Facteurs clés',
    'Observations marché riz Madagascar',
    'Mesure d’atténuation / Action terrain',
    'Dernière mise à jour',
  ];

  const rows = PESTEL_CATEGORIES_META.map((meta) => {
    const entry = pestelAnalysis[meta.key];
    return [
      projectName,
      meta.title,
      meta.letter,
      PESTEL_IMPACT_LABELS[entry.impact],
      entry.severity,
      entry.impact === 'menace' ? entry.severity : 0,
      entry.impact === 'opportunite' ? entry.severity : 0,
      PESTEL_HORIZON_LABELS[entry.horizon],
      entry.keyFactors.join(' ; '),
      entry.notes,
      entry.mitigationPlan,
      entry.updatedAt,
    ];
  });

  return '\uFEFF' + [headers, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n');
}

export const PestelTab: React.FC = () => {
  const {
    activeProject,
    pestelAnalysis,
    savePestelAnalysis,
    resetPestelAnalysis,
    notify,
  } = useFinancial();
  const [lastExplicitSaveAt, setLastExplicitSaveAt] = useState<string | null>(null);
  const [radarMode, setRadarMode] = useState<PestelRadarMode>('both');
  const radarRef = useRef<HTMLDivElement>(null);

  const summary = useMemo(() => {
    const entries = Object.values(pestelAnalysis);
    const opportunities = entries.filter((e) => e.impact === 'opportunite').length;
    const threats = entries.filter((e) => e.impact === 'menace').length;
    const neutral = entries.filter((e) => e.impact === 'neutre').length;
    const avgSeverity =
      entries.reduce((acc, e) => acc + e.severity, 0) / Math.max(1, entries.length);
    const latestUpdate = entries.reduce((latest, e) => {
      return e.updatedAt > latest ? e.updatedAt : latest;
    }, '');
    const highestRisk = [...PESTEL_CATEGORIES_META]
      .map((meta) => ({
        title: meta.title,
        entry: pestelAnalysis[meta.key],
      }))
      .sort((a, b) => b.entry.severity - a.entry.severity)[0];

    return {
      opportunities,
      threats,
      neutral,
      avgSeverity,
      latestUpdate,
      highestRisk,
    };
  }, [pestelAnalysis]);

  const radarData = useMemo(() => buildPestelRadarData(pestelAnalysis), [pestelAnalysis]);

  const handleExplicitSave = () => {
    savePestelAnalysis();
    setLastExplicitSaveAt(new Date().toISOString());
  };

  const handleExportCsv = () => {
    try {
      const csvContent = buildPestelCsvContent(pestelAnalysis, activeProject.name);
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analyse_pestel_riz_madagascar_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify('success', 'Analyse PESTEL exportée au format CSV.');
    } catch {
      notify('error', 'Impossible d’exporter l’analyse PESTEL en CSV.');
    }
  };

  const displaySavedTimestamp = lastExplicitSaveAt || summary.latestUpdate;

  return (
    <div className="space-y-6">
      {/* Top Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Globe2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Analyse PESTEL — Contexte Macro-économique Rizicole (Madagascar)</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Projet : <strong className="text-zinc-900 dark:text-zinc-200">{activeProject.name}</strong></span>
            <span aria-hidden="true">·</span>
            <span>6 dimensions macro-environnementales intégrées à l’export PDF</span>
            {displaySavedTimestamp && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums text-xs text-teal-700 dark:text-teal-400">
                  Sauvegarde : {new Date(displaySavedTimestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </>
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <button
            type="button"
            onClick={resetPestelAnalysis}
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Référentiel Madagascar</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExplicitSave}
            className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Sauvegarder l&apos;analyse</span>
          </button>
        </div>
      </div>

      {/* Macro Synthesis + Recharts Dual Risk/Opportunity Radar */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <section
          aria-label="Synthèse des 6 piliers PESTEL"
          className="xl:col-span-6 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col justify-between gap-4"
        >
          <div className="space-y-1">
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
              Cartographie Synthétique des Risques &amp; Opportunités
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Équilibre global entre facteurs porteurs et vulnérabilités structurelles de la filière riz à Madagascar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-zinc-200 dark:divide-white/[0.08] rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#151424]">
            <div className="p-3.5">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Opportunités</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-400">
                {summary.opportunities} / 6
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Menaces / Risques</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-rose-700 dark:text-rose-400">
                {summary.threats} / 6
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Criticité moyenne</div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {summary.avgSeverity.toFixed(1)} / 5
              </div>
            </div>
            <div className="p-3.5">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">Point de vigilance max</div>
              <div className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300 truncate">
                {summary.highestRisk ? `${summary.highestRisk.title} (${summary.highestRisk.entry.severity}/5)` : '—'}
              </div>
            </div>
          </div>

          {/* 6-pillar compact table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400">
                  <th className="py-2 pr-3 font-semibold">Pilier</th>
                  <th className="py-2 px-3 font-semibold">Orientation</th>
                  <th className="py-2 px-3 font-semibold">Horizon</th>
                  <th className="py-2 pl-3 text-right font-semibold">Score (/5)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                {PESTEL_CATEGORIES_META.map((meta) => {
                  const entry = pestelAnalysis[meta.key];
                  return (
                    <tr key={meta.key} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                      <td className="py-2 pr-3 font-semibold text-zinc-900 dark:text-zinc-100">
                        <span className="font-mono text-indigo-600 dark:text-indigo-400 mr-2">
                          {meta.letter}
                        </span>
                        {meta.title}
                      </td>
                      <td
                        className={`py-2 px-3 font-medium ${
                          entry.impact === 'opportunite'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : entry.impact === 'menace'
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-zinc-600 dark:text-zinc-400'
                        }`}
                      >
                        {PESTEL_IMPACT_LABELS[entry.impact]}
                      </td>
                      <td className="py-2 px-3 text-zinc-600 dark:text-zinc-400">
                        {PESTEL_HORIZON_LABELS[entry.horizon]}
                      </td>
                      <td className="py-2 pl-3 text-right font-mono tabular-nums font-bold text-zinc-900 dark:text-white">
                        {entry.severity}/5
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section
          aria-label="Graphique radar des scores de risques et d'opportunités PESTEL"
          className="xl:col-span-6 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col justify-between gap-3"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
                Radar PESTEL : Scores de Risques &amp; Opportunités (/5)
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Visualisation comparative des expositions aux risques et leviers d&apos;opportunité sur chaque dimension.
              </p>
            </div>
            <ChartExportButtons
              targetRef={radarRef}
              filenameBase="radar_pestel_risques_opportunites"
              chartTitle="Radar PESTEL Risques & Opportunités"
            />
          </div>

          <div
            role="group"
            aria-label="Filtre d'affichage du radar PESTEL"
            className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171627] self-start no-print"
          >
            <button
              type="button"
              onClick={() => setRadarMode('both')}
              aria-pressed={radarMode === 'both'}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                radarMode === 'both'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Risques &amp; Opportunités
            </button>
            <button
              type="button"
              onClick={() => setRadarMode('risks')}
              aria-pressed={radarMode === 'risks'}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                radarMode === 'risks'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Risques (/5)
            </button>
            <button
              type="button"
              onClick={() => setRadarMode('opportunities')}
              aria-pressed={radarMode === 'opportunities'}
              className={`min-h-8 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                radarMode === 'opportunities'
                  ? 'bg-emerald-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Opportunités (/5)
            </button>
          </div>

          <div ref={radarRef} className="w-full h-[290px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="rgba(148,163,184,0.22)" />
                <PolarAngleAxis
                  dataKey="pillar"
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                />
                <PolarRadiusAxis
                  angle={30}
                  domain={[0, 5]}
                  tickCount={6}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                {radarMode === 'both' && (
                  <Radar
                    name="Intensité globale (/5)"
                    dataKey="severity"
                    stroke="#6366f1"
                    strokeDasharray="4 4"
                    fill="#6366f1"
                    fillOpacity={0.08}
                    strokeWidth={1.5}
                  />
                )}
                {(radarMode === 'both' || radarMode === 'risks') && (
                  <Radar
                    name="Score Risques (/5)"
                    dataKey="riskScore"
                    stroke="#f43f5e"
                    fill="#f43f5e"
                    fillOpacity={0.28}
                    strokeWidth={2.2}
                  />
                )}
                {(radarMode === 'both' || radarMode === 'opportunities') && (
                  <Radar
                    name="Score Opportunités (/5)"
                    dataKey="opportunityScore"
                    stroke="#10b981"
                    fill="#10b981"
                    fillOpacity={0.26}
                    strokeWidth={2.2}
                  />
                )}
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                <RechartsTooltip
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const row = payload[0].payload as PestelRadarDatum;
                    return (
                      <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700 text-xs text-zinc-100 space-y-1">
                        <div className="font-bold text-white">
                          {row.letter} · {row.pillar} ({row.impactLabel})
                        </div>
                        <div className="flex justify-between gap-4 font-mono tabular-nums">
                          <span className="text-rose-300">Score Risque :</span>
                          <span>{row.riskScore} / 5</span>
                        </div>
                        <div className="flex justify-between gap-4 font-mono tabular-nums">
                          <span className="text-emerald-300">Score Opportunité :</span>
                          <span>{row.opportunityScore} / 5</span>
                        </div>
                        <div className="flex justify-between gap-4 font-mono tabular-nums">
                          <span className="text-indigo-300">Intensité globale :</span>
                          <span>{row.severity} / 5</span>
                        </div>
                      </div>
                    );
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </section>
      </div>

      {/* Full Interactive 6-Pillar PESTEL Editor */}
      <PestelAnalysisSection />
    </div>
  );
};
