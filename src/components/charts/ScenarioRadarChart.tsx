import React, { useMemo, useState } from 'react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { FinancialAssumptions, FullFinancialModel } from '../../types/finance';
import { DEFAULT_ASSUMPTIONS } from '../../engine/defaultAssumptions';
import { calculateFullModel } from '../../engine/calculator';
import { useFinancial } from '../../context/FinancialContext';
import { applyScenarioDefinitionToAssumptions } from '../../utils/scenarioHelpers';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { SelectMenu } from '../ui/SelectMenu';

interface ScenarioRadarChartProps {
  assumptions: FinancialAssumptions;
  model: FullFinancialModel;
  inMillions: boolean;
}

interface RadarDatum {
  axis: string;
  Active: number;
  Baseline: number;
  Pessimiste: number;
  rawActive: string;
  rawBaseline: string;
  rawPessimiste: string;
  description: string;
}

export const ScenarioRadarChart: React.FC<ScenarioRadarChartProps> = ({
  assumptions,
  model,
  inMillions,
}) => {
  const { savedScenarios, activeScenarioId } = useFinancial();
  const [baselineId, setBaselineId] = useState<string>('builtin-optimiste');
  const [showPessimiste, setShowPessimiste] = useState(false);

  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId);
  const activeName = activeScenario?.name || 'Scénario actif (Réaliste)';

  const baselineOptions = useMemo(() => {
    const opts: Array<{ id: string; label: string; group: string }> = [
      { id: 'builtin-optimiste', label: 'Optimiste (choc positif)', group: 'Références calculées' },
      { id: 'builtin-default', label: 'Référence initiale (Défaut)', group: 'Références calculées' },
      { id: 'builtin-pessimiste', label: 'Pessimiste (stress)', group: 'Références calculées' },
      ...savedScenarios
        .filter((s) => s.id !== activeScenarioId)
        .map((s) => ({
          id: `saved:${s.id}`,
          label: s.name,
          group: 'Scénarios sauvegardés',
        })),
    ];
    return opts;
  }, [savedScenarios, activeScenarioId]);

  const { radarData, baselineName, summary } = useMemo(() => {
    const activeModel = model;

    let baseModel: FullFinancialModel;
    let baseLabel = 'Optimiste';

    if (baselineId === 'builtin-optimiste') {
      baseModel = calculateFullModel(
        applyScenarioDefinitionToAssumptions(assumptions, model.scenarios.optimiste.definition)
      );
      baseLabel = 'Optimiste';
    } else if (baselineId === 'builtin-pessimiste') {
      baseModel = calculateFullModel(
        applyScenarioDefinitionToAssumptions(assumptions, model.scenarios.pessimiste.definition)
      );
      baseLabel = 'Pessimiste';
    } else if (baselineId === 'builtin-default') {
      baseModel = calculateFullModel(DEFAULT_ASSUMPTIONS);
      baseLabel = 'Référence initiale';
    } else if (baselineId.startsWith('saved:')) {
      const targetId = baselineId.slice('saved:'.length);
      const saved = savedScenarios.find((s) => s.id === targetId);
      if (saved) {
        baseModel = calculateFullModel(saved.assumptions);
        baseLabel = saved.name;
      } else {
        baseModel = calculateFullModel(
          applyScenarioDefinitionToAssumptions(assumptions, model.scenarios.optimiste.definition)
        );
        baseLabel = 'Optimiste';
      }
    } else {
      baseModel = calculateFullModel(
        applyScenarioDefinitionToAssumptions(assumptions, model.scenarios.optimiste.definition)
      );
      baseLabel = 'Optimiste';
    }

    const pessModel = calculateFullModel(
      applyScenarioDefinitionToAssumptions(assumptions, model.scenarios.pessimiste.definition)
    );

    // Raw metrics across compared scenarios
    const volAct = activeModel.year1.totalRiceKgSold / 1000; // tonnes
    const volBase = baseModel.year1.totalRiceKgSold / 1000;
    const volPess = pessModel.year1.totalRiceKgSold / 1000;
    const maxVol = Math.max(volAct, volBase, showPessimiste ? volPess : 0, 1);

    const caAct = activeModel.year1.totalTurnoverAr;
    const caBase = baseModel.year1.totalTurnoverAr;
    const caPess = pessModel.year1.totalTurnoverAr;
    const maxCa = Math.max(caAct, caBase, showPessimiste ? caPess : 0, 1);

    const marginAct = activeModel.year1.netMarginAfterTaxRate;
    const marginBase = baseModel.year1.netMarginAfterTaxRate;
    const marginPess = pessModel.year1.netMarginAfterTaxRate;
    const maxMargin = Math.max(marginAct, marginBase, showPessimiste ? marginPess : 0, 0.05);

    const pbAct = activeModel.payback.paybackMonths;
    const pbBase = baseModel.payback.paybackMonths;
    const pbPess = pessModel.payback.paybackMonths;
    const scorePayback = (months: number) =>
      months > 0 ? Math.max(4, Math.min(100, ((36 - Math.min(36, months)) / 36) * 100)) : 0;

    const irrAct = Number.isFinite(activeModel.irr.irrValue) ? activeModel.irr.irrValue : 0;
    const irrBase = Number.isFinite(baseModel.irr.irrValue) ? baseModel.irr.irrValue : 0;
    const irrPess = Number.isFinite(pessModel.irr.irrValue) ? pessModel.irr.irrValue : 0;
    const maxIrr = Math.max(irrAct, irrBase, showPessimiste ? irrPess : 0, 0.12);

    const formatIrrRaw = (irr: { irrValue: number }) =>
      Number.isFinite(irr.irrValue) ? formatPercent(irr.irrValue, 1) : 'N/A';

    const clampScore = (val: number) => Math.max(0, Math.min(100, Number(val.toFixed(1))));

    const data: RadarDatum[] = [
      {
        axis: 'Volume riz',
        Active: clampScore((volAct / maxVol) * 100),
        Baseline: clampScore((volBase / maxVol) * 100),
        Pessimiste: clampScore((volPess / maxVol) * 100),
        rawActive: `${volAct.toFixed(1)} t`,
        rawBaseline: `${volBase.toFixed(1)} t`,
        rawPessimiste: `${volPess.toFixed(1)} t`,
        description: 'Tonnage annuel de riz blanc commercialisé',
      },
      {
        axis: 'Chiffre d’affaires',
        Active: clampScore((caAct / maxCa) * 100),
        Baseline: clampScore((caBase / maxCa) * 100),
        Pessimiste: clampScore((caPess / maxCa) * 100),
        rawActive: formatAriary(caAct, { inMillions }),
        rawBaseline: formatAriary(caBase, { inMillions }),
        rawPessimiste: formatAriary(caPess, { inMillions }),
        description: 'Revenus annuels consolidés (HS + BS)',
      },
      {
        axis: 'Marge nette',
        Active: clampScore((Math.max(0, marginAct) / maxMargin) * 100),
        Baseline: clampScore((Math.max(0, marginBase) / maxMargin) * 100),
        Pessimiste: clampScore((Math.max(0, marginPess) / maxMargin) * 100),
        rawActive: formatPercent(marginAct),
        rawBaseline: formatPercent(marginBase),
        rawPessimiste: formatPercent(marginPess),
        description: 'Part du bénéfice net après IR dans le CA',
      },
      {
        axis: 'Délai récupération',
        Active: clampScore(scorePayback(pbAct)),
        Baseline: clampScore(scorePayback(pbBase)),
        Pessimiste: clampScore(scorePayback(pbPess)),
        rawActive: formatMonths(pbAct),
        rawBaseline: formatMonths(pbBase),
        rawPessimiste: formatMonths(pbPess),
        description: 'Rapidité de récupération du capital I₀ (score inversé / 36m)',
      },
      {
        axis: 'TRI (Rentabilité)',
        Active: clampScore((Math.max(0, irrAct) / maxIrr) * 100),
        Baseline: clampScore((Math.max(0, irrBase) / maxIrr) * 100),
        Pessimiste: clampScore((Math.max(0, irrPess) / maxIrr) * 100),
        rawActive: formatIrrRaw(activeModel.irr),
        rawBaseline: formatIrrRaw(baseModel.irr),
        rawPessimiste: formatIrrRaw(pessModel.irr),
        description: 'Taux de Rentabilité Interne sur 3 ans (CF A1–A3)',
      },
    ];

    return {
      radarData: data,
      baselineName: baseLabel,
      summary: {
        baseNpv: baseModel.npv.npvAr,
        actNpv: activeModel.npv.npvAr,
        basePb: pbBase,
        actPb: pbAct,
        baseIrr: formatIrrRaw(baseModel.irr),
        actIrr: formatIrrRaw(activeModel.irr),
      },
    };
  }, [assumptions, model, baselineId, savedScenarios, showPessimiste, inMillions]);

  const canTogglePessimiste = baselineId !== 'builtin-pessimiste';

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Radar Multidimensionnel — Scénario Actif vs Référence
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Profil normalisé (0–100) comparant <strong className="text-zinc-800 dark:text-zinc-200">{activeName}</strong> face à{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">{baselineName}</strong> sur 5 axes : volume, CA, marge nette, délai de récupération et TRI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="font-medium whitespace-nowrap">Comparer à :</span>
            <SelectMenu
              id="radar-baseline-select"
              size="sm"
              ariaLabel="Scénario de référence à comparer sur le radar"
              value={baselineId}
              onChange={setBaselineId}
              options={baselineOptions.map((opt) => ({
                value: opt.id,
                label: opt.label,
                group: opt.group,
              }))}
              align="right"
              className="w-[205px]"
            />
          </div>

          {canTogglePessimiste && (
            <button
              type="button"
              onClick={() => setShowPessimiste((prev) => !prev)}
              aria-pressed={showPessimiste}
              className={`min-h-9 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap ${
                showPessimiste
                  ? 'border-amber-500/45 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
            >
              {showPessimiste ? 'Masquer Pessimiste' : '+ Superposer Pessimiste'}
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        {/* Radar Plot */}
        <div className="lg:col-span-7 h-[320px] sm:h-[350px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="rgba(148, 163, 184, 0.28)" />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
              />
              <PolarRadiusAxis
                angle={90}
                domain={[0, 100]}
                tick={{ fill: '#64748b', fontSize: 10 }}
                tickCount={5}
              />
              <Radar
                name={baselineName}
                dataKey="Baseline"
                stroke="#06b6d4"
                strokeWidth={2.2}
                fill="#06b6d4"
                fillOpacity={0.22}
              />
              <Radar
                name={activeName}
                dataKey="Active"
                stroke="#10b981"
                strokeWidth={2.2}
                fill="#10b981"
                fillOpacity={0.22}
              />
              {showPessimiste && canTogglePessimiste && (
                <Radar
                  name="Pessimiste"
                  dataKey="Pessimiste"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="#f59e0b"
                  fillOpacity={0.16}
                />
              )}
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload as RadarDatum;
                  return (
                    <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700/80 text-xs text-zinc-100 shadow-xl space-y-1.5 min-w-[220px]">
                      <div className="font-bold text-white">{row.axis}</div>
                      <div className="text-[11px] text-zinc-400">{row.description}</div>
                      <div className="pt-1 border-t border-zinc-800 space-y-1 font-mono tabular-nums">
                        <div className="flex justify-between gap-3 text-emerald-300">
                          <span className="truncate max-w-[120px]">{activeName} :</span>
                          <span className="font-bold">{row.rawActive}</span>
                        </div>
                        <div className="flex justify-between gap-3 text-cyan-300">
                          <span className="truncate max-w-[120px]">{baselineName} :</span>
                          <span className="font-bold">{row.rawBaseline}</span>
                        </div>
                        {showPessimiste && canTogglePessimiste && (
                          <div className="flex justify-between gap-3 text-amber-300">
                            <span>Pessimiste :</span>
                            <span className="font-bold">{row.rawPessimiste}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Exact Axis Breakdown Table */}
        <div className="lg:col-span-5 space-y-2.5">
          <div className="flex flex-wrap items-center gap-4 text-xs font-medium pb-1">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
              <span className="truncate max-w-[150px]">{activeName}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 text-cyan-700 dark:text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
              <span className="truncate max-w-[150px]">{baselineName}</span>
            </span>
            {showPessimiste && canTogglePessimiste && (
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                Pessimiste
              </span>
            )}
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
            {radarData.map((row) => (
              <div key={row.axis} className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="min-w-0">
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">{row.axis}</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {row.description}
                  </div>
                </div>
                <div className="text-right font-mono tabular-nums shrink-0 space-y-0.5">
                  <div className="text-emerald-700 dark:text-emerald-300 font-bold">{row.rawActive}</div>
                  <div className="text-cyan-700 dark:text-cyan-300">{row.rawBaseline}</div>
                  {showPessimiste && canTogglePessimiste && (
                    <div className="text-amber-700 dark:text-amber-300">{row.rawPessimiste}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums flex flex-wrap justify-between gap-2 px-1">
            <span>
              Écart VAN (Actif vs Réf) :{' '}
              <strong
                className={
                  summary.actNpv - summary.baseNpv >= 0
                    ? 'text-emerald-700 dark:text-emerald-300'
                    : 'text-cyan-700 dark:text-cyan-300'
                }
              >
                {summary.actNpv - summary.baseNpv >= 0 ? '+' : ''}
                {formatAriary(summary.actNpv - summary.baseNpv, { inMillions: true })}
              </strong>
            </span>
            <span>
              TRI : {summary.actIrr} vs {summary.baseIrr} · Payback : {formatMonths(summary.actPb)} vs {formatMonths(summary.basePb)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
