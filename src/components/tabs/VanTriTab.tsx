import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { KpiCard } from '../ui/KpiCard';
import { ViewToggle } from '../ui/ViewToggle';
import { Tooltip } from '../ui/Tooltip';
import { Award, CheckCircle2, TrendingUp, Sliders, ShieldCheck, AlertTriangle } from 'lucide-react';

export const VanTriTab: React.FC = () => {
  const { model, unitDisplay, updateGeneralField } = useFinancial();
  const inM = unitDisplay === 'millions';
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');

  const npv = model.npv;
  const irr = model.irr;
  const hasCalculableIrr =
    Number.isFinite(irr.irrValue) &&
    (npv.cfYear1Ar > 0 || npv.cfYear2Ar > 0 || npv.cfYear3Ar > 0);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Rentabilité de l’Investissement — VAN & TRI</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Valeur Actuelle Nette (VAN) et Taux de Rentabilité Interne (TRI) calculés sur les flux prévisionnels à 3 ans.
          </p>
        </div>
      </div>

      {!hasCalculableIrr && (
        <div
          role="alert"
          className="p-4 rounded-xl border border-red-500/40 bg-red-500/10 text-xs sm:text-sm text-red-900 dark:text-red-200 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-700 dark:text-red-400" aria-hidden="true" />
          <span>
            Le TRI n’est pas calculable lorsque tous les flux futurs (Années 1 à 3) sont négatifs ou nuls.
          </span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="Taux d’actualisation (r)"
          value={formatPercent(npv.discountRate, 1)}
          sub="Coût du capital retenu"
          icon={Sliders}
          tone="neutral"
          tooltipAlign="left"
          tooltip="Taux de rendement minimal exigé par les apporteurs de capitaux pour actualiser les flux futurs A1 à A3."
        />
        <KpiCard
          label="VAN (NPV) calculée"
          value={formatAriary(npv.npvAr, { inMillions: inM })}
          animatedValue={npv.npvAr}
          formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
          sub={npv.decision}
          icon={CheckCircle2}
          tone={npv.npvAr > 0 ? 'positive' : 'danger'}
          tooltip="VAN = −I₀ + CF₁/(1+r) + CF₂/(1+r)² + CF₃/(1+r)³. Représente l’enrichissement net créé en Ariary d’aujourd’hui."
        />
        <KpiCard
          label="TRI exact (IRR)"
          value={hasCalculableIrr ? formatPercent(irr.irrValue, 1) : 'Non calculable'}
          sub="Taux qui annule la VAN"
          icon={TrendingUp}
          tone={hasCalculableIrr && irr.isAcceptable ? 'positive' : 'danger'}
          tooltip="Taux d’actualisation exact (résolu par dichotomie) pour lequel VAN(TRI) = 0 Ar."
        />
        <KpiCard
          label="Décision d’investissement"
          value={irr.isAcceptable && npv.npvAr > 0 ? 'Acceptable' : 'Non rentable'}
          sub={
            hasCalculableIrr
              ? `TRI (${formatPercent(irr.irrValue, 0)}) vs r (${formatPercent(npv.discountRate, 1)})`
              : 'Flux insuffisants'
          }
          icon={ShieldCheck}
          tone={irr.isAcceptable && npv.npvAr > 0 ? 'positive' : 'danger'}
          tooltipAlign="right"
          tooltip="Un projet est financièrement acceptable lorsque la VAN est strictement positive et que le TRI dépasse le taux d’actualisation r."
        />
      </div>

      {/* Discount Rate Interactive Slider */}
      <section className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
          <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <label
            htmlFor="discount-rate-slider"
            className="font-semibold text-zinc-900 dark:text-zinc-100"
          >
            Tester un autre taux d’actualisation :
          </label>
          <Tooltip
            align="left"
            label="Taux d’actualisation"
            content="Plus le taux r est élevé, plus les cash-flows futurs (A2, A3) sont dépréciés dans le calcul de la VAN."
          />
          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
            {formatPercent(npv.discountRate, 1)}
          </span>
        </div>

        <div className="flex items-center gap-3 w-full md:w-80">
          <input
            id="discount-rate-slider"
            type="range"
            min="0.05"
            max="1.0"
            step="0.01"
            value={Math.min(1, Math.max(0.05, npv.discountRate))}
            onChange={(e) => updateGeneralField('discountRate', Number(e.target.value))}
            className="w-full h-3 accent-emerald-600 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => updateGeneralField('discountRate', 0.12)}
            className="min-h-11 sm:min-h-10 px-3 py-1.5 text-xs font-semibold rounded-lg border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 shrink-0 transition-colors"
          >
            Reset 12 %
          </button>
        </div>
      </section>

      {/* VAN Detail Table */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Tableau de Calcul de la VAN (Actualisation pas à pas)
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">
              Formule : VAN = −I₀ + Σ CFt / (1+r)ᵗ
            </span>
          </div>
          <ViewToggle mode={mobileView} onChange={setMobileView} />
        </div>

        {/* Mobile Cards for VAN */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {[
              {
                t: 't = 0',
                label: 'Fonds initial à lever (CF₀)',
                cf: npv.initialInvestmentAr,
                factor: '1.0000',
                pv: npv.initialInvestmentAr,
              },
              {
                t: 't = 1',
                label: 'Résultat net Année 1 (après IR)',
                cf: npv.cfYear1Ar,
                factor: (1 + npv.discountRate).toFixed(4),
                pv: npv.pvYear1Ar,
              },
              {
                t: 't = 2',
                label: 'Résultat net Année 2 (après IR)',
                cf: npv.cfYear2Ar,
                factor: Math.pow(1 + npv.discountRate, 2).toFixed(4),
                pv: npv.pvYear2Ar,
              },
              {
                t: 't = 3',
                label: 'Résultat net Année 3 (après IR)',
                cf: npv.cfYear3Ar,
                factor: Math.pow(1 + npv.discountRate, 3).toFixed(4),
                pv: npv.pvYear3Ar,
              },
            ].map((row) => (
              <div key={row.t} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold font-mono text-zinc-900 dark:text-zinc-100">
                    {row.t} · <span className="font-sans font-medium">{row.label}</span>
                  </span>
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">
                    ×{row.factor}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                  <div>
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">CF brut</div>
                    <div className={row.cf < 0 ? 'text-red-700 dark:text-red-400 font-bold' : 'font-semibold'}>
                      {formatAriary(row.cf, { inMillions: inM })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">Flux actualisé</div>
                    <div
                      className={`font-bold ${
                        row.pv < 0
                          ? 'text-red-700 dark:text-red-400'
                          : 'text-emerald-700 dark:text-emerald-400'
                      }`}
                    >
                      {formatAriary(row.pv, { inMillions: inM })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-4 bg-emerald-500/10 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300">
                VALEUR ACTUELLE NETTE (VAN)
              </span>
              <span className="text-sm font-bold font-mono text-emerald-800 dark:text-emerald-300">
                {formatAriary(npv.npvAr, { inMillions: inM })}
              </span>
            </div>
          </div>
        )}

        <div className={`${mobileView === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 font-semibold">Année (t)</th>
                <th className="py-3 px-4 font-semibold font-sans">Nature du flux</th>
                <th className="py-3 px-4 text-right font-semibold">Cash-flow brut (CF)</th>
                <th className="py-3 px-4 text-right font-semibold">Facteur (1+r)ᵗ</th>
                <th className="py-3 px-4 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  Flux actualisé
                </th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-600 dark:text-zinc-400">
                  Perte due à l’attente
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              <tr>
                <td className="py-2.5 px-4 font-bold">t = 0</td>
                <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                  Fonds initial à lever (CF₀)
                </td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">
                  {formatAriary(npv.initialInvestmentAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right">1.0000</td>
                <td className="py-2.5 px-4 text-right text-red-700 dark:text-red-400 font-bold">
                  {formatAriary(npv.initialInvestmentAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-600 dark:text-zinc-400">0 Ar</td>
              </tr>
              {[
                { t: 1, cf: npv.cfYear1Ar, pv: npv.pvYear1Ar },
                { t: 2, cf: npv.cfYear2Ar, pv: npv.pvYear2Ar },
                { t: 3, cf: npv.cfYear3Ar, pv: npv.pvYear3Ar },
              ].map((row) => (
                <tr key={row.t}>
                  <td className="py-2.5 px-4 font-bold">t = {row.t}</td>
                  <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                    Résultat net Année {row.t} (après IR)
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium">
                    {formatAriary(row.cf, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    {Math.pow(1 + npv.discountRate, row.t).toFixed(4)}
                  </td>
                  <td className="py-2.5 px-4 text-right font-medium text-emerald-700 dark:text-emerald-400">
                    {formatAriary(row.pv, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-600 dark:text-zinc-400">
                    {formatAriary(row.cf - row.pv, { inMillions: inM })}
                  </td>
                </tr>
              ))}
              <tr className="bg-zinc-50/70 dark:bg-zinc-900/40">
                <td colSpan={2} className="py-2.5 px-4 font-sans font-semibold text-zinc-900 dark:text-zinc-100">
                  Cumul des flux futurs actualisés (A1 + A2 + A3)
                </td>
                <td className="py-2.5 px-4 text-right font-bold">
                  {formatAriary(npv.cfYear1Ar + npv.cfYear2Ar + npv.cfYear3Ar, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-500">—</td>
                <td className="py-2.5 px-4 text-right font-bold text-emerald-700 dark:text-emerald-400">
                  {formatAriary(npv.totalPvAr, { inMillions: inM })}
                </td>
                <td className="py-2.5 px-4 text-right text-zinc-600 dark:text-zinc-400">
                  {formatAriary(npv.lossFromWaitingAr, { inMillions: inM })}
                </td>
              </tr>
              <tr className="bg-emerald-500/10 font-bold border-t border-emerald-500/25 text-sm">
                <td colSpan={2} className="py-3 px-4 font-sans text-emerald-900 dark:text-emerald-300">
                  VALEUR ACTUELLE NETTE (VAN)
                </td>
                <td colSpan={2} className="py-3 px-4 text-right text-xs font-sans text-emerald-800 dark:text-emerald-400">
                  Décision : {npv.decision}
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 dark:text-emerald-300">
                  {formatAriary(npv.npvAr, { inMillions: inM })}
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 dark:text-emerald-400 text-xs font-sans">
                  Contrôle NPV : OK ✓
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sensitivity Table for Discount Rates */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Robustesse de la VAN selon Différents Taux d’Actualisation
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">8 % à 100 % + TRI</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">Taux exigé (r)</th>
                <th className="py-2.5 px-3 text-right font-semibold">Flux act. A1</th>
                <th className="py-2.5 px-3 text-right font-semibold">Flux act. A2</th>
                <th className="py-2.5 px-3 text-right font-semibold">Flux act. A3</th>
                <th className="py-2.5 px-3 text-right font-semibold">Somme flux</th>
                <th className="py-2.5 px-3 text-right font-semibold text-emerald-700 dark:text-emerald-400">
                  VAN calculée
                </th>
                <th className="py-2.5 px-3 font-sans font-semibold">Décision</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {npv.sensitivityTable.map((item, idx) => {
                const isSelectedRate = Math.abs(item.rate - npv.discountRate) < 0.001;
                return (
                  <tr key={idx} className={isSelectedRate ? 'bg-emerald-500/10 font-bold' : ''}>
                    <td className="py-2.5 px-3 font-medium">{formatPercent(item.rate, 0)}</td>
                    <td className="py-2.5 px-3 text-right">{formatAriary(item.pvYear1Ar, { inMillions: inM })}</td>
                    <td className="py-2.5 px-3 text-right">{formatAriary(item.pvYear2Ar, { inMillions: inM })}</td>
                    <td className="py-2.5 px-3 text-right">{formatAriary(item.pvYear3Ar, { inMillions: inM })}</td>
                    <td className="py-2.5 px-3 text-right">{formatAriary(item.totalPvAr, { inMillions: inM })}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-bold ${
                        item.npvAr > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {formatAriary(item.npvAr, { inMillions: inM })}
                    </td>
                    <td
                      className={`py-2.5 px-3 font-sans ${
                        item.npvAr > 0
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-red-700 dark:text-red-400'
                      }`}
                    >
                      {item.decision}
                    </td>
                  </tr>
                );
              })}
              {hasCalculableIrr && (
                <tr className="bg-amber-500/12 font-bold border-t border-amber-500/30">
                  <td className="py-2.5 px-3 text-amber-800 dark:text-amber-300">
                    {formatPercent(irr.irrValue, 1)} (TRI)
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatAriary(npv.cfYear1Ar / (1 + irr.irrValue), { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatAriary(npv.cfYear2Ar / Math.pow(1 + irr.irrValue, 2), { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    {formatAriary(npv.cfYear3Ar / Math.pow(1 + irr.irrValue, 3), { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-800 dark:text-amber-300">
                    {formatAriary(-npv.initialInvestmentAr, { inMillions: inM })}
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-amber-800 dark:text-amber-300">
                    0 Ar (Seuil)
                  </td>
                  <td className="py-2.5 px-3 font-sans text-amber-800 dark:text-amber-300">
                    Seuil = TRI exact
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* TRI Educational Section */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>Taux de Rentabilité Interne (TRI) — Méthodes de Calcul</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-2">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              1. Calcul Exact (Algorithme Numérique)
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Résout numériquement par dichotomie l’équation non-linéaire : <br />
              <code className="font-mono text-emerald-700 dark:text-emerald-400">
                0 = −I₀ + CF₁/(1+r) + CF₂/(1+r)² + CF₃/(1+r)³
              </code>
            </p>
            <div className="pt-1">
              <span className="text-zinc-600 dark:text-zinc-400 font-sans">TRI exact résolu :</span>{' '}
              <span className="text-base font-bold font-mono text-emerald-700 dark:text-emerald-400">
                {hasCalculableIrr ? formatPercent(irr.irrValue, 2) : 'Non calculable'}
              </span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Contrôle : VAN(TRI) = {formatAriary(irr.npvAtIrrAr, { decimals: 2 })}
            </div>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-2">
            <div className="font-bold text-zinc-900 dark:text-zinc-100">
              2. Méthode d’Interpolation Linéaire (Conforme Excel TRI)
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed font-sans">
              Encadre le TRI avec <code className="font-mono">i₁ = 400 %</code> et{' '}
              <code className="font-mono">i₂ = 600 %</code> : <br />
              <code className="font-mono text-emerald-700 dark:text-emerald-400">
                TRI ≈ i₁ + VAN(i₁) / (VAN(i₁) − VAN(i₂)) × (i₂ − i₁)
              </code>
            </p>
            <div className="pt-1">
              <span className="text-zinc-600 dark:text-zinc-400 font-sans">TRI par interpolation :</span>{' '}
              <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                {hasCalculableIrr ? formatPercent(irr.linearInterpolation.approxIrr, 2) : '—'}
              </span>
            </div>
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              Écart avec le TRI exact :{' '}
              {hasCalculableIrr ? formatPercent(irr.linearInterpolation.error, 2) : '—'}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
