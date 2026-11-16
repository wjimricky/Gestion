import React, { useMemo, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { RoadCondition } from '../../types/finance';
import {
  computeDistanceProfitabilitySimulation,
  computeSeasonLogisticsBreakdown,
  computeUrbanDistributionBreakdown,
  CORRIDOR_LOGISTICS_PRESETS,
  getResolvedLogistics,
  ROAD_CONDITION_META,
} from '../../utils/logistics';
import { formatAriary, formatPercent } from '../../utils/formatters';
import { FormField } from './FormField';
import { LabelWithTooltip, Tooltip } from './Tooltip';
import { SelectMenu } from './SelectMenu';
import { MachineMaintenanceCalendar } from './MachineMaintenanceCalendar';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import {
  Truck,
  CheckCircle2,
  SlidersHorizontal,
  MapPin,
  Route,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';

export const LogisticsTransportModule: React.FC = () => {
  const { assumptions, model, validation, updateLogistics, theme } = useFinancial();
  const isDarkMode = theme === 'dark';
  const [showCurve, setShowCurve] = useState(true);

  const logistics = getResolvedLogistics(assumptions);

  const logisticsHS = computeSeasonLogisticsBreakdown(logistics, 'hauteSaison');
  const logisticsBS = computeSeasonLogisticsBreakdown(logistics, 'basseSaison');

  const hsRiceKgPerRot =
    assumptions.hauteSaison.paddyBoughtKgPerRotation * assumptions.hauteSaison.yieldPaddyToRice;
  const bsRiceKgPerRot =
    assumptions.basseSaison.paddyBoughtKgPerRotation * assumptions.basseSaison.yieldPaddyToRice;

  const urbanHS = computeUrbanDistributionBreakdown(logistics, hsRiceKgPerRot, 'hauteSaison');
  const urbanBS = computeUrbanDistributionBreakdown(logistics, bsRiceKgPerRot, 'basseSaison');

  const annualCollectionAr =
    logisticsHS.totalCostPerRotationAr * model.hauteSaison.totalRotations +
    logisticsBS.totalCostPerRotationAr * model.basseSaison.totalRotations;

  const annualUrbanAr = logistics.includeUrbanDistribution
    ? urbanHS.totalCostPerRotationAr * model.hauteSaison.totalRotations +
      urbanBS.totalCostPerRotationAr * model.basseSaison.totalRotations
    : 0;

  const annualTotalLogisticsAr = annualCollectionAr + annualUrbanAr;
  const logisticsShareOfOps =
    model.year1.totalPurchaseAndOperatingCostsAr > 0
      ? annualTotalLogisticsAr / model.year1.totalPurchaseAndOperatingCostsAr
      : 0;

  const distanceSim = useMemo(
    () => computeDistanceProfitabilitySimulation(assumptions, logistics),
    [assumptions, logistics]
  );

  const roadConditionOptions = (Object.keys(ROAD_CONDITION_META) as RoadCondition[]).map(
    (key) => ({
      value: key,
      label: ROAD_CONDITION_META[key].label,
      badge: `×${ROAD_CONDITION_META[key].multiplier.toFixed(2)}`,
      description: ROAD_CONDITION_META[key].description,
    })
  );

  const gridStroke = isDarkMode ? 'rgba(255,255,255,0.08)' : '#e4e4e7';
  const axisTickColor = isDarkMode ? '#a1a1aa' : '#52525b';

  return (
    <section
      aria-label="Logistique et Transport : collecte rizières vers rizerie et distribution marchés urbains"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4"
    >
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Truck className="w-4 h-4 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                4b. Logistique &amp; Transport (Rizières → Rizerie → Marchés Urbains)
              </h2>
              <Tooltip
                label="Logistique bi-segment"
                content="Segment 1 : collecte aller-retour rizières → rizerie (carburant, état des pistes, usure). Segment 2 optionnel : fret riz usiné rizerie → marchés urbains (Ar/tonne·km + péages/manutention)."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Simule l’impact de l’éloignement des rizières et de la distribution vers les pôles urbains sur les coûts par rotation et la rentabilité.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => updateLogistics({ enabled: !logistics.enabled })}
          aria-pressed={logistics.enabled}
          className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 shrink-0 whitespace-nowrap transition-colors ${
            logistics.enabled
              ? 'border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/15'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {logistics.enabled ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
          )}
          <span>
            {logistics.enabled
              ? 'Impact Compte de Résultat : Actif'
              : 'Mode manuel (synchroniser)'}
          </span>
        </button>
      </div>

      {/* Corridors logistiques Madagascar préconfigurés */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          <Route className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
          <span>Corridors rizicoles types (Madagascar)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
          {CORRIDOR_LOGISTICS_PRESETS.map((preset) => {
            const active = logistics.corridorPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  updateLogistics({
                    ...preset.patch,
                    enabled: true,
                  })
                }
                className={`text-left p-2.5 rounded-lg border transition-colors ${
                  active
                    ? 'border-indigo-500/60 bg-indigo-500/10 dark:bg-indigo-500/15'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-800/60'
                }`}
              >
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  {preset.label}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-indigo-700 dark:text-indigo-300 mt-0.5">
                  {preset.routeSummary}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Paramètres véhicule & carburant communs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField
          label="Prix du gasoil (Ar / L)"
          unit="Ar / litre"
          tooltip="Prix du gasoil à la pompe (Madagascar). Appliqué au volume consommé par aller-retour de collecte."
          error={validation.errors['logistics.fuelPriceArPerLiter']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="100"
              min="0"
              value={logistics.fuelPriceArPerLiter}
              onChange={(e) =>
                updateLogistics({
                  fuelPriceArPerLiter: Number(e.target.value),
                  corridorPresetId: 'custom',
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Consommation camion (L / 100 km)"
          unit="litres / 100 km"
          tooltip="Consommation nominale en charge sur route bitumée, majorée par le coefficient d'état de route."
          error={validation.errors['logistics.fuelConsumptionLPer100Km']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="1"
              min="0"
              value={logistics.fuelConsumptionLPer100Km}
              onChange={(e) =>
                updateLogistics({
                  fuelConsumptionLPer100Km: Number(e.target.value),
                  corridorPresetId: 'custom',
                })
              }
            />
          )}
        </FormField>

        <FormField
          label="Usure, péages & chauffeur (Ar / km)"
          unit="Ar / km A/R"
          tooltip="Coût d'entretien, pneumatiques, péages et indemnités kilométriques rapportés au kilomètre aller-retour."
          error={validation.errors['logistics.truckTollAndWearArPerKm']}
        >
          {(props) => (
            <input
              {...props}
              type="number"
              step="50"
              min="0"
              value={logistics.truckTollAndWearArPerKm}
              onChange={(e) =>
                updateLogistics({
                  truckTollAndWearArPerKm: Number(e.target.value),
                  corridorPresetId: 'custom',
                })
              }
            />
          )}
        </FormField>
      </div>

      {/* Segment 1 : Collecte Rizières -> Rizerie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[
          {
            key: 'HS' as const,
            title: 'Segment 1 · Collecte Haute Saison (HS)',
            subtitle: `${model.hauteSaison.totalRotations} rotations / an`,
            distance: logistics.distanceOneWayKmHS,
            road: logistics.roadConditionHS,
            breakdown: logisticsHS,
            rotations: model.hauteSaison.totalRotations,
            distError: validation.errors['logistics.distanceOneWayKmHS'],
            onDistanceChange: (val: number) =>
              updateLogistics({ distanceOneWayKmHS: val, corridorPresetId: 'custom' }),
            onRoadChange: (val: RoadCondition) =>
              updateLogistics({ roadConditionHS: val, corridorPresetId: 'custom' }),
            accentClass: 'text-indigo-700 dark:text-indigo-400',
          },
          {
            key: 'BS' as const,
            title: 'Segment 1 · Collecte Basse Saison (BS)',
            subtitle: `${model.basseSaison.totalRotations} rotations / an`,
            distance: logistics.distanceOneWayKmBS,
            road: logistics.roadConditionBS,
            breakdown: logisticsBS,
            rotations: model.basseSaison.totalRotations,
            distError: validation.errors['logistics.distanceOneWayKmBS'],
            onDistanceChange: (val: number) =>
              updateLogistics({ distanceOneWayKmBS: val, corridorPresetId: 'custom' }),
            onRoadChange: (val: RoadCondition) =>
              updateLogistics({ roadConditionBS: val, corridorPresetId: 'custom' }),
            accentClass: 'text-teal-700 dark:text-teal-400',
          },
        ].map((seasonCfg) => {
          const seasonTotalAr = seasonCfg.breakdown.totalCostPerRotationAr * seasonCfg.rotations;
          return (
            <div
              key={seasonCfg.key}
              className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider ${seasonCfg.accentClass}`}>
                  {seasonCfg.title}
                </span>
                <span className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                  {seasonCfg.subtitle}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField
                  label="Distance rizières → rizerie (km)"
                  unit="km (aller)"
                  tooltip="Distance aller simple entre la zone de collecte de paddy et la rizerie (doublée automatiquement pour l'aller-retour)."
                  error={seasonCfg.distError}
                >
                  {(props) => (
                    <input
                      {...props}
                      type="number"
                      step="5"
                      min="0"
                      value={seasonCfg.distance}
                      onChange={(e) => seasonCfg.onDistanceChange(Number(e.target.value))}
                    />
                  )}
                </FormField>

                <div className="space-y-1">
                  <LabelWithTooltip
                    htmlFor={`logistics-road-${seasonCfg.key}`}
                    label="État des routes"
                    tooltip="Applique un coefficient de surconsommation et d'usure selon la praticabilité de l'axe."
                    className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
                  />
                  <SelectMenu
                    id={`logistics-road-${seasonCfg.key}`}
                    ariaLabel={`État des routes pour ${seasonCfg.title}`}
                    value={seasonCfg.road}
                    onChange={(val) => seasonCfg.onRoadChange(val as RoadCondition)}
                    options={roadConditionOptions}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] text-xs font-mono tabular-nums">
                <div>
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Aller-retour</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {seasonCfg.breakdown.roundTripKm.toLocaleString('fr-FR')} km
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Gasoil / rot.</div>
                  <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {seasonCfg.breakdown.litersPerRotation.toFixed(1)} L
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Coût / rot.</div>
                  <div className="font-bold text-zinc-900 dark:text-white">
                    {formatAriary(seasonCfg.breakdown.totalCostPerRotationAr)}
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Total saison</div>
                  <div className={`font-bold ${seasonCfg.accentClass}`}>
                    {formatAriary(seasonTotalAr, { inMillions: true })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Segment 2 : Distribution Rizerie -> Marchés Urbains */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-200/70 dark:border-white/[0.06]">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" aria-hidden="true" />
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Segment 2 · Distribution Rizerie → Marchés Urbains
                </span>
                <Tooltip
                  label="Fret aval vers marchés urbains"
                  content="Calcule le transport du riz blanc usiné vers les centres de consommation (ex: Antananarivo, Toamasina, Mahajanga) en Ar / tonne·km multiplié par l'état de la route."
                />
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Base Excel par défaut désactivée (vente départ rizerie). Activez pour intégrer le fret vers les grossistes urbains.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              updateLogistics({
                includeUrbanDistribution: !logistics.includeUrbanDistribution,
              })
            }
            aria-pressed={Boolean(logistics.includeUrbanDistribution)}
            className={`min-h-9 px-3 py-1.5 rounded-lg border text-xs font-semibold shrink-0 whitespace-nowrap transition-colors ${
              logistics.includeUrbanDistribution
                ? 'border-amber-500/45 bg-amber-500/15 text-amber-800 dark:text-amber-300 hover:bg-amber-500/20'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {logistics.includeUrbanDistribution
              ? 'Fret urbain intégré au modèle'
              : 'Activer transport marchés urbains'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <FormField
            label="Distance marché urbain HS (km)"
            unit="km"
            error={validation.errors['logistics.distanceToUrbanMarketKmHS']}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="10"
                min="0"
                value={logistics.distanceToUrbanMarketKmHS ?? 180}
                onChange={(e) =>
                  updateLogistics({
                    distanceToUrbanMarketKmHS: Number(e.target.value),
                    corridorPresetId: 'custom',
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Distance marché urbain BS (km)"
            unit="km"
            error={validation.errors['logistics.distanceToUrbanMarketKmBS']}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="10"
                min="0"
                value={logistics.distanceToUrbanMarketKmBS ?? 180}
                onChange={(e) =>
                  updateLogistics({
                    distanceToUrbanMarketKmBS: Number(e.target.value),
                    corridorPresetId: 'custom',
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Tarif fret routier (Ar / t·km)"
            unit="Ar / tonne·km"
            error={validation.errors['logistics.urbanFreightArPerTonKm']}
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="10"
                min="0"
                value={logistics.urbanFreightArPerTonKm ?? 320}
                onChange={(e) =>
                  updateLogistics({
                    urbanFreightArPerTonKm: Number(e.target.value),
                    corridorPresetId: 'custom',
                  })
                }
              />
            )}
          </FormField>

          <FormField
            label="Manutention & octroi / rot."
            unit="Ar / rotation"
          >
            {(props) => (
              <input
                {...props}
                type="number"
                step="5000"
                min="0"
                value={logistics.urbanHandlingAndTollArPerRot ?? 45000}
                onChange={(e) =>
                  updateLogistics({
                    urbanHandlingAndTollArPerRot: Number(e.target.value),
                    corridorPresetId: 'custom',
                  })
                }
              />
            )}
          </FormField>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <LabelWithTooltip
              htmlFor="urban-road-hs"
              label="État axe urbain (Haute Saison)"
              tooltip="Praticabilité du corridor routier entre la rizerie et le marché urbain en Haute Saison."
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            />
            <SelectMenu
              id="urban-road-hs"
              ariaLabel="État axe urbain Haute Saison"
              value={logistics.urbanRoadConditionHS ?? 'goudronnee'}
              onChange={(val) =>
                updateLogistics({ urbanRoadConditionHS: val as RoadCondition, corridorPresetId: 'custom' })
              }
              options={roadConditionOptions}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <LabelWithTooltip
              htmlFor="urban-road-bs"
              label="État axe urbain (Basse Saison)"
              tooltip="Praticabilité du corridor routier entre la rizerie et le marché urbain en Basse Saison (pluies)."
              className="text-xs font-medium text-zinc-700 dark:text-zinc-300"
            />
            <SelectMenu
              id="urban-road-bs"
              ariaLabel="État axe urbain Basse Saison"
              value={logistics.urbanRoadConditionBS ?? 'goudronnee'}
              onChange={(val) =>
                updateLogistics({ urbanRoadConditionBS: val as RoadCondition, corridorPresetId: 'custom' })
              }
              options={roadConditionOptions}
              className="w-full"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-200/70 dark:border-white/[0.06] text-xs font-mono tabular-nums">
          <div>
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Riz livré / rot. (HS/BS)</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {urbanHS.riceTonsPerRotation.toFixed(1)} t · {urbanBS.riceTonsPerRotation.toFixed(1)} t
            </div>
          </div>
          <div>
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Fret urbain HS / rot.</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatAriary(urbanHS.totalCostPerRotationAr)}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Fret urbain BS / rot.</div>
            <div className="font-semibold text-zinc-900 dark:text-zinc-100">
              {formatAriary(urbanBS.totalCostPerRotationAr)}
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-[10px] font-sans text-zinc-500 dark:text-zinc-400">Coût urbain annuel</div>
            <div className="font-bold text-amber-700 dark:text-amber-400">
              {logistics.includeUrbanDistribution
                ? formatAriary(annualUrbanAr, { inMillions: true })
                : `${formatAriary(
                    urbanHS.totalCostPerRotationAr * model.hauteSaison.totalRotations +
                      urbanBS.totalCostPerRotationAr * model.basseSaison.totalRotations,
                    { inMillions: true }
                  )} (sim.)`}
            </div>
          </div>
        </div>
      </div>

      {/* Synthèse annuelle d'impact sur le Compte de Résultat */}
      <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-100/70 dark:bg-[#141322] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="space-y-0.5">
          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
            {logistics.enabled
              ? 'Impact direct appliqué au Compte de Résultat (Année 1)'
              : 'Simulation logistique déconnectée (frais par rotation manuels utilisés)'}
          </div>
          <p className="text-[11px] text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            Collecte paddy : {formatAriary(annualCollectionAr, { inMillions: true })}
            {logistics.includeUrbanDistribution
              ? ` · Fret marchés urbains : ${formatAriary(annualUrbanAr, { inMillions: true })}`
              : ' · Fret marchés urbains : non intégré'}
            {' · '}Coût unitaire : {Math.round(distanceSim.logisticsCostPerKgRiceAr).toLocaleString('fr-FR')} Ar/kg riz
          </p>
        </div>
        <div className="font-mono tabular-nums text-left sm:text-right shrink-0">
          <div className="text-sm font-bold text-zinc-900 dark:text-white">
            {formatAriary(annualTotalLogisticsAr)} / an
          </div>
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            soit {formatPercent(logisticsShareOfOps, 1)} des coûts d’exploitation
          </div>
        </div>
      </div>

      {/* Courbe de sensibilité distance totale -> Rentabilité */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/30 p-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
              Impact de la distance totale (Collecte + Urbain) sur le Résultat Net &amp; la VAN
            </h3>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5 font-mono tabular-nums">
              Distance moyenne actuelle : {distanceSim.currentAvgTotalKm} km ·{' '}
              {distanceSim.breakEvenDistanceKm !== null ? (
                <span className="text-amber-700 dark:text-amber-400 font-semibold">
                  Seuil critique rentabilité ≈ {distanceSim.breakEvenDistanceKm} km
                </span>
              ) : (
                <span className="text-emerald-700 dark:text-emerald-400">
                  Rentable sur l’ensemble de la plage testée (25 – 650 km)
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCurve((v) => !v)}
            className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 self-start sm:self-auto"
          >
            <span>{showCurve ? 'Masquer la courbe' : 'Afficher la courbe'}</span>
            {showCurve ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {distanceSim.breakEvenDistanceKm !== null &&
          distanceSim.currentAvgTotalKm > distanceSim.breakEvenDistanceKm && (
            <div className="p-2.5 rounded-lg border border-rose-500/35 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                Attention : la distance totale actuelle ({distanceSim.currentAvgTotalKm} km) dépasse le seuil critique d’équilibre ({distanceSim.breakEvenDistanceKm} km).
              </span>
            </div>
          )}

        {showCurve && (
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={distanceSim.points} margin={{ top: 10, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                  tickFormatter={(v) => `${v} M`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: axisTickColor, fontSize: 11 }}
                  axisLine={{ stroke: gridStroke }}
                  tickFormatter={(v) => `${v}%`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: isDarkMode ? '#141322' : '#ffffff',
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.12)' : '#e4e4e7',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                  }}
                  formatter={(val: unknown, name: unknown) => {
                    const num = Number(val ?? 0);
                    const label = String(name ?? '');
                    if (label.includes('Marge')) return [`${num.toFixed(1)} %`, label];
                    return [`${num.toFixed(2)} M Ar`, label];
                  }}
                />
                <ReferenceLine yAxisId="left" y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Bar
                  yAxisId="left"
                  dataKey="annualLogisticsCostMAr"
                  name="Coût transport annuel (M Ar)"
                  fill={isDarkMode ? '#4f46e5' : '#6366f1'}
                  fillOpacity={0.32}
                  radius={[4, 4, 0, 0]}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="netResultAfterTaxMAr"
                  name="Résultat Net A1 (M Ar)"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="npvMAr"
                  name="VAN 3 ans (M Ar)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="4 2"
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="netMarginPct"
                  name="Marge nette (%)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Calendrier de Maintenance des Machines */}
      <MachineMaintenanceCalendar />
    </section>
  );
};
