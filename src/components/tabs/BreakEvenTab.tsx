import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent, formatKg } from '../../utils/formatters';
import { BreakEvenChart } from '../charts/FinancialCharts';
import { KpiCard } from '../ui/KpiCard';
import { FormField } from '../ui/FormField';
import { ViewToggle } from '../ui/ViewToggle';
import { Target, Users, ShieldAlert, TrendingUp, AlertTriangle } from 'lucide-react';

export const BreakEvenTab: React.FC = () => {
  const { model, assumptions, validation, unitDisplay, updateGeneralField } = useFinancial();
  const inM = unitDisplay === 'millions';
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const be = model.breakEven;
  const unattainable = be.grossMarginRate <= 0;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Seuil de Rentabilité (Break-Even Analysis) — Année 1</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Volume et chiffre d’affaires minimums indispensables pour couvrir l’intégralité des charges fixes.
          </p>
        </div>
      </div>

      {unattainable && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs sm:text-sm text-red-900 dark:text-red-200 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
          <span>
            Le taux de marge brute actuel ({formatPercent(be.grossMarginRate, 1)}) ne permet pas d’atteindre le seuil de rentabilité. Vérifiez vos prix de vente et coûts variables.
          </span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Point mort CA mensuel"
          value={unattainable ? 'Non atteint' : formatAriary(be.monthlyBreakEvenTurnoverAr, { inMillions: inM })}
          animatedValue={unattainable ? undefined : be.monthlyBreakEvenTurnoverAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={
            unattainable
              ? 'Marge brute ≤ 0'
              : `Annuel : ${formatAriary(be.annualBreakEvenTurnoverAr, { inMillions: true })}`
          }
          icon={Target}
          tone={unattainable ? 'danger' : 'warning'}
          tooltipAlign="left"
          tooltip="CA seuil mensuel = (Charges fixes annuelles ÷ Taux de marge brute) ÷ 12. C’est le niveau de ventes minimal pour couvrir 100 % des charges."
        />
        <KpiCard
          label="Point mort volume mensuel"
          value={unattainable ? '—' : formatKg(be.monthlyBreakEvenVolumeKg)}
          sub={unattainable ? 'Ajuster les marges' : `Annuel : ${formatKg(be.annualBreakEvenVolumeKg)}`}
          icon={TrendingUp}
          tone="neutral"
          tooltip="Volume mensuel = Point mort CA mensuel ÷ Prix de vente moyen pondéré sur l’année."
        />
        <KpiCard
          label="Marge de sécurité"
          value={unattainable ? '—' : formatPercent(be.safetyMarginRate, 1)}
          sub={
            unattainable
              ? 'Sous le seuil'
              : `Seuil = ${formatPercent(be.breakEvenPercentOfTarget, 1)} de l’objectif`
          }
          icon={ShieldAlert}
          tone={!unattainable && be.safetyMarginRate >= 0 ? 'positive' : 'danger'}
          tooltip="Marge de sécurité = (CA annuel prévu − Point mort annuel) ÷ CA annuel prévu. Mesure la baisse de ventes absorbable sans perte."
        />
        <KpiCard
          label="Clients actifs nécessaires"
          value={unattainable ? '—' : `${be.requiredActiveClients} clients`}
          sub={`Base : ${assumptions.avgVolumePerClientKgMonthly} kg/client/mois`}
          icon={Users}
          tone="positive"
          tooltipAlign="right"
          tooltip="Nombre de clients requis = Arrondi supérieur de (Volume mensuel au point mort ÷ Volume moyen par client)."
        />
      </div>

      {/* Break-Even Visual Graph */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
          Représentation Graphique du Point Mort
        </h2>
        <BreakEvenChart
          monthlyFixedCharges={be.monthlyFixedChargesAr}
          monthlyBreakEvenVolume={be.monthlyBreakEvenVolumeKg}
          monthlyBreakEvenTurnover={be.monthlyBreakEvenTurnoverAr}
          nominalVolume={model.year1.totalRiceKgSold / 12}
          nominalTurnover={model.year1.totalTurnoverAr / 12}
          avgSellingPrice={be.weightedAvgSellingPriceAr}
          grossMarginRate={be.grossMarginRate}
        />
      </section>

      {/* Operational Vigilance Thresholds */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>Seuils de Vigilance Opérationnelle</span>
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              Suivi mensuel des ventes
            </span>
          </div>
          <ViewToggle mode={mobileView} onChange={setMobileView} />
        </div>

        {/* Mobile Cards */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {be.vigilanceThresholds.map((threshold, idx) => (
              <div
                key={idx}
                className={`p-4 space-y-2 ${idx === 2 ? 'bg-emerald-500/10' : ''}`}
              >
                <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  {threshold.level}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      Volume mensuel
                    </div>
                    <div className="font-semibold mt-0.5">{formatKg(threshold.monthlyVolumeKg)}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      CA mensuel
                    </div>
                    <div className="font-bold mt-0.5">
                      {formatAriary(threshold.monthlyTurnoverAr, { inMillions: inM })}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 pt-1">
                  {threshold.status}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Table */}
        <div className={`${mobileView === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 font-semibold">Palier opérationnel</th>
                <th className="py-3 px-4 text-right font-semibold">Volume mensuel</th>
                <th className="py-3 px-4 text-right font-semibold">CA mensuel</th>
                <th className="py-3 px-4 font-sans font-semibold">Situation financière</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {be.vigilanceThresholds.map((threshold, idx) => (
                <tr key={idx} className={idx === 2 ? 'bg-emerald-500/10 font-medium' : ''}>
                  <td className="py-2.5 px-4 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                    {threshold.level}
                  </td>
                  <td className="py-2.5 px-4 text-right">{formatKg(threshold.monthlyVolumeKg)}</td>
                  <td className="py-2.5 px-4 text-right font-bold">
                    {formatAriary(threshold.monthlyTurnoverAr, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-zinc-700 dark:text-zinc-300">
                    {threshold.status}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Step-by-Step Reconstruction & Client Volume Simulator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Reconstruction Pas à Pas de la Formule
          </h3>
          <dl className="space-y-2 text-xs font-mono">
            <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Étape 1 — Charges fixes annuelles :</dt>
              <dd className="text-right">{formatAriary(be.annualFixedChargesAr, { inMillions: inM })}</dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Étape 2 — Taux de marge brute :</dt>
              <dd className="font-bold text-emerald-700 dark:text-emerald-400 text-right">
                {formatPercent(be.grossMarginRate)}
              </dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Étape 3 — Break-even CA annuel (1 / 2) :</dt>
              <dd className="font-bold text-right">
                {formatAriary(be.annualBreakEvenTurnoverAr, { inMillions: inM })}
              </dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Étape 4 — Prix moyen pondéré :</dt>
              <dd className="text-right">{formatAriary(be.weightedAvgSellingPriceAr)} / kg</dd>
            </div>
            <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-zinc-800/60">
              <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Étape 5 — Break-even volume annuel :</dt>
              <dd className="text-right">{formatKg(be.annualBreakEvenVolumeKg)}</dd>
            </div>
            <div className="flex justify-between gap-2 pt-1.5 font-bold text-emerald-700 dark:text-emerald-400">
              <dt className="font-sans">Étape 6 — Break-even volume mensuel (/ 12) :</dt>
              <dd className="text-right">{formatKg(be.monthlyBreakEvenVolumeKg)}</dd>
            </div>
          </dl>
        </section>

        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Dimensionnement du Portefeuille Clients</span>
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Ajustez le volume moyen distribué par client pour évaluer la taille critique du réseau commercial.
          </p>

          <div className="space-y-3 pt-1">
            <FormField
              label="Volume moyen par client actif (kg / mois)"
              hint="Ex : grossiste, demi-gros ou gargote"
              tooltip="Consommation mensuelle moyenne par acheteur. Permet de convertir le volume critique du point mort en portefeuille client cible."
              error={validation.errors['avgVolumePerClientKgMonthly']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="25"
                  min="1"
                  max="10000"
                  value={assumptions.avgVolumePerClientKgMonthly}
                  onChange={(e) =>
                    updateGeneralField('avgVolumePerClientKgMonthly', Number(e.target.value))
                  }
                />
              )}
            </FormField>

            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                  Nombre de clients actifs requis
                </div>
                <div className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Point mort mensuel ({formatKg(be.monthlyBreakEvenVolumeKg)}) / Volume client
                </div>
              </div>
              <div className="text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300">
                {unattainable ? '—' : be.requiredActiveClients}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
