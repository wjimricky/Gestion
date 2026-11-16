import React, { useMemo, useRef, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ArrowLeftRight,
  Download,
  FileUp,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { DEFAULT_ASSUMPTIONS } from '../../engine/defaultAssumptions';
import {
  ImportedRiceBenchmark,
  ImportedRiceGrade,
  MarketPositioningStrategy,
} from '../../types/finance';
import {
  computeMarketComparisonMetrics,
  downloadMarketTemplateCsv,
  getResolvedMarketComparison,
  IMPORTED_GRADE_META,
  parseImportedRiceFile,
  POSITIONING_STRATEGY_META,
} from '../../utils/marketComparison';
import { formatAriary } from '../../utils/formatters';

export const MarketComparisonView: React.FC = () => {
  const {
    assumptions,
    model,
    updateMarketComparison,
    updateSeasonField,
    notify,
  } = useFinancial();

  const market = getResolvedMarketComparison(assumptions);
  const summary = useMemo(
    () => computeMarketComparisonMetrics(assumptions, model, market),
    [assumptions, model, market]
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [newName, setNewName] = useState('');
  const [newOrigin, setNewOrigin] = useState('');
  const [newGrade, setNewGrade] = useState<ImportedRiceGrade>('standard');
  const [newPrice, setNewPrice] = useState('2500');
  const [newShare, setNewShare] = useState('15');
  const [importError, setImportError] = useState<string | null>(null);

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportError(null);
    try {
      const importedRows = await parseImportedRiceFile(file);
      updateMarketComparison({ benchmarks: importedRows });
      notify(
        'success',
        `${importedRows.length} référence(s) de riz importé chargée(s) depuis ${file.name}.`
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Erreur lors de la lecture du fichier marché.';
      setImportError(message);
      notify('error', message);
    }
  };

  const handleAddBenchmark = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newName.trim();
    const price = Math.round(Number(newPrice) || 0);
    if (!cleanName || price <= 0) {
      notify('error', 'Veuillez renseigner un nom et un prix > 0 Ar/kg.');
      return;
    }
    const item: ImportedRiceBenchmark = {
      id: `mkt-${Date.now()}`,
      name: cleanName,
      origin: newOrigin.trim() || 'Import',
      grade: newGrade,
      priceArPerKg: price,
      marketShareEstimatePct: Math.max(1, Math.min(100, Math.round(Number(newShare) || 15))),
    };
    updateMarketComparison({ benchmarks: [...market.benchmarks, item] });
    setNewName('');
    setNewOrigin('');
    setNewPrice('2500');
    notify('success', `Référence « ${item.name} » ajoutée au comparateur.`);
  };

  const handleUpdateBenchmark = (
    id: string,
    patch: Partial<ImportedRiceBenchmark>
  ) => {
    updateMarketComparison({
      benchmarks: market.benchmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    });
  };

  const handleDeleteBenchmark = (id: string) => {
    if (market.benchmarks.length <= 1) {
      notify('error', 'Conservez au moins une référence de riz importé.');
      return;
    }
    updateMarketComparison({
      benchmarks: market.benchmarks.filter((b) => b.id !== id),
    });
    notify('info', 'Référence marché retirée.');
  };

  const handleApplyRecommendedPricing = () => {
    updateSeasonField(
      'hauteSaison',
      'riceSellingPriceArPerKg',
      summary.recommendedHSPriceAr,
      'Simulateur'
    );
    updateSeasonField(
      'basseSaison',
      'riceSellingPriceArPerKg',
      summary.recommendedBSPriceAr,
      'Simulateur'
    );
    notify(
      'success',
      `Positionnement appliqué : HS ${formatAriary(summary.recommendedHSPriceAr)}/kg · BS ${formatAriary(summary.recommendedBSPriceAr)}/kg.`
    );
  };

  const chartData = useMemo(() => {
    const importBars = market.benchmarks.map((b) => ({
      name: b.name.length > 22 ? `${b.name.slice(0, 20)}…` : b.name,
      fullName: `${b.name} (${b.origin})`,
      price: b.priceArPerKg,
      kind: 'import' as const,
      gapAr: Math.round(summary.localWeightedAvgPrice - b.priceArPerKg),
    }));

    return [
      {
        name: 'Local (Haute Saison)',
        fullName: 'Produit local — Haute Saison',
        price: summary.localPriceHS,
        kind: 'local_hs' as const,
        gapAr: 0,
      },
      {
        name: 'Local (Moy. A1)',
        fullName: 'Produit local — Moyenne pondérée Année 1',
        price: Math.round(summary.localWeightedAvgPrice),
        kind: 'local_avg' as const,
        gapAr: 0,
      },
      {
        name: 'Local (Basse Saison)',
        fullName: 'Produit local — Basse Saison',
        price: summary.localPriceBS,
        kind: 'local_bs' as const,
        gapAr: 0,
      },
      ...importBars,
    ];
  }, [market.benchmarks, summary]);

  const gapSign = summary.avgGapAr >= 0 ? '+' : '';

  return (
    <div className="space-y-5">
      {/* Top Diagnostic & Import Toolbar */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
            <ArrowLeftRight className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Comparaison Marché — Riz Local vs Riz Importé (Madagascar)</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Importez ou éditez les prix du riz importé (riz brisé, indien, pakistanais, parfumé) pour mesurer votre écart de compétitivité et ajuster votre positionnement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleImportFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="min-h-10 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Importer CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={downloadMarketTemplateCsv}
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            <span>Modèle CSV</span>
          </button>
          <button
            type="button"
            onClick={() =>
              updateMarketComparison(DEFAULT_ASSUMPTIONS.marketComparison!)
            }
            className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </section>

      {importError && (
        <div
          role="alert"
          className="p-3.5 rounded-xl border border-rose-500/45 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200"
        >
          {importError}
        </div>
      )}

      {/* 4 Market KPI Summary Cards */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Prix local pondéré (A1)
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(summary.localWeightedAvgPrice)} / kg
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            HS {formatAriary(summary.localPriceHS)} · BS {formatAriary(summary.localPriceBS)}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Prix moyen riz importé
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-sky-700 dark:text-sky-400">
            {formatAriary(summary.importedWeightedAvgPrice)} / kg
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Fourchette : {formatAriary(summary.importedMinPrice)} – {formatAriary(summary.importedMaxPrice)}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Écart prix Local vs Importé
          </div>
          <div
            className={`text-xl font-bold font-mono tabular-nums ${
              summary.avgGapAr <= 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-amber-700 dark:text-amber-300'
            }`}
          >
            {gapSign}
            {formatAriary(summary.avgGapAr)} / kg
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Soit {gapSign}
            {summary.avgGapPct.toFixed(1)} % (indice {summary.competitivenessIndex.toFixed(0)})
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#11101C] space-y-1">
          <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Cible recommandée ({POSITIONING_STRATEGY_META[market.positioningStrategy].shortLabel})
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
            {formatAriary(summary.recommendedTargetPriceAr)} / kg
          </div>
          <div className="text-xs font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            HS {formatAriary(summary.recommendedHSPriceAr)} · BS {formatAriary(summary.recommendedBSPriceAr)}
          </div>
        </div>
      </div>

      {/* Price Gap Chart + Strategy Selector */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <section className="xl:col-span-7 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Comparatif visuel des prix au kilo (Ar / kg)
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                La ligne pointillée marque votre prix moyen local pondéré ({formatAriary(summary.localWeightedAvgPrice)}/kg).
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-700 dark:text-teal-400 font-medium">Vert/Indigo : Local</span>
              <span aria-hidden="true">·</span>
              <span className="text-amber-700 dark:text-amber-300 font-medium">Ambre : Importé</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={52}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${Math.round(Number(v))} Ar`}
                  width={62}
                />
                <ReferenceLine
                  y={Math.round(summary.localWeightedAvgPrice)}
                  stroke="#6366f1"
                  strokeDasharray="5 4"
                  strokeWidth={2}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value) => [formatAriary(Number(value ?? 0)) + ' / kg', 'Prix unitaire']}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName || ''}
                />
                <Bar dataKey="price" radius={[6, 6, 0, 0]} maxBarSize={36}>
                  {chartData.map((entry, idx) => {
                    const fill =
                      entry.kind === 'local_hs'
                        ? '#14b8a6'
                        : entry.kind === 'local_avg'
                        ? '#6366f1'
                        : entry.kind === 'local_bs'
                        ? '#0ea5e9'
                        : '#f59e0b';
                    return <Cell key={`cell-${idx}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Positioning Strategy Panel */}
        <section className="xl:col-span-5 rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Ajustement de Stratégie &amp; Positionnement</span>
            </h3>

            <div className="space-y-2">
              {(Object.keys(POSITIONING_STRATEGY_META) as MarketPositioningStrategy[]).map(
                (key) => {
                  const meta = POSITIONING_STRATEGY_META[key];
                  const active = market.positioningStrategy === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateMarketComparison({ positioningStrategy: key })}
                      className={`w-full text-left p-3 rounded-xl border transition-colors ${
                        active
                          ? 'border-indigo-500/60 bg-indigo-500/10 text-zinc-900 dark:text-white'
                          : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1e1d32]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold">
                        <span>{meta.label}</span>
                        <span className="font-mono text-indigo-700 dark:text-indigo-300">
                          {meta.shortLabel}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
                        {meta.description}
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-[#171627] space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 dark:text-zinc-400">Tarifs cibles calculés :</span>
              <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
                HS {formatAriary(summary.recommendedHSPriceAr)} · BS {formatAriary(summary.recommendedBSPriceAr)}
              </span>
            </div>
            <button
              type="button"
              onClick={handleApplyRecommendedPricing}
              className="w-full min-h-10 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition-colors"
            >
              Appliquer ces prix cibles au modèle financier
            </button>
          </div>
        </section>
      </div>

      {/* Editable Imported Rice Benchmark Table + Add Row Form */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
            Mercuriale des Riz Importés &amp; Écarts par Saison
          </h3>
          <span className="text-xs text-zinc-600 dark:text-zinc-400">
            Modifiez directement un prix pour recalibrer l’écart en temps réel
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-3 px-3.5 font-semibold">Variété importée</th>
                <th className="py-3 px-3.5 font-semibold">Origine</th>
                <th className="py-3 px-3.5 font-semibold">Catégorie</th>
                <th className="py-3 px-3.5 text-right font-semibold">Prix (Ar/kg)</th>
                <th className="py-3 px-3.5 text-right font-semibold">Écart vs HS</th>
                <th className="py-3 px-3.5 text-right font-semibold">Écart vs BS</th>
                <th className="py-3 px-3.5 text-right font-semibold">Écart vs Moy.</th>
                <th className="py-3 px-3.5 text-right font-semibold no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {summary.rows.map((row) => {
                const b = row.benchmark;
                return (
                  <tr key={b.id} className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3.5 font-sans">
                      <input
                        type="text"
                        aria-label={`Nom ${b.name}`}
                        value={b.name}
                        onChange={(e) => handleUpdateBenchmark(b.id, { name: e.target.value })}
                        className="w-full min-w-[180px] px-2 py-1 rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3.5 font-sans">
                      <input
                        type="text"
                        aria-label={`Origine ${b.name}`}
                        value={b.origin}
                        onChange={(e) => handleUpdateBenchmark(b.id, { origin: e.target.value })}
                        className="w-full min-w-[110px] px-2 py-1 rounded-lg border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent text-zinc-700 dark:text-zinc-300 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3.5 font-sans text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {IMPORTED_GRADE_META[b.grade]?.shortLabel || b.grade}
                    </td>
                    <td className="py-2.5 px-3.5 text-right">
                      <input
                        type="number"
                        min="100"
                        step="50"
                        aria-label={`Prix ${b.name}`}
                        value={b.priceArPerKg}
                        onChange={(e) =>
                          handleUpdateBenchmark(b.id, {
                            priceArPerKg: Math.max(100, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-[#171627] font-bold text-zinc-900 dark:text-white"
                      />
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-semibold ${
                        row.gapVsLocalHSAr <= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {row.gapVsLocalHSAr >= 0 ? '+' : ''}
                      {formatAriary(row.gapVsLocalHSAr)}
                    </td>
                    <td
                      className={`py-2.5 px-3.5 text-right font-semibold ${
                        row.gapVsLocalBSAr <= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-amber-700 dark:text-amber-300'
                      }`}
                    >
                      {row.gapVsLocalBSAr >= 0 ? '+' : ''}
                      {formatAriary(row.gapVsLocalBSAr)}
                    </td>
                    <td className="py-2.5 px-3.5 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                      {row.gapVsLocalWeightedPct >= 0 ? '+' : ''}
                      {row.gapVsLocalWeightedPct.toFixed(1)} %
                    </td>
                    <td className="py-2.5 px-3.5 text-right no-print">
                      <button
                        type="button"
                        onClick={() => handleDeleteBenchmark(b.id)}
                        title="Supprimer cette référence"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Benchmark Form */}
        <form
          onSubmit={handleAddBenchmark}
          className="p-4 border-t border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161525] grid grid-cols-1 sm:grid-cols-6 gap-2.5 items-end no-print"
        >
          <div className="sm:col-span-2">
            <label htmlFor="mkt-new-name" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Nouveau riz importé
            </label>
            <input
              id="mkt-new-name"
              type="text"
              placeholder="Ex : Riz vietnamien 10 % brisures"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
          </div>
          <div>
            <label htmlFor="mkt-new-origin" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Origine
            </label>
            <input
              id="mkt-new-origin"
              type="text"
              placeholder="Vietnam / Inde"
              value={newOrigin}
              onChange={(e) => setNewOrigin(e.target.value)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            />
          </div>
          <div>
            <label htmlFor="mkt-new-grade" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Segment
            </label>
            <select
              id="mkt-new-grade"
              value={newGrade}
              onChange={(e) => setNewGrade(e.target.value as ImportedRiceGrade)}
              className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
            >
              {(Object.keys(IMPORTED_GRADE_META) as ImportedRiceGrade[]).map((g) => (
                <option key={g} value={g}>
                  {IMPORTED_GRADE_META[g].shortLabel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="mkt-new-price" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
              Prix (Ar/kg)
            </label>
            <input
              id="mkt-new-price"
              type="number"
              min="100"
              step="50"
              value={newPrice}
              onChange={(e) => setNewPrice(e.target.value)}
              className="w-full min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max="100"
              aria-label="Part estimée %"
              title="Poids estimé (%)"
              value={newShare}
              onChange={(e) => setNewShare(e.target.value)}
              className="w-16 min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
            />
            <button
              type="submit"
              className="flex-1 min-h-9 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1 hover:opacity-90 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Ajouter</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};
