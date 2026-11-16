import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Droplets,
  PackageCheck,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  Timer,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { StorageMethodType } from '../../types/finance';
import {
  computeStorageSimulationPreview,
  getResolvedStorageOptimization,
  STORAGE_METHOD_META,
} from '../../utils/storage';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

export const StorageOptimizationSection: React.FC = () => {
  const { assumptions, validation, updateStorageOptimization } = useFinancial();
  const storage = getResolvedStorageOptimization(assumptions);

  const preview = useMemo(
    () => computeStorageSimulationPreview(assumptions, storage),
    [assumptions, storage]
  );

  const isModified =
    storage.storageDurationDays !== 30 ||
    Math.abs(storage.moisturePercent - 14.0) > 0.05 ||
    storage.storageMethod !== 'sacs_standard' ||
    (storage.storageCapacityKg ?? 40000) !== 40000;

  const seasonScopeOptions = [
    {
      value: 'both',
      label: 'Toute l’année (HS + BS)',
      badge: '12 mois',
      description: 'Stockage appliqué aux lots Haute et Basse Saison',
    },
    {
      value: 'hauteSaison',
      label: 'Haute Saison uniquement (HS)',
      badge: `${assumptions.hauteSaison.months}m`,
      description: 'Report de stock post-récolte principale',
    },
    {
      value: 'basseSaison',
      label: 'Basse Saison uniquement (BS)',
      badge: `${assumptions.basseSaison.months}m`,
      description: 'Conservation en période chaude / humide',
    },
  ];

  const moistureStatus =
    storage.moisturePercent <= 14.0
      ? {
          label: 'Seuil sûr (≤ 14 %)',
          className: 'text-emerald-700 dark:text-emerald-400',
          Icon: ShieldCheck,
        }
      : storage.moisturePercent <= 17.0
      ? {
          label: 'Humidité modérée (risque fongique)',
          className: 'text-amber-700 dark:text-amber-400',
          Icon: AlertTriangle,
        }
      : {
          label: 'Humidité critique (échauffement rapide)',
          className: 'text-rose-700 dark:text-rose-400',
          Icon: AlertTriangle,
        };

  return (
    <section
      aria-label="Capacité de stockage et pertes post-récolte"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <PackageCheck
            className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                4e. Capacité de Stockage &amp; Pertes Post-Récolte
              </h2>
              <Tooltip
                label="Capacité de Stockage & Pertes"
                content="Modélise la capacité maximale de l’entrepôt (tonnes), les pertes de poids et de qualité post-récolte selon la durée de conservation, le taux d’humidité et l’infrastructure (entrepôt ventilé vs traditionnel), avec répercussion directe sur le stock valorisable et la marge."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Dimensionnez la capacité d’entreposage, la durée et l’infrastructure (entrepôt ventilé vs traditionnel) avec impact direct sur la marge.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isModified && (
            <button
              type="button"
              onClick={() =>
                updateStorageOptimization({
                  storageDurationDays: 30,
                  moisturePercent: 14.0,
                  storageMethod: 'sacs_standard',
                  storageCapacityKg: 40000,
                })
              }
              className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Standard sec (40 T · 14 % · 30 j)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => updateStorageOptimization({ enabled: !storage.enabled })}
            aria-pressed={storage.enabled}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              storage.enabled
                ? 'border-teal-500/45 bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {storage.enabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {storage.enabled
                ? 'Impact stock valorisable : Actif'
                : 'Simulation isolée (sans impact CA)'}
            </span>
          </button>
        </div>
      </div>

      {/* Warehouse Capacity Input & Utilization Gauge */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-5 space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label
              htmlFor="storage-capacity-kg"
              className="font-semibold text-zinc-800 dark:text-zinc-200"
            >
              Capacité totale de l’entrepôt (kg)
            </label>
            <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-400">
              {((storage.storageCapacityKg ?? 40000) / 1000).toFixed(1)} tonnes
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="storage-capacity-kg"
              type="number"
              min={1000}
              step={2000}
              value={storage.storageCapacityKg ?? 40000}
              onChange={(e) =>
                updateStorageOptimization({
                  storageCapacityKg: Math.max(1000, Number(e.target.value) || 1000),
                })
              }
              className="w-32 min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono font-bold tabular-nums text-zinc-900 dark:text-white"
            />
            {[20000, 40000, 60000, 100000].map((cap) => (
              <button
                key={cap}
                type="button"
                onClick={() => updateStorageOptimization({ storageCapacityKg: cap })}
                className={`min-h-8 px-2 py-1 rounded-lg border text-[11px] font-mono font-semibold transition-colors ${
                  (storage.storageCapacityKg ?? 40000) === cap
                    ? 'border-teal-500/60 bg-teal-500/15 text-teal-800 dark:text-teal-300'
                    : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {cap / 1000} T
              </button>
            ))}
          </div>
          {validation.errors['storage.storageCapacityKg'] && (
            <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
              {validation.errors['storage.storageCapacityKg']}
            </p>
          )}
        </div>

        <div className="lg:col-span-7 space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Taux d’occupation au pic de stockage ({storage.storageDurationDays} j)
            </span>
            <span
              className={`font-mono font-bold tabular-nums ${
                preview.isOverCapacity
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.capacityUtilizationPct > 85
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {formatKg(preview.peakStockPaddyKg)} / {formatKg(preview.storageCapacityKg)} (
              {preview.capacityUtilizationPct.toFixed(0)} %)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-200 ${
                preview.isOverCapacity
                  ? 'bg-rose-600'
                  : preview.capacityUtilizationPct > 85
                  ? 'bg-amber-500'
                  : 'bg-teal-600'
              }`}
              style={{ width: `${Math.min(100, preview.capacityUtilizationPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
            {preview.isOverCapacity
              ? `Alerte surcharge (+${formatKg(preview.overflowExcessKg)} hors entrepôt) : risque accru d’humidité et de pertes sur le surplus.`
              : 'Capacité suffisante pour absorber les rotations simultanées sur la durée de conservation choisie.'}
          </p>
        </div>
      </div>

      {/* Storage Method Selector Cards */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
          Infrastructure &amp; technologie de stockage (Entrepôt ventilé vs traditionnel)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {preview.methodComparison.map((item) => {
            const meta = STORAGE_METHOD_META[item.method as StorageMethodType];
            const active = storage.storageMethod === item.method;
            return (
              <button
                key={item.method}
                type="button"
                onClick={() => updateStorageOptimization({ storageMethod: item.method })}
                aria-pressed={active}
                className={`text-left p-3 rounded-xl border transition-colors space-y-1.5 ${
                  active
                    ? 'border-teal-500/65 bg-teal-500/10 text-zinc-900 dark:text-white ring-1 ring-teal-500/25'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/70'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">{item.shortLabel}</span>
                  <span
                    className={`text-xs font-mono font-bold tabular-nums ${
                      item.lossRate < 0.03
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : item.lossRate < 0.08
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    −{formatPercent(item.lossRate, 1)} perte
                  </span>
                </div>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-snug">
                  {meta.description}
                </p>
                <div className="pt-1 border-t border-zinc-200/70 dark:border-white/[0.06] flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="text-zinc-600 dark:text-zinc-400">
                    Riz valorisable : <strong>{formatKg(item.valorizableRiceKg)}</strong>
                  </span>
                  {item.savedTurnoverVsStandardAr > 1000 && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      +{formatAriary(item.savedTurnoverVsStandardAr, { inMillions: true })}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive Sliders + Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        <div className="lg:col-span-4 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2">
          <div className="flex items-center justify-between gap-2 text-xs">
            <label
              htmlFor="storage-duration-slider"
              className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
            >
              <Timer className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Durée de stockage</span>
            </label>
            <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
              {storage.storageDurationDays} jours ({(storage.storageDurationDays / 30).toFixed(1)} mois)
            </span>
          </div>
          <input
            id="storage-duration-slider"
            type="range"
            min={15}
            max={180}
            step={5}
            value={storage.storageDurationDays}
            onChange={(e) =>
              updateStorageOptimization({ storageDurationDays: Number(e.target.value) })
            }
            className="w-full accent-teal-600 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
            <span>15 j</span>
            <span>30 j (rot. standard)</span>
            <span>90 j</span>
            <span>180 j (report BS)</span>
          </div>
          {validation.errors['storage.storageDurationDays'] && (
            <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
              {validation.errors['storage.storageDurationDays']}
            </p>
          )}
        </div>

        <div className="lg:col-span-5 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <label
              htmlFor="storage-moisture-slider"
              className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"
            >
              <Droplets className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" aria-hidden="true" />
              <span>Taux d’humidité du paddy</span>
            </label>
            <span className="font-mono font-bold tabular-nums text-zinc-900 dark:text-white">
              {storage.moisturePercent.toFixed(1)} %
            </span>
          </div>
          <input
            id="storage-moisture-slider"
            type="range"
            min={11}
            max={24}
            step={0.5}
            value={storage.moisturePercent}
            onChange={(e) =>
              updateStorageOptimization({ moisturePercent: Number(e.target.value) })
            }
            className="w-full accent-sky-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className={`inline-flex items-center gap-1 font-medium ${moistureStatus.className}`}>
              <moistureStatus.Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>{moistureStatus.label}</span>
            </span>
            <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
              11 % – 24 %
            </span>
          </div>
          {validation.errors['storage.moisturePercent'] && (
            <p role="alert" className="text-xs text-rose-700 dark:text-rose-400">
              {validation.errors['storage.moisturePercent']}
            </p>
          )}
        </div>

        <div className="lg:col-span-3 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 flex flex-col justify-between space-y-2">
          <label
            htmlFor="storage-season-scope"
            className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200"
          >
            Saison(s) concernée(s)
          </label>
          <SelectMenu
            id="storage-season-scope"
            ariaLabel="Saisons affectées par les pertes de stockage"
            value={storage.affectedSeason}
            onChange={(val) =>
              updateStorageOptimization({
                affectedSeason: val as 'both' | 'hauteSaison' | 'basseSaison',
              })
            }
            options={seasonScopeOptions}
            className="w-full"
          />
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">
            Répercussion directe sur le ratio de riz valorisable en fin de saison.
          </p>
        </div>
      </div>

      {/* End-of-season Valorizable Stock Summary + Loss Curve Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-1">
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Perte post-récolte totale
            </div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                preview.riskLevel === 'critique'
                  ? 'text-rose-700 dark:text-rose-400'
                  : preview.riskLevel === 'vigilance'
                  ? 'text-amber-700 dark:text-amber-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              −{formatPercent(preview.totalLossRate, 1)}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              −{formatKg(preview.lostPaddyKg)} paddy
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Stock valorisable fin de saison
            </div>
            <div className="mt-1 text-base font-bold font-mono tabular-nums text-zinc-900 dark:text-white">
              {formatKg(preview.valorizableRiceKg)} riz
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              sur {formatKg(preview.baselineRiceKg)} nominal
            </div>
          </div>

          <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]">
            <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
              Impact direct sur la marge
            </div>
            <div
              className={`mt-1 text-base font-bold font-mono tabular-nums ${
                preview.netProfitDeltaAr < -1000
                  ? 'text-rose-700 dark:text-rose-400'
                  : 'text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {preview.netProfitDeltaAr >= 0 ? '+' : '−'}
              {formatAriary(Math.abs(preview.netProfitDeltaAr), { inMillions: true })}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
              Marge nette : {formatPercent(preview.netMarginBeforeAr, 1)} →{' '}
              <strong className="text-zinc-900 dark:text-white">
                {formatPercent(preview.netMarginAfterAr, 1)}
              </strong>{' '}
              ({preview.netMarginDeltaPts >= 0 ? '+' : ''}
              {preview.netMarginDeltaPts.toFixed(1)} pts)
            </div>
          </div>
        </div>

        <div className="lg:col-span-6 h-[175px] min-w-0 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] p-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={preview.curveData}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.16)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#94A3B8', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                width={38}
                tickFormatter={(v) => `${v}%`}
              />
              <RechartsTooltip
                formatter={(value, name) => [
                  `${Number(value ?? 0).toFixed(1)} % de perte`,
                  String(name ?? ''),
                ]}
                contentStyle={{
                  backgroundColor: 'rgba(15, 14, 28, 0.94)',
                  borderColor: 'rgba(255,255,255,0.12)',
                  borderRadius: '10px',
                  fontSize: '11px',
                  color: '#F4F4F5',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '10px' }} />
              <ReferenceLine
                x={`${Math.round(storage.storageDurationDays / 30) * 30 || 15} j`}
                stroke="#14B8A6"
                strokeDasharray="3 3"
              />
              <Line
                type="monotone"
                dataKey="lossSacsStandardPct"
                name="Entrepôt traditionnel"
                stroke="#F43F5E"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
              <Line
                type="monotone"
                dataKey="lossGrenierVentilePct"
                name="Entrepôt ventilé"
                stroke="#F59E0B"
                strokeWidth={2}
                dot={{ r: 2.5 }}
              />
              <Line
                type="monotone"
                dataKey="lossSacsPicsPct"
                name="Sacs hermétiques PICS"
                stroke="#10B981"
                strokeWidth={2.2}
                dot={{ r: 2.5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
};
