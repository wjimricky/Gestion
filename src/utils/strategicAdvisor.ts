import { calculateFullModel } from '../engine/calculator';
import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import {
  applyClimateAndStorageToSeasons,
  computeStorageWeightLossRate,
  getResolvedStorageOptimization,
} from './storage';
import { getResolvedClimateImpact } from './climate';
import {
  computeSeasonLogisticsBreakdown,
  getResolvedLogistics,
} from './logistics';

export interface StrategicRecommendation {
  id: string;
  title: string;
  badge: string;
  priority: 'critique' | 'haute' | 'opportunite';
  diagnosis: string;
  actionSummary: string;
  isLossReductionScenario: boolean;
  before: {
    npvAr: number;
    irrValue: number;
    grossMarginRate: number;
    netMarginRate: number;
    annualNetAr: number;
    paybackMonths: number;
  };
  after: {
    npvAr: number;
    irrValue: number;
    grossMarginRate: number;
    netMarginRate: number;
    annualNetAr: number;
    paybackMonths: number;
  };
  deltas: {
    npvAr: number;
    irrPts: number;
    grossMarginPts: number;
    netMarginPts: number;
    annualNetAr: number;
    paybackMonths: number;
  };
  buildOptimizedAssumptions: (base: FinancialAssumptions) => FinancialAssumptions;
}

export interface StrategicAdvisorReport {
  healthVerdict: 'solide' | 'optimisable' | 'critique';
  headline: string;
  summaryNote: string;
  recommendations: StrategicRecommendation[];
}

function extractMetrics(model: FullFinancialModel) {
  return {
    npvAr: model.npv.npvAr,
    irrValue: Number.isFinite(model.irr.irrValue) ? model.irr.irrValue : 0,
    grossMarginRate: model.year1.grossMarginRate,
    netMarginRate: model.year1.netMarginAfterTaxRate,
    annualNetAr: model.year1.netResultAfterTaxAr,
    paybackMonths: model.payback.paybackMonths,
  };
}

function buildRecommendation(
  meta: Omit<StrategicRecommendation, 'before' | 'after' | 'deltas'>,
  baseAssumptions: FinancialAssumptions,
  baseModel: FullFinancialModel
): StrategicRecommendation {
  const optimizedAssumptions = meta.buildOptimizedAssumptions(baseAssumptions);
  const optimizedModel = calculateFullModel(optimizedAssumptions);
  const before = extractMetrics(baseModel);
  const after = extractMetrics(optimizedModel);

  return {
    ...meta,
    before,
    after,
    deltas: {
      npvAr: after.npvAr - before.npvAr,
      irrPts: (after.irrValue - before.irrValue) * 100,
      grossMarginPts: (after.grossMarginRate - before.grossMarginRate) * 100,
      netMarginPts: (after.netMarginRate - before.netMarginRate) * 100,
      annualNetAr: after.annualNetAr - before.annualNetAr,
      paybackMonths: after.paybackMonths - before.paybackMonths,
    },
  };
}

/**
 * Generates deterministic, counterfactual cost-optimization recommendations
 * grounded in current VAN, TRI, Marge and a loss-reduction scenario simulation.
 */
export function generateStrategicRecommendations(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel
): StrategicAdvisorReport {
  const npv = model.npv.npvAr;
  const irr = Number.isFinite(model.irr.irrValue) ? model.irr.irrValue : 0;
  const netMargin = model.year1.netMarginAfterTaxRate;
  const grossMargin = model.year1.grossMarginRate;

  const storage = getResolvedStorageOptimization(assumptions);
  const storageLoss = computeStorageWeightLossRate(storage);
  const logistics = getResolvedLogistics(assumptions);

  const recommendations: StrategicRecommendation[] = [];

  // 1. Primary required simulation: Scénario de réduction des pertes (post-récolte + usinage)
  const hasActiveStorageLosses = storageLoss.totalLossRate > 0.005;
  const canUpgradeStorage = storage.storageMethod !== 'sacs_hermetiques_pics';

  recommendations.push(
    buildRecommendation(
      {
        id: 'loss-reduction-scenario',
        title: hasActiveStorageLosses
          ? 'Scénario de réduction des pertes post-récolte (Stockage ventilé / PICS & séchage)'
          : 'Scénario de réduction des pertes techniques & usinage (+2 pts rendement)',
        badge: 'Simulation réduction des pertes',
        priority: hasActiveStorageLosses || netMargin < 0.12 ? 'critique' : 'haute',
        isLossReductionScenario: true,
        diagnosis: hasActiveStorageLosses
          ? `Vos paramètres de stockage actuels génèrent −${(storageLoss.totalLossRate * 100).toFixed(1)} % de pertes (${storage.moisturePercent.toFixed(1)} % humidité sur ${storage.storageDurationDays} j).`
          : `Vos pertes stockage sont déjà maîtrisées, mais l’usinage actuel (${(assumptions.hauteSaison.yieldPaddyToRice * 100).toFixed(0)} %) laisse un gisement de +2 pts par pré-nettoyage et séchage homogène à 13,5 %.`,
        actionSummary: hasActiveStorageLosses
          ? `Basculer vers ${canUpgradeStorage ? 'des sacs hermétiques PICS / entrepôt ventilé' : 'un séchage maîtrisé à 13,8 %'} et sécuriser +2 pts de rendement usinage réduit les brisures et augmente directement le volume de riz vendu.`
          : 'Intégrer un pré-nettoyeur de paddy (réduction des impuretés et brisures de +2 pts) tout en verrouillant la conservation en entrepôt ventilé / sacs PICS.',
        buildOptimizedAssumptions: (base) => {
          const curStorage = getResolvedStorageOptimization(base);
          const curClimate = getResolvedClimateImpact(base);

          const nextStorage = {
            ...curStorage,
            enabled: true,
            moisturePercent: Math.min(curStorage.moisturePercent, 13.8),
            storageMethod: 'sacs_hermetiques_pics' as const,
            storageCapacityKg: Math.max(curStorage.storageCapacityKg ?? 40000, 45000),
          };

          const improvedMillingHS = Math.min(0.76, curClimate.baselineMillingYieldHS + 0.02);
          const improvedMillingBS = Math.min(0.76, curClimate.baselineMillingYieldBS + 0.02);
          const nextClimate = {
            ...curClimate,
            baselineMillingYieldHS: improvedMillingHS,
            baselineMillingYieldBS: improvedMillingBS,
          };

          const syncedSeasons = applyClimateAndStorageToSeasons(
            base,
            nextClimate,
            nextStorage
          );

          return {
            ...base,
            storageOptimization: nextStorage,
            climateImpact: nextClimate,
            ...syncedSeasons,
          };
        },
      },
      assumptions,
      model
    )
  );

  // 2. Optimisation logistique (-15 % fret / consommation)
  recommendations.push(
    buildRecommendation(
      {
        id: 'logistics-backhaul',
        title: 'Optimisation du fret & groupage logistique (−15 % coût transport)',
        badge: 'Levier Logistique',
        priority: npv <= 0 || irr < assumptions.discountRate ? 'critique' : 'haute',
        isLossReductionScenario: false,
        diagnosis: `La collecte saisonnière pèse ${Math.round(
          (model.hauteSaison.totalRotations *
            (assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant')?.costHS ?? 0) +
            model.basseSaison.totalRotations *
              (assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant')?.costBS ?? 0)) /
            1e6
        )} M Ar/an sur l’exploitation.`,
        actionSummary:
          'Planifier des retours à charge (intrants/marchandises) et augmenter le taux de remplissage des camions réduit le poste carburant & usure de 15 % par rotation.',
        buildOptimizedAssumptions: (base) => {
          const curLog = getResolvedLogistics(base);
          const nextLog = {
            ...curLog,
            enabled: true,
            fuelConsumptionLPer100Km: Number((curLog.fuelConsumptionLPer100Km * 0.85).toFixed(1)),
            truckTollAndWearArPerKm: Math.round(curLog.truckTollAndWearArPerKm * 0.85),
          };
          const hsCost = computeSeasonLogisticsBreakdown(nextLog, 'hauteSaison').totalCostPerRotationAr;
          const bsCost = computeSeasonLogisticsBreakdown(nextLog, 'basseSaison').totalCostPerRotationAr;
          return {
            ...base,
            logistics: nextLog,
            costsPerRotation: base.costsPerRotation.map((c) =>
              c.id === 'rot-carburant' ? { ...c, costHS: hsCost, costBS: bsCost } : c
            ),
          };
        },
      },
      assumptions,
      model
    )
  );

  // 3. Contractualisation coopératives (-4 % achat paddy + optimisation sacherie 250kg ou 60kg)
  recommendations.push(
    buildRecommendation(
      {
        id: 'paddy-contract-sourcing',
        title: 'Contrats bord-champ & négociation intrants paddy (−4 % prix d’achat)',
        badge: 'Levier Achats Paddy',
        priority: grossMargin < 0.28 ? 'haute' : 'opportunite',
        isLossReductionScenario: false,
        diagnosis: `Le coût d’achat du paddy représente le premier poste opérationnel ; votre marge brute actuelle est de ${(grossMargin * 100).toFixed(1)} %.`,
        actionSummary:
          'Sécuriser des contrats à terme avec les coopératives locales en début de récolte permet de réduire le prix d’acquisition moyen du paddy de 4 % sans dégrader la qualité.',
        buildOptimizedAssumptions: (base) => ({
          ...base,
          costsPerKgPaddy: base.costsPerKgPaddy.map((c) =>
            c.id === 'cost-paddy'
              ? {
                  ...c,
                  costHS: Math.max(200, Math.round(c.costHS * 0.96)),
                  costBS: Math.max(250, Math.round(c.costBS * 0.96)),
                }
              : c
          ),
        }),
      },
      assumptions,
      model
    )
  );

  const healthVerdict: StrategicAdvisorReport['healthVerdict'] =
    npv <= 0 || irr < assumptions.discountRate || netMargin <= 0.03
      ? 'critique'
      : netMargin < 0.14 || hasActiveStorageLosses
      ? 'optimisable'
      : 'solide';

  const headline =
    healthVerdict === 'critique'
      ? 'Rentabilité sous tension : actions correctives prioritaires identifiées'
      : healthVerdict === 'optimisable'
      ? 'Modèle rentable avec fort gisement d’amélioration de marge'
      : 'Performance solide : leviers d’amplification VAN & TRI disponibles';

  const summaryNote = `Base actuelle : VAN ${(npv / 1e6).toFixed(1)} M Ar · TRI ${(irr * 100).toFixed(1)} % · Marge nette ${(netMargin * 100).toFixed(1)} %. Chaque simulation recalcule intégralement l’exploitation HS/BS et les flux sur 3 ans.`;

  return {
    healthVerdict,
    headline,
    summaryNote,
    recommendations,
  };
}
