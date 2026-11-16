import React, { useMemo } from 'react';
import {
  Award,
  CheckCircle2,
  RotateCcw,
  SlidersHorizontal,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import {
  CERTIFICATION_PRESETS,
  computeTraceabilityPreview,
  getResolvedTraceability,
  hasActiveCertificationImpact,
} from '../../utils/traceability';
import { formatAriary, formatKg, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { Tooltip } from './Tooltip';

export const TraceabilityCertificationSection: React.FC = () => {
  const { assumptions, validation, updateTraceabilityCertification } = useFinancial();
  const cert = getResolvedTraceability(assumptions);

  const preview = useMemo(
    () => computeTraceabilityPreview(assumptions, cert),
    [assumptions, cert]
  );

  const isCertified = hasActiveCertificationImpact(cert);

  const applyPreset = (presetId: (typeof CERTIFICATION_PRESETS)[number]['id']) => {
    const found = CERTIFICATION_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    updateTraceabilityCertification({
      certificationType: found.id,
      labelName: found.labelName,
      extraCostArPerKgPaddy: found.extraCostArPerKgPaddy,
      annualAuditFixedCostAr: found.annualAuditFixedCostAr,
      sellingPricePremiumPercent: found.sellingPricePremiumPercent,
      targetMarketSharePercent: found.targetMarketSharePercent,
    });
  };

  const chartData = useMemo(
    () => [
      {
        metric: "Chiffre d'affaires",
        base: Math.round(preview.beforeModel.year1.totalTurnoverAr / 1e6),
        certifie: Math.round(preview.afterModel.year1.totalTurnoverAr / 1e6),
      },
      {
        metric: 'Coûts totaux',
        base: Math.round(
          (preview.beforeModel.year1.totalPurchaseAndOperatingCostsAr +
            preview.beforeModel.year1.annualFixedChargesAr) /
            1e6
        ),
        certifie: Math.round(
          (preview.afterModel.year1.totalPurchaseAndOperatingCostsAr +
            preview.afterModel.year1.annualFixedChargesAr) /
            1e6
        ),
      },
      {
        metric: 'Bénéfice net A1',
        base: Math.round(preview.beforeModel.year1.netResultAfterTaxAr / 1e6),
        certifie: Math.round(preview.afterModel.year1.netResultAfterTaxAr / 1e6),
      },
      {
        metric: 'VAN (3 ans)',
        base: Math.round(preview.beforeModel.npv.npvAr / 1e6),
        certifie: Math.round(preview.afterModel.npv.npvAr / 1e6),
      },
    ],
    [preview]
  );

  return (
    <section
      aria-label="Traçabilité et Certifications Bio ou Commerce Équitable"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Award
            className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                9. Traçabilité &amp; Certifications (Bio, Commerce Équitable, IGP)
              </h2>
              <Tooltip
                label="Traçabilité et Certifications"
                content="Évaluez le surcoût variable de traçabilité par kg de paddy et les frais d’audit annuel, face à la prime sur le prix de vente certifié et aux parts de marché cibles."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Arbitrez la rentabilité d’un label Bio ou Équitable entre surcoûts de conformité, prime tarifaire et volume cible capté.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isCertified && (
            <button
              type="button"
              onClick={() => applyPreset('none')}
              className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Riz conventionnel</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => updateTraceabilityCertification({ enabled: !cert.enabled })}
            aria-pressed={cert.enabled}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap ${
              cert.enabled
                ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200 hover:bg-emerald-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {cert.enabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {cert.enabled
                ? 'Prix & surcoûts appliqués au modèle'
                : 'Simulation isolée (sans impact modèle)'}
            </span>
          </button>
        </div>
      </div>

      {/* Certification Scheme Selector */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Référentiel de certification &amp; traçabilité
        </div>
        <div className="flex flex-wrap gap-2">
          {CERTIFICATION_PRESETS.map((preset) => {
            const active = cert.certificationType === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
                  active
                    ? 'border-emerald-500/60 bg-emerald-600 text-white shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <FormField
          label="Surcoût traçabilité / kg paddy"
          unit="Ar / kg paddy"
          tooltip="Prime producteur, séparation physique des lots, analyses et étiquetage QR par kg de paddy collecté."
          error={validation.errors['traceability.extraCostArPerKgPaddy']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="5"
              value={cert.extraCostArPerKgPaddy}
              onChange={(e) =>
                updateTraceabilityCertification({
                  extraCostArPerKgPaddy: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Audit & contrôle annuel"
          unit="Ar / an"
          tooltip="Frais annuels d’organisme certificateur (ECOCERT, Fairtrade), inspection terrain et renouvellement du label."
          error={validation.errors['traceability.annualAuditFixedCostAr']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              min="0"
              step="200000"
              value={cert.annualAuditFixedCostAr}
              onChange={(e) =>
                updateTraceabilityCertification({
                  annualAuditFixedCostAr: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          )}
        </FormField>

        <div className="space-y-1.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="cert-premium-range" className="font-medium text-zinc-700 dark:text-zinc-300">
              Prime prix de vente
            </label>
            <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              +{Math.round(cert.sellingPricePremiumPercent * 100)} %
            </span>
          </div>
          <input
            id="cert-premium-range"
            type="range"
            min="0"
            max="0.6"
            step="0.02"
            value={cert.sellingPricePremiumPercent}
            onChange={(e) =>
              updateTraceabilityCertification({
                sellingPricePremiumPercent: Number(e.target.value),
              })
            }
            className="w-full accent-emerald-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            <span>HS {formatAriary(preview.certifiedPriceHS)}/kg</span>
            <span>BS {formatAriary(preview.certifiedPriceBS)}/kg</span>
          </div>
        </div>

        <div className="space-y-1.5 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="cert-share-range" className="font-medium text-zinc-700 dark:text-zinc-300">
              Part de marché cible
            </label>
            <span className="font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
              {cert.targetMarketSharePercent.toFixed(0)} %
            </span>
          </div>
          <input
            id="cert-share-range"
            type="range"
            min="1"
            max="50"
            step="1"
            value={cert.targetMarketSharePercent}
            onChange={(e) =>
              updateTraceabilityCertification({
                targetMarketSharePercent: Number(e.target.value),
              })
            }
            className="w-full accent-indigo-600 cursor-pointer"
          />
          <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            <span>Captée : {preview.capturedMarketSharePct.toFixed(1)} %</span>
            <span>Cible : {formatKg(preview.targetMarketVolumeKg)}</span>
          </div>
        </div>
      </div>

      {/* Market Volume Reference Input + KPI Summary + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
            <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Surcoût total certification / an
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-amber-700 dark:text-amber-300">
              {formatAriary(preview.totalCertificationCostAnnualAr, { inMillions: true })}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              Var. {formatAriary(preview.extraVariableCostAnnualAr, { inMillions: true })} · Audit{' '}
              {formatAriary(preview.annualAuditCostAr, { inMillions: true })}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
            <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Gain net annuel après IR
            </div>
            <div
              className={`font-mono text-base font-bold tabular-nums ${
                preview.netProfitDeltaAr >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-rose-700 dark:text-rose-400'
              }`}
            >
              {preview.netProfitDeltaAr >= 0 ? '+' : ''}
              {formatAriary(preview.netProfitDeltaAr, { inMillions: true })}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              TRI : {formatPercent(preview.irrBefore, 1)} → {formatPercent(preview.irrAfter, 1)}
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1.5">
            <label
              htmlFor="cert-addressable-market"
              className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
            >
              Marché adressable segment (kg riz / an)
            </label>
            <input
              id="cert-addressable-market"
              type="number"
              min="100000"
              step="250000"
              value={cert.addressableMarketVolumeKgAnnual}
              onChange={(e) =>
                updateTraceabilityCertification({
                  addressableMarketVolumeKgAnnual: Math.max(
                    100000,
                    Number(e.target.value) || 100000
                  ),
                })
              }
              className="w-full min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-xs tabular-nums text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
            <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Couverture part de marché cible
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
              {preview.volumeCoverageOfTargetPct.toFixed(0)} %
            </div>
            <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
              Offre {formatKg(preview.annualRiceVolumeKg)} / {formatKg(preview.targetMarketVolumeKg)}
            </div>
          </div>
        </div>

        {/* Impact Chart */}
        <div className="xl:col-span-6 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-between space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>Effet Certification : Conventionnel vs Certifié (M Ar)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span>Gris : Conventionnel</span>
              <span aria-hidden="true">·</span>
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">Vert : Certifié</span>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="metric" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${Number(v)} M`}
                  width={44}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value, name) => {
                    const label = name === 'base' ? 'Conventionnel' : 'Certifié';
                    return [`${Number(value ?? 0).toLocaleString('fr-FR')} M Ar`, label];
                  }}
                />
                <Bar dataKey="base" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="certifie" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
