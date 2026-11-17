import React, { useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Calculator,
  CheckCircle2,
  Cpu,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  ASSET_CATEGORY_META,
  computeFixedAssetsAnalysis,
  DEFAULT_FIXED_ASSETS,
  getMadagascarDegressiveCoeff,
} from '../../utils/fixedAssets';
import {
  DepreciationMethod,
  FixedAssetCategory,
  FixedAssetItem,
} from '../../types/finance';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

export const FixedAssetsSection: React.FC = () => {
  const { assumptions, model, unitDisplay, theme, updateFixedAssets, notify } = useFinancial();
  const isDarkMode = theme === 'dark';
  const inM = unitDisplay === 'millions';

  const analysis = useMemo(
    () => computeFixedAssetsAnalysis(assumptions, model),
    [assumptions, model]
  );

  // Add new asset state
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<FixedAssetCategory>('unite_decorticage');
  const [newValue, setNewValue] = useState('8000000');
  const [newResidual, setNewResidual] = useState('500000');
  const [newLife, setNewLife] = useState('5');
  const [newMethod, setNewMethod] = useState<DepreciationMethod>('degressif');
  const [newYear, setNewYear] = useState<1 | 2 | 3>(1);

  const handleToggleApply = (checked: boolean) => {
    updateFixedAssets({
      enabled: true,
      applyToModel: checked,
    });
    notify(
      'info',
      checked
        ? 'Dotations aux amortissements intégrées dans le Résultat Net et le calcul de l’impôt IR.'
        : 'Dotations aux amortissements en mode simulation seule (Résultat comptable base inchangé).'
    );
  };

  const handleToggleSyncCapex = (checked: boolean) => {
    updateFixedAssets({
      enabled: true,
      syncCapexToInvestment: checked,
    });
  };

  const handleUpdateItem = (id: string, patch: Partial<FixedAssetItem>) => {
    const nextItems = analysis.config.items.map((it) =>
      it.id === id ? { ...it, ...patch } : it
    );
    updateFixedAssets({ items: nextItems });
  };

  const handleDeleteItem = (id: string) => {
    const nextItems = analysis.config.items.filter((it) => it.id !== id);
    updateFixedAssets({ items: nextItems });
  };

  const handleAddAsset = (e: React.FormEvent) => {
    e.preventDefault();
    const val = Number(newValue);
    const res = Math.max(0, Number(newResidual) || 0);
    const life = Math.max(1, Math.min(30, Math.round(Number(newLife) || 5)));
    if (!newName.trim() || !Number.isFinite(val) || val <= 0) {
      notify('error', 'Veuillez saisir une désignation et une valeur d’acquisition positive.');
      return;
    }

    const newItem: FixedAssetItem = {
      id: `asset-${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      acquisitionValueAr: Math.round(val),
      residualValueAr: Math.min(Math.round(val), Math.round(res)),
      usefulLifeYears: life,
      method: newMethod,
      acquisitionYear: newYear,
      active: true,
    };

    updateFixedAssets({ items: [...analysis.config.items, newItem] });
    setNewName('');
    notify('success', `Actif « ${newItem.name} » ajouté au registre d’amortissement.`);
  };

  const handleResetAssets = () => {
    updateFixedAssets({
      ...DEFAULT_FIXED_ASSETS,
      baselineMaterielAr: assumptions.investment.materielAr,
    });
    notify('info', 'Registre des immobilisations réinitialisé aux valeurs standard.');
  };

  // For comparative table: compute EBITDA (before depreciation) directly from gross profit & fixed charges
  const baseEbitda = model.year1.annualGrossProfitAr - model.year1.annualFixedChargesAr;
  const taxRate = assumptions.corporateTaxRate;
  const taxWithoutDep = Math.max(0, baseEbitda) * taxRate;
  const ebtAfterDep = baseEbitda - analysis.year1DepreciationAr;
  const taxWithDep = Math.max(0, ebtAfterDep) * taxRate;
  const taxShieldA1 = Math.max(0, taxWithoutDep - taxWithDep);
  const netWithoutDep = baseEbitda - taxWithoutDep;
  const netWithDep = ebtAfterDep - taxWithDep;
  const cafWithDep = netWithDep + analysis.year1DepreciationAr;

  const chartData = useMemo(() => {
    return analysis.annualSchedule5Y.map((row) => ({
      label: row.label,
      depreciationM: Number((row.depreciationAr / 1e6).toFixed(2)),
      taxShieldM: Number((row.taxShieldAr / 1e6).toFixed(2)),
      nbvM: Number((row.netBookValueAr / 1e6).toFixed(2)),
    }));
  }, [analysis.annualSchedule5Y]);

  return (
    <section
      aria-label="Gestion des actifs et dotations aux amortissements"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Cpu
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                15. Calculateur de Dépréciation &amp; Gestion des Actifs Immobilisés
              </h2>
              <Tooltip
                label="Calculateur de Dépréciation & Impact Fiscal IR"
                content="Inventoriez vos matériels agricoles et unités de décorticage, choisissez le mode linéaire ou dégressif fiscal (CGI Madagascar : coeff. 1,5 à 2,5), et automatisez la dotation annuelle ainsi que l'économie d'impôt sur les sociétés (bouclier fiscal IR)."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Plan d’amortissement linéaire / dégressif du matériel agricole et des unités de décorticage, avec automatisation de l’impact fiscal IR annuel.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer select-none min-h-9 px-3 rounded-lg border border-indigo-500/35 bg-indigo-500/[0.07]">
            <input
              type="checkbox"
              checked={analysis.config.applyToModel}
              onChange={(e) => handleToggleApply(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            <span>Impacter Résultat Net &amp; IR</span>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none min-h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
            <input
              type="checkbox"
              checked={analysis.config.syncCapexToInvestment}
              onChange={(e) => handleToggleSyncCapex(e.target.checked)}
              className="w-4 h-4 accent-teal-600 rounded"
            />
            <span>Sync CapEx A1 → I₀</span>
          </label>

          <button
            type="button"
            onClick={handleResetAssets}
            className="min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Parc d’actifs actif ({analysis.activeCount} unités)
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(analysis.totalGrossValueAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
            CapEx Année 1 : {formatAriary(analysis.year1CapexAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Dotation aux amortissements (A1)
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-indigo-700 dark:text-indigo-300">
            {formatAriary(analysis.year1DepreciationAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
            Cumul 3 ans : {formatAriary(analysis.threeYearTotalDepreciationAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] space-y-1">
          <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>Bouclier fiscal IR Année 1</span>
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-emerald-700 dark:text-emerald-300">
            +{formatAriary(taxShieldA1, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80 font-mono tabular-nums">
            Économie d’IR au taux {formatPercent(taxRate, 0)} (non décaissé)
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            CAF Année 1 (Flux réel après IR)
          </div>
          <div className="text-base font-bold font-mono tabular-nums text-teal-700 dark:text-teal-300">
            {formatAriary(cafWithDep, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono tabular-nums">
            Résultat net comptable : {formatAriary(netWithDep, { inMillions: true })}
          </div>
        </div>
      </div>

      {/* Chart + Fiscal Impact Comparison */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        {/* Left: 5-Year Depreciation & NBV Chart */}
        <div className="xl:col-span-7 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Trajectoire des Dotations, Économies IR &amp; VNC (5 ans)
              </h3>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Montants en Millions d’Ariary (M Ar)
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> Dotation annuelle
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-emerald-500" /> Bouclier IR
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-amber-500" /> VNC résiduelle
              </span>
            </div>
          </div>

          <div className="h-60 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: isDarkMode ? '#a1a1aa' : '#52525b' }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: isDarkMode ? '#a1a1aa' : '#52525b' }}
                  tickFormatter={(v) => `${v} M`}
                  width={48}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#09090b' : '#ffffff',
                    border: isDarkMode ? '1px solid #27272a' : '1px solid #e4e4e7',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: isDarkMode ? '#f4f4f5' : '#18181b',
                  }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      depreciationM: 'Dotation aux amortissements',
                      taxShieldM: 'Économie d’impôt IR',
                      nbvM: 'Valeur Nette Comptable (VNC)',
                    };
                    return [`${Number(value).toFixed(2)} M Ar`, labels[String(name)] || String(name)];
                  }}
                />
                <Bar
                  dataKey="depreciationM"
                  fill="#6366f1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="taxShieldM"
                  fill="#10b981"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Line
                  type="monotone"
                  dataKey="nbvM"
                  stroke="#f59e0b"
                  strokeWidth={2.5}
                  dot={{ r: 3.5, fill: '#f59e0b' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Fiscal Impact Table (Before vs After Depreciation) */}
        <div className="xl:col-span-5 rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Impact Fiscal Année 1 (Avant vs Après Amort.)</span>
            </span>
            {analysis.config.applyToModel && (
              <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                <span>Actif</span>
              </span>
            )}
          </div>

          <div className="flex-1 overflow-x-auto">
            <table className="w-full text-xs border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-zinc-100/70 dark:bg-zinc-950/70 text-zinc-600 dark:text-zinc-400 font-sans border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2 px-3 text-left font-semibold">Indicateur fiscal A1</th>
                  <th className="py-2 px-3 text-right font-semibold">Hors amort.</th>
                  <th className="py-2 px-3 text-right font-semibold">Avec amort.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
                <tr>
                  <td className="py-2 px-3 font-sans text-zinc-700 dark:text-zinc-300">
                    Excédent Brut (EBE)
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(baseEbitda, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(baseEbitda, { inMillions: inM })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-indigo-700 dark:text-indigo-300">
                    − Dotation amortissements
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-500">0 Ar</td>
                  <td className="py-2 px-3 text-right font-semibold text-indigo-700 dark:text-indigo-300">
                    −{formatAriary(analysis.year1DepreciationAr, { inMillions: inM })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-zinc-700 dark:text-zinc-300">
                    Résultat imposable (avant IR)
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(baseEbitda, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-zinc-900 dark:text-white">
                    {formatAriary(ebtAfterDep, { inMillions: inM })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans text-zinc-700 dark:text-zinc-300">
                    Impôt sur les revenus (IR {formatPercent(taxRate, 0)})
                  </td>
                  <td className="py-2 px-3 text-right text-rose-700 dark:text-rose-400">
                    {formatAriary(taxWithoutDep, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                    {formatAriary(taxWithDep, { inMillions: inM })}
                  </td>
                </tr>
                <tr className="bg-emerald-500/[0.06]">
                  <td className="py-2 px-3 font-sans font-semibold text-emerald-800 dark:text-emerald-300">
                    Économie d’IR (Bouclier fiscal)
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-500">—</td>
                  <td className="py-2 px-3 text-right font-bold text-emerald-700 dark:text-emerald-400">
                    +{formatAriary(taxShieldA1, { inMillions: inM })}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    Résultat net comptable
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(netWithoutDep, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-zinc-900 dark:text-white">
                    {formatAriary(netWithDep, { inMillions: inM })}
                  </td>
                </tr>
                <tr className="bg-teal-500/[0.05]">
                  <td className="py-2 px-3 font-sans font-semibold text-teal-800 dark:text-teal-300">
                    CAF (Résultat net + Dotations)
                  </td>
                  <td className="py-2 px-3 text-right text-zinc-800 dark:text-zinc-200">
                    {formatAriary(netWithoutDep, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-teal-700 dark:text-teal-300">
                    {formatAriary(cafWithDep, { inMillions: inM })}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Asset Register Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Registre des immobilisations (matériel agricole, unités de décorticage &amp; logistique)
          </span>
          <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            Dotation A2 : {formatAriary(analysis.year2DepreciationAr, { inMillions: true })} · A3 :{' '}
            {formatAriary(analysis.year3DepreciationAr, { inMillions: true })}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-950/80 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">Actif</th>
                <th className="py-2.5 px-3 font-semibold">Catégorie</th>
                <th className="py-2.5 px-3 text-right font-semibold">Valeur brute (Ar)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Val. résiduelle</th>
                <th className="py-2.5 px-3 text-right font-semibold">Durée</th>
                <th className="py-2.5 px-3 font-semibold">Méthode</th>
                <th className="py-2.5 px-3 text-center font-semibold">Mise en serv.</th>
                <th className="py-2.5 px-3 text-right font-semibold">Dotation A1</th>
                <th className="py-2.5 px-3 text-right font-semibold">VNC fin A3</th>
                <th className="py-2.5 px-3 text-center font-semibold">Actif</th>
                <th className="py-2.5 px-2" aria-label="Actions" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {analysis.assetDetails.map(({ item, year1DepreciationAr, netBookValueEndYear3Ar }) => {
                const coeff = item.method === 'degressif' ? getMadagascarDegressiveCoeff(item.usefulLifeYears) : 1;
                return (
                  <tr
                    key={item.id}
                    className={
                      item.active
                        ? 'hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]'
                        : 'opacity-55 bg-zinc-50/40 dark:bg-zinc-950/40'
                    }
                  >
                    <td className="py-2 px-3 min-w-[180px]">
                      <input
                        type="text"
                        aria-label={`Nom actif ${item.name}`}
                        value={item.name}
                        onChange={(e) => handleUpdateItem(item.id, { name: e.target.value })}
                        className="w-full px-2 py-1 rounded border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-[11px] text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                      {ASSET_CATEGORY_META[item.category].shortLabel}
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="500000"
                        aria-label={`Valeur brute ${item.name}`}
                        value={item.acquisitionValueAr}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            acquisitionValueAr: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-28 text-right font-mono tabular-nums px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="0"
                        step="100000"
                        aria-label={`Valeur résiduelle ${item.name}`}
                        value={item.residualValueAr}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            residualValueAr: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        className="w-24 text-right font-mono tabular-nums px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-700 dark:text-zinc-300"
                      />
                    </td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        min="1"
                        max="30"
                        aria-label={`Durée amortissement ${item.name}`}
                        value={item.usefulLifeYears}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            usefulLifeYears: Math.max(1, Math.min(30, Math.round(Number(e.target.value) || 5))),
                          })
                        }
                        className="w-16 text-right font-mono tabular-nums px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <select
                        aria-label={`Méthode amortissement ${item.name}`}
                        value={item.method}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            method: e.target.value as DepreciationMethod,
                          })
                        }
                        className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-[11px] font-medium text-zinc-800 dark:text-zinc-200"
                      >
                        <option value="lineaire">Linéaire</option>
                        <option value="degressif">Dégressif (×{coeff.toFixed(1)})</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <select
                        aria-label={`Année acquisition ${item.name}`}
                        value={item.acquisitionYear}
                        onChange={(e) =>
                          handleUpdateItem(item.id, {
                            acquisitionYear: Number(e.target.value) as 1 | 2 | 3,
                          })
                        }
                        className="px-2 py-1 rounded border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-[11px] font-mono text-zinc-800 dark:text-zinc-200"
                      >
                        <option value={1}>A1</option>
                        <option value={2}>A2</option>
                        <option value={3}>A3</option>
                      </select>
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums font-semibold text-indigo-700 dark:text-indigo-300 whitespace-nowrap">
                      {formatAriary(year1DepreciationAr, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-right font-mono tabular-nums text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatAriary(netBookValueEndYear3Ar, { inMillions: inM })}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Activer ${item.name}`}
                        checked={item.active}
                        onChange={(e) => handleUpdateItem(item.id, { active: e.target.checked })}
                        className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        aria-label={`Supprimer ${item.name}`}
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
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
      </div>

      {/* Add Fixed Asset Form */}
      <form
        onSubmit={handleAddAsset}
        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 items-end"
      >
        <div className="lg:col-span-2">
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Nouvel équipement / unité
          </label>
          <input
            type="text"
            placeholder="Ex : Trieur optique / Séchoir mobile"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs mt-1"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Catégorie
          </label>
          <select
            value={newCategory}
            onChange={(e) => {
              const cat = e.target.value as FixedAssetCategory;
              setNewCategory(cat);
              setNewLife(String(ASSET_CATEGORY_META[cat].defaultLifeYears));
            }}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs mt-1"
          >
            {Object.entries(ASSET_CATEGORY_META).map(([k, m]) => (
              <option key={k} value={k}>
                {m.shortLabel}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Valeur (Ar)
          </label>
          <input
            type="number"
            min="100000"
            step="500000"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
          />
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Durée (ans) &amp; Val. rés.
          </label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <input
              type="number"
              min="1"
              max="30"
              value={newLife}
              onChange={(e) => setNewLife(e.target.value)}
              aria-label="Durée d'amortissement en années"
              className="w-full min-h-9 px-2 py-1.5 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
            <input
              type="number"
              min="0"
              step="100000"
              value={newResidual}
              onChange={(e) => setNewResidual(e.target.value)}
              aria-label="Valeur résiduelle en Ariary"
              className="w-full min-h-9 px-2 py-1.5 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Méthode &amp; Année
          </label>
          <div className="grid grid-cols-2 gap-1.5 mt-1">
            <select
              value={newMethod}
              onChange={(e) => setNewMethod(e.target.value as DepreciationMethod)}
              aria-label="Méthode d'amortissement"
              className="w-full min-h-9 px-1.5 py-1.5 text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <option value="lineaire">Linéaire</option>
              <option value="degressif">Dégressif</option>
            </select>
            <select
              value={newYear}
              onChange={(e) => setNewYear(Number(e.target.value) as 1 | 2 | 3)}
              aria-label="Année de mise en service"
              className="w-full min-h-9 px-1.5 py-1.5 font-mono text-xs rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            >
              <option value={1}>A1</option>
              <option value={2}>A2</option>
              <option value={3}>A3</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ajouter actif</span>
        </button>
      </form>
    </section>
  );
};
