import React, { useMemo, useState } from 'react';
import { CloudLightning, Plus, Trash2, CheckCircle2, SlidersHorizontal } from 'lucide-react';
import {
  ClimateCoefficientCategory,
  ClimateLossCoefficient,
} from '../../types/finance';
import {
  aggregateCustomClimateCoefficients,
  CLIMATE_CATEGORY_META,
  CLIMATE_COEFFICIENT_PRESETS,
  DEFAULT_CLIMATE_COEFFICIENTS,
  getResolvedClimateImpact,
} from '../../utils/climate';
import { useFinancial } from '../../context/FinancialContext';

export const ClimateLossCoefficientsPanel: React.FC = () => {
  const { assumptions, updateClimateImpact, notify } = useFinancial();
  const climate = getResolvedClimateImpact(assumptions);

  const coefficients = climate.customCoefficients ?? DEFAULT_CLIMATE_COEFFICIENTS;
  const useCustom = Boolean(climate.useCustomCoefficients);
  const aggregationMode = climate.coefficientAggregationMode ?? 'expected_probability';

  const [newLabel, setNewLabel] = useState('');
  const [newCategory, setNewCategory] = useState<ClimateCoefficientCategory>('cyclone');
  const [newSeason, setNewSeason] = useState<'both' | 'hauteSaison' | 'basseSaison'>('hauteSaison');
  const [newFieldLossPct, setNewFieldLossPct] = useState('25');
  const [newMillingLossPts, setNewMillingLossPts] = useState('2');
  const [newProbabilityPct, setNewProbabilityPct] = useState('40');

  const agg = useMemo(
    () =>
      aggregateCustomClimateCoefficients(
        climate,
        assumptions.hauteSaison.months,
        assumptions.basseSaison.months
      ),
    [climate, assumptions.hauteSaison.months, assumptions.basseSaison.months]
  );

  const updateList = (nextList: ClimateLossCoefficient[], forceEnable = true) => {
    updateClimateImpact({
      useCustomCoefficients: forceEnable ? true : useCustom,
      customCoefficients: nextList,
    });
  };

  const handleToggleItem = (id: string) => {
    const nextList = coefficients.map((item) =>
      item.id === id ? { ...item, active: !item.active } : item
    );
    updateList(nextList, true);
  };

  const handleUpdateNumber = (
    id: string,
    field: 'fieldLossPercent' | 'millingLossPoints' | 'probabilityPercent',
    rawVal: number
  ) => {
    const clean = Number.isFinite(rawVal) ? rawVal : 0;
    const nextList = coefficients.map((item) => {
      if (item.id !== id) return item;
      if (field === 'fieldLossPercent') {
        return { ...item, fieldLossPercent: Math.max(0, Math.min(0.9, clean / 100)) };
      }
      if (field === 'millingLossPoints') {
        return { ...item, millingLossPoints: Math.max(0, Math.min(0.45, clean / 100)) };
      }
      return { ...item, probabilityPercent: Math.max(0, Math.min(100, clean)) };
    });
    updateList(nextList, useCustom);
  };

  const handleRemoveItem = (id: string) => {
    const nextList = coefficients.filter((item) => item.id !== id);
    updateList(nextList, useCustom);
    notify('info', 'Coefficient d’aléa climatique supprimé.');
  };

  const handleAddPreset = (preset: Omit<ClimateLossCoefficient, 'id' | 'active'>) => {
    const newItem: ClimateLossCoefficient = {
      ...preset,
      id: `coeff-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      active: true,
    };
    updateList([...coefficients, newItem], true);
    notify('success', `Coefficient « ${preset.label} » ajouté et activé.`);
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const label = newLabel.trim();
    if (!label) return;
    const fieldLoss = Math.max(0, Math.min(90, Number(newFieldLossPct) || 0)) / 100;
    const millingLoss = Math.max(0, Math.min(45, Number(newMillingLossPts) || 0)) / 100;
    const prob = Math.max(0, Math.min(100, Number(newProbabilityPct) || 0));

    const newItem: ClimateLossCoefficient = {
      id: `coeff-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      label,
      category: newCategory,
      seasonScope: newSeason,
      fieldLossPercent: fieldLoss,
      millingLossPoints: millingLoss,
      probabilityPercent: prob,
      active: true,
    };
    updateList([...coefficients, newItem], true);
    setNewLabel('');
    notify('success', `Coefficient climatique « ${label} » ajouté.`);
  };

  const seasonLabel = (s: ClimateLossCoefficient['seasonScope']) =>
    s === 'both' ? 'HS + BS' : s === 'hauteSaison' ? 'Haute Saison' : 'Basse Saison';

  return (
    <div className="p-3.5 sm:p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#0D0C18] space-y-3.5">
      {/* Header & Mode Toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 pb-2.5 border-b border-zinc-200/80 dark:border-white/[0.06]">
        <div className="flex items-start gap-2">
          <CloudLightning className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Coefficients de perte de rendement climatique (Cyclones, Sécheresse, Crues)
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
              Ajoutez et combinez plusieurs aléas météorologiques spécifiques par saison pour refléter les risques agricoles réels.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            role="switch"
            aria-checked={useCustom}
            onClick={() => updateClimateImpact({ useCustomCoefficients: !useCustom })}
            className={`min-h-9 px-3 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              useCustom
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200'
                : 'border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-zinc-700 dark:text-zinc-300'
            }`}
          >
            {useCustom ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 shrink-0" aria-hidden="true" />
            )}
            <span>{useCustom ? 'Multi-aléas activés' : 'Activer multi-aléas'}</span>
          </button>

          <div className="inline-flex rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() =>
                updateClimateImpact({
                  useCustomCoefficients: true,
                  coefficientAggregationMode: 'expected_probability',
                })
              }
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                aggregationMode === 'expected_probability'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Pondéré (Probabilité %)
            </button>
            <button
              type="button"
              onClick={() =>
                updateClimateImpact({
                  useCustomCoefficients: true,
                  coefficientAggregationMode: 'cumulative',
                })
              }
              className={`px-2.5 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
                aggregationMode === 'cumulative'
                  ? 'bg-rose-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Choc cumulé (100 %)
            </button>
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="font-semibold text-zinc-600 dark:text-zinc-400 mr-1">
          Modèles rapides :
        </span>
        {CLIMATE_COEFFICIENT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => handleAddPreset(preset)}
            className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#171627] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-700 dark:text-zinc-200 font-medium inline-flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <span>
              {preset.label} (−{Math.round(preset.fieldLossPercent * 100)} %)
            </span>
          </button>
        ))}
      </div>

      {/* Existing Coefficients Table / List */}
      <div className="space-y-2">
        {coefficients.length === 0 ? (
          <div className="p-3 rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Aucun coefficient enregistré. Ajoutez un aléa ci-dessous ou utilisez un modèle rapide.
          </div>
        ) : (
          <div className="divide-y divide-zinc-200/80 dark:divide-white/[0.06] rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#131222] overflow-hidden">
            {coefficients.map((item) => {
              const catMeta = CLIMATE_CATEGORY_META[item.category];
              const weight =
                aggregationMode === 'expected_probability' ? item.probabilityPercent / 100 : 1;
              const effectiveLossPct = item.active ? item.fieldLossPercent * weight * 100 : 0;

              return (
                <div
                  key={item.id}
                  className={`p-2.5 sm:px-3 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs ${
                    item.active ? '' : 'opacity-65'
                  }`}
                >
                  <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      aria-label={`Activer ${item.label}`}
                      checked={item.active}
                      onChange={() => handleToggleItem(item.id)}
                      className="mt-0.5 sm:mt-0 rounded border-zinc-300 dark:border-zinc-600 text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {item.label}
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded border text-[10px] font-semibold ${catMeta.badgeClass}`}
                        >
                          {catMeta.label}
                        </span>
                        <span className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#1B1A2E] text-[10px] font-mono text-zinc-600 dark:text-zinc-300">
                          {seasonLabel(item.seasonScope)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums pl-6 lg:pl-0 shrink-0">
                    <label className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span>Champ −</span>
                      <input
                        type="number"
                        min={0}
                        max={90}
                        step={1}
                        aria-label={`Perte champ pour ${item.label} (%)`}
                        value={Math.round(item.fieldLossPercent * 100)}
                        onChange={(e) =>
                          handleUpdateNumber(item.id, 'fieldLossPercent', Number(e.target.value))
                        }
                        className="w-14 px-1.5 py-1 rounded border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] text-right text-xs text-zinc-900 dark:text-zinc-100"
                      />
                      <span>%</span>
                    </label>

                    <label className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span>Usinage −</span>
                      <input
                        type="number"
                        min={0}
                        max={45}
                        step={0.5}
                        aria-label={`Perte usinage pour ${item.label} (pts)`}
                        value={Number((item.millingLossPoints * 100).toFixed(1))}
                        onChange={(e) =>
                          handleUpdateNumber(item.id, 'millingLossPoints', Number(e.target.value))
                        }
                        className="w-14 px-1.5 py-1 rounded border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] text-right text-xs text-zinc-900 dark:text-zinc-100"
                      />
                      <span>pts</span>
                    </label>

                    <label className="inline-flex items-center gap-1 text-[11px] text-zinc-600 dark:text-zinc-400">
                      <span>Prob.</span>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        aria-label={`Probabilité annuelle pour ${item.label} (%)`}
                        value={Math.round(item.probabilityPercent)}
                        onChange={(e) =>
                          handleUpdateNumber(item.id, 'probabilityPercent', Number(e.target.value))
                        }
                        className="w-14 px-1.5 py-1 rounded border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] text-right text-xs text-zinc-900 dark:text-zinc-100"
                      />
                      <span>%</span>
                    </label>

                    <span
                      className={`min-w-[76px] text-right font-bold text-[11px] ${
                        effectiveLossPct > 0
                          ? 'text-rose-700 dark:text-rose-400'
                          : 'text-zinc-400 dark:text-zinc-500'
                      }`}
                    >
                      {effectiveLossPct > 0 ? `−${effectiveLossPct.toFixed(1)} %` : 'Inactif'}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveItem(item.id)}
                      aria-label={`Supprimer ${item.label}`}
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add New Custom Coefficient Form */}
      <form
        onSubmit={handleAddCustom}
        className="pt-2 border-t border-zinc-200/80 dark:border-white/[0.06] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_0.8fr_0.8fr_0.8fr_auto] gap-2 items-end text-xs"
      >
        <div>
          <label htmlFor="coeff-label" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Nouvel aléa climatique
          </label>
          <input
            id="coeff-label"
            type="text"
            required
            placeholder="Ex : Cyclone côte Nord-Est..."
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-xs text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="coeff-cat" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Type d&apos;aléa
          </label>
          <select
            id="coeff-cat"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as ClimateCoefficientCategory)}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-xs text-zinc-900 dark:text-zinc-100"
          >
            <option value="cyclone">Cyclone</option>
            <option value="secheresse">Sécheresse</option>
            <option value="inondation">Inondation / Crue</option>
            <option value="autre">Autre aléa</option>
          </select>
        </div>

        <div>
          <label htmlFor="coeff-season" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Saison cible
          </label>
          <select
            id="coeff-season"
            value={newSeason}
            onChange={(e) =>
              setNewSeason(e.target.value as 'both' | 'hauteSaison' | 'basseSaison')
            }
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] text-xs text-zinc-900 dark:text-zinc-100"
          >
            <option value="hauteSaison">Haute Saison</option>
            <option value="basseSaison">Basse Saison</option>
            <option value="both">HS + BS (Année)</option>
          </select>
        </div>

        <div>
          <label htmlFor="coeff-field-loss" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Perte champ (%)
          </label>
          <input
            id="coeff-field-loss"
            type="number"
            min={0}
            max={90}
            step={1}
            value={newFieldLossPct}
            onChange={(e) => setNewFieldLossPct(e.target.value)}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] font-mono text-right text-xs text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="coeff-milling-loss" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Usinage (pts)
          </label>
          <input
            id="coeff-milling-loss"
            type="number"
            min={0}
            max={45}
            step={0.5}
            value={newMillingLossPts}
            onChange={(e) => setNewMillingLossPts(e.target.value)}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] font-mono text-right text-xs text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="coeff-prob" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Prob. (%)
          </label>
          <input
            id="coeff-prob"
            type="number"
            min={0}
            max={100}
            step={5}
            value={newProbabilityPct}
            onChange={(e) => setNewProbabilityPct(e.target.value)}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171627] font-mono text-right text-xs text-zinc-900 dark:text-zinc-100"
          />
        </div>

        <button
          type="submit"
          className="min-h-9 px-3.5 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 font-semibold inline-flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ajouter</span>
        </button>
      </form>

      {/* Aggregated Seasonal Shock Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono tabular-nums pt-1">
        <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#131222] flex items-center justify-between">
          <span className="font-sans text-zinc-600 dark:text-zinc-400">Choc combiné HS :</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {(agg.hsFieldShockPercent * 100).toFixed(1)} % | {(agg.hsMillingDeltaPoints * 100).toFixed(1)} pts
          </span>
        </div>
        <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#131222] flex items-center justify-between">
          <span className="font-sans text-zinc-600 dark:text-zinc-400">Choc combiné BS :</span>
          <span className="font-bold text-zinc-900 dark:text-zinc-100">
            {(agg.bsFieldShockPercent * 100).toFixed(1)} % | {(agg.bsMillingDeltaPoints * 100).toFixed(1)} pts
          </span>
        </div>
        <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#131222] flex items-center justify-between">
          <span className="font-sans text-zinc-600 dark:text-zinc-400">Aléas actifs :</span>
          <span className="font-bold text-amber-700 dark:text-amber-300">
            {agg.activeCount} / {coefficients.length} ({useCustom ? 'appliqué' : 'en veille'})
          </span>
        </div>
      </div>
    </div>
  );
};
