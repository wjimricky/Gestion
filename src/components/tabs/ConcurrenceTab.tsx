import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  Building2,
  Download,
  Plus,
  RotateCcw,
  Trash2,
  TrendingDown,
  TrendingUp,
  PieChart as PieChartIcon,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { LocalCompetitorActor, LocalCompetitorActorType } from '../../types/finance';
import {
  ACTOR_TYPE_META,
  computeCompetitorLandscape,
  DEFAULT_COMPETITOR_BENCHMARK,
  exportCompetitorsCsv,
  getResolvedCompetitors,
} from '../../utils/competitors';
import { formatAriary } from '../../utils/formatters';
import { MarketComparisonView } from '../ui/MarketComparisonView';

export const ConcurrenceTab: React.FC = () => {
  const { assumptions, model, updateCompetitors, theme, notify } = useFinancial();
  const isDarkMode = theme === 'dark';

  const competitors = getResolvedCompetitors(assumptions);
  const summary = useMemo(
    () => computeCompetitorLandscape(assumptions, model, competitors),
    [assumptions, model, competitors]
  );

  const [showImportComparator, setShowImportComparator] = useState(false);

  // Add new actor form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<LocalCompetitorActorType>('collecteur_usinier');
  const [newRegion, setNewRegion] = useState('Alaotra / Tana');
  const [newPaddyCost, setNewPaddyCost] = useState('1650');
  const [newMillingCost, setNewMillingCost] = useState('230');
  const [newLogCost, setNewLogCost] = useState('310');
  const [newSellPrice, setNewSellPrice] = useState('2720');
  const [newShare, setNewShare] = useState('8');
  const [newYield, setNewYield] = useState('66');

  const handleUpdateActor = (id: string, patch: Partial<LocalCompetitorActor>) => {
    updateCompetitors({
      actors: competitors.actors.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  };

  const handleDeleteActor = (id: string) => {
    if (competitors.actors.length <= 1) {
      notify('info', 'Conservez au moins un acteur local de référence.');
      return;
    }
    updateCompetitors({
      actors: competitors.actors.filter((a) => a.id !== id),
    });
    notify('info', 'Acteur concurrent retiré du comparatif.');
  };

  const handleAddActor = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    if (!cleanName) {
      notify('error', 'Veuillez saisir le nom de l’acteur concurrent.');
      return;
    }

    const item: LocalCompetitorActor = {
      id: `comp-${Date.now()}`,
      name: cleanName,
      actorType: newType,
      region: newRegion.trim() || 'Madagascar',
      paddySourcingCostArPerKgRice: Math.max(0, Math.round(Number(newPaddyCost) || 0)),
      millingAndPackagingCostArPerKg: Math.max(0, Math.round(Number(newMillingCost) || 0)),
      logisticsAndOverheadArPerKg: Math.max(0, Math.round(Number(newLogCost) || 0)),
      sellingPriceArPerKg: Math.max(100, Math.round(Number(newSellPrice) || 0)),
      marketSharePct: Math.max(0, Math.min(100, Number(newShare) || 0)),
      millingYieldPct: Math.max(30, Math.min(85, Number(newYield) || 65)),
      strengthTag: 'Concurrent ajouté',
      active: true,
    };

    updateCompetitors({
      actors: [...competitors.actors, item],
    });
    setNewName('');
    notify('success', `Acteur « ${item.name} » ajouté à l’analyse concurrentielle.`);
  };

  const costChartData = useMemo(
    () =>
      summary.allRows
        .filter((r) => r.active)
        .map((r) => ({
          name: r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name,
          fullName: r.name,
          paddy: r.paddySourcingArPerKg,
          usinage: r.millingPackagingArPerKg,
          logistique: r.logisticsOverheadArPerKg,
          totalCost: r.totalUnitCostArPerKg,
          sellingPrice: r.sellingPriceArPerKg,
        })),
    [summary.allRows]
  );

  const sharePieData = useMemo(() => {
    const base = summary.allRows
      .filter((r) => r.active && r.marketSharePct > 0)
      .map((r) => ({
        name: r.name,
        value: Number(r.marketSharePct.toFixed(1)),
        color: r.color,
      }));
    if (summary.residualMarketSharePct > 0.5) {
      base.push({
        name: 'Autoconsommation / Autres',
        value: summary.residualMarketSharePct,
        color: isDarkMode ? '#475569' : '#cbd5e1',
      });
    }
    return base;
  }, [summary.allRows, summary.residualMarketSharePct, isDarkMode]);

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const axisTickColor = isDarkMode ? '#a1a1aa' : '#52525b';
  const costAdvantagePositive = summary.costAdvantageArPerKg >= 0;

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <section className="pb-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Analyse Concurrentielle — Filière Rizicole Madagascar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Comparez votre prix de revient complet (paddy, usinage, structure) et vos parts de marché face aux principaux opérateurs locaux.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#141322] text-xs">
            <span className="text-zinc-600 dark:text-zinc-400">Part cible projet :</span>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              aria-label="Part de marché cible de notre projet (%)"
              value={competitors.ourTargetSharePct}
              onChange={(e) =>
                updateCompetitors({
                  ourTargetSharePct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                })
              }
              className="w-14 px-2 py-0.5 rounded-md border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-right font-mono font-bold text-teal-700 dark:text-teal-300"
            />
            <span className="font-mono text-zinc-500">%</span>
          </div>

          <button
            type="button"
            onClick={() => exportCompetitorsCsv(summary)}
            className="min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Exporter CSV</span>
          </button>

          <button
            type="button"
            onClick={() => {
              updateCompetitors(DEFAULT_COMPETITOR_BENCHMARK);
              notify('info', 'Panel concurrents locaux réinitialisé.');
            }}
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </section>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Notre Prix de Revient Complet (A1)
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(summary.ourActor.totalUnitCostArPerKg)} / kg
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Paddy {formatAriary(summary.ourActor.paddySourcingArPerKg)} · Usin.{' '}
            {formatAriary(summary.ourActor.millingPackagingArPerKg)} · Struct.{' '}
            {formatAriary(summary.ourActor.logisticsOverheadArPerKg)}
          </div>
        </div>

        <div
          className={`p-4 rounded-xl border space-y-1 ${
            costAdvantagePositive
              ? 'border-emerald-500/35 bg-emerald-500/[0.05]'
              : 'border-amber-500/35 bg-amber-500/[0.05]'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <span>Écart de Coût vs Filière Locale</span>
            {costAdvantagePositive ? (
              <TrendingDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            ) : (
              <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            )}
          </div>
          <div
            className={`text-xl font-bold font-mono tabular-nums ${
              costAdvantagePositive
                ? 'text-emerald-700 dark:text-emerald-300'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {costAdvantagePositive ? '−' : '+'}
            {formatAriary(Math.abs(summary.costAdvantageArPerKg))} / kg
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            Moy. pondérée concurrents : {formatAriary(summary.weightedMarketCostArPerKg)}/kg (
            {costAdvantagePositive ? 'avantage ' : 'surcoût '}
            {Math.abs(summary.costAdvantagePct).toFixed(1)} %)
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Marge Unitaire &amp; Prix de Vente
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-teal-700 dark:text-teal-400">
            {formatAriary(summary.ourActor.unitMarginArPerKg)} / kg (
            {summary.ourActor.unitMarginPct.toFixed(1)} %)
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Vente projet {formatAriary(summary.ourActor.sellingPriceArPerKg)} vs Marché{' '}
            {formatAriary(summary.weightedMarketPriceArPerKg)}/kg
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] space-y-1">
          <div className="flex items-center justify-between text-xs font-medium text-zinc-600 dark:text-zinc-400">
            <span>Parts de Marché &amp; Concentration</span>
            <PieChartIcon className="w-4 h-4 text-indigo-500" aria-hidden="true" />
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {summary.ourActor.marketSharePct.toFixed(1)} % cible · HHI {summary.hhiIndex}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
            {summary.concentrationLabel} · Leader : {summary.marketLeaderName}
          </div>
        </div>
      </div>

      {/* Dual Charts: Stacked Cost Price Comparison & Market Share Donut */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <section className="xl:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-3 min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Comparatif du Prix de Revient Décomposé (Ar / kg riz usiné)
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Ventilation matière paddy, frais d’usinage/sacs et logistique/structure par acteur.
              </p>
            </div>
            <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 shrink-0">
              Coût bas le plus compétitif : {summary.costLeaderName}
            </span>
          </div>

          <div className="h-72 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costChartData} margin={{ top: 10, right: 16, left: 0, bottom: 26 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: axisTickColor, fontSize: 10 }}
                  axisLine={{ stroke: gridStroke }}
                  interval={0}
                  angle={-14}
                  textAnchor="end"
                  height={56}
                />
                <YAxis
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                  tickFormatter={(v) => `${v} Ar`}
                  width={60}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown, name: unknown) => [
                    `${formatAriary(Number(val ?? 0))} / kg`,
                    String(name ?? ''),
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="paddy" stackId="cost" name="Sourcing Paddy" fill="#6366f1" maxBarSize={38} />
                <Bar dataKey="usinage" stackId="cost" name="Usinage & Sacs" fill="#14b8a6" maxBarSize={38} />
                <Bar
                  dataKey="logistique"
                  stackId="cost"
                  name="Logistique & Structure"
                  fill="#f59e0b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={38}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="xl:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-3 min-w-0 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Parts de Marché Estimées de la Filière (%)
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Total couvert : {summary.totalClaimedSharePct.toFixed(1)} %
              {summary.totalClaimedSharePct > 100
                ? ' (somme > 100 % — ajustez les parts ci-dessous)'
                : ` · Résiduel / autoconsommation : ${summary.residualMarketSharePct.toFixed(1)} %`}
            </p>
          </div>

          <div className="h-56 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sharePieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                >
                  {sharePieData.map((entry, idx) => (
                    <Cell key={`share-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown) => [`${Number(val ?? 0).toFixed(1)} %`, 'Part estimée']}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 text-xs">
            {sharePieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="w-2.5 h-2.5 rounded-xs shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate text-zinc-700 dark:text-zinc-300">{item.name}</span>
                </div>
                <span className="font-mono font-semibold tabular-nums text-zinc-900 dark:text-white shrink-0">
                  {item.value.toFixed(1)} %
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Editable Competitors Table + Add Form */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Matrice Détaillée des Acteurs — Prix de Revient &amp; Parts de Marché
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Modifiez les coûts, prix de vente ou parts estimées directement dans le tableau
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-3 px-3 font-semibold">Acteur / Opérateur</th>
                <th className="py-3 px-3 font-semibold">Bassin</th>
                <th className="py-3 px-3 text-right font-semibold">Paddy (Ar/kg)</th>
                <th className="py-3 px-3 text-right font-semibold">Usin./Sac</th>
                <th className="py-3 px-3 text-right font-semibold">Log./Struct.</th>
                <th className="py-3 px-3 text-right font-semibold">Prix Revient</th>
                <th className="py-3 px-3 text-right font-semibold">Prix Vente</th>
                <th className="py-3 px-3 text-right font-semibold">Marge / kg</th>
                <th className="py-3 px-3 text-right font-semibold">Part (%)</th>
                <th className="py-3 px-3 text-right font-semibold">Rdt (%)</th>
                <th className="py-3 px-3 text-right font-semibold no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {/* Our Project Highlight Row */}
              <tr className="bg-teal-500/[0.06] dark:bg-teal-500/[0.09] font-semibold">
                <td className="py-3 px-3 font-sans">
                  <div className="flex items-center gap-2 text-teal-800 dark:text-teal-300">
                    <span className="w-2 h-2 rounded-full bg-teal-500 shrink-0" />
                    <span>{summary.ourActor.name}</span>
                  </div>
                  <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400 pl-4">
                    Calculé en direct du modèle A1
                  </div>
                </td>
                <td className="py-3 px-3 font-sans text-zinc-700 dark:text-zinc-300">
                  {summary.ourActor.region}
                </td>
                <td className="py-3 px-3 text-right">{formatAriary(summary.ourActor.paddySourcingArPerKg)}</td>
                <td className="py-3 px-3 text-right">{formatAriary(summary.ourActor.millingPackagingArPerKg)}</td>
                <td className="py-3 px-3 text-right">{formatAriary(summary.ourActor.logisticsOverheadArPerKg)}</td>
                <td className="py-3 px-3 text-right font-bold text-zinc-900 dark:text-white">
                  {formatAriary(summary.ourActor.totalUnitCostArPerKg)}
                </td>
                <td className="py-3 px-3 text-right">{formatAriary(summary.ourActor.sellingPriceArPerKg)}</td>
                <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-300">
                  +{formatAriary(summary.ourActor.unitMarginArPerKg)}
                </td>
                <td className="py-3 px-3 text-right text-teal-700 dark:text-teal-300">
                  {summary.ourActor.marketSharePct.toFixed(1)} %
                </td>
                <td className="py-3 px-3 text-right">{summary.ourActor.millingYieldPct.toFixed(1)} %</td>
                <td className="py-3 px-3 text-right font-sans text-[11px] text-zinc-500 no-print">Réf.</td>
              </tr>

              {/* Local Competitors */}
              {competitors.actors.map((actor) => {
                const row = summary.competitorRows.find((r) => r.id === actor.id)!;
                return (
                  <tr
                    key={actor.id}
                    className={`hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] ${
                      !actor.active ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <input
                        type="text"
                        aria-label={`Nom ${actor.name}`}
                        value={actor.name}
                        onChange={(e) => handleUpdateActor(actor.id, { name: e.target.value })}
                        className="w-full min-w-[175px] px-2 py-1 rounded-md border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400 px-2">
                        {ACTOR_TYPE_META[actor.actorType]?.label}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      <input
                        type="text"
                        aria-label={`Bassin ${actor.name}`}
                        value={actor.region}
                        onChange={(e) => handleUpdateActor(actor.id, { region: e.target.value })}
                        className="w-full min-w-[115px] px-2 py-1 rounded-md border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="20"
                        min="0"
                        aria-label={`Coût paddy ${actor.name}`}
                        value={actor.paddySourcingCostArPerKgRice}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            paddySourcingCostArPerKgRice: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-20 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        aria-label={`Coût usinage ${actor.name}`}
                        value={actor.millingAndPackagingCostArPerKg}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            millingAndPackagingCostArPerKg: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-16 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        aria-label={`Coût logistique ${actor.name}`}
                        value={actor.logisticsAndOverheadArPerKg}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            logisticsAndOverheadArPerKg: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-16 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-zinc-900 dark:text-white">
                      {formatAriary(row.totalUnitCostArPerKg)}
                      <div
                        className={`text-[10px] font-normal ${
                          row.costGapVsUsAr >= 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {row.costGapVsUsAr >= 0 ? '+' : ''}
                        {formatAriary(row.costGapVsUsAr)} vs nous
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="50"
                        min="100"
                        aria-label={`Prix vente ${actor.name}`}
                        value={actor.sellingPriceArPerKg}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            sellingPriceArPerKg: Math.max(100, Number(e.target.value) || 0),
                          })
                        }
                        className="w-20 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-semibold ${
                        row.unitMarginArPerKg >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatAriary(row.unitMarginArPerKg)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        aria-label={`Part marché ${actor.name}`}
                        value={actor.marketSharePct}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            marketSharePct: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
                          })
                        }
                        className="w-14 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        step="1"
                        min="40"
                        max="85"
                        aria-label={`Rendement ${actor.name}`}
                        value={actor.millingYieldPct}
                        onChange={(e) =>
                          handleUpdateActor(actor.id, {
                            millingYieldPct: Math.max(40, Math.min(85, Number(e.target.value) || 65)),
                          })
                        }
                        className="w-14 px-1.5 py-1 text-right rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627]"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right no-print">
                      <div className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={actor.active}
                          aria-label={`Inclure ${actor.name} dans le benchmark`}
                          onChange={(e) => handleUpdateActor(actor.id, { active: e.target.checked })}
                          className="rounded border-zinc-300 dark:border-zinc-700 accent-indigo-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleDeleteActor(actor.id)}
                          title="Supprimer cet acteur"
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                        >
                          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Local Actor Form */}
        <form
          onSubmit={handleAddActor}
          className="p-4 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161525] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-8 gap-2.5 items-end no-print"
        >
          <div className="lg:col-span-2">
            <label htmlFor="comp-new-name" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Nouvel acteur local
            </label>
            <input
              id="comp-new-name"
              type="text"
              placeholder="Ex : Rizerie Boeny Export"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
          </div>
          <div>
            <label htmlFor="comp-new-type" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Profil acteur
            </label>
            <select
              id="comp-new-type"
              value={newType}
              onChange={(e) => setNewType(e.target.value as LocalCompetitorActorType)}
              className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            >
              {(Object.keys(ACTOR_TYPE_META) as LocalCompetitorActorType[]).map((t) => (
                <option key={t} value={t}>
                  {ACTOR_TYPE_META[t].shortLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="comp-new-paddy" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Paddy (Ar/kg)
            </label>
            <input
              id="comp-new-paddy"
              type="number"
              min="0"
              value={newPaddyCost}
              onChange={(e) => setNewPaddyCost(e.target.value)}
              className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="comp-new-usin" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Usin.+Log. (Ar/kg)
            </label>
            <div className="flex gap-1">
              <input
                id="comp-new-usin"
                type="number"
                min="0"
                aria-label="Coût usinage"
                value={newMillingCost}
                onChange={(e) => setNewMillingCost(e.target.value)}
                className="w-1/2 min-h-9 px-1.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
              />
              <input
                type="number"
                min="0"
                aria-label="Coût logistique"
                value={newLogCost}
                onChange={(e) => setNewLogCost(e.target.value)}
                className="w-1/2 min-h-9 px-1.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <label htmlFor="comp-new-sell" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Vente (Ar/kg)
            </label>
            <input
              id="comp-new-sell"
              type="number"
              min="100"
              value={newSellPrice}
              onChange={(e) => setNewSellPrice(e.target.value)}
              className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
            />
          </div>
          <div>
            <label htmlFor="comp-new-share" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Part (%) / Rdt
            </label>
            <div className="flex gap-1">
              <input
                id="comp-new-share"
                type="number"
                min="0"
                max="100"
                aria-label="Part de marché %"
                value={newShare}
                onChange={(e) => setNewShare(e.target.value)}
                className="w-1/2 min-h-9 px-1.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
              />
              <input
                type="number"
                min="40"
                max="85"
                aria-label="Rendement %"
                value={newYield}
                onChange={(e) => setNewYield(e.target.value)}
                className="w-1/2 min-h-9 px-1.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
              />
            </div>
          </div>
          <div>
            <button
              type="submit"
              className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ajouter</span>
            </button>
          </div>
        </form>
      </section>

      {/* Complementary Imported Rice Market Comparator Toggle */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <button
          type="button"
          onClick={() => setShowImportComparator((v) => !v)}
          aria-expanded={showImportComparator}
          className="w-full px-5 py-3.5 flex items-center justify-between gap-2 text-left hover:bg-zinc-50 dark:hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden="true" />
            <div>
              <div className="text-sm font-semibold text-zinc-900 dark:text-white">
                Benchmark complémentaire — Mercuriale des Riz Importés (Inde / Pakistan / Thaïlande)
              </div>
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Comparer vos prix de vente locaux face aux arrivages de riz importés et calibrer votre stratégie tarifaire
              </div>
            </div>
          </div>
          {showImportComparator ? (
            <ChevronUp className="w-4 h-4 text-zinc-500 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0" />
          )}
        </button>

        {showImportComparator && (
          <div className="p-5 border-t border-zinc-200 dark:border-white/[0.08]">
            <MarketComparisonView />
          </div>
        )}
      </section>
    </div>
  );
};
