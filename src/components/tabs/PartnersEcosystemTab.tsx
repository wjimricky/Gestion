import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Cell,
} from 'recharts';
import {
  Handshake,
  Wheat,
  Truck,
  Plus,
  Trash2,
  RotateCcw,
  CheckCircle2,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { CooperativePartner, TransporterPartner } from '../../types/finance';
import {
  DEFAULT_PARTNERS_ECOSYSTEM,
  evaluatePartnersImpact,
  getResolvedPartnersEcosystem,
} from '../../utils/partners';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Tooltip } from '../ui/Tooltip';

export const PartnersEcosystemTab: React.FC = () => {
  const {
    assumptions,
    unitDisplay,
    theme,
    updatePartnersEcosystem,
    notify,
  } = useFinancial();

  const inM = unitDisplay === 'millions';
  const ecosystem = useMemo(() => getResolvedPartnersEcosystem(assumptions), [assumptions]);
  const impact = useMemo(
    () => evaluatePartnersImpact(assumptions, ecosystem),
    [assumptions, ecosystem]
  );

  // Add cooperative form state
  const [newCoopName, setNewCoopName] = useState('');
  const [newCoopRegion, setNewCoopRegion] = useState('Alaotra-Mangoro');
  const [newCoopShare, setNewCoopShare] = useState(20);
  const [newCoopPriceHS, setNewCoopPriceHS] = useState(760);
  const [newCoopPriceBS, setNewCoopPriceBS] = useState(1350);
  const [newCoopFee, setNewCoopFee] = useState(15);

  // Add transporter form state
  const [newTransName, setNewTransName] = useState('');
  const [newTransCorridor, setNewTransCorridor] = useState('RN2 / RN4');
  const [newTransCap, setNewTransCap] = useState(15);
  const [newTransShare, setNewTransShare] = useState(25);
  const [newTransCostHS, setNewTransCostHS] = useState(95000);
  const [newTransCostBS, setNewTransCostBS] = useState(740000);
  const [newTransReliability, setNewTransReliability] = useState(92);

  const [showAddCoop, setShowAddCoop] = useState(false);
  const [showAddTrans, setShowAddTrans] = useState(false);

  const isDark = theme === 'dark';
  const gridStroke = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(24,24,27,0.08)';
  const axisTickColor = isDark ? '#a1a1aa' : '#52525b';

  const handleUpdateCoop = (id: string, patch: Partial<CooperativePartner>) => {
    const next = ecosystem.cooperatives.map((c) => (c.id === id ? { ...c, ...patch } : c));
    updatePartnersEcosystem({ cooperatives: next });
  };

  const handleDeleteCoop = (id: string) => {
    if (ecosystem.cooperatives.length <= 1) {
      notify('error', 'Conservez au moins une coopérative dans l’écosystème.');
      return;
    }
    const next = ecosystem.cooperatives.filter((c) => c.id !== id);
    updatePartnersEcosystem({ cooperatives: next });
    notify('info', 'Coopérative retirée du portefeuille.');
  };

  const handleAddCoop = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCoopName.trim();
    if (!cleanName) {
      notify('error', 'Veuillez saisir le nom de la coopérative.');
      return;
    }
    const created: CooperativePartner = {
      id: `coop-${Date.now()}`,
      name: cleanName,
      region: newCoopRegion.trim() || 'Madagascar',
      sharePercent: Math.max(0, Number(newCoopShare) || 0),
      paddyPriceArPerKgHS: Math.max(0, Number(newCoopPriceHS) || 0),
      paddyPriceArPerKgBS: Math.max(0, Number(newCoopPriceBS) || 0),
      collectionFeeArPerKg: Math.max(0, Number(newCoopFee) || 0),
      active: true,
    };
    updatePartnersEcosystem({
      cooperatives: [...ecosystem.cooperatives, created],
    });
    setNewCoopName('');
    setShowAddCoop(false);
    notify('success', `Coopérative « ${cleanName} » ajoutée au modèle.`);
  };

  const handleUpdateTrans = (id: string, patch: Partial<TransporterPartner>) => {
    const next = ecosystem.transporters.map((t) => (t.id === id ? { ...t, ...patch } : t));
    updatePartnersEcosystem({ transporters: next });
  };

  const handleDeleteTrans = (id: string) => {
    if (ecosystem.transporters.length <= 1) {
      notify('error', 'Conservez au moins un transporteur dans l’écosystème.');
      return;
    }
    const next = ecosystem.transporters.filter((t) => t.id !== id);
    updatePartnersEcosystem({ transporters: next });
    notify('info', 'Transporteur retiré du portefeuille.');
  };

  const handleAddTrans = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newTransName.trim();
    if (!cleanName) {
      notify('error', 'Veuillez saisir le nom du transporteur.');
      return;
    }
    const created: TransporterPartner = {
      id: `trans-${Date.now()}`,
      name: cleanName,
      corridor: newTransCorridor.trim() || 'Corridor collecte',
      vehicleCapacityTons: Math.max(1, Number(newTransCap) || 10),
      sharePercent: Math.max(0, Number(newTransShare) || 0),
      costPerRotationHS: Math.max(0, Number(newTransCostHS) || 0),
      costPerRotationBS: Math.max(0, Number(newTransCostBS) || 0),
      reliabilityPercent: Math.max(10, Math.min(100, Number(newTransReliability) || 90)),
      active: true,
    };
    updatePartnersEcosystem({
      transporters: [...ecosystem.transporters, created],
    });
    setNewTransName('');
    setShowAddTrans(false);
    notify('success', `Transporteur « ${cleanName} » ajouté au modèle.`);
  };

  const handleResetEcosystem = () => {
    updatePartnersEcosystem(JSON.parse(JSON.stringify(DEFAULT_PARTNERS_ECOSYSTEM)));
    notify('info', 'Écosystème partenaires réinitialisé sur la base nominale Madagascar.');
  };

  const partnerCostChartData = useMemo(() => {
    const coopItems = impact.coopSummary.breakdown
      .filter((b) => b.partner.active && b.annualCostAr > 0)
      .map((b) => ({
        name: b.partner.name.length > 22 ? `${b.partner.name.slice(0, 20)}…` : b.partner.name,
        fullName: b.partner.name,
        type: 'Coopérative (Paddy + Collecte)',
        annualCostM: Number((b.annualCostAr / 1_000_000).toFixed(2)),
        annualCostAr: b.annualCostAr,
        sharePct: Number((b.normalizedShare * 100).toFixed(1)),
        fill: '#14b8a6',
      }));

    const transItems = impact.transSummary.breakdown
      .filter((b) => b.partner.active && b.annualCostAr > 0)
      .map((b) => ({
        name: b.partner.name.length > 22 ? `${b.partner.name.slice(0, 20)}…` : b.partner.name,
        fullName: b.partner.name,
        type: 'Transporteur (Rotations HS/BS)',
        annualCostM: Number((b.annualCostAr / 1_000_000).toFixed(2)),
        annualCostAr: b.annualCostAr,
        sharePct: Number((b.normalizedShare * 100).toFixed(1)),
        fill: '#6366f1',
      }));

    return [...coopItems, ...transItems];
  }, [impact]);

  const inputClass =
    'w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs font-mono tabular-nums text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70';

  const textInputClass =
    'w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#161526] text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/70';

  const netImpactPositive = impact.annualNetProfitDeltaAr >= 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/15 border border-teal-500/30 flex items-center justify-center shrink-0">
              <Handshake className="w-5 h-5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
                Écosystème Partenaires — Coopératives &amp; Transporteurs
              </h1>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
                Modélisez la pondération de vos bassins d’achat paddy et de vos prestataires logistiques sur les coûts variables de production.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
          <button
            type="button"
            onClick={handleResetEcosystem}
            className="min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Base nominale</span>
          </button>
        </div>
      </section>

      {/* Synchronization Controls Bar */}
      <section className="rounded-2xl border border-indigo-500/25 bg-indigo-500/[0.04] dark:bg-indigo-500/[0.06] p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-2.5">
          <SlidersHorizontal className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <div className="text-xs font-bold text-zinc-900 dark:text-white">
              Répercussion automatique sur les coûts variables du modèle
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Activez les liaisons pour injecter en temps réel les tarifs pondérés dans{' '}
              <span className="font-mono font-semibold">Coûts / kg paddy</span> et{' '}
              <span className="font-mono font-semibold">Coûts / rotation</span>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#141323] cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={ecosystem.syncPaddyCosts}
              onChange={(e) => updatePartnersEcosystem({ syncPaddyCosts: e.target.checked })}
              className="rounded border-zinc-400 text-teal-600 focus:ring-teal-500"
            />
            <span>Coopératives → Paddy &amp; Collecte</span>
          </label>

          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#141323] cursor-pointer text-xs font-semibold text-zinc-800 dark:text-zinc-100">
            <input
              type="checkbox"
              checked={ecosystem.syncTransportCosts}
              onChange={(e) => updatePartnersEcosystem({ syncTransportCosts: e.target.checked })}
              className="rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Transporteurs → Rotation</span>
          </label>
        </div>
      </section>

      {/* 4 Impact KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>Prix paddy pondéré (HS / BS)</span>
            <Wheat className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            <AnimatedNumber value={impact.coopSummary.weightedPaddyHS} format={(v) => `${Math.round(v)}`} /> /{' '}
            <AnimatedNumber value={impact.coopSummary.weightedPaddyBS} format={(v) => `${Math.round(v)}`} /> Ar/kg
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            {impact.coopSummary.activeCount} coopérative(s) · frais collecte{' '}
            {impact.coopSummary.weightedCollectionFee} Ar/kg
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>Tarif transport pondéré / rot.</span>
            <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(impact.transSummary.weightedRotationCostHS, { inMillions: false })} /{' '}
            {formatAriary(impact.transSummary.weightedRotationCostBS, { inMillions: false })}
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            {impact.transSummary.activeCount} transporteur(s) · fiabilité {impact.transSummary.avgReliability} %
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1">
              <span>Coûts variables A1 (Simulé)</span>
              <Tooltip
                label="Coûts variables partenaires"
                content="Total annuel des coûts d’achat paddy, commissions coopératives, transport et exploitation si les 2 liaisons partenaires sont actives."
              />
            </span>
            <CheckCircle2 className="w-4 h-4 text-sky-600 dark:text-sky-400" aria-hidden="true" />
          </div>
          <div className="text-base sm:text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(impact.simulatedModel.year1.totalPurchaseAndOperatingCostsAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            Marge brute simulée : {formatPercent(impact.simulatedModel.year1.grossMarginRate, 1)}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
            <span>Écart net vs modèle actif</span>
            {netImpactPositive ? (
              <ArrowUpRight className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
            )}
          </div>
          <div
            className={`text-base sm:text-lg font-bold font-mono tabular-nums ${
              Math.abs(impact.annualNetProfitDeltaAr) < 1
                ? 'text-zinc-900 dark:text-white'
                : netImpactPositive
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {impact.annualNetProfitDeltaAr > 0 ? '+' : ''}
            {formatAriary(impact.annualNetProfitDeltaAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            {Math.abs(impact.annualNetProfitDeltaAr) < 1
              ? 'Synchronisé avec le modèle actif'
              : `Impact VAN : ${impact.npvDeltaAr > 0 ? '+' : ''}${formatAriary(impact.npvDeltaAr, { inMillions: true })}`}
          </div>
        </div>
      </section>

      {/* Section 1: Coopératives Agricoles Locales */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Wheat className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Coopératives Agricoles Locales (Approvisionnement Paddy)</span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Somme brute des parts actives :{' '}
              <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-200">
                {impact.coopSummary.totalShareRaw} %
              </span>{' '}
              (normalisée automatiquement à 100 % sur les partenaires actifs).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddCoop((v) => !v)}
            className="min-h-9 px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ajouter une coopérative</span>
          </button>
        </div>

        {showAddCoop && (
          <form
            onSubmit={handleAddCoop}
            className="p-4 border-b border-zinc-200 dark:border-white/[0.08] bg-teal-500/[0.04] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nom de la coopérative
              </label>
              <input
                type="text"
                value={newCoopName}
                onChange={(e) => setNewCoopName(e.target.value)}
                placeholder="Ex. Coopérative Betsiboka"
                className={textInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Bassin / Région
              </label>
              <input
                type="text"
                value={newCoopRegion}
                onChange={(e) => setNewCoopRegion(e.target.value)}
                className={textInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Part (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={newCoopShare}
                onChange={(e) => setNewCoopShare(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Prix HS / BS (Ar/kg)
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  min={0}
                  value={newCoopPriceHS}
                  onChange={(e) => setNewCoopPriceHS(Number(e.target.value))}
                  aria-label="Prix HS"
                  className={inputClass}
                />
                <input
                  type="number"
                  min={0}
                  value={newCoopPriceBS}
                  onChange={(e) => setNewCoopPriceBS(Number(e.target.value))}
                  aria-label="Prix BS"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Collecte (Ar/kg)
              </label>
              <input
                type="number"
                min={0}
                value={newCoopFee}
                onChange={(e) => setNewCoopFee(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold transition-colors"
              >
                Créer
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-2.5 px-4 font-semibold">Actif</th>
                <th className="py-2.5 px-3 font-semibold">Coopérative &amp; Bassin</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Prix HS (Ar/kg)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Prix BS (Ar/kg)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Frais collecte (Ar/kg)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Volume &amp; Coût A1</th>
                <th className="py-2.5 px-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {impact.coopSummary.breakdown.map(({ partner, normalizedShare, annualPaddyKg, annualCostAr }) => (
                <tr
                  key={partner.id}
                  className={partner.active ? '' : 'opacity-55 bg-zinc-50/50 dark:bg-white/[0.01]'}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={partner.active}
                      onChange={(e) => handleUpdateCoop(partner.id, { active: e.target.checked })}
                      aria-label={`Activer ${partner.name}`}
                      className="rounded border-zinc-400 text-teal-600 focus:ring-teal-500"
                    />
                  </td>
                  <td className="py-3 px-3 min-w-[210px]">
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handleUpdateCoop(partner.id, { name: e.target.value })}
                      aria-label="Nom de la coopérative"
                      className={`${textInputClass} font-semibold`}
                    />
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <MapPin className="w-3 h-3 shrink-0" aria-hidden="true" />
                      <span>{partner.region}</span>
                      {partner.active && (
                        <span className="ml-1 font-mono text-teal-700 dark:text-teal-400">
                          · Poids {(normalizedShare * 100).toFixed(0)} %
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 w-24">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={partner.sharePercent}
                      onChange={(e) =>
                        handleUpdateCoop(partner.id, {
                          sharePercent: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Part d'approvisionnement ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-28">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={partner.paddyPriceArPerKgHS}
                      onChange={(e) =>
                        handleUpdateCoop(partner.id, {
                          paddyPriceArPerKgHS: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Prix HS ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-28">
                    <input
                      type="number"
                      min={0}
                      step={10}
                      value={partner.paddyPriceArPerKgBS}
                      onChange={(e) =>
                        handleUpdateCoop(partner.id, {
                          paddyPriceArPerKgBS: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Prix BS ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-28">
                    <input
                      type="number"
                      min={0}
                      step={5}
                      value={partner.collectionFeeArPerKg}
                      onChange={(e) =>
                        handleUpdateCoop(partner.id, {
                          collectionFeeArPerKg: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Frais collecte ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatAriary(annualCostAr, { inMillions: inM })}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {formatKg(annualPaddyKg)} paddy/an
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteCoop(partner.id)}
                      aria-label={`Supprimer ${partner.name}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Transporteurs & Collecteurs */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Transporteurs &amp; Prestataires Logistiques (Coûts par Rotation)</span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Répartissez vos rotations entre flottes routières et transporteurs tout-terrain ; les tarifs pondérés pilotent le poste Carburant &amp; Collecte.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddTrans((v) => !v)}
            className="min-h-9 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Ajouter un transporteur</span>
          </button>
        </div>

        {showAddTrans && (
          <form
            onSubmit={handleAddTrans}
            className="p-4 border-b border-zinc-200 dark:border-white/[0.08] bg-indigo-500/[0.04] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end"
          >
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nom du transporteur
              </label>
              <input
                type="text"
                value={newTransName}
                onChange={(e) => setNewTransName(e.target.value)}
                placeholder="Ex. Flotte Logistique RN7"
                className={textInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Corridor / Tonnage
              </label>
              <input
                type="text"
                value={newTransCorridor}
                onChange={(e) => setNewTransCorridor(e.target.value)}
                className={textInputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Part rot. (%) / T
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newTransShare}
                  onChange={(e) => setNewTransShare(Number(e.target.value))}
                  aria-label="Part rotations"
                  className={inputClass}
                />
                <input
                  type="number"
                  min={1}
                  value={newTransCap}
                  onChange={(e) => setNewTransCap(Number(e.target.value))}
                  aria-label="Capacité tonnes"
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tarif HS (Ar/rot)
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={newTransCostHS}
                onChange={(e) => setNewTransCostHS(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Tarif BS (Ar/rot)
              </label>
              <input
                type="number"
                min={0}
                step={10000}
                value={newTransCostBS}
                onChange={(e) => setNewTransCostBS(Number(e.target.value))}
                className={inputClass}
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
              >
                Créer
              </button>
            </div>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-2.5 px-4 font-semibold">Actif</th>
                <th className="py-2.5 px-3 font-semibold">Transporteur &amp; Corridor</th>
                <th className="py-2.5 px-3 font-semibold text-right">Part (%)</th>
                <th className="py-2.5 px-3 font-semibold text-right">Tarif HS / rot.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Tarif BS / rot.</th>
                <th className="py-2.5 px-3 font-semibold text-right">Fiabilité</th>
                <th className="py-2.5 px-3 font-semibold text-right">Facturation A1</th>
                <th className="py-2.5 px-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {impact.transSummary.breakdown.map(({ partner, normalizedShare, annualRotations, annualCostAr }) => (
                <tr
                  key={partner.id}
                  className={partner.active ? '' : 'opacity-55 bg-zinc-50/50 dark:bg-white/[0.01]'}
                >
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={partner.active}
                      onChange={(e) => handleUpdateTrans(partner.id, { active: e.target.checked })}
                      aria-label={`Activer ${partner.name}`}
                      className="rounded border-zinc-400 text-indigo-600 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="py-3 px-3 min-w-[210px]">
                    <input
                      type="text"
                      value={partner.name}
                      onChange={(e) => handleUpdateTrans(partner.id, { name: e.target.value })}
                      aria-label="Nom du transporteur"
                      className={`${textInputClass} font-semibold`}
                    />
                    <div className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                      <span>{partner.corridor}</span>
                      <span>· {partner.vehicleCapacityTons}T</span>
                      {partner.active && (
                        <span className="font-mono text-indigo-700 dark:text-indigo-400">
                          · Poids {(normalizedShare * 100).toFixed(0)} %
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 w-24">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={partner.sharePercent}
                      onChange={(e) =>
                        handleUpdateTrans(partner.id, {
                          sharePercent: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Part rotations ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-32">
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={partner.costPerRotationHS}
                      onChange={(e) =>
                        handleUpdateTrans(partner.id, {
                          costPerRotationHS: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Tarif HS ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-32">
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      value={partner.costPerRotationBS}
                      onChange={(e) =>
                        handleUpdateTrans(partner.id, {
                          costPerRotationBS: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      aria-label={`Tarif BS ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 w-24">
                    <input
                      type="number"
                      min={10}
                      max={100}
                      value={partner.reliabilityPercent}
                      onChange={(e) =>
                        handleUpdateTrans(partner.id, {
                          reliabilityPercent: Math.max(10, Math.min(100, Number(e.target.value) || 90)),
                        })
                      }
                      aria-label={`Fiabilité ${partner.name}`}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums whitespace-nowrap">
                    <div className="font-bold text-zinc-900 dark:text-zinc-100">
                      {formatAriary(annualCostAr, { inMillions: inM })}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {annualRotations.toFixed(1)} rot./an
                    </div>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleDeleteTrans(partner.id)}
                      aria-label={`Supprimer ${partner.name}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recharts Cost Contribution Chart */}
      <section className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Répartition Annuelle des Coûts par Partenaire (Millions d’Ariary)</span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Poids financier annuel de chaque coopérative (achat paddy + collecte) et de chaque transporteur sur le cycle Année 1.
            </p>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-teal-500" aria-hidden="true" />
              Coopératives
            </span>
            <span className="inline-flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300">
              <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" aria-hidden="true" />
              Transporteurs
            </span>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={partnerCostChartData}
              margin={{ top: 10, right: 16, left: 4, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: axisTickColor, fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: gridStroke }}
              />
              <YAxis
                tick={{ fill: axisTickColor, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v} M`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: isDark ? '#141323' : '#ffffff',
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
                formatter={(value, _name, item) => {
                  const num = Number(value ?? 0);
                  const payload = item?.payload as { fullName?: string; sharePct?: number; type?: string } | undefined;
                  return [
                    `${num.toFixed(2)} M Ar (${payload?.sharePct ?? 0} % de son segment)`,
                    payload?.fullName || payload?.type || 'Coût annuel',
                  ];
                }}
              />
              <Bar dataKey="annualCostM" name="Coût annuel engagé (M Ar)" radius={[6, 6, 0, 0]} maxBarSize={56}>
                {partnerCostChartData.map((entry, idx) => (
                  <Cell key={`cell-${idx}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
};
