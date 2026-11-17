import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from '../ui/FormField';
import { LabelWithTooltip, Tooltip } from '../ui/Tooltip';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { ExpressEntrySheet } from '../ui/ExpressEntrySheet';
import { SelectMenu } from '../ui/SelectMenu';
import { PestelAnalysisSection } from '../ui/PestelAnalysisSection';
import { ClimateImpactSection } from '../ui/ClimateImpactSection';
import { FxRiskSection } from '../ui/FxRiskSection';
import { StorageOptimizationSection } from '../ui/StorageOptimizationSection';
import { StockManagementBfrSection } from '../ui/StockManagementBfrSection';
import { LogisticsTransportModule } from '../ui/LogisticsTransportModule';
import { SubsidiesSection } from '../ui/SubsidiesSection';
import { TraceabilityCertificationSection } from '../ui/TraceabilityCertificationSection';
import { ComplianceAuditSection } from '../ui/ComplianceAuditSection';
import { RegionSelectorSection } from '../ui/RegionSelectorSection';
import { OperationalStressTestSection } from '../ui/OperationalStressTestSection';
import { AgriculturalInflationSection } from '../ui/AgriculturalInflationSection';
import { LoanRepaymentSection } from '../ui/LoanRepaymentSection';
import { MadagascarVatCalculatorSection } from '../ui/MadagascarVatCalculatorSection';
import { CommunalTaxesSection } from '../ui/CommunalTaxesSection';
import { FixedAssetsSection } from '../ui/FixedAssetsSection';
import { HumanResourcesSection } from '../ui/HumanResourcesSection';
import { RiskAnalysisSection } from '../ui/RiskAnalysisSection';
import { getResolvedKpiThresholds, getResolvedLogistics } from '../../utils/logistics';
import {
  Plus,
  Trash2,
  Calendar,
  Layers,
  ShoppingBag,
  DollarSign,
  Building,
  TrendingUp,
  AlertTriangle,
  Link2,
  History,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  ShieldAlert,
  Table2,
  SlidersHorizontal,
  Truck,
  BellRing,
  ShieldCheck,
} from 'lucide-react';

type DeletePending =
  | { type: 'costKg'; id: string; label: string }
  | { type: 'costRot'; id: string; label: string }
  | { type: 'fixed'; id: string; label: string }
  | { type: 'bag'; id: string; label: string }
  | null;

export const HypothesesTab: React.FC = () => {
  const {
    assumptions,
    model,
    validation,
    kpiAlerts,
    autoBalanceSeasons,
    setAutoBalanceSeasons,
    updateSeasonField,
    updateInvestmentField,
    updateGeneralField,
    updateKpiThresholds,
    updateVariableCostPerKg,
    addVariableCostPerKg,
    removeVariableCostPerKg,
    updateCostPerRotation,
    addCostPerRotation,
    removeCostPerRotation,
    updateFixedMonthlyCharge,
    addFixedMonthlyCharge,
    removeFixedMonthlyCharge,
    updateBagOption,
    addBagOption,
    removeBagOption,
    auditLog,
    clearAuditLog,
  } = useFinancial();

  // Add Cost / kg state
  const [newCostKgLabel, setNewCostKgLabel] = useState('');
  const [newCostKgHS, setNewCostKgHS] = useState<string>('');
  const [newCostKgBS, setNewCostKgBS] = useState<string>('');

  // Add Cost / rotation state
  const [newRotCostLabel, setNewRotCostLabel] = useState('');
  const [newRotCostHS, setNewRotCostHS] = useState<string>('');
  const [newRotCostBS, setNewRotCostBS] = useState<string>('');

  // Add Fixed charge state
  const [newFixChargeLabel, setNewFixChargeLabel] = useState('');
  const [newFixChargeAmount, setNewFixChargeAmount] = useState<string>('');

  // Add Bag option state
  const [newBagCapacity, setNewBagCapacity] = useState<string>('50');
  const [newBagPrice, setNewBagPrice] = useState<string>('1500');

  const [pendingDelete, setPendingDelete] = useState<DeletePending>(null);
  const [expressMode, setExpressMode] = useState(false);

  const totalFixedMonthly = assumptions.fixedMonthlyCharges.reduce((acc, f) => acc + f.amount, 0);
  const seasonMonthsWarning = validation.warnings.find((w) => w.field === 'seasons.totalMonths');
  const hsProfitAlert = validation.warnings.find(
    (w) => w.field.startsWith('hauteSaison.') && w.category === 'rentabilite'
  );
  const bsProfitAlert = validation.warnings.find(
    (w) => w.field.startsWith('basseSaison.') && w.category === 'rentabilite'
  );
  const profitabilityAlerts = validation.warnings.filter((w) => w.category === 'rentabilite');
  const hasCriticalProfitAlert = profitabilityAlerts.some((w) => w.severity === 'error');
  const diag = validation.diagnostics;
  const paddyHSTonnes = (assumptions.hauteSaison.paddyBoughtKgPerRotation / 1000).toFixed(1);

  const logistics = getResolvedLogistics(assumptions);
  const kpiThresholds = getResolvedKpiThresholds(assumptions);

  const handleConfirmDelete = () => {
    if (!pendingDelete) return;
    if (pendingDelete.type === 'costKg') removeVariableCostPerKg(pendingDelete.id);
    if (pendingDelete.type === 'costRot') removeCostPerRotation(pendingDelete.id);
    if (pendingDelete.type === 'fixed') removeFixedMonthlyCharge(pendingDelete.id);
    if (pendingDelete.type === 'bag') removeBagOption(pendingDelete.id);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Saisie & Modélisation des Hypothèses
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Toutes les modifications sont validées et recalculées en temps réel dans l’ensemble des modules.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setExpressMode((prev) => !prev)}
          aria-pressed={expressMode}
          className={`min-h-11 sm:min-h-10 px-4 py-2 rounded-xl border text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-2 shrink-0 transition-colors no-print ${
            expressMode
              ? 'border-indigo-500/45 bg-indigo-600 text-white hover:bg-indigo-500'
              : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {expressMode ? (
            <>
              <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Formulaire détaillé</span>
            </>
          ) : (
            <>
              <Table2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
              <span>Saisie express</span>
            </>
          )}
        </button>
      </div>

      {/* Panneau de validation intelligente de rentabilité en temps réel */}
      <section
        data-tour="hypotheses-alerts"
        role={profitabilityAlerts.length > 0 ? 'alert' : 'status'}
        aria-label="Contrôle intelligent de rentabilité en temps réel"
        className={`p-4 sm:p-5 rounded-xl border space-y-3 transition-colors ${
          hasCriticalProfitAlert
            ? 'border-rose-500/45 bg-rose-500/[0.07] dark:bg-rose-950/25'
            : profitabilityAlerts.length > 0
            ? 'border-amber-500/45 bg-amber-500/[0.08] dark:bg-amber-950/20'
            : 'border-emerald-500/30 bg-emerald-500/[0.05] dark:bg-emerald-950/15'
        }`}
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            {hasCriticalProfitAlert ? (
              <ShieldAlert className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : profitabilityAlerts.length > 0 ? (
              <AlertTriangle className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
            )}
            <div>
              <h2
                className={`text-sm font-semibold ${
                  hasCriticalProfitAlert
                    ? 'text-rose-900 dark:text-rose-200'
                    : profitabilityAlerts.length > 0
                    ? 'text-amber-900 dark:text-amber-200'
                    : 'text-emerald-900 dark:text-emerald-200'
                }`}
              >
                {hasCriticalProfitAlert
                  ? 'Alerte critique : risque de non-rentabilité détecté'
                  : profitabilityAlerts.length > 0
                  ? `${profitabilityAlerts.length} alerte${profitabilityAlerts.length > 1 ? 's' : ''} de vigilance sur la rentabilité`
                  : 'Contrôle intelligent : modèle rentable et marges unitaires positives'}
              </h2>
              <p className="text-xs text-zinc-700 dark:text-zinc-300 mt-0.5 font-mono tabular-nums">
                HS : coût variable net {formatAriary(diag.hsUnitCostPerRiceKg)}/kg vs vente{' '}
                {formatAriary(diag.hsSellingPricePerKg)}/kg · BS :{' '}
                {formatAriary(diag.bsUnitCostPerRiceKg)}/kg vs vente{' '}
                {formatAriary(diag.bsSellingPricePerKg)}/kg
              </p>
            </div>
          </div>

          <div className="text-xs font-mono tabular-nums text-zinc-700 dark:text-zinc-300 shrink-0">
            Résultat A1 avant IR :{' '}
            <strong
              className={
                diag.year1NetBeforeTaxAr > 0
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-rose-700 dark:text-rose-400'
              }
            >
              {formatAriary(diag.year1NetBeforeTaxAr)}
            </strong>
          </div>
        </div>

        {profitabilityAlerts.length > 0 && (
          <ul className="space-y-2 pt-2 border-t border-zinc-200/70 dark:border-white/[0.08]">
            {profitabilityAlerts.map((issue) => (
              <li
                key={`${issue.field}-${issue.title}`}
                className={`p-3 rounded-lg border text-xs space-y-1 ${
                  issue.severity === 'error'
                    ? 'border-rose-500/35 bg-white/80 dark:bg-zinc-950/60 text-rose-950 dark:text-rose-100'
                    : 'border-amber-500/35 bg-white/80 dark:bg-zinc-950/60 text-amber-950 dark:text-amber-100'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {issue.severity === 'error' ? (
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-700 dark:text-rose-400 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
                  )}
                  <span>{issue.title}</span>
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">{issue.message}</p>
                {issue.recommendation && (
                  <p className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Piste : {issue.recommendation}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {expressMode ? (
        <ExpressEntrySheet onExitExpress={() => setExpressMode(false)} />
      ) : (
        <>
          {/* Sélecteur de Région Rizicole à Madagascar (Transport & Rendement / ha) */}
          <RegionSelectorSection />

          {/* 1. Saisons & Volumes de Paddy */}
          <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>1. Cadence Saisonnière & Ventes de Riz</span>
          </h2>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer select-none min-h-10 px-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40">
            <input
              type="checkbox"
              checked={autoBalanceSeasons}
              onChange={(e) => setAutoBalanceSeasons(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded"
            />
            <Link2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Maintenir HS + BS = 12 mois</span>
          </label>
        </div>

        {seasonMonthsWarning && (
          <div
            role="alert"
            className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2"
          >
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-700 dark:text-amber-400" aria-hidden="true" />
            <span>{seasonMonthsWarning.message}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Haute Saison */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Haute Saison (HS)
              </div>
              <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                Coût var. {formatAriary(diag.hsUnitCostPerRiceKg)}/kg
              </span>
            </div>
            {hsProfitAlert && (
              <div
                role="alert"
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  hsProfitAlert.severity === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{hsProfitAlert.title}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Nombre de mois"
                unit="mois"
                tooltip="Durée de la Haute Saison dans l’année (période de récolte). Si le verrouillage 12 mois est actif, la Basse Saison s’ajuste automatiquement."
                error={validation.errors['hauteSaison.months']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="1"
                    max="11"
                    value={assumptions.hauteSaison.months}
                    onChange={(e) => updateSeasonField('hauteSaison', 'months', Number(e.target.value))}
                  />
                )}
              </FormField>

              <FormField
                label="Rotations / mois"
                unit="rotations / mois"
                tooltip="Nombre de cycles complets (achat paddy → usinage → vente riz) effectués par mois en Haute Saison. Total rotations = Mois × Rotations/mois."
                error={validation.errors['hauteSaison.rotationsPerMonth']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={assumptions.hauteSaison.rotationsPerMonth}
                    onChange={(e) =>
                      updateSeasonField('hauteSaison', 'rotationsPerMonth', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Paddy acheté / rot. (kg)"
                unit="kg de paddy / rotation"
                tooltip="Quantité brute de paddy achetée par rotation. Sert de base au calcul du BFR initial, du nombre de sacs et du tonnage de riz produit."
                error={validation.errors['hauteSaison.paddyBoughtKgPerRotation']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="100"
                    min="1"
                    value={assumptions.hauteSaison.paddyBoughtKgPerRotation}
                    onChange={(e) =>
                      updateSeasonField('hauteSaison', 'paddyBoughtKgPerRotation', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Rendement (0.70 = 70 %)"
                unit="ratio (0,01 à 1,00)"
                tooltip="Ratio de transformation Paddy → Riz blanc (Riz = Paddy × Rendement). Le complément (1 − Rendement) forme les sous-produits."
                error={validation.errors['hauteSaison.yieldPaddyToRice']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={assumptions.hauteSaison.yieldPaddyToRice}
                    onChange={(e) =>
                      updateSeasonField('hauteSaison', 'yieldPaddyToRice', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Prix vente riz (Ar/kg)"
                unit="Ar / kg"
                tooltip="Prix de vente unitaire du riz usiné en Haute Saison. Multiplié par le tonnage de riz obtenu par rotation."
                error={validation.errors['hauteSaison.riceSellingPriceArPerKg']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="50"
                    min="1"
                    value={assumptions.hauteSaison.riceSellingPriceArPerKg}
                    onChange={(e) =>
                      updateSeasonField('hauteSaison', 'riceSellingPriceArPerKg', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Sous-produits (Ar/kg)"
                unit="Ar / kg"
                tooltip="Prix moyen de revente du son de riz et résidus (Volume sous-produits = Paddy × (1 − Rendement))."
                error={validation.errors['hauteSaison.byproductSellingPriceArPerKg']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="50"
                    min="0"
                    value={assumptions.hauteSaison.byproductSellingPriceArPerKg}
                    onChange={(e) =>
                      updateSeasonField(
                        'hauteSaison',
                        'byproductSellingPriceArPerKg',
                        Number(e.target.value)
                      )
                    }
                  />
                )}
              </FormField>
            </div>
          </div>

          {/* Basse Saison */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                Basse Saison (BS)
              </div>
              <span className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                Coût var. {formatAriary(diag.bsUnitCostPerRiceKg)}/kg
              </span>
            </div>
            {bsProfitAlert && (
              <div
                role="alert"
                className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                  bsProfitAlert.severity === 'error'
                    ? 'border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-200'
                    : 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{bsProfitAlert.title}</span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="Nombre de mois"
                unit="mois"
                tooltip="Durée de la Basse Saison (période de soudure où le prix du paddy et du riz augmentent généralement)."
                error={validation.errors['basseSaison.months']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min="1"
                    max="11"
                    value={assumptions.basseSaison.months}
                    onChange={(e) => updateSeasonField('basseSaison', 'months', Number(e.target.value))}
                  />
                )}
              </FormField>

              <FormField
                label="Rotations / mois"
                unit="rotations / mois"
                tooltip="Cadence mensuelle des rotations commerciales durant la Basse Saison. Total rotations = Mois × Rotations/mois."
                error={validation.errors['basseSaison.rotationsPerMonth']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={assumptions.basseSaison.rotationsPerMonth}
                    onChange={(e) =>
                      updateSeasonField('basseSaison', 'rotationsPerMonth', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Paddy acheté / rot. (kg)"
                unit="kg de paddy / rotation"
                tooltip="Tonnage brut de paddy acheté par rotation en Basse Saison. Détermine le volume usiné et le nombre de sacs requis."
                error={validation.errors['basseSaison.paddyBoughtKgPerRotation']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="100"
                    min="1"
                    value={assumptions.basseSaison.paddyBoughtKgPerRotation}
                    onChange={(e) =>
                      updateSeasonField('basseSaison', 'paddyBoughtKgPerRotation', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Rendement (0.70 = 70 %)"
                unit="ratio (0,01 à 1,00)"
                tooltip="Taux de conversion du paddy en riz usiné durant la Basse Saison (Riz = Paddy × Rendement)."
                error={validation.errors['basseSaison.yieldPaddyToRice']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={assumptions.basseSaison.yieldPaddyToRice}
                    onChange={(e) =>
                      updateSeasonField('basseSaison', 'yieldPaddyToRice', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Prix vente riz (Ar/kg)"
                unit="Ar / kg"
                tooltip="Prix de vente unitaire du riz en Basse Saison, multiplié par la quantité de riz blanc produite."
                error={validation.errors['basseSaison.riceSellingPriceArPerKg']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="50"
                    min="1"
                    value={assumptions.basseSaison.riceSellingPriceArPerKg}
                    onChange={(e) =>
                      updateSeasonField('basseSaison', 'riceSellingPriceArPerKg', Number(e.target.value))
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Sous-produits (Ar/kg)"
                unit="Ar / kg"
                tooltip="Prix unitaire de valorisation du son et des sous-produits en Basse Saison."
                error={validation.errors['basseSaison.byproductSellingPriceArPerKg']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="50"
                    min="0"
                    value={assumptions.basseSaison.byproductSellingPriceArPerKg}
                    onChange={(e) =>
                      updateSeasonField(
                        'basseSaison',
                        'byproductSellingPriceArPerKg',
                        Number(e.target.value)
                      )
                    }
                  />
                )}
              </FormField>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Format & Choix des Sacs */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>2. Barème et Sélection des Sacs</span>
          </h2>
          <div className="flex items-center gap-2 text-xs">
            <LabelWithTooltip
              htmlFor="active-bag-select"
              label="Sac actif :"
              unit="kg / sac"
              align="right"
              tooltip="Format de sac sélectionné pour conditionner le paddy. Nombre de sacs = Arrondi supérieur(Paddy / Contenance)."
              className="text-zinc-600 dark:text-zinc-400 font-medium"
            />
            <SelectMenu
              id="active-bag-select"
              ariaLabel="Sélectionner le format de sac actif"
              value={String(assumptions.selectedBagCapacityKg)}
              onChange={(val) => updateGeneralField('selectedBagCapacityKg', Number(val))}
              tone="emerald"
              align="right"
              options={assumptions.bagOptions.map((b) => ({
                value: String(b.capacityKg),
                label: `${b.capacityKg} kg`,
                badge: `${b.unitPriceAr.toLocaleString('fr-FR')} Ar/sac`,
              }))}
              className="w-[215px]"
            />
          </div>
        </div>

        {/* Mobile Cards for Bags */}
        <div className="sm:hidden space-y-2.5">
          {assumptions.bagOptions.map((b) => {
            const bagsCount = Math.ceil(
              assumptions.hauteSaison.paddyBoughtKgPerRotation / (b.capacityKg > 0 ? b.capacityKg : 60)
            );
            const isSelected = b.capacityKg === assumptions.selectedBagCapacityKg;
            return (
              <div
                key={b.id}
                className={`p-3.5 rounded-xl border space-y-2.5 ${
                  isSelected
                    ? 'border-emerald-600/50 bg-emerald-500/10'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    Sac {b.capacityKg} kg {isSelected ? '· Actif' : ''}
                  </span>
                  {assumptions.bagOptions.length > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({
                          type: 'bag',
                          id: b.id,
                          label: `Format sac ${b.capacityKg} kg`,
                        })
                      }
                      aria-label={`Supprimer le sac de ${b.capacityKg} kg`}
                      className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <FormField
                    label="Contenance (kg)"
                    unit="kg / sac"
                    tooltip="Capacité d’un sac en kg. Détermine le nombre de sacs nécessaires : Arrondi.Sup(Paddy / Contenance)."
                    error={validation.errors[`bag.${b.id}.capacityKg`]}
                  >
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min="1"
                        value={b.capacityKg}
                        onChange={(e) => updateBagOption(b.id, 'capacityKg', Number(e.target.value))}
                      />
                    )}
                  </FormField>
                  <FormField
                    label="Prix / sac (Ar)"
                    unit="Ar / sac"
                    tooltip="Coût d’achat unitaire d’un sac vide. Multiplié par le nombre de sacs calculé par rotation."
                    error={validation.errors[`bag.${b.id}.unitPriceAr`]}
                  >
                    {(props) => (
                      <input
                        {...props}
                        type="number"
                        min="0"
                        step="50"
                        value={b.unitPriceAr}
                        onChange={(e) => updateBagOption(b.id, 'unitPriceAr', Number(e.target.value))}
                      />
                    )}
                  </FormField>
                </div>
                <div className="flex items-center justify-between text-xs font-mono pt-1 border-t border-zinc-200/70 dark:border-zinc-800">
                  <span className="text-zinc-600 dark:text-zinc-400 font-sans">
                    HS ({paddyHSTonnes} t) : {bagsCount} sacs
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-400">
                    {formatAriary(bagsCount * b.unitPriceAr)} / rot.
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop Table for Bags */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse font-mono">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2.5 px-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Contenance (kg)</span>
                    <Tooltip
                      align="left"
                      label="Contenance des sacs"
                      unit="kg / sac"
                      content="Capacité unitaire du sac. Sert à calculer le nombre exact de sacs nécessaires par rotation : Arrondi.Sup(Paddy / Contenance)."
                    />
                  </span>
                </th>
                <th className="py-2.5 px-3 font-semibold">
                  <span className="inline-flex items-center gap-1.5">
                    <span>Prix unitaire (Ar / sac)</span>
                    <Tooltip
                      align="left"
                      label="Prix unitaire par sac"
                      unit="Ar / sac"
                      content="Prix d’achat d’un sac vide. Le coût total d’emballage par rotation est égal au nombre de sacs × prix unitaire."
                    />
                  </span>
                </th>
                <th className="py-2.5 px-3 font-semibold">Sacs / rot. (HS {paddyHSTonnes} t)</th>
                <th className="py-2.5 px-3 font-semibold">Montant / rot.</th>
                <th className="py-2.5 px-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {assumptions.bagOptions.map((b) => {
                const bagsCount = Math.ceil(
                  assumptions.hauteSaison.paddyBoughtKgPerRotation / (b.capacityKg > 0 ? b.capacityKg : 60)
                );
                const isSelected = b.capacityKg === assumptions.selectedBagCapacityKg;
                return (
                  <tr key={b.id} className={isSelected ? 'bg-emerald-500/10 font-bold' : ''}>
                    <td className="py-2 px-3">
                      <label htmlFor={`bag-cap-${b.id}`} className="sr-only">
                        Contenance en kg
                      </label>
                      <input
                        id={`bag-cap-${b.id}`}
                        type="number"
                        min="1"
                        value={b.capacityKg}
                        onChange={(e) => updateBagOption(b.id, 'capacityKg', Number(e.target.value))}
                        className="w-24 min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      />{' '}
                      kg
                    </td>
                    <td className="py-2 px-3">
                      <label htmlFor={`bag-price-${b.id}`} className="sr-only">
                        Prix unitaire en Ariary
                      </label>
                      <input
                        id={`bag-price-${b.id}`}
                        type="number"
                        min="0"
                        step="50"
                        value={b.unitPriceAr}
                        onChange={(e) => updateBagOption(b.id, 'unitPriceAr', Number(e.target.value))}
                        className="w-28 min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm"
                      />{' '}
                      Ar
                    </td>
                    <td className="py-2 px-3 text-zinc-700 dark:text-zinc-300">{bagsCount} sacs</td>
                    <td className="py-2 px-3 text-emerald-700 dark:text-emerald-400">
                      {formatAriary(bagsCount * b.unitPriceAr)}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {assumptions.bagOptions.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setPendingDelete({
                              type: 'bag',
                              id: b.id,
                              label: `Format sac ${b.capacityKg} kg`,
                            })
                          }
                          aria-label={`Supprimer le sac de ${b.capacityKg} kg`}
                          className="min-h-9 min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Add Bag Option Form (previously unused state now wired!) */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const cap = Number(newBagCapacity);
            const price = Number(newBagPrice);
            if (cap > 0 && price >= 0) {
              addBagOption(cap, price);
              setNewBagCapacity('50');
              setNewBagPrice('1500');
            }
          }}
          className="pt-2 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2.5 items-end"
        >
          <div>
            <LabelWithTooltip
              htmlFor="new-bag-cap"
              label="Nouveau format (kg)"
              unit="kg / sac"
              tooltip="Contenance en kilogrammes du nouveau format de sac à ajouter au barème."
              className="text-xs text-zinc-600 dark:text-zinc-400"
            />
            <input
              id="new-bag-cap"
              type="number"
              min="1"
              required
              value={newBagCapacity}
              onChange={(e) => setNewBagCapacity(e.target.value)}
              className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
            />
          </div>
          <div>
            <LabelWithTooltip
              htmlFor="new-bag-price"
              label="Prix unitaire (Ar / sac)"
              unit="Ar / sac"
              tooltip="Prix d’achat unitaire du nouveau format de sac en Ariary."
              className="text-xs text-zinc-600 dark:text-zinc-400"
            />
            <input
              id="new-bag-price"
              type="number"
              min="0"
              step="50"
              required
              value={newBagPrice}
              onChange={(e) => setNewBagPrice(e.target.value)}
              className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 sm:min-h-10 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Ajouter format</span>
          </button>
        </form>
      </section>

      {/* 3 & 4. Coûts au kg de paddy & Coûts par rotation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Coûts par kg de paddy */}
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>3. Coûts par kg de paddy</span>
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">Ar / kg</span>
          </div>

          <div className="space-y-2.5">
            {assumptions.costsPerKgPaddy.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <label htmlFor={`costkg-label-${item.id}`} className="sr-only">
                    Libellé du poste
                  </label>
                  <input
                    id={`costkg-label-${item.id}`}
                    type="text"
                    value={item.label}
                    disabled={item.id === 'cost-paddy'}
                    onChange={(e) => updateVariableCostPerKg(item.id, 'label', e.target.value)}
                    className="flex-1 min-h-11 sm:min-h-9 px-2.5 py-1 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 disabled:opacity-75"
                  />
                  {item.id !== 'cost-paddy' && (
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({ type: 'costKg', id: item.id, label: item.label })
                      }
                      aria-label={`Supprimer ${item.label}`}
                      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <LabelWithTooltip
                      htmlFor={`costkg-hs-${item.id}`}
                      label="Haute Saison (Ar/kg)"
                      unit="Ar / kg de paddy"
                      tooltip="Coût unitaire en Haute Saison multiplié par la quantité de paddy achetée par rotation (kg)."
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    />
                    <input
                      id={`costkg-hs-${item.id}`}
                      type="number"
                      min="0"
                      value={item.costHS}
                      onChange={(e) =>
                        updateVariableCostPerKg(item.id, 'costHS', Number(e.target.value))
                      }
                      className="w-full min-h-11 sm:min-h-9 px-2.5 py-1 font-mono text-right text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                    />
                  </div>
                  <div>
                    <LabelWithTooltip
                      htmlFor={`costkg-bs-${item.id}`}
                      label="Basse Saison (Ar/kg)"
                      unit="Ar / kg de paddy"
                      tooltip="Coût unitaire en Basse Saison multiplié par la quantité de paddy achetée par rotation (kg)."
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    />
                    <input
                      id={`costkg-bs-${item.id}`}
                      type="number"
                      min="0"
                      value={item.costBS}
                      onChange={(e) =>
                        updateVariableCostPerKg(item.id, 'costBS', Number(e.target.value))
                      }
                      className="w-full min-h-11 sm:min-h-9 px-2.5 py-1 font-mono text-right text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                    />
                  </div>
                </div>
                {validation.errors[`costKg.${item.id}`] && (
                  <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                    {validation.errors[`costKg.${item.id}`]}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Add variable cost line with HS & BS inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newCostKgLabel.trim()) return;
              addVariableCostPerKg(newCostKgLabel, Number(newCostKgHS) || 0, Number(newCostKgBS) || 0);
              setNewCostKgLabel('');
              setNewCostKgHS('');
              setNewCostKgBS('');
            }}
            className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Ajouter un coût au kg
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label htmlFor="new-costkg-label" className="sr-only">
                  Libellé du nouveau coût au kg
                </label>
                <input
                  id="new-costkg-label"
                  type="text"
                  required
                  placeholder="Ex : Transport local / kg..."
                  value={newCostKgLabel}
                  onChange={(e) => setNewCostKgLabel(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
              <div>
                <LabelWithTooltip
                  htmlFor="new-costkg-hs"
                  label="Montant HS (Ar/kg)"
                  unit="Ar / kg de paddy"
                  tooltip="Coût variable additionnel appliqué à chaque kg de paddy en Haute Saison."
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                />
                <input
                  id="new-costkg-hs"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newCostKgHS}
                  onChange={(e) => setNewCostKgHS(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                />
              </div>
              <div>
                <LabelWithTooltip
                  htmlFor="new-costkg-bs"
                  label="Montant BS (Ar/kg)"
                  unit="Ar / kg de paddy"
                  tooltip="Coût variable additionnel appliqué à chaque kg de paddy en Basse Saison."
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                />
                <input
                  id="new-costkg-bs"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newCostKgBS}
                  onChange={(e) => setNewCostKgBS(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-12 sm:min-h-10 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Ajouter le poste</span>
            </button>
          </form>
        </section>

        {/* Coûts par rotation */}
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>4. Coûts par rotation</span>
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono">Ar / rotation</span>
          </div>

          {assumptions.costsPerRotation.length === 0 ? (
            <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-600 dark:text-zinc-400">
              Aucun frais par rotation configuré (hors achat des sacs). Ajoutez une ligne ci-dessous si besoin.
            </div>
          ) : (
            <div className="space-y-2.5">
              {assumptions.costsPerRotation.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <label htmlFor={`costrot-label-${item.id}`} className="sr-only">
                      Libellé du frais par rotation
                    </label>
                    <input
                      id={`costrot-label-${item.id}`}
                      type="text"
                      value={item.label}
                      onChange={(e) => updateCostPerRotation(item.id, 'label', e.target.value)}
                      className="flex-1 min-h-11 sm:min-h-9 px-2.5 py-1 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPendingDelete({ type: 'costRot', id: item.id, label: item.label })
                      }
                      aria-label={`Supprimer ${item.label}`}
                      className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  {item.id === 'rot-carburant' && logistics.enabled && (
                    <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>
                        Synchronisé avec « Logistique et Transport » ci-dessous (une saisie manuelle ici passe en mode manuel).
                      </span>
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <LabelWithTooltip
                        htmlFor={`costrot-hs-${item.id}`}
                        label="Haute Saison (Ar)"
                        unit="Ar / rotation"
                        tooltip="Montant forfaitaire imputé une fois à chaque rotation en Haute Saison, quel que soit le tonnage."
                        className="text-xs text-zinc-600 dark:text-zinc-400"
                      />
                      <input
                        id={`costrot-hs-${item.id}`}
                        type="number"
                        step="50000"
                        min="0"
                        value={item.costHS}
                        onChange={(e) =>
                          updateCostPerRotation(item.id, 'costHS', Number(e.target.value))
                        }
                        className="w-full min-h-11 sm:min-h-9 px-2.5 py-1 font-mono text-right text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                      />
                    </div>
                    <div>
                      <LabelWithTooltip
                        htmlFor={`costrot-bs-${item.id}`}
                        label="Basse Saison (Ar)"
                        unit="Ar / rotation"
                        tooltip="Montant forfaitaire imputé une fois à chaque rotation en Basse Saison."
                        className="text-xs text-zinc-600 dark:text-zinc-400"
                      />
                      <input
                        id={`costrot-bs-${item.id}`}
                        type="number"
                        step="50000"
                        min="0"
                        value={item.costBS}
                        onChange={(e) =>
                          updateCostPerRotation(item.id, 'costBS', Number(e.target.value))
                        }
                        className="w-full min-h-11 sm:min-h-9 px-2.5 py-1 font-mono text-right text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                      />
                    </div>
                  </div>
                  {validation.errors[`costRot.${item.id}`] && (
                    <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                      {validation.errors[`costRot.${item.id}`]}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Add rotation cost line with HS & BS inputs */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newRotCostLabel.trim()) return;
              addCostPerRotation(newRotCostLabel, Number(newRotCostHS) || 0, Number(newRotCostBS) || 0);
              setNewRotCostLabel('');
              setNewRotCostHS('');
              setNewRotCostBS('');
            }}
            className="pt-3 border-t border-zinc-200 dark:border-zinc-800 space-y-2"
          >
            <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              Ajouter un frais par rotation
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="sm:col-span-2">
                <label htmlFor="new-costrot-label" className="sr-only">
                  Libellé du frais par rotation
                </label>
                <input
                  id="new-costrot-label"
                  type="text"
                  required
                  placeholder="Ex : Prime transporteur..."
                  value={newRotCostLabel}
                  onChange={(e) => setNewRotCostLabel(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
                />
              </div>
              <div>
                <LabelWithTooltip
                  htmlFor="new-costrot-hs"
                  label="Montant HS (Ar)"
                  unit="Ar / rotation"
                  tooltip="Frais fixe imputé par rotation en Haute Saison (ex : location camion, manutention)."
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                />
                <input
                  id="new-costrot-hs"
                  type="number"
                  step="50000"
                  min="0"
                  placeholder="0"
                  value={newRotCostHS}
                  onChange={(e) => setNewRotCostHS(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                />
              </div>
              <div>
                <LabelWithTooltip
                  htmlFor="new-costrot-bs"
                  label="Montant BS (Ar)"
                  unit="Ar / rotation"
                  tooltip="Frais fixe imputé par rotation en Basse Saison."
                  className="text-xs text-zinc-600 dark:text-zinc-400"
                />
                <input
                  id="new-costrot-bs"
                  type="number"
                  step="50000"
                  min="0"
                  placeholder="0"
                  value={newRotCostBS}
                  onChange={(e) => setNewRotCostBS(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full sm:w-auto min-h-12 sm:min-h-10 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Ajouter le frais</span>
            </button>
          </form>
        </section>
      </div>

      {/* 4b. Logistique & Transport (Rizières -> Rizerie -> Marchés urbains) */}
      <LogisticsTransportModule />

      {/* 4c. Analyse d'impact climatique */}
      <ClimateImpactSection />

      {/* 4d. Gestion du risque de change (Ariary vs EUR/USD) */}
      <FxRiskSection />

      {/* 4e. Optimisation de stockage post-récolte */}
      <StorageOptimizationSection />

      {/* 4f. Gestion des stocks paddy/riz usiné & BFR */}
      <StockManagementBfrSection />

      {/* 5. Charges Fixes Mensuelles */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>5. Charges Fixes Mensuelles (Salaires, Loyer, Véhicule)</span>
          </h2>
          <div className="text-xs sm:text-sm font-mono font-bold text-emerald-700 dark:text-emerald-400">
            Total : {formatAriary(totalFixedMonthly)} / mois ({formatAriary(totalFixedMonthly * 12)} / an)
          </div>
        </div>

        {assumptions.fixedMonthlyCharges.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 text-center text-xs text-zinc-600 dark:text-zinc-400">
            Aucune charge fixe mensuelle saisie. Ajoutez une charge ci-dessous.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {assumptions.fixedMonthlyCharges.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/40 space-y-2"
              >
                <div className="flex items-center gap-2">
                  <label htmlFor={`fixed-label-${item.id}`} className="sr-only">
                    Libellé de la charge fixe
                  </label>
                  <input
                    id={`fixed-label-${item.id}`}
                    type="text"
                    value={item.label}
                    onChange={(e) => updateFixedMonthlyCharge(item.id, 'label', e.target.value)}
                    className="flex-1 min-h-11 sm:min-h-9 px-2.5 py-1 text-sm font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPendingDelete({ type: 'fixed', id: item.id, label: item.label })
                    }
                    aria-label={`Supprimer ${item.label}`}
                    className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 inline-flex items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:text-red-700 dark:hover:text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <LabelWithTooltip
                    htmlFor={`fixed-amount-${item.id}`}
                    label="Montant mensuel (Ar)"
                    unit="Ar / mois"
                    tooltip="Charge fixe récurrente chaque mois, additionnée pour former le coût fixe mensuel total utilisé dans le Break-Even et le résultat net."
                    className="text-xs text-zinc-600 dark:text-zinc-400"
                  />
                  <input
                    id={`fixed-amount-${item.id}`}
                    type="number"
                    step="10000"
                    min="0"
                    value={item.amount}
                    onChange={(e) =>
                      updateFixedMonthlyCharge(item.id, 'amount', Number(e.target.value))
                    }
                    className="w-full min-h-11 sm:min-h-9 px-2.5 py-1 font-mono text-right text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
                  />
                </div>
                {validation.errors[`fixed.${item.id}`] && (
                  <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                    {validation.errors[`fixed.${item.id}`]}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add fixed charge line */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newFixChargeLabel.trim()) return;
            addFixedMonthlyCharge(newFixChargeLabel, Number(newFixChargeAmount) || 0);
            setNewFixChargeLabel('');
            setNewFixChargeAmount('');
          }}
          className="pt-3 border-t border-zinc-200 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-[1fr_180px_auto] gap-2.5 items-end max-w-2xl"
        >
          <div>
            <label htmlFor="new-fixed-label" className="block text-xs text-zinc-600 dark:text-zinc-400 mb-1">
              Nouvelle charge fixe
            </label>
            <input
              id="new-fixed-label"
              type="text"
              required
              placeholder="Ex : Assurance entrepôt..."
              value={newFixChargeLabel}
              onChange={(e) => setNewFixChargeLabel(e.target.value)}
              className="w-full min-h-12 sm:min-h-10 px-3 py-2 text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900"
            />
          </div>
          <div>
            <LabelWithTooltip
              htmlFor="new-fixed-amount"
              label="Montant (Ar / mois)"
              unit="Ar / mois"
              tooltip="Montant mensuel de la nouvelle charge fixe. Sera multiplié par 12 pour le total annuel."
              className="text-xs text-zinc-600 dark:text-zinc-400"
            />
            <input
              id="new-fixed-amount"
              type="number"
              step="50000"
              min="0"
              placeholder="0"
              value={newFixChargeAmount}
              onChange={(e) => setNewFixChargeAmount(e.target.value)}
              className="w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 mt-1"
            />
          </div>
          <button
            type="submit"
            className="min-h-12 sm:min-h-10 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span>Ajouter</span>
          </button>
        </form>
      </section>

      {/* 6 & 7. Investissement, Fiscalité, Actualisation et Projections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>6. Investissement & Réserve de Sécurité</span>
          </h2>

          <div className="space-y-3">
            <FormField
              label="Matériel & Équipement initial (Ar)"
              unit="Ariary (Ar)"
              tooltip="Coût d’acquisition des balances, palettes et équipements de conditionnement inclus dans I₀."
              error={validation.errors['investment.materielAr']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="500000"
                  min="0"
                  value={assumptions.investment.materielAr}
                  onChange={(e) => updateInvestmentField('materielAr', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Frais d’enregistrement légal (Ar)"
              unit="Ariary (Ar)"
              tooltip="Frais administratifs, statutaires et d’immatriculation de la structure au démarrage, inclus dans I₀."
              error={validation.errors['investment.enregistrementAr']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="100000"
                  min="0"
                  value={assumptions.investment.enregistrementAr}
                  onChange={(e) => updateInvestmentField('enregistrementAr', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Cash buffer — trésorerie de secours (Ar)"
              unit="Ariary (Ar)"
              tooltip="Réserve de trésorerie ajoutée au BFR de la 1ère rotation HS pour absorber les imprévus initiaux dans I₀."
              error={validation.errors['investment.cashBufferAr']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="500000"
                  min="0"
                  value={assumptions.investment.cashBufferAr}
                  onChange={(e) => updateInvestmentField('cashBufferAr', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Volume moyen par client (kg / mois)"
              unit="kg / client / mois"
              tooltip="Sert à estimer le nombre minimal de clients actifs requis au point mort (Volume seuil mensuel ÷ Volume par client)."
              error={validation.errors['avgVolumePerClientKgMonthly']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="25"
                  min="1"
                  value={assumptions.avgVolumePerClientKgMonthly}
                  onChange={(e) =>
                    updateGeneralField('avgVolumePerClientKgMonthly', Number(e.target.value))
                  }
                />
              )}
            </FormField>
          </div>
        </section>

        <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>7. Fiscalité, Actualisation & Croissance</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Taux IR (0.20 = 20 %)"
              unit="ratio décimal (0,20 = 20 %)"
              tooltip="Impôt sur les Revenus (20 % selon la fiscalité malgache), appliqué uniquement lorsque le résultat avant impôt est positif."
              error={validation.errors['corporateTaxRate']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  min="0"
                  max="0.99"
                  value={assumptions.corporateTaxRate}
                  onChange={(e) => updateGeneralField('corporateTaxRate', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Taux actualisation r (0.12 = 12 %)"
              unit="taux annuel (0,12 = 12 %)"
              tooltip="Taux de rendement exigé utilisé pour actualiser les cash-flows futurs dans le calcul de la VAN et comme seuil de décision du TRI."
              error={validation.errors['discountRate']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={assumptions.discountRate}
                  onChange={(e) => updateGeneralField('discountRate', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Part Investisseur (0.70 = 70 %)"
              unit="ratio (0,00 à 1,00)"
              tooltip="Quote-part du bénéfice net après IR distribuée à l’investisseur ; le solde (1 − Part) revient à la société."
              error={validation.errors['investorShare']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.05"
                  min="0"
                  max="1"
                  value={assumptions.investorShare}
                  onChange={(e) => updateGeneralField('investorShare', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Croissance Réaliste A2 (0.48)"
              unit="taux annuel (0,48 = +48 %)"
              tooltip="Taux de croissance appliqué au flux net après IR de l’Année 1 pour projeter l’Année 2 (CF A2 = CF A1 × (1 + g₂))."
              error={validation.errors['growthRateYear2']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  value={assumptions.growthRateYear2}
                  onChange={(e) => updateGeneralField('growthRateYear2', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Croissance Réaliste A3 (0.60)"
              unit="taux annuel (0,60 = +60 %)"
              tooltip="Taux de croissance appliqué au flux net de l’Année 2 pour projeter l’Année 3 (CF A3 = CF A2 × (1 + g₃))."
              error={validation.errors['growthRateYear3']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  value={assumptions.growthRateYear3}
                  onChange={(e) => updateGeneralField('growthRateYear3', Number(e.target.value))}
                />
              )}
            </FormField>

            <FormField
              label="Croissance Ambitieuse A2 (0.98)"
              unit="taux annuel (0,98 = +98 %)"
              tooltip="Taux de croissance accéléré appliqué au flux net A1 pour projeter l’Année 2 dans le scénario Ambitieux."
              error={validation.errors['ambitiousGrowthRateYear2']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  value={assumptions.ambitiousGrowthRateYear2}
                  onChange={(e) =>
                    updateGeneralField('ambitiousGrowthRateYear2', Number(e.target.value))
                  }
                />
              )}
            </FormField>

            <FormField
              label="Croissance Ambitieuse A3 (0.60)"
              unit="taux annuel (0,60 = +60 %)"
              tooltip="Taux de croissance appliqué au flux net Ambitieux A2 pour projeter l’Année 3."
              error={validation.errors['ambitiousGrowthRateYear3']}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  step="0.01"
                  value={assumptions.ambitiousGrowthRateYear3}
                  onChange={(e) =>
                    updateGeneralField('ambitiousGrowthRateYear3', Number(e.target.value))
                  }
                />
              )}
            </FormField>
          </div>

          {/* Seuils d'alerte KPI (Tableau de bord) */}
          <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BellRing className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
                <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Seuils d’alerte KPI (Tableau de bord)
                </h3>
              </div>
              <span
                className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                  kpiAlerts.hasAnyBreach
                    ? 'border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                    : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {kpiAlerts.hasAnyBreach ? (
                  <>
                    <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                    <span>{kpiAlerts.breachedItems.length} alerte(s) active(s)</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Tous les seuils respectés</span>
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              <FormField
                label="Marge nette min (%)"
                unit="% du CA (ex : 8)"
                tooltip="Si la marge nette après IR (Résultat net / CA) tombe sous ce seuil, une alerte visuelle se déclenche sur le Tableau de bord."
                error={validation.errors['kpiThresholds.minNetMarginRate']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="1"
                    min="-50"
                    max="90"
                    value={Number(((kpiThresholds.minNetMarginRate ?? 0.08) * 100).toFixed(1))}
                    onChange={(e) =>
                      updateKpiThresholds({
                        minNetMarginRate: (Number(e.target.value) || 0) / 100,
                      })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Marge opérationnelle min (%)"
                unit="% du CA (ex : 10)"
                tooltip="Si la marge opérationnelle avant IR (EBIT / CA) passe sous ce pourcentage, une alerte visuelle se déclenche sur le Tableau de bord."
                error={validation.errors['kpiThresholds.minOperatingMarginRate']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="1"
                    min="-50"
                    max="90"
                    value={Number(((kpiThresholds.minOperatingMarginRate ?? 0.1) * 100).toFixed(1))}
                    onChange={(e) =>
                      updateKpiThresholds({
                        minOperatingMarginRate: (Number(e.target.value) || 0) / 100,
                      })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Marge brute min (%)"
                unit="% du CA (ex : 20)"
                tooltip="Si la marge brute sur achats & usinage descend sous ce pourcentage, une alerte visuelle s'affiche sur le Tableau de bord."
                error={validation.errors['kpiThresholds.minGrossMarginRate']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="1"
                    min="-50"
                    max="90"
                    value={Number(((kpiThresholds.minGrossMarginRate ?? 0.2) * 100).toFixed(1))}
                    onChange={(e) =>
                      updateKpiThresholds({
                        minGrossMarginRate: (Number(e.target.value) || 0) / 100,
                      })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="VAN minimale (Ar)"
                unit="Ariary (Ar)"
                tooltip="Si la VAN à 3 ans passe sous ce montant, une alerte rouge s'affiche sur le Tableau de bord."
                error={validation.errors['kpiThresholds.minNpvAr']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="1000000"
                    value={kpiThresholds.minNpvAr}
                    onChange={(e) =>
                      updateKpiThresholds({ minNpvAr: Number(e.target.value) })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="TRI minimal (ratio)"
                unit="ex : 0,12 = 12 %"
                tooltip="Taux de rentabilité interne minimal exigé (exprimé en ratio décimal : 0,12 = 12 %)."
                error={validation.errors['kpiThresholds.minIrrRate']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="0.01"
                    min="0"
                    max="5"
                    value={kpiThresholds.minIrrRate}
                    onChange={(e) =>
                      updateKpiThresholds({ minIrrRate: Number(e.target.value) })
                    }
                  />
                )}
              </FormField>

              <FormField
                label="Payback max (mois)"
                unit="mois tolérés"
                tooltip="Durée maximale tolérée pour récupérer le capital investi I₀ avant déclenchement d'une alerte."
                error={validation.errors['kpiThresholds.maxPaybackMonths']}
              >
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    step="1"
                    min="1"
                    max="120"
                    value={kpiThresholds.maxPaybackMonths}
                    onChange={(e) =>
                      updateKpiThresholds({ maxPaybackMonths: Number(e.target.value) })
                    }
                  />
                )}
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 text-[11px] font-mono tabular-nums">
              {[
                kpiAlerts.items.netMargin,
                kpiAlerts.items.operatingMargin,
                kpiAlerts.items.grossMargin,
                kpiAlerts.items.van,
                kpiAlerts.items.tri,
                kpiAlerts.items.payback,
              ].map((item) => (
                <div
                  key={item.id}
                  className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 ${
                    item.breached
                      ? 'border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-200'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span className="font-sans font-semibold truncate">{item.label}</span>
                  <span className="font-bold shrink-0">
                    {item.actualFormatted} ({item.breached ? 'Alerte' : 'OK'})
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
        </>
      )}

      {/* 8. Gestion des aides et subventions */}
      <SubsidiesSection />

      {/* 9. Traçabilité et Certifications (Bio / Équitable / IGP) */}
      <TraceabilityCertificationSection />

      {/* 10. Stress-Test Opérationnel (Chocs Exogènes Madagascar — Impact Trésorerie) */}
      <OperationalStressTestSection />

      {/* 11. Calculateur d'Inflation Agricole Madagascar (Indexation 5 ans) */}
      <AgriculturalInflationSection />

      {/* 12. Plan de Remboursement — Prêts Bancaires & IMF Agricoles */}
      <LoanRepaymentSection />

      {/* 13. Calculatrice TVA Agricole Madagascar (Intrants & Extrants) */}
      <MadagascarVatCalculatorSection />

      {/* 14. Taxes communales et redevances foncières */}
      <CommunalTaxesSection />

      {/* 15. Gestion des Actifs Immobilisés & Dotations aux Amortissements */}
      <FixedAssetsSection />

      {/* 16. Planification des Ressources Humaines saisonnières */}
      <HumanResourcesSection />

      {/* 17. Analyse des Risques Opérationnels & Perte Espérée */}
      <RiskAnalysisSection />

      {/* Audit de Conformité (Standards Filière Riz Madagascar) */}
      <ComplianceAuditSection />

      {/* Analyse PESTEL (Madagascar — Filière Riz) */}
      <PestelAnalysisSection />

      {/* Journal des modifications (Audit Log — 3 dernières valeurs modifiées) */}
      <section
        aria-label="Journal des modifications récentes"
        className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3 no-print"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800/80">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <div>
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Journal des modifications récentes (Audit Log)
              </h2>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                Suivi automatique des 3 dernières valeurs ajustées dans vos hypothèses.
              </p>
            </div>
          </div>

          {auditLog.length > 0 && (
            <button
              type="button"
              onClick={clearAuditLog}
              className="self-start sm:self-auto min-h-9 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Vider l’historique</span>
            </button>
          )}
        </div>

        {auditLog.length === 0 ? (
          <div className="p-4 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 text-center text-xs text-zinc-600 dark:text-zinc-400">
            Aucune modification récente enregistrée. Ajustez une variable ci-dessus ou dans le Simulateur Rapide pour tracer vos changements.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
            {auditLog.slice(0, 3).map((entry, idx) => {
              const timeStr = new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              });
              return (
                <li
                  key={entry.id}
                  className="py-2.5 first:pt-1 last:pb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-mono font-bold text-[11px] shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {entry.fieldLabel}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">
                        <span>{timeStr}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-sans">{entry.source}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-mono tabular-nums pl-8 sm:pl-0 shrink-0">
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 line-through">
                      {entry.oldValue}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                      {entry.newValue}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        onClose={() => setPendingDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Supprimer cette ligne ?"
        message={`Voulez-vous vraiment retirer « ${pendingDelete?.label || ''} » du modèle ? Le recalcul sera immédiat.`}
        confirmLabel="Supprimer"
      />
    </div>
  );
};
