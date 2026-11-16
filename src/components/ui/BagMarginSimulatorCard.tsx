import React, { useEffect, useMemo, useState } from 'react';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CheckCircle2, Package, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

type CostStructurePreset = 'active' | 'economique' | 'standard' | 'premium';

export const BagMarginSimulatorCard: React.FC = () => {
  const {
    assumptions,
    model,
    updateVariableCostPerKg,
    addVariableCostPerKg,
    updateBagOption,
    updateGeneralField,
    notify,
  } = useFinancial();

  const [season, setSeason] = useState<'hauteSaison' | 'basseSaison'>('hauteSaison');
  const [bagCapacityKg, setBagCapacityKg] = useState<number>(assumptions.selectedBagCapacityKg || 60);

  // Extract baseline processing costs from model
  const baselineDecorticage = useMemo(() => {
    const item = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-decorticage');
    if (!item) return 100;
    return season === 'hauteSaison' ? item.costHS : item.costBS;
  }, [assumptions.costsPerKgPaddy, season]);

  const baselineBlanchiment = useMemo(() => {
    const item = assumptions.costsPerKgPaddy.find(
      (c) => c.id === 'cost-blanchiment' || c.label.toLowerCase().includes('blanchi')
    );
    if (!item) return 0;
    return season === 'hauteSaison' ? item.costHS : item.costBS;
  }, [assumptions.costsPerKgPaddy, season]);

  const baselineBagUnitPrice = useMemo(() => {
    const found =
      assumptions.bagOptions.find((b) => b.capacityKg === bagCapacityKg) ||
      assumptions.bagOptions[0];
    return found ? found.unitPriceAr : 1700;
  }, [assumptions.bagOptions, bagCapacityKg]);

  const [decorticageArKg, setDecorticageArKg] = useState<number>(baselineDecorticage);
  const [blanchimentArKg, setBlanchimentArKg] = useState<number>(baselineBlanchiment);
  const [ensachageArSac, setEnsachageArSac] = useState<number>(baselineBagUnitPrice);
  const [activePreset, setActivePreset] = useState<CostStructurePreset>('active');

  // Keep synced when user switches season, bag size, or active project changes
  useEffect(() => {
    setBagCapacityKg(assumptions.selectedBagCapacityKg || 60);
  }, [assumptions.selectedBagCapacityKg]);

  useEffect(() => {
    setDecorticageArKg(baselineDecorticage);
    setBlanchimentArKg(baselineBlanchiment);
    setEnsachageArSac(baselineBagUnitPrice);
    setActivePreset('active');
  }, [baselineDecorticage, baselineBlanchiment, baselineBagUnitPrice]);

  const seasonAssump = assumptions[season];
  const seasonResult = season === 'hauteSaison' ? model.hauteSaison : model.basseSaison;

  // Paddy unit cost & docker cost from active assumptions
  const paddyUnitPriceArKg = useMemo(() => {
    const item = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
    if (!item) return season === 'hauteSaison' ? 800 : 1400;
    return season === 'hauteSaison' ? item.costHS : item.costBS;
  }, [assumptions.costsPerKgPaddy, season]);

  const otherPerKgCostsAr = useMemo(() => {
    return assumptions.costsPerKgPaddy
      .filter(
        (c) =>
          c.id !== 'cost-paddy' &&
          c.id !== 'cost-decorticage' &&
          c.id !== 'cost-blanchiment' &&
          !c.label.toLowerCase().includes('blanchi')
      )
      .reduce((sum, c) => sum + (season === 'hauteSaison' ? c.costHS : c.costBS), 0);
  }, [assumptions.costsPerKgPaddy, season]);

  // Prorated rotation costs (carburant, admin) per kg of rice produced
  const rotationCostsPerRiceKg = useMemo(() => {
    const fixedRotCosts = assumptions.costsPerRotation.reduce(
      (sum, c) => sum + (season === 'hauteSaison' ? c.costHS : c.costBS),
      0
    );
    return seasonResult.riceKgPerRotation > 0 ? fixedRotCosts / seasonResult.riceKgPerRotation : 0;
  }, [assumptions.costsPerRotation, season, seasonResult.riceKgPerRotation]);

  const yieldRatio = Math.max(0.1, Math.min(1, seasonAssump.yieldPaddyToRice));
  const paddyKgPerBag = bagCapacityKg / yieldRatio;
  const byproductsKgPerBag = Math.max(0, paddyKgPerBag - bagCapacityKg);

  const revenuePerBagAr =
    bagCapacityKg * seasonAssump.riceSellingPriceArPerKg +
    byproductsKgPerBag * seasonAssump.byproductSellingPriceArPerKg;

  const computeBagMetrics = (decort: number, blanch: number, ensach: number) => {
    const paddyCostAr = paddyKgPerBag * paddyUnitPriceArKg;
    const decorticageCostAr = paddyKgPerBag * decort;
    const blanchimentCostAr = paddyKgPerBag * blanch;
    const otherVariableAr =
      paddyKgPerBag * otherPerKgCostsAr + bagCapacityKg * rotationCostsPerRiceKg;
    const ensachageCostAr = ensach;

    const processingTotalAr = decorticageCostAr + blanchimentCostAr + ensachageCostAr;
    const totalCostPerBagAr = paddyCostAr + processingTotalAr + otherVariableAr;
    const grossMarginAr = revenuePerBagAr - totalCostPerBagAr;
    const grossMarginRate = revenuePerBagAr > 0 ? grossMarginAr / revenuePerBagAr : 0;

    return {
      paddyCostAr,
      decorticageCostAr,
      blanchimentCostAr,
      ensachageCostAr,
      otherVariableAr,
      processingTotalAr,
      totalCostPerBagAr,
      grossMarginAr,
      grossMarginRate,
    };
  };

  const sim = computeBagMetrics(decorticageArKg, blanchimentArKg, ensachageArSac);
  const base = computeBagMetrics(baselineDecorticage, baselineBlanchiment, baselineBagUnitPrice);
  const deltaMarginAr = sim.grossMarginAr - base.grossMarginAr;

  const annualEquivalentBags =
    bagCapacityKg > 0 ? model.year1.totalRiceKgSold / bagCapacityKg : 0;
  const seasonEquivalentBags =
    bagCapacityKg > 0 ? seasonResult.totalRiceKg / bagCapacityKg : 0;
  const annualDeltaImpactAr = deltaMarginAr * annualEquivalentBags;

  // Evolution curve across 6 transformation cost structures
  const evolutionSeries = useMemo(() => {
    const tiers = [
      { label: '−40 % transfo', mult: 0.6 },
      { label: '−20 % transfo', mult: 0.8 },
      { label: 'Simulé actuel', mult: 1.0 },
      { label: '+20 % transfo', mult: 1.2 },
      { label: '+40 % transfo', mult: 1.4 },
      { label: '+60 % transfo', mult: 1.6 },
    ];
    return tiers.map((tier) => {
      const m = computeBagMetrics(
        decorticageArKg * tier.mult,
        blanchimentArKg * tier.mult,
        ensachageArSac * tier.mult
      );
      return {
        tier: tier.label,
        margeBruteSac: Math.round(m.grossMarginAr),
        coutTransfoSac: Math.round(m.processingTotalAr),
        tauxMargePct: Number((m.grossMarginRate * 100).toFixed(1)),
      };
    });
  }, [
    decorticageArKg,
    blanchimentArKg,
    ensachageArSac,
    paddyKgPerBag,
    paddyUnitPriceArKg,
    otherPerKgCostsAr,
    rotationCostsPerRiceKg,
    revenuePerBagAr,
    bagCapacityKg,
  ]);

  const applyPreset = (preset: CostStructurePreset) => {
    setActivePreset(preset);
    if (preset === 'active') {
      setDecorticageArKg(baselineDecorticage);
      setBlanchimentArKg(baselineBlanchiment);
      setEnsachageArSac(baselineBagUnitPrice);
    } else if (preset === 'economique') {
      setDecorticageArKg(75);
      setBlanchimentArKg(0);
      setEnsachageArSac(Math.max(1000, Math.round(baselineBagUnitPrice * 0.85)));
    } else if (preset === 'standard') {
      setDecorticageArKg(100);
      setBlanchimentArKg(20);
      setEnsachageArSac(baselineBagUnitPrice);
    } else if (preset === 'premium') {
      setDecorticageArKg(120);
      setBlanchimentArKg(55);
      setEnsachageArSac(Math.round(baselineBagUnitPrice * 1.25));
    }
  };

  const handleApplyToModel = () => {
    const costField = season === 'hauteSaison' ? 'costHS' : 'costBS';
    const decortItem = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-decorticage');
    if (decortItem) {
      updateVariableCostPerKg(decortItem.id, costField, decorticageArKg);
    }

    const blanchItem = assumptions.costsPerKgPaddy.find(
      (c) => c.id === 'cost-blanchiment' || c.label.toLowerCase().includes('blanchi')
    );
    if (blanchItem) {
      updateVariableCostPerKg(blanchItem.id, costField, blanchimentArKg);
    } else if (blanchimentArKg > 0) {
      addVariableCostPerKg(
        'Blanchiment & polissage',
        season === 'hauteSaison' ? blanchimentArKg : 0,
        season === 'basseSaison' ? blanchimentArKg : 0
      );
    }

    const bagOption = assumptions.bagOptions.find((b) => b.capacityKg === bagCapacityKg);
    if (bagOption && bagOption.unitPriceAr !== ensachageArSac) {
      updateBagOption(bagOption.id, 'unitPriceAr', ensachageArSac);
    }
    if (assumptions.selectedBagCapacityKg !== bagCapacityKg) {
      updateGeneralField('selectedBagCapacityKg', bagCapacityKg);
    }

    notify(
      'success',
      `Structure de transformation appliquée au modèle (${bagCapacityKg} kg · ${season === 'hauteSaison' ? 'HS' : 'BS'}).`
    );
  };

  // Cost stack segments (% of selling price per bag)
  const stackDenom = Math.max(revenuePerBagAr, sim.totalCostPerBagAr, 1);
  const stackSegments = [
    { label: 'Paddy', amount: sim.paddyCostAr, color: 'bg-indigo-500' },
    { label: 'Décorticage', amount: sim.decorticageCostAr, color: 'bg-amber-400' },
    { label: 'Blanchiment', amount: sim.blanchimentCostAr, color: 'bg-sky-400' },
    { label: 'Ensachage', amount: sim.ensachageCostAr, color: 'bg-violet-400' },
    {
      label: 'Marge brute',
      amount: Math.max(0, sim.grossMarginAr),
      color: 'bg-teal-400',
    },
  ];

  return (
    <section
      aria-label="Simulateur interactif de marge brute par sac de riz"
      style={{ animationDelay: '350ms' }}
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 space-y-5 transition-colors duration-200"
    >
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-200 dark:border-white/[0.08]">
        <div className="flex items-start gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-500/12 dark:bg-indigo-500/15 flex items-center justify-center shrink-0 mt-0.5">
            <Package className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </span>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-white">
                Simulateur de Marge Brute par Sac de Riz
              </h2>
              <Tooltip
                align="left"
                label="Marge brute par sac"
                content="Simule l'évolution de la marge brute d'un sac de riz usiné selon la structure des coûts de transformation (décorticage, blanchiment, ensachage) sans altérer le modèle tant que vous ne cliquez pas sur Appliquer."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
              1 sac de {bagCapacityKg} kg riz = {paddyKgPerBag.toFixed(1)} kg paddy (rendement{' '}
              {formatPercent(yieldRatio, 0)}) · Prix vente sac : {formatAriary(revenuePerBagAr)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 no-print">
          {/* Season Switch */}
          <div className="inline-flex rounded-xl p-0.5 bg-zinc-100 dark:bg-[#171628] border border-zinc-200 dark:border-white/[0.08]">
            {(['hauteSaison', 'basseSaison'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSeason(s)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  season === s
                    ? 'bg-white dark:bg-[#252342] text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {s === 'hauteSaison' ? 'Haute Saison' : 'Basse Saison'}
              </button>
            ))}
          </div>

          {/* Bag Capacity Switch */}
          <div className="inline-flex rounded-xl p-0.5 bg-zinc-100 dark:bg-[#171628] border border-zinc-200 dark:border-white/[0.08]">
            {assumptions.bagOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setBagCapacityKg(opt.capacityKg)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  bagCapacityKg === opt.capacityKg
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {opt.capacityKg} kg
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main 2-Column Body */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left: Sliders & Transformation Structure Presets (5 cols) */}
        <div className="xl:col-span-5 space-y-4">
          {/* Preset Cost Structure Buttons */}
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: 'active', label: 'Modèle actif' },
                { id: 'economique', label: 'Économique' },
                { id: 'standard', label: 'Standard (+Blanch.)' },
                { id: 'premium', label: 'Riz Blanc Export' },
              ] as const
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors ${
                  activePreset === p.id
                    ? 'border-indigo-500/50 bg-indigo-500/12 text-indigo-800 dark:text-indigo-300'
                    : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#171628] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-[#1F1D35]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* 3 Interactive Sliders */}
          <div className="space-y-3">
            {/* 1. Décorticage */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627] space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="sim-decorticage" className="font-semibold text-zinc-800 dark:text-zinc-200">
                  1. Décorticage (Ar / kg paddy)
                </label>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <input
                    id="sim-decorticage"
                    type="number"
                    min="0"
                    step="5"
                    value={decorticageArKg}
                    onChange={(e) => {
                      setActivePreset('active');
                      setDecorticageArKg(Math.max(0, Number(e.target.value) || 0));
                    }}
                    className="w-16 text-right px-1.5 py-0.5 rounded border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#100F1C] text-xs font-bold text-zinc-900 dark:text-white"
                  />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    ({formatAriary(sim.decorticageCostAr)}/sac)
                  </span>
                </div>
              </div>
              <input
                aria-label="Curseur coût de décorticage"
                type="range"
                min={0}
                max={250}
                step={5}
                value={decorticageArKg}
                onChange={(e) => setDecorticageArKg(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* 2. Blanchiment & Polissage */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627] space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="sim-blanchiment" className="font-semibold text-zinc-800 dark:text-zinc-200">
                  2. Blanchiment &amp; tri (Ar / kg paddy)
                </label>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <input
                    id="sim-blanchiment"
                    type="number"
                    min="0"
                    step="5"
                    value={blanchimentArKg}
                    onChange={(e) => setBlanchimentArKg(Math.max(0, Number(e.target.value) || 0))}
                    className="w-16 text-right px-1.5 py-0.5 rounded border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#100F1C] text-xs font-bold text-zinc-900 dark:text-white"
                  />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    ({formatAriary(sim.blanchimentCostAr)}/sac)
                  </span>
                </div>
              </div>
              <input
                aria-label="Curseur coût de blanchiment"
                type="range"
                min={0}
                max={150}
                step={5}
                value={blanchimentArKg}
                onChange={(e) => setBlanchimentArKg(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            {/* 3. Ensachage */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627] space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <label htmlFor="sim-ensachage" className="font-semibold text-zinc-800 dark:text-zinc-200">
                  3. Ensachage &amp; sac (Ar / sac)
                </label>
                <div className="flex items-center gap-1.5 font-mono tabular-nums">
                  <input
                    id="sim-ensachage"
                    type="number"
                    min="0"
                    step="100"
                    value={ensachageArSac}
                    onChange={(e) => setEnsachageArSac(Math.max(0, Number(e.target.value) || 0))}
                    className="w-20 text-right px-1.5 py-0.5 rounded border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#100F1C] text-xs font-bold text-zinc-900 dark:text-white"
                  />
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Ar/sac</span>
                </div>
              </div>
              <input
                aria-label="Curseur coût d'ensachage"
                type="range"
                min={500}
                max={4000}
                step={100}
                value={ensachageArSac}
                onChange={(e) => setEnsachageArSac(Number(e.target.value))}
                className="w-full accent-violet-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
            <button
              type="button"
              onClick={handleApplyToModel}
              className="flex-1 min-h-10 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Appliquer aux hypothèses</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('active')}
              className="min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Réinitialiser</span>
            </button>
          </div>
        </div>

        {/* Right: KPI Strip + Cost Stack + Recharts Curve (7 cols) */}
        <div className="xl:col-span-7 space-y-4">
          {/* 3 Result KPIs per bag */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627]">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Marge brute / sac ({bagCapacityKg} kg)
              </div>
              <div
                className={`mt-1 text-lg font-bold font-mono tabular-nums ${
                  sim.grossMarginAr >= 0
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatAriary(sim.grossMarginAr)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
                Taux : <strong className="text-zinc-900 dark:text-zinc-100">{formatPercent(sim.grossMarginRate, 1)}</strong>
                {Math.abs(deltaMarginAr) >= 1 && (
                  <span
                    className={`ml-1.5 font-semibold ${
                      deltaMarginAr >= 0 ? 'text-teal-700 dark:text-teal-400' : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    ({deltaMarginAr >= 0 ? '+' : ''}
                    {formatAriary(deltaMarginAr)})
                  </span>
                )}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627]">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Coût transformation / sac
              </div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatAriary(sim.processingTotalAr)}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
                {revenuePerBagAr > 0
                  ? `${((sim.processingTotalAr / revenuePerBagAr) * 100).toFixed(1)} % du prix sac`
                  : '—'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#171627]">
              <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Projection saison ({Math.round(seasonEquivalentBags).toLocaleString('fr-FR')} sacs)
              </div>
              <div className="mt-1 text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
                {formatAriary(sim.grossMarginAr * seasonEquivalentBags, { inMillions: true })}
              </div>
              <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
                Écart annuel :{' '}
                <span
                  className={
                    annualDeltaImpactAr >= 0
                      ? 'text-teal-700 dark:text-teal-400 font-semibold'
                      : 'text-rose-700 dark:text-rose-400 font-semibold'
                  }
                >
                  {annualDeltaImpactAr >= 0 ? '+' : ''}
                  {formatAriary(annualDeltaImpactAr, { inMillions: true })}
                </span>
              </div>
            </div>
          </div>

          {/* Segmented Cost Structure Bar per Bag */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-zinc-600 dark:text-zinc-400">
              <span>Décomposition du prix de vente par sac ({formatAriary(revenuePerBagAr)})</span>
              <span className="font-mono tabular-nums">
                Coût complet var. : {formatAriary(sim.totalCostPerBagAr)}
              </span>
            </div>
            <div className="flex h-5 w-full gap-0.5 rounded-lg overflow-hidden">
              {stackSegments.map((seg) => {
                const pct = (seg.amount / stackDenom) * 100;
                if (pct <= 0.2) return null;
                return (
                  <div
                    key={seg.label}
                    style={{ width: `${pct}%` }}
                    title={`${seg.label} : ${formatAriary(seg.amount)} (${pct.toFixed(1)} %)`}
                    className={`h-full ${seg.color} transition-all duration-200`}
                  />
                );
              })}
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-600 dark:text-zinc-400">
              {stackSegments.map((seg) => (
                <span key={seg.label} className="inline-flex items-center gap-1 font-mono tabular-nums">
                  <span className={`w-2 h-2 rounded-xs ${seg.color}`} aria-hidden="true" />
                  <span className="font-sans">{seg.label}</span>: {formatAriary(seg.amount)}
                </span>
              ))}
            </div>
          </div>

          {/* Recharts Evolution Chart across Processing Cost Intensities */}
          <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0B0A16] p-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                <span>Sensibilité de la marge brute / sac selon le coût de transformation</span>
              </span>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                Barres : Ar/sac · Courbe : % marge
              </span>
            </div>
            <div className="w-full h-[210px] min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={evolutionSeries} margin={{ top: 8, right: 12, left: 0, bottom: 2 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" vertical={false} />
                  <XAxis
                    dataKey="tier"
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="ar"
                    tick={{ fill: '#94A3B8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={52}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                  />
                  <YAxis
                    yAxisId="pct"
                    orientation="right"
                    tick={{ fill: '#38BDF8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={38}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <ReferenceLine yAxisId="ar" y={0} stroke="rgba(244,63,94,0.5)" strokeDasharray="3 3" />
                  <RechartsTooltip
                    formatter={(val, name) => {
                      const num = Number(val ?? 0);
                      if (name === 'tauxMargePct') return [`${num.toFixed(1)} %`, 'Taux de marge'];
                      if (name === 'coutTransfoSac') return [formatAriary(num), 'Coût transfo / sac'];
                      return [formatAriary(num), 'Marge brute / sac'];
                    }}
                    contentStyle={{
                      backgroundColor: 'rgba(15, 14, 28, 0.94)',
                      borderColor: 'rgba(255,255,255,0.12)',
                      borderRadius: '10px',
                      fontSize: '12px',
                      color: '#F4F4F5',
                    }}
                  />
                  <Bar
                    yAxisId="ar"
                    dataKey="margeBruteSac"
                    name="margeBruteSac"
                    fill="#2DD4BF"
                    radius={[4, 4, 0, 0]}
                    barSize={26}
                  />
                  <Bar
                    yAxisId="ar"
                    dataKey="coutTransfoSac"
                    name="coutTransfoSac"
                    fill="#818CF8"
                    fillOpacity={0.7}
                    radius={[4, 4, 0, 0]}
                    barSize={18}
                  />
                  <Line
                    yAxisId="pct"
                    type="monotone"
                    dataKey="tauxMargePct"
                    name="tauxMargePct"
                    stroke="#38BDF8"
                    strokeWidth={2.2}
                    dot={{ r: 3.5, fill: '#38BDF8', stroke: '#0B0A16', strokeWidth: 1.5 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
