import React from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { Table2, Link2, ArrowLeft, TrendingUp } from 'lucide-react';

interface ExpressEntrySheetProps {
  onExitExpress: () => void;
}

/**
 * Mode "Saisie en ligne" (Grille tableur simplifiée) pour éditer rapidement les variables clés
 * (prix, volumes, cadences, rendement et coût matière) sans monter les formulaires complets.
 */
export const ExpressEntrySheet: React.FC<ExpressEntrySheetProps> = ({ onExitExpress }) => {
  const {
    assumptions,
    model,
    autoBalanceSeasons,
    setAutoBalanceSeasons,
    updateSeasonField,
    updateVariableCostPerKg,
    updateGeneralField,
  } = useFinancial();

  const paddyCostItem = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const decorticageCostItem = assumptions.costsPerKgPaddy.find(
    (c) => c.id !== 'cost-paddy'
  );

  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const y1 = model.year1;

  const cellInputClass =
    'w-full min-h-10 px-2.5 py-1.5 text-right font-mono text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors';

  return (
    <section
      aria-label="Grille de saisie express type tableur"
      className="rounded-xl border border-indigo-500/35 bg-white dark:bg-zinc-900/80 overflow-hidden"
    >
      {/* Toolbar */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 bg-indigo-500/[0.05] dark:bg-indigo-500/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5">
          <Table2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0" aria-hidden="true" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Mode Édition rapide — Grille tableur compacte
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Modifiez directement les variables clés de prix et de volume sans naviguer entre plusieurs sections — recalcul instantané.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none min-h-9 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950/60">
            <input
              type="checkbox"
              checked={autoBalanceSeasons}
              onChange={(e) => setAutoBalanceSeasons(e.target.checked)}
              className="w-4 h-4 accent-indigo-600 rounded"
            />
            <Link2 className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>HS + BS = 12 mois</span>
          </label>

          <button
            type="button"
            onClick={onExitExpress}
            className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Formulaire détaillé</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="bg-zinc-100/90 dark:bg-zinc-800/70 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2.5 px-4 font-semibold min-w-[200px]">Variable clé (Prix / Volume)</th>
              <th className="py-2.5 px-4 text-right font-semibold text-emerald-700 dark:text-emerald-400 min-w-[140px]">
                Haute Saison (HS)
              </th>
              <th className="py-2.5 px-4 text-right font-semibold text-cyan-700 dark:text-cyan-400 min-w-[140px]">
                Basse Saison (BS)
              </th>
              <th className="py-2.5 px-4 text-right font-semibold min-w-[100px]">Unité</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/70">
            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Durée saisonnière
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  min={1}
                  max={11}
                  aria-label="Durée Haute Saison en mois"
                  value={assumptions.hauteSaison.months}
                  onChange={(e) => updateSeasonField('hauteSaison', 'months', Number(e.target.value))}
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  min={1}
                  max={11}
                  aria-label="Durée Basse Saison en mois"
                  value={assumptions.basseSaison.months}
                  onChange={(e) => updateSeasonField('basseSaison', 'months', Number(e.target.value))}
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">mois</td>
            </tr>

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Cadence commerciale (Rotations / mois)
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  aria-label="Rotations par mois Haute Saison"
                  value={assumptions.hauteSaison.rotationsPerMonth}
                  onChange={(e) =>
                    updateSeasonField('hauteSaison', 'rotationsPerMonth', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  aria-label="Rotations par mois Basse Saison"
                  value={assumptions.basseSaison.rotationsPerMonth}
                  onChange={(e) =>
                    updateSeasonField('basseSaison', 'rotationsPerMonth', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">rot/mois</td>
            </tr>

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Volume de paddy acheté par rotation
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="100"
                  min="1"
                  aria-label="Paddy acheté par rotation Haute Saison en kg"
                  value={assumptions.hauteSaison.paddyBoughtKgPerRotation}
                  onChange={(e) =>
                    updateSeasonField('hauteSaison', 'paddyBoughtKgPerRotation', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="100"
                  min="1"
                  aria-label="Paddy acheté par rotation Basse Saison en kg"
                  value={assumptions.basseSaison.paddyBoughtKgPerRotation}
                  onChange={(e) =>
                    updateSeasonField('basseSaison', 'paddyBoughtKgPerRotation', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">kg / rot.</td>
            </tr>

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Rendement transformation (Paddy → Riz)
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1"
                  aria-label="Rendement Haute Saison"
                  value={assumptions.hauteSaison.yieldPaddyToRice}
                  onChange={(e) =>
                    updateSeasonField('hauteSaison', 'yieldPaddyToRice', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="1"
                  aria-label="Rendement Basse Saison"
                  value={assumptions.basseSaison.yieldPaddyToRice}
                  onChange={(e) =>
                    updateSeasonField('basseSaison', 'yieldPaddyToRice', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">ratio (0–1)</td>
            </tr>

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] bg-indigo-500/[0.03]">
              <td className="py-2 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                Prix de vente du riz usiné
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="50"
                  min="1"
                  aria-label="Prix de vente du riz Haute Saison en Ar/kg"
                  value={assumptions.hauteSaison.riceSellingPriceArPerKg}
                  onChange={(e) =>
                    updateSeasonField('hauteSaison', 'riceSellingPriceArPerKg', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="50"
                  min="1"
                  aria-label="Prix de vente du riz Basse Saison en Ar/kg"
                  value={assumptions.basseSaison.riceSellingPriceArPerKg}
                  onChange={(e) =>
                    updateSeasonField('basseSaison', 'riceSellingPriceArPerKg', Number(e.target.value))
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">Ar / kg</td>
            </tr>

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Prix de vente sous-produits (son)
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="50"
                  min="0"
                  aria-label="Prix des sous-produits Haute Saison en Ar/kg"
                  value={assumptions.hauteSaison.byproductSellingPriceArPerKg}
                  onChange={(e) =>
                    updateSeasonField(
                      'hauteSaison',
                      'byproductSellingPriceArPerKg',
                      Number(e.target.value)
                    )
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="50"
                  min="0"
                  aria-label="Prix des sous-produits Basse Saison en Ar/kg"
                  value={assumptions.basseSaison.byproductSellingPriceArPerKg}
                  onChange={(e) =>
                    updateSeasonField(
                      'basseSaison',
                      'byproductSellingPriceArPerKg',
                      Number(e.target.value)
                    )
                  }
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">Ar / kg</td>
            </tr>

            {paddyCostItem && (
              <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02] bg-amber-500/[0.03]">
                <td className="py-2 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                  Prix d’achat du paddy brut
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    aria-label="Prix achat paddy Haute Saison en Ar/kg"
                    value={paddyCostItem.costHS}
                    onChange={(e) =>
                      updateVariableCostPerKg(paddyCostItem.id, 'costHS', Number(e.target.value))
                    }
                    className={cellInputClass}
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step="50"
                    min="0"
                    aria-label="Prix achat paddy Basse Saison en Ar/kg"
                    value={paddyCostItem.costBS}
                    onChange={(e) =>
                      updateVariableCostPerKg(paddyCostItem.id, 'costBS', Number(e.target.value))
                    }
                    className={cellInputClass}
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">Ar / kg</td>
              </tr>
            )}

            {decorticageCostItem && (
              <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                  {decorticageCostItem.label}
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    aria-label={`${decorticageCostItem.label} Haute Saison`}
                    value={decorticageCostItem.costHS}
                    onChange={(e) =>
                      updateVariableCostPerKg(
                        decorticageCostItem.id,
                        'costHS',
                        Number(e.target.value)
                      )
                    }
                    className={cellInputClass}
                  />
                </td>
                <td className="py-2 px-4">
                  <input
                    type="number"
                    step="10"
                    min="0"
                    aria-label={`${decorticageCostItem.label} Basse Saison`}
                    value={decorticageCostItem.costBS}
                    onChange={(e) =>
                      updateVariableCostPerKg(
                        decorticageCostItem.id,
                        'costBS',
                        Number(e.target.value)
                      )
                    }
                    className={cellInputClass}
                  />
                </td>
                <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">Ar / kg</td>
              </tr>
            )}

            <tr className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
              <td className="py-2 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                Taux d’actualisation (r) &amp; Taux IR
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  aria-label="Taux d'actualisation r"
                  value={assumptions.discountRate}
                  onChange={(e) => updateGeneralField('discountRate', Number(e.target.value))}
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.99"
                  aria-label="Taux IR"
                  value={assumptions.corporateTaxRate}
                  onChange={(e) => updateGeneralField('corporateTaxRate', Number(e.target.value))}
                  className={cellInputClass}
                />
              </td>
              <td className="py-2 px-4 text-right font-mono text-zinc-500 dark:text-zinc-400">r / IR</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Live Impact Strip */}
      <div className="px-4 sm:px-5 py-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-950/60 grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
        <div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400">CA Annuel (A1)</div>
          <div className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">
            {formatAriary(y1.totalTurnoverAr, { inMillions: true })}
          </div>
        </div>
        <div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400">
            Résultat mensuel HS / BS
          </div>
          <div className="font-bold text-sm text-zinc-900 dark:text-white mt-0.5">
            {formatAriary(hs.monthlyNetResultBeforeTaxAr, { inMillions: true })} /{' '}
            {formatAriary(bs.monthlyNetResultBeforeTaxAr, { inMillions: true })}
          </div>
        </div>
        <div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400">
            Résultat net après IR
          </div>
          <div
            className={`font-bold text-sm mt-0.5 flex items-center gap-1 ${
              y1.netResultAfterTaxAr >= 0
                ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {formatAriary(y1.netResultAfterTaxAr, { inMillions: true })} (
              {formatPercent(y1.netMarginAfterTaxRate)})
            </span>
          </div>
        </div>
        <div>
          <div className="font-sans text-[11px] text-zinc-500 dark:text-zinc-400">VAN à 3 ans</div>
          <div
            className={`font-bold text-sm mt-0.5 ${
              model.npv.npvAr > 0
                ? 'text-teal-700 dark:text-teal-400'
                : 'text-rose-700 dark:text-rose-400'
            }`}
          >
            {formatAriary(model.npv.npvAr, { inMillions: true })}
          </div>
        </div>
      </div>
    </section>
  );
};
