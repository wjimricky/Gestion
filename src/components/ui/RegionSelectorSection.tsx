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
  ArrowUpRight,
  BarChart3,
  CheckCircle2,
  LayoutGrid,
  MapPin,
  Sprout,
  Truck,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  getZoneProfileById,
  MADAGASCAR_PRODUCTION_ZONES,
  ProductionZoneId,
  simulateZoneProfitability,
} from '../../utils/productionZones';
import { ROAD_CONDITION_META } from '../../utils/logistics';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

export const RegionSelectorSection: React.FC = () => {
  const { assumptions, model, unitDisplay, applyProductionRegion, theme } = useFinancial();
  const isDarkMode = theme === 'dark';
  const inM = unitDisplay === 'millions';

  const [syncPaddyPrice, setSyncPaddyPrice] = useState(true);
  const [viewMode, setViewMode] = useState<'cards' | 'compare'>('compare');

  const selectedRegionId = (assumptions.selectedRegionId as ProductionZoneId) || 'current';
  const activeProfile = getZoneProfileById(selectedRegionId);

  const regionOptions = MADAGASCAR_PRODUCTION_ZONES.map((z) => ({
    value: z.id,
    label: z.name,
    badge: `${(z.avgFieldYieldKgPerHa / 1000).toFixed(1)} t/ha`,
    description: `${z.region} · ${z.distanceKmHS}/${z.distanceKmBS} km`,
  }));

  const currentCarburant = assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant');

  const zoneBenchmarks = useMemo(() => {
    return MADAGASCAR_PRODUCTION_ZONES.filter((z) => z.id !== 'current').map((profile) =>
      simulateZoneProfitability(assumptions, model, profile)
    );
  }, [assumptions, model]);

  const bestNpvZone = useMemo(() => {
    return [...zoneBenchmarks].sort((a, b) => b.npvAr - a.npvAr)[0];
  }, [zoneBenchmarks]);

  const chartData = useMemo(() => {
    return zoneBenchmarks.map((r) => ({
      name: r.profile.shortName,
      unitCostRice: Math.round(r.unitCostPerKgRiceAr),
      paddyHS: Math.round(r.paddyCostPerKgHS),
      npvMillions: Number((r.npvAr / 1e6).toFixed(1)),
      yieldTonsHa: Number((r.profile.avgFieldYieldKgPerHa / 1000).toFixed(2)),
    }));
  }, [zoneBenchmarks]);

  return (
    <section
      aria-label="Segmentation géographique et comparatif régional à Madagascar"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <MapPin
            className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Segmentation Géographique &amp; Bassins Rizicoles (Madagascar)
              </h2>
              <Tooltip
                label="Segmentation Géographique"
                content="Compare les coûts paddy, frais d’approche logistique, rendements agricoles (t/ha), marges et VAN à 3 ans entre les principaux bassins rizicoles (Alaotra, Itasy, Marovoay, Vakinankaratra, Sofia). Appliquer une région met automatiquement à jour toutes les projections."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Comparez les coûts et rendements régionaux (Alaotra, Itasy, Marovoay, Hautes Terres, Sofia) puis appliquez un bassin pour recalibrer les projections.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none min-h-9 px-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
            <input
              type="checkbox"
              checked={syncPaddyPrice}
              onChange={(e) => setSyncPaddyPrice(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            <span>Calibrer prix paddy régional</span>
          </label>

          <div
            role="group"
            aria-label="Affichage segmentation géographique"
            className="inline-flex items-center p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/60"
          >
            <button
              type="button"
              onClick={() => setViewMode('compare')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                viewMode === 'compare'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Comparatif coûts &amp; VAN</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`px-2.5 py-1.5 rounded-md text-xs font-medium inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                viewMode === 'cards'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Fiches bassins</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Region Summary & Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 space-y-2.5">
          <label
            htmlFor="region-selector-menu"
            className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          >
            Bassin de production actif
          </label>
          <SelectMenu
            id="region-selector-menu"
            ariaLabel="Sélectionner une région de production rizicole à Madagascar"
            value={selectedRegionId}
            onChange={(val) =>
              applyProductionRegion(val as ProductionZoneId, syncPaddyPrice)
            }
            options={regionOptions}
            className="w-full"
          />
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {activeProfile.name}
              </span>
              {selectedRegionId !== 'current' && (
                <button
                  type="button"
                  onClick={() => applyProductionRegion('current', syncPaddyPrice)}
                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
                >
                  Revenir base
                </button>
              )}
            </div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
              {activeProfile.fieldYieldNote}
            </p>
            <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] grid grid-cols-2 gap-2 text-[11px] font-mono tabular-nums">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 font-sans block">
                  Transport HS / BS
                </span>
                <strong className="text-zinc-900 dark:text-white">
                  {currentCarburant ? formatAriary(currentCarburant.costHS) : '—'} /{' '}
                  {currentCarburant ? formatAriary(currentCarburant.costBS) : '—'}
                </strong>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400 font-sans block">
                  Rendement / ha
                </span>
                <strong className="text-teal-700 dark:text-teal-400">
                  {(assumptions.climateImpact?.nominalYieldKgPerHa ?? activeProfile.avgFieldYieldKgPerHa).toLocaleString('fr-FR')} kg/ha
                </strong>
              </div>
            </div>
            {bestNpvZone && (
              <div className="pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between text-[11px]">
                <span className="text-zinc-600 dark:text-zinc-400">
                  Meilleur potentiel VAN :
                </span>
                <span className="font-mono font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
                  {bestNpvZone.profile.shortName} ({formatAriary(bestNpvZone.npvAr, { inMillions: true })})
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Either Regional Chart + Summary OR Quick Cards */}
        <div className="lg:col-span-8">
          {viewMode === 'compare' ? (
            <div className="h-full p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-between gap-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Comparaison Coût de Revient Riz (Ar/kg) vs VAN 3 Ans (M Ar)
                  </h3>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Impact combiné du prix bord-champ, du rendement usinage et de la distance de collecte sur la rentabilité.
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-indigo-500" /> Coût revient riz
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-400" /> Paddy HS
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-3 h-0.5 bg-emerald-500" /> VAN (M Ar)
                  </span>
                </div>
              </div>

              <div className="h-56 w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 2 }}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                    />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: isDarkMode ? '#a1a1aa' : '#52525b' }}
                    />
                    <YAxis
                      yAxisId="cost"
                      tick={{ fontSize: 11, fill: isDarkMode ? '#a1a1aa' : '#52525b' }}
                      tickFormatter={(v) => `${v}`}
                      width={48}
                    />
                    <YAxis
                      yAxisId="npv"
                      orientation="right"
                      tick={{ fontSize: 11, fill: isDarkMode ? '#34d399' : '#059669' }}
                      tickFormatter={(v) => `${v} M`}
                      width={52}
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
                        if (name === 'unitCostRice') return [`${Number(value).toLocaleString('fr-FR')} Ar/kg`, 'Coût revient riz'];
                        if (name === 'paddyHS') return [`${Number(value).toLocaleString('fr-FR')} Ar/kg`, 'Paddy bord-champ HS'];
                        if (name === 'npvMillions') return [`${Number(value).toFixed(1)} M Ar`, 'VAN 3 ans'];
                        return [String(value), String(name)];
                      }}
                    />
                    <Bar
                      yAxisId="cost"
                      dataKey="unitCostRice"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                    <Bar
                      yAxisId="cost"
                      dataKey="paddyHS"
                      fill="#94a3b8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={26}
                    />
                    <Line
                      yAxisId="npv"
                      type="monotone"
                      dataKey="npvMillions"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      dot={{ r: 3.5, fill: '#10b981' }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {MADAGASCAR_PRODUCTION_ZONES.filter((z) => z.id !== 'current').map((zone) => {
                const isSelected = selectedRegionId === zone.id;
                return (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => applyProductionRegion(zone.id, syncPaddyPrice)}
                    aria-pressed={isSelected}
                    className={`text-left p-3 rounded-xl border transition-colors space-y-1.5 ${
                      isSelected
                        ? 'border-indigo-500/65 bg-indigo-500/10 ring-1 ring-indigo-500/25'
                        : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: zone.color }}
                          aria-hidden="true"
                        />
                        <span>{zone.shortName}</span>
                      </span>
                      {isSelected ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                          Paddy ×{zone.paddyPriceMultiplier.toFixed(2)}
                        </span>
                      )}
                    </div>

                    <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
                      {zone.region}
                    </div>

                    <div className="pt-1 border-t border-zinc-200/70 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums">
                      <span className="inline-flex items-center gap-1 text-zinc-700 dark:text-zinc-300">
                        <Truck className="w-3 h-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                        <span>
                          {zone.distanceKmHS}/{zone.distanceKmBS} km ({ROAD_CONDITION_META[zone.roadBS].shortLabel})
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700 dark:text-teal-400">
                        <Sprout className="w-3 h-3" aria-hidden="true" />
                        <span>{(zone.avgFieldYieldKgPerHa / 1000).toFixed(1)} t/ha</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Comparative Regional Financial Matrix */}
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            Matrice comparative régionale — Coûts, Rendements &amp; Projections (A1–A3)
          </span>
          <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
            Cliquez sur « Appliquer » pour basculer les hypothèses et recalculer les projections
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-950/80 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">Bassin / Région</th>
                <th className="py-2.5 px-3 text-right font-semibold">Rend. champ</th>
                <th className="py-2.5 px-3 text-right font-semibold">Usinage</th>
                <th className="py-2.5 px-3 text-right font-semibold">Paddy HS / BS</th>
                <th className="py-2.5 px-3 text-right font-semibold">Fret / kg</th>
                <th className="py-2.5 px-3 text-right font-semibold">Coût riz / kg</th>
                <th className="py-2.5 px-3 text-right font-semibold">Résultat Net A1</th>
                <th className="py-2.5 px-3 text-right font-semibold">Proj. A3</th>
                <th className="py-2.5 px-3 text-right font-semibold">VAN (3 ans)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
              {zoneBenchmarks.map((row) => {
                const isActive = selectedRegionId === row.profile.id;
                return (
                  <tr
                    key={row.profile.id}
                    className={
                      isActive
                        ? 'bg-indigo-500/[0.08] dark:bg-indigo-500/[0.12]'
                        : 'hover:bg-zinc-50 dark:hover:bg-white/[0.02]'
                    }
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.profile.color }}
                          aria-hidden="true"
                        />
                        <span>{row.profile.shortName}</span>
                      </div>
                      <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {row.profile.distanceKmHS}/{row.profile.distanceKmBS} km
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-800 dark:text-zinc-200">
                      {(row.profile.avgFieldYieldKgPerHa / 1000).toFixed(2)} t/ha
                    </td>
                    <td className="py-2.5 px-3 text-right text-teal-700 dark:text-teal-400 font-semibold">
                      {row.millingYieldPct.toFixed(1)} %
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {Math.round(row.paddyCostPerKgHS).toLocaleString('fr-FR')} /{' '}
                      {Math.round(row.paddyCostPerKgBS).toLocaleString('fr-FR')} Ar
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700 dark:text-amber-400">
                      {Math.round(row.logisticsCostPerKgPaddyAr).toLocaleString('fr-FR')} Ar
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 dark:text-white">
                      {Math.round(row.unitCostPerKgRiceAr).toLocaleString('fr-FR')} Ar
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-800 dark:text-zinc-200">
                      {formatAriary(row.netResultAfterTaxAr, { inMillions: inM })}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300">
                      {formatAriary(row.year3ProjectionAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        row.npvAr >= 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatAriary(row.npvAr, { inMillions: true })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-sans">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Actif</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => applyProductionRegion(row.profile.id, syncPaddyPrice)}
                          className="px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1 transition-colors whitespace-nowrap"
                        >
                          <span>Appliquer</span>
                          <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
