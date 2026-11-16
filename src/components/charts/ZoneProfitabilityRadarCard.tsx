import React, { useMemo, useState } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { MapPin, MessageSquareText, Truck } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  buildZoneRadarDataset,
  MADAGASCAR_PRODUCTION_ZONES,
  ProductionZoneId,
  simulateZoneProfitability,
  ZoneRadarDatum,
} from '../../utils/productionZones';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { KpiContextTarget } from '../ui/KpiContextMenu';
import { Tooltip } from '../ui/Tooltip';
import { ChartExportButtons } from '../ui/ChartExportButtons';

interface ZoneProfitabilityRadarCardProps {
  onKpiContextMenu?: (
    e: React.MouseEvent<HTMLElement>,
    target: KpiContextTarget
  ) => void;
  getNoteCount?: (kpiId: string) => number;
  onOpenKpiNotes?: (target: KpiContextTarget) => void;
}

export const ZoneProfitabilityRadarCard: React.FC<ZoneProfitabilityRadarCardProps> = ({
  onKpiContextMenu,
  getNoteCount,
  onOpenKpiNotes,
}) => {
  const { assumptions, model, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const [selectedZones, setSelectedZones] = useState<ProductionZoneId[]>([
    'current',
    'alaotra',
    'vakinankaratra',
    'marovoay',
  ]);

  const zoneResults = useMemo(
    () =>
      MADAGASCAR_PRODUCTION_ZONES.map((profile) =>
        simulateZoneProfitability(assumptions, model, profile)
      ),
    [assumptions, model]
  );

  const activeResults = useMemo(
    () => zoneResults.filter((r) => selectedZones.includes(r.profile.id)),
    [zoneResults, selectedZones]
  );

  const radarData = useMemo(
    () =>
      buildZoneRadarDataset(
        activeResults,
        (v) => formatAriary(v, { inMillions: true }),
        (v, d = 1) => formatPercent(v, d),
        (v) => formatMonths(v)
      ),
    [activeResults]
  );

  const bestNpvZone = useMemo(() => {
    return [...activeResults].sort((a, b) => b.npvAr - a.npvAr)[0];
  }, [activeResults]);

  const lowestLogisticsZone = useMemo(() => {
    return [...activeResults].sort(
      (a, b) => a.logisticsCostPerKgPaddyAr - b.logisticsCostPerKgPaddyAr
    )[0];
  }, [activeResults]);

  const toggleZone = (id: ProductionZoneId) => {
    setSelectedZones((prev) => {
      if (prev.includes(id)) {
        if (prev.length <= 2) return prev; // Keep at least 2 zones to compare
        return prev.filter((z) => z !== id);
      }
      if (prev.length >= 4) {
        return [...prev.slice(0, 3), id];
      }
      return [...prev, id];
    });
  };

  const kpiTarget: KpiContextTarget = {
    kpiId: 'radar_zones_madagascar',
    kpiLabel: 'Comparatif Zones Rizicoles (VAN / TRI)',
    kpiValueText: bestNpvZone
      ? `Leader VAN : ${bestNpvZone.profile.shortName} (${formatAriary(bestNpvZone.npvAr, { inMillions: true })})`
      : 'Comparatif régional',
    targetTab: 'dashboard',
  };
  const noteCount = getNoteCount ? getNoteCount(kpiTarget.kpiId) : 0;

  return (
    <section
      data-pdf-chart="zones-radar"
      style={{ animationDelay: '330ms' }}
      onContextMenu={(e) => onKpiContextMenu?.(e, kpiTarget)}
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 transition-colors duration-200"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-white/[0.06]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <MapPin
              className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Radar Rentabilité par Zone Rizicole (Madagascar — Profils Logistiques)
            </h2>
            <Tooltip
              align="left"
              label="Comparaison zonale VAN / TRI"
              content="Recalcule la VAN à 3 ans, le TRI, la marge nette et le délai de récupération selon les distances de collecte, l'état des axes (RN44, RN7, pistes rurales) et les prix locaux du paddy dans chaque grand bassin rizicole."
            />
            {onOpenKpiNotes && (
              <button
                type="button"
                onClick={() => onOpenKpiNotes(kpiTarget)}
                title="Ajouter ou consulter les notes d’analyse sur ce comparatif"
                aria-label="Notes sur le comparatif des zones rizicoles"
                className={`ml-1 px-1.5 py-0.5 rounded inline-flex items-center gap-1 text-[11px] font-mono tabular-nums no-print transition-colors ${
                  noteCount > 0
                    ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30'
                    : 'text-zinc-500 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-indigo-300'
                }`}
              >
                <MessageSquareText className="w-3 h-3" aria-hidden="true" />
                {noteCount > 0 && <span>{noteCount}</span>}
              </button>
            )}
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Comparez la performance VAN / TRI de votre projet face aux bassins du Lac Alaotra, Marovoay, Vakinankaratra et Sofia (sélectionnez 2 à 4 zones).
          </p>
        </div>

        {/* Zone Selection Toggles */}
        <div className="flex flex-wrap gap-1.5 shrink-0 no-print">
          {MADAGASCAR_PRODUCTION_ZONES.map((z) => {
            const active = selectedZones.includes(z.id);
            return (
              <button
                key={z.id}
                type="button"
                onClick={() => toggleZone(z.id)}
                aria-pressed={active}
                className={`px-2.5 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                  active
                    ? 'border-zinc-400 dark:border-white/25 bg-zinc-100 dark:bg-[#1E1D30] text-zinc-900 dark:text-white'
                    : 'border-zinc-200 dark:border-white/[0.07] bg-zinc-50/70 dark:bg-[#141322] text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: active ? z.color : '#64748b', opacity: active ? 1 : 0.45 }}
                />
                <span>{z.shortName}</span>
              </button>
            );
          })}
          <ChartExportButtons
            selector='section[data-pdf-chart="zones-radar"]'
            filenameBase="radar_zones_madagascar"
            chartTitle="Radar Rentabilité Zones"
          />
        </div>
      </div>

      {/* Main Content: Radar Chart + Logistics & VAN/TRI Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        <div className="lg:col-span-6 h-[320px] sm:h-[345px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart cx="50%" cy="50%" outerRadius="72%" data={radarData}>
              <PolarGrid stroke="rgba(148, 163, 184, 0.25)" />
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
              {activeResults.map((res) => (
                <Radar
                  key={res.profile.id}
                  name={res.profile.shortName}
                  dataKey={res.profile.id}
                  stroke={res.profile.color}
                  strokeWidth={res.profile.id === 'current' ? 2.5 : 2}
                  fill={res.profile.color}
                  fillOpacity={res.profile.id === 'current' ? 0.22 : 0.14}
                />
              ))}
              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null;
                  const row = payload[0].payload as ZoneRadarDatum;
                  return (
                    <div className="p-3 rounded-xl bg-zinc-950/95 border border-zinc-700/80 text-xs text-zinc-100 shadow-xl space-y-1.5 min-w-[235px]">
                      <div className="font-bold text-white">{row.axis}</div>
                      <div className="text-[11px] text-zinc-400">{row.description}</div>
                      <div className="pt-1 border-t border-zinc-800 space-y-1 font-mono tabular-nums">
                        {activeResults.map((res) => (
                          <div
                            key={res.profile.id}
                            className="flex items-center justify-between gap-3"
                          >
                            <span className="inline-flex items-center gap-1.5 text-zinc-200 truncate">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: res.profile.color }}
                              />
                              <span className="truncate max-w-[125px]">
                                {res.profile.shortName}
                              </span>
                            </span>
                            <span className="font-bold text-white">
                              {row.rawLabels[res.profile.id]}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                }}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Benchmark Table per Zone */}
        <div className="lg:col-span-6 space-y-3 min-w-0">
          <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
            <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
              <thead>
                <tr className="bg-zinc-100/80 dark:bg-[#171628] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                  <th className="py-2.5 px-3 font-semibold">Zone / Bassin</th>
                  <th className="py-2.5 px-3 text-right font-semibold">VAN (3 ans)</th>
                  <th className="py-2.5 px-3 text-right font-semibold">TRI</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Marge nette</th>
                  <th className="py-2.5 px-3 text-right font-semibold">Logistique / rot.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                {activeResults.map((res) => (
                  <tr
                    key={res.profile.id}
                    className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]"
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: res.profile.color }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {res.profile.shortName}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                            {res.profile.logisticsSummary}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold whitespace-nowrap ${
                        res.npvAr >= 0
                          ? 'text-teal-700 dark:text-teal-300'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      {formatAriary(res.npvAr, { inMillions: true })}
                    </td>
                    <td className="py-2.5 px-3 text-right font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                      {res.irrValue > 0 ? formatPercent(res.irrValue, 1) : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatPercent(res.netMarginRate, 1)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-zinc-700 dark:text-zinc-300 whitespace-nowrap">
                      {formatAriary(res.avgLogisticsCostPerRotAr, { inMillions: inM })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {bestNpvZone && lowestLogisticsZone && (
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
                <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                <span>
                  Meilleure VAN : <strong className="text-zinc-900 dark:text-white">{bestNpvZone.profile.shortName}</strong> (
                  {formatAriary(bestNpvZone.npvAr, { inMillions: true })})
                </span>
              </div>
              <div className="text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
                Fret min : <strong className="text-zinc-900 dark:text-white">{lowestLogisticsZone.profile.shortName}</strong> (
                {Math.round(lowestLogisticsZone.logisticsCostPerKgPaddyAr)} Ar/kg)
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
