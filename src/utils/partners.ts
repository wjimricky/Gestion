import {
  CooperativePartner,
  FinancialAssumptions,
  FullFinancialModel,
  PartnersEcosystemAssumptions,
  TransporterPartner,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';

export const DEFAULT_PARTNERS_ECOSYSTEM: PartnersEcosystemAssumptions = {
  syncPaddyCosts: true,
  syncTransportCosts: true,
  cooperatives: [
    {
      id: 'coop-alaotra',
      name: 'Coopérative Fivoarana Alaotra',
      region: 'Lac Alaotra (Ambatondrazaka)',
      sharePercent: 50,
      paddyPriceArPerKgHS: 780,
      paddyPriceArPerKgBS: 1380,
      collectionFeeArPerKg: 0,
      active: true,
      note: 'Collecte groupée bord-champ avec séchage sur aire bétonnée.',
    },
    {
      id: 'coop-marovoay',
      name: 'Union Rizicole Marovoay',
      region: 'Betsiboka / Marovoay',
      sharePercent: 30,
      paddyPriceArPerKgHS: 820,
      paddyPriceArPerKgBS: 1420,
      collectionFeeArPerKg: 0,
      active: true,
      note: 'Apport continu en contre-saison (variété Makalioka & Tsipala).',
    },
    {
      id: 'coop-vakinankaratra',
      name: 'Groupement Vakinankaratra',
      region: 'Hauts-Plateaux (Antsirabe)',
      sharePercent: 20,
      paddyPriceArPerKgHS: 820,
      paddyPriceArPerKgBS: 1420,
      collectionFeeArPerKg: 0,
      active: true,
      note: 'Proximité directe RN7 réduisant les délais d’approvisionnement.',
    },
  ],
  transporters: [
    {
      id: 'trans-rn-express',
      name: 'Trans-Mada Flotte RN2/RN4',
      corridor: 'Axes goudronnés principaux',
      vehicleCapacityTons: 18,
      sharePercent: 60,
      costPerRotationHS: 100000,
      costPerRotationBS: 760000,
      reliabilityPercent: 95,
      active: true,
      note: 'Camions 18T sous contrat cadre annuel aller-retour.',
    },
    {
      id: 'trans-pistes-locales',
      name: 'Collecteurs Pistes Rurales',
      corridor: 'Pistes agricoles & désenclavement',
      vehicleCapacityTons: 10,
      sharePercent: 40,
      costPerRotationHS: 100000,
      costPerRotationBS: 860000,
      reliabilityPercent: 86,
      active: true,
      note: 'Camions 4×4 adaptés aux pistes dégradées en Basse Saison.',
    },
  ],
};

export function getResolvedPartnersEcosystem(
  assumptions: FinancialAssumptions
): PartnersEcosystemAssumptions {
  const existing = assumptions.partnersEcosystem;
  if (!existing) {
    return JSON.parse(JSON.stringify(DEFAULT_PARTNERS_ECOSYSTEM));
  }
  return {
    syncPaddyCosts: existing.syncPaddyCosts ?? true,
    syncTransportCosts: existing.syncTransportCosts ?? true,
    cooperatives: Array.isArray(existing.cooperatives)
      ? existing.cooperatives
      : JSON.parse(JSON.stringify(DEFAULT_PARTNERS_ECOSYSTEM.cooperatives)),
    transporters: Array.isArray(existing.transporters)
      ? existing.transporters
      : JSON.parse(JSON.stringify(DEFAULT_PARTNERS_ECOSYSTEM.transporters)),
  };
}

export interface CooperativeWeightedSummary {
  activeCount: number;
  totalShareRaw: number;
  weightedPaddyHS: number;
  weightedPaddyBS: number;
  weightedCollectionFee: number;
  breakdown: Array<{
    partner: CooperativePartner;
    normalizedShare: number; // 0..1
    annualPaddyKg: number;
    annualCostAr: number;
  }>;
}

export interface TransporterWeightedSummary {
  activeCount: number;
  totalShareRaw: number;
  weightedRotationCostHS: number;
  weightedRotationCostBS: number;
  avgReliability: number;
  breakdown: Array<{
    partner: TransporterPartner;
    normalizedShare: number; // 0..1
    annualRotations: number;
    annualCostAr: number;
  }>;
}

export interface PartnersImpactEvaluation {
  coopSummary: CooperativeWeightedSummary;
  transSummary: TransporterWeightedSummary;
  baselineModel: FullFinancialModel;
  simulatedModel: FullFinancialModel;
  paddyPriceDeltaHS: number;
  paddyPriceDeltaBS: number;
  transportDeltaHS: number;
  transportDeltaBS: number;
  annualVariableCostDeltaAr: number;
  annualGrossProfitDeltaAr: number;
  annualNetProfitDeltaAr: number;
  npvDeltaAr: number;
}

export function computeCooperativeSummary(
  assumptions: FinancialAssumptions,
  ecosystem: PartnersEcosystemAssumptions
): CooperativeWeightedSummary {
  const active = ecosystem.cooperatives.filter((c) => c.active && c.sharePercent > 0);
  const totalShareRaw = active.reduce((sum, c) => sum + Math.max(0, c.sharePercent), 0);

  const paddyRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const fallbackHS = paddyRow?.costHS ?? 800;
  const fallbackBS = paddyRow?.costBS ?? 1400;

  if (active.length === 0 || totalShareRaw <= 0) {
    return {
      activeCount: 0,
      totalShareRaw: 0,
      weightedPaddyHS: fallbackHS,
      weightedPaddyBS: fallbackBS,
      weightedCollectionFee: 0,
      breakdown: ecosystem.cooperatives.map((partner) => ({
        partner,
        normalizedShare: 0,
        annualPaddyKg: 0,
        annualCostAr: 0,
      })),
    };
  }

  const totalPaddyHS =
    assumptions.hauteSaison.months *
    assumptions.hauteSaison.rotationsPerMonth *
    assumptions.hauteSaison.paddyBoughtKgPerRotation;
  const totalPaddyBS =
    assumptions.basseSaison.months *
    assumptions.basseSaison.rotationsPerMonth *
    assumptions.basseSaison.paddyBoughtKgPerRotation;

  let weightedPaddyHS = 0;
  let weightedPaddyBS = 0;
  let weightedCollectionFee = 0;

  const breakdown = ecosystem.cooperatives.map((partner) => {
    const normalizedShare =
      partner.active && partner.sharePercent > 0 ? partner.sharePercent / totalShareRaw : 0;
    weightedPaddyHS += normalizedShare * partner.paddyPriceArPerKgHS;
    weightedPaddyBS += normalizedShare * partner.paddyPriceArPerKgBS;
    weightedCollectionFee += normalizedShare * partner.collectionFeeArPerKg;

    const annualPaddyKg = (totalPaddyHS + totalPaddyBS) * normalizedShare;
    const annualCostAr =
      normalizedShare *
      (totalPaddyHS * (partner.paddyPriceArPerKgHS + partner.collectionFeeArPerKg) +
        totalPaddyBS * (partner.paddyPriceArPerKgBS + partner.collectionFeeArPerKg));

    return {
      partner,
      normalizedShare,
      annualPaddyKg,
      annualCostAr,
    };
  });

  return {
    activeCount: active.length,
    totalShareRaw,
    weightedPaddyHS: Math.round(weightedPaddyHS),
    weightedPaddyBS: Math.round(weightedPaddyBS),
    weightedCollectionFee: Math.round(weightedCollectionFee),
    breakdown,
  };
}

export function computeTransporterSummary(
  assumptions: FinancialAssumptions,
  ecosystem: PartnersEcosystemAssumptions
): TransporterWeightedSummary {
  const active = ecosystem.transporters.filter((t) => t.active && t.sharePercent > 0);
  const totalShareRaw = active.reduce((sum, t) => sum + Math.max(0, t.sharePercent), 0);

  const fuelRow = assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant');
  const fallbackHS = fuelRow?.costHS ?? 100000;
  const fallbackBS = fuelRow?.costBS ?? 800000;

  if (active.length === 0 || totalShareRaw <= 0) {
    return {
      activeCount: 0,
      totalShareRaw: 0,
      weightedRotationCostHS: fallbackHS,
      weightedRotationCostBS: fallbackBS,
      avgReliability: 0,
      breakdown: ecosystem.transporters.map((partner) => ({
        partner,
        normalizedShare: 0,
        annualRotations: 0,
        annualCostAr: 0,
      })),
    };
  }

  const rotHS = assumptions.hauteSaison.months * assumptions.hauteSaison.rotationsPerMonth;
  const rotBS = assumptions.basseSaison.months * assumptions.basseSaison.rotationsPerMonth;

  let weightedRotationCostHS = 0;
  let weightedRotationCostBS = 0;
  let avgReliability = 0;

  const breakdown = ecosystem.transporters.map((partner) => {
    const normalizedShare =
      partner.active && partner.sharePercent > 0 ? partner.sharePercent / totalShareRaw : 0;
    weightedRotationCostHS += normalizedShare * partner.costPerRotationHS;
    weightedRotationCostBS += normalizedShare * partner.costPerRotationBS;
    avgReliability += normalizedShare * partner.reliabilityPercent;

    return {
      partner,
      normalizedShare,
      annualRotations: (rotHS + rotBS) * normalizedShare,
      annualCostAr:
        normalizedShare * (rotHS * partner.costPerRotationHS + rotBS * partner.costPerRotationBS),
    };
  });

  return {
    activeCount: active.length,
    totalShareRaw,
    weightedRotationCostHS: Math.round(weightedRotationCostHS),
    weightedRotationCostBS: Math.round(weightedRotationCostBS),
    avgReliability: Number(avgReliability.toFixed(1)),
    breakdown,
  };
}

export const COOP_FEE_ROW_ID = 'cost-coop-collecte';

/**
 * Applies partner ecosystem weighted costs to costsPerKgPaddy and costsPerRotation
 * according to the sync toggles. When default averages match Excel (800/1400, 0 fee, 100k/800k),
 * produces exact zero drift on the financial model.
 */
export function applyPartnersEcosystemToAssumptions(
  assumptions: FinancialAssumptions,
  ecosystem: PartnersEcosystemAssumptions,
  forceSync: boolean = false
): Pick<FinancialAssumptions, 'costsPerKgPaddy' | 'costsPerRotation'> {
  const coopSummary = computeCooperativeSummary(assumptions, ecosystem);
  const transSummary = computeTransporterSummary(assumptions, ecosystem);

  let nextCostsPerKg = [...assumptions.costsPerKgPaddy];
  if (forceSync || ecosystem.syncPaddyCosts) {
    nextCostsPerKg = nextCostsPerKg.map((row) =>
      row.id === 'cost-paddy'
        ? {
            ...row,
            costHS: coopSummary.weightedPaddyHS,
            costBS: coopSummary.weightedPaddyBS,
          }
        : row
    );

    const hasCoopFeeRow = nextCostsPerKg.some((c) => c.id === COOP_FEE_ROW_ID);
    if (coopSummary.weightedCollectionFee > 0) {
      if (hasCoopFeeRow) {
        nextCostsPerKg = nextCostsPerKg.map((c) =>
          c.id === COOP_FEE_ROW_ID
            ? {
                ...c,
                costHS: coopSummary.weightedCollectionFee,
                costBS: coopSummary.weightedCollectionFee,
              }
            : c
        );
      } else {
        nextCostsPerKg.push({
          id: COOP_FEE_ROW_ID,
          label: 'Commission collecte coopératives',
          costHS: coopSummary.weightedCollectionFee,
          costBS: coopSummary.weightedCollectionFee,
        });
      }
    } else if (hasCoopFeeRow) {
      nextCostsPerKg = nextCostsPerKg.filter((c) => c.id !== COOP_FEE_ROW_ID);
    }
  }

  let nextCostsPerRotation = [...assumptions.costsPerRotation];
  if (forceSync || ecosystem.syncTransportCosts) {
    const hasFuelRow = nextCostsPerRotation.some((c) => c.id === 'rot-carburant');
    if (hasFuelRow) {
      nextCostsPerRotation = nextCostsPerRotation.map((row) =>
        row.id === 'rot-carburant'
          ? {
              ...row,
              costHS: transSummary.weightedRotationCostHS,
              costBS: transSummary.weightedRotationCostBS,
            }
          : row
      );
    } else {
      nextCostsPerRotation.unshift({
        id: 'rot-carburant',
        label: 'Carburant & Transport partenaires',
        costHS: transSummary.weightedRotationCostHS,
        costBS: transSummary.weightedRotationCostBS,
      });
    }
  }

  return {
    costsPerKgPaddy: nextCostsPerKg,
    costsPerRotation: nextCostsPerRotation,
  };
}

export function evaluatePartnersImpact(
  assumptions: FinancialAssumptions,
  ecosystem: PartnersEcosystemAssumptions
): PartnersImpactEvaluation {
  const coopSummary = computeCooperativeSummary(assumptions, ecosystem);
  const transSummary = computeTransporterSummary(assumptions, ecosystem);

  const currentModel = calculateFullModel(assumptions);

  // Baseline without partner overrides (standard 800/1400 & 100k/800k or current un-synced values)
  const simulatedPatch = applyPartnersEcosystemToAssumptions(assumptions, ecosystem, true);
  const simulatedAssumptions: FinancialAssumptions = {
    ...assumptions,
    ...simulatedPatch,
    partnersEcosystem: ecosystem,
  };
  const simulatedModel = calculateFullModel(simulatedAssumptions);

  const paddyRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const fuelRow = assumptions.costsPerRotation.find((c) => c.id === 'rot-carburant');

  return {
    coopSummary,
    transSummary,
    baselineModel: currentModel,
    simulatedModel,
    paddyPriceDeltaHS: coopSummary.weightedPaddyHS - (paddyRow?.costHS ?? 800),
    paddyPriceDeltaBS: coopSummary.weightedPaddyBS - (paddyRow?.costBS ?? 1400),
    transportDeltaHS: transSummary.weightedRotationCostHS - (fuelRow?.costHS ?? 100000),
    transportDeltaBS: transSummary.weightedRotationCostBS - (fuelRow?.costBS ?? 800000),
    annualVariableCostDeltaAr:
      simulatedModel.year1.totalPurchaseAndOperatingCostsAr -
      currentModel.year1.totalPurchaseAndOperatingCostsAr,
    annualGrossProfitDeltaAr:
      simulatedModel.year1.annualGrossProfitAr - currentModel.year1.annualGrossProfitAr,
    annualNetProfitDeltaAr:
      simulatedModel.year1.netResultAfterTaxAr - currentModel.year1.netResultAfterTaxAr,
    npvDeltaAr: simulatedModel.npv.npvAr - currentModel.npv.npvAr,
  };
}
