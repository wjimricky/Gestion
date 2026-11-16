import React, { useMemo } from 'react';
import {
  Landmark,
  CheckCircle2,
  SlidersHorizontal,
  RotateCcw,
  TrendingUp,
  BadgePercent,
  Coins,
  Wallet,
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
import { SubsidyDonorType } from '../../types/finance';
import {
  computeSubsidiesPreview,
  getResolvedSubsidies,
  hasNonZeroSubsidy,
  SUBSIDY_PRESETS,
} from '../../utils/subsidies';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { SelectMenu } from './SelectMenu';
import { Tooltip } from './Tooltip';

const DONOR_OPTIONS: Array<{
  value: SubsidyDonorType;
  label: string;
  badge: string;
  description: string;
}> = [
  {
    value: 'national',
    label: 'Programme National (MAEP / FDA / État)',
    badge: 'NAT',
    description: 'Fonds de Développement Agricole, subvention intrants ou équipement national.',
  },
  {
    value: 'international',
    label: 'Bailleur International (FIDA / FAO / UE / AFD)',
    badge: 'INT',
    description: 'Appui multilatéral à la sécurité alimentaire et modernisation post-récolte.',
  },
  {
    value: 'mixte',
    label: 'Cofinancement Mixte (État + Bailleur)',
    badge: 'MIX',
    description: 'Montage hybride combinant subvention CAPEX et appui d’exploitation.',
  },
];

export const SubsidiesSection: React.FC = () => {
  const { assumptions, validation, updateSubsidies } = useFinancial();
  const subsidies = getResolvedSubsidies(assumptions);

  const preview = useMemo(
    () => computeSubsidiesPreview(assumptions, subsidies),
    [assumptions, subsidies]
  );

  const isActiveGrant = hasNonZeroSubsidy(subsidies);

  const applyPreset = (presetId: string) => {
    const found = SUBSIDY_PRESETS.find((p) => p.id === presetId);
    if (!found) return;
    updateSubsidies({
      programName: found.programName,
      donorType: found.donorType,
      capexGrantPercent: found.capexGrantPercent,
      capexGrantFixedAr: found.capexGrantFixedAr,
      bfrWorkingCapitalGrantAr: found.bfrWorkingCapitalGrantAr,
      opexPaddySubsidyArPerKg: found.opexPaddySubsidyArPerKg,
      opexFixedMonthlySubsidyAr: found.opexFixedMonthlySubsidyAr,
    });
  };

  const chartData = useMemo(
    () => [
      {
        metric: 'Investissement I₀',
        sansAide: Math.round(preview.i0BeforeAr / 1e6),
        avecAide: Math.round(preview.i0AfterAr / 1e6),
      },
      {
        metric: 'BFR requis',
        sansAide: Math.round(preview.bfrBeforeAr / 1e6),
        avecAide: Math.round(preview.bfrAfterAr / 1e6),
      },
      {
        metric: 'OPEX annuels',
        sansAide: Math.round(
          (preview.beforeModel.year1.totalPurchaseAndOperatingCostsAr +
            preview.beforeModel.year1.annualFixedChargesAr) /
            1e6
        ),
        avecAide: Math.round(
          (preview.afterModel.year1.totalPurchaseAndOperatingCostsAr +
            preview.afterModel.year1.annualFixedChargesAr) /
            1e6
        ),
      },
      {
        metric: 'Bénéfice net A1',
        sansAide: Math.round(preview.netProfitBeforeAr / 1e6),
        avecAide: Math.round(preview.netProfitAfterAr / 1e6),
      },
      {
        metric: 'VAN (3 ans)',
        sansAide: Math.round(preview.npvBeforeAr / 1e6),
        avecAide: Math.round(preview.npvAfterAr / 1e6),
      },
    ],
    [preview]
  );

  return (
    <section
      aria-label="Gestion des aides et subventions agricoles"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Landmark
            className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                8. Gestion des Aides &amp; Subventions (Programmes Nationaux / Internationaux)
              </h2>
              <Tooltip
                label="Aides et Subventions"
                content="Simulez l’impact de subventions d’investissement (CAPEX sur matériel/enregistrement dans I₀) et d’appuis aux charges d’exploitation (bonification OPEX paddy/usinage et charges fixes mensuelles) avec recalcul temps réel de la VAN, du TRI et du Payback."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Évaluez la réduction du capital initial requis (I₀) et l’amélioration de la rentabilité via les programmes FDA, FIDA, FAO ou Banque Mondiale.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isActiveGrant && (
            <button
              type="button"
              onClick={() => applyPreset('none')}
              className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Sans subvention (0 %)</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => updateSubsidies({ enabled: !subsidies.enabled })}
            aria-pressed={subsidies.enabled}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              subsidies.enabled
                ? 'border-teal-500/45 bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {subsidies.enabled ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {subsidies.enabled
                ? 'Répercussion VAN / TRI : Active'
                : 'Simulation isolée (sans impact modèle)'}
            </span>
          </button>
        </div>
      </div>

      {/* Program Presets */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
          Programmes de soutien types (Madagascar)
        </div>
        <div className="flex flex-wrap gap-2">
          {SUBSIDY_PRESETS.map((preset) => {
            const isSelected =
              Math.abs(subsidies.capexGrantPercent - preset.capexGrantPercent) < 0.005 &&
              Math.abs(subsidies.capexGrantFixedAr - preset.capexGrantFixedAr) < 1 &&
              Math.abs(
                (subsidies.bfrWorkingCapitalGrantAr ?? 0) - preset.bfrWorkingCapitalGrantAr
              ) < 1 &&
              Math.abs(subsidies.opexPaddySubsidyArPerKg - preset.opexPaddySubsidyArPerKg) < 1 &&
              Math.abs(subsidies.opexFixedMonthlySubsidyAr - preset.opexFixedMonthlySubsidyAr) < 1;

            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                title={preset.description}
                className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                  isSelected
                    ? 'border-teal-500/60 bg-teal-600 text-white shadow-xs'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Donor & Program Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300">
            Nature du bailleur / dispositif
          </span>
          <SelectMenu
            value={subsidies.donorType}
            options={DONOR_OPTIONS}
            onChange={(val) => updateSubsidies({ donorType: val as SubsidyDonorType })}
            ariaLabel="Type de bailleur"
          />
        </div>

        <FormField
          label="Intitulé du programme / convention"
          unit="libellé libre"
          tooltip="Nom du programme public ou international utilisé pour documenter vos projections."
        >
          {(props) => (
            <input
              {...props}
              type="text"
              value={subsidies.programName}
              onChange={(e) => updateSubsidies({ programName: e.target.value })}
              placeholder="Ex : FDA / MAEP — Subvention décorticage"
            />
          )}
        </FormField>
      </div>

      {/* CAPEX & OPEX Sliders / Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* CAPEX Box */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <BadgePercent className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>Subvention sur Investissement Initial (CAPEX)</span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-teal-700 dark:text-teal-400">
              −{formatAriary(preview.capexGrantTotalAr)}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sub-capex-pct" className="text-zinc-700 dark:text-zinc-300 font-medium">
                Taux de prise en charge matériel &amp; légal (%)
              </label>
              <span className="font-mono font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
                {(subsidies.capexGrantPercent * 100).toFixed(0)} %
              </span>
            </div>
            <input
              id="sub-capex-pct"
              type="range"
              min="0"
              max="0.9"
              step="0.05"
              value={subsidies.capexGrantPercent}
              onChange={(e) =>
                updateSubsidies({ capexGrantPercent: Number(e.target.value) })
              }
              className="w-full accent-indigo-600 cursor-pointer"
            />
            {validation.errors['subsidies.capexGrantPercent'] && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {validation.errors['subsidies.capexGrantPercent']}
              </p>
            )}
          </div>

          <FormField
            label="Prime forfaitaire CAPEX additionnelle (Ar)"
            unit="Ariary (Ar)"
            tooltip="Montant fixe déduit directement du matériel & frais d’enregistrement dans le calcul de I₀."
            error={validation.errors['subsidies.capexGrantFixedAr']}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                step="250000"
                value={subsidies.capexGrantFixedAr}
                onChange={(e) =>
                  updateSubsidies({
                    capexGrantFixedAr: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            )}
          </FormField>
        </div>

        {/* OPEX Box */}
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <Coins className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Appui aux Charges d’Exploitation (OPEX)</span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-teal-700 dark:text-teal-400">
              −{formatAriary(preview.annualOpexGrantTotalAr)} / an
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="sub-opex-kg" className="text-zinc-700 dark:text-zinc-300 font-medium">
                Bonification usinage / intrants (Ar / kg paddy)
              </label>
              <span className="font-mono font-bold tabular-nums text-teal-700 dark:text-teal-300">
                {Math.round(subsidies.opexPaddySubsidyArPerKg)} Ar/kg
              </span>
            </div>
            <input
              id="sub-opex-kg"
              type="range"
              min="0"
              max="300"
              step="5"
              value={subsidies.opexPaddySubsidyArPerKg}
              onChange={(e) =>
                updateSubsidies({ opexPaddySubsidyArPerKg: Number(e.target.value) })
              }
              className="w-full accent-teal-600 cursor-pointer"
            />
            {validation.errors['subsidies.opexPaddySubsidyArPerKg'] && (
              <p className="text-[11px] text-rose-600 dark:text-rose-400">
                {validation.errors['subsidies.opexPaddySubsidyArPerKg']}
              </p>
            )}
          </div>

          <FormField
            label="Prise en charge charges fixes mensuelles (Ar / mois)"
            unit="Ariary / mois"
            tooltip="Subvention d’exploitation mensuelle (salaire technicien, loyer ou encadrement) réduisant les charges fixes."
            error={validation.errors['subsidies.opexFixedMonthlySubsidyAr']}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                min="0"
                step="100000"
                value={subsidies.opexFixedMonthlySubsidyAr}
                onChange={(e) =>
                  updateSubsidies({
                    opexFixedMonthlySubsidyAr: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            )}
          </FormField>
        </div>
        {/* BFR Working Capital Grant Box */}
        <div className="md:col-span-2 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <Wallet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>
                Financement direct du Besoin en Fonds de Roulement (BFR / Projets de développement)
              </span>
            </div>
            <span className="font-mono text-xs font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
              BFR réduit de −{formatAriary(preview.bfrReductionAr, { inMillions: true })} (−
              {(preview.bfrReductionPct * 100).toFixed(1)} %)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="sub-bfr-grant" className="text-zinc-700 dark:text-zinc-300 font-medium">
                  Dotation fonds de roulement &amp; réserve de trésorerie (Ar)
                </label>
                <span className="font-mono font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
                  {formatAriary(subsidies.bfrWorkingCapitalGrantAr ?? 0, { inMillions: true })}
                </span>
              </div>
              <input
                id="sub-bfr-grant"
                type="range"
                min="0"
                max="15000000"
                step="250000"
                value={subsidies.bfrWorkingCapitalGrantAr ?? 0}
                onChange={(e) =>
                  updateSubsidies({ bfrWorkingCapitalGrantAr: Number(e.target.value) })
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <FormField
              label="Montant exact dotation BFR État / Projet (Ar)"
              unit="Ariary (Ar)"
              tooltip="Financement non remboursable ou ligne à taux zéro réduisant le BFR initial (tampon de trésorerie et avances collecte)."
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min="0"
                  step="250000"
                  value={subsidies.bfrWorkingCapitalGrantAr ?? 0}
                  onChange={(e) =>
                    updateSubsidies({
                      bfrWorkingCapitalGrantAr: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                />
              )}
            </FormField>
          </div>
        </div>
      </div>

      {/* KPI Impact Comparison Strip + Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* BFR Impact */}
          <div className="p-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.05] space-y-1">
            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Besoin en Fonds de Roulement (BFR)
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
              {formatAriary(preview.bfrAfterAr, { inMillions: true })}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-zinc-500">
                Base : {formatAriary(preview.bfrBeforeAr, { inMillions: true })}
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                −{(preview.bfrReductionPct * 100).toFixed(1)} % (−
                {formatAriary(preview.bfrReductionAr, { inMillions: true })})
              </span>
            </div>
          </div>

          {/* Net Profitability Impact */}
          <div className="p-3.5 rounded-xl border border-emerald-500/35 bg-emerald-500/[0.05] space-y-1">
            <div className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
              Rentabilité nette A1 (Bénéfice &amp; Marge)
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-emerald-700 dark:text-emerald-300">
              {formatAriary(preview.netProfitAfterAr, { inMillions: true })}
              <span className="text-xs font-normal text-zinc-500 ml-1.5">
                ({formatPercent(preview.netMarginAfterRate, 1)})
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-zinc-500">
                Base : {formatPercent(preview.netMarginBeforeRate, 1)}
              </span>
              <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                {preview.netMarginDeltaPts >= 0 ? '+' : ''}
                {preview.netMarginDeltaPts.toFixed(1)} pts
              </span>
            </div>
          </div>

          {/* I0 Impact */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
            <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              Capital initial requis (I₀)
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
              {formatAriary(preview.i0AfterAr, { inMillions: true })}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-zinc-500">
                Base : {formatAriary(preview.i0BeforeAr, { inMillions: true })}
              </span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                {preview.i0ReductionAr > 0
                  ? `−${formatAriary(preview.i0ReductionAr, { inMillions: true })}`
                  : '0 Ar'}
              </span>
            </div>
          </div>

          {/* VAN & TRI Impact */}
          <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
            <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
              VAN (3 ans) &amp; TRI · Payback
            </div>
            <div className="font-mono text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
              {formatAriary(preview.npvAfterAr, { inMillions: true })} · {formatPercent(preview.irrAfter, 1)}
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
              <span className="text-zinc-500">
                Payback : {formatMonths(preview.paybackAfterMonths)}
              </span>
              <span className="font-semibold text-teal-700 dark:text-teal-400">
                {preview.irrDeltaPts >= 0 ? '+' : ''}
                {preview.irrDeltaPts.toFixed(1)} pts TRI
              </span>
            </div>
          </div>
        </div>

        {/* Comparison Chart */}
        <div className="xl:col-span-6 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-between space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <TrendingUp className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Comparaison Avant / Après Subventions (M Ar)</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-zinc-400 dark:bg-zinc-600" /> Sans aide
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-xs bg-teal-500" /> Avec programme
              </span>
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
                    const label = name === 'sansAide' ? 'Sans subvention' : 'Avec programme';
                    return [`${Number(value ?? 0).toLocaleString('fr-FR')} M Ar`, label];
                  }}
                />
                <Bar dataKey="sansAide" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={26} />
                <Bar dataKey="avecAide" fill="#14b8a6" radius={[4, 4, 0, 0]} maxBarSize={26} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
};
