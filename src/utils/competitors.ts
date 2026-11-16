import {
  CompetitorBenchmarkAssumptions,
  FinancialAssumptions,
  FullFinancialModel,
  LocalCompetitorActor,
  LocalCompetitorActorType,
} from '../types/finance';

export const ACTOR_TYPE_META: Record<
  LocalCompetitorActorType,
  { label: string; shortLabel: string; color: string }
> = {
  rizerie_industrielle: {
    label: 'Rizerie industrielle',
    shortLabel: 'Industriel',
    color: '#6366f1',
  },
  collecteur_usinier: {
    label: 'Collecteur-Usinier régional',
    shortLabel: 'Collecteur',
    color: '#0ea5e9',
  },
  cooperative: {
    label: 'Coopérative rizicole structurée',
    shortLabel: 'Coopérative',
    color: '#10b981',
  },
  importateur_urbain: {
    label: 'Importateur / Grossiste urbain',
    shortLabel: 'Importateur',
    color: '#f59e0b',
  },
  negociant_local: {
    label: 'Négociant / Décortiqueur artisanal',
    shortLabel: 'Artisanal',
    color: '#ec4899',
  },
};

export const DEFAULT_COMPETITOR_BENCHMARK: CompetitorBenchmarkAssumptions = {
  ourTargetSharePct: 12,
  actors: [
    {
      id: 'comp-rizerie-alaotra',
      name: 'Rizeries Industrielles Alaotra',
      actorType: 'rizerie_industrielle',
      region: 'Lac Alaotra → Tana',
      paddySourcingCostArPerKgRice: 1580,
      millingAndPackagingCostArPerKg: 210,
      logisticsAndOverheadArPerKg: 340,
      sellingPriceArPerKg: 2780,
      marketSharePct: 26,
      millingYieldPct: 69,
      strengthTag: 'Volumes & stockage silo',
      active: true,
    },
    {
      id: 'comp-collecteurs-regionaux',
      name: 'Collecteurs-Usiniers Régionaux',
      actorType: 'collecteur_usinier',
      region: 'Vakinankaratra / Itasy',
      paddySourcingCostArPerKgRice: 1690,
      millingAndPackagingCostArPerKg: 240,
      logisticsAndOverheadArPerKg: 310,
      sellingPriceArPerKg: 2700,
      marketSharePct: 22,
      millingYieldPct: 65,
      strengthTag: 'Maillage collecte rurale',
      active: true,
    },
    {
      id: 'comp-grossistes-import',
      name: 'Grossistes Riz Importé Urbain',
      actorType: 'importateur_urbain',
      region: 'Toamasina / Antananarivo',
      paddySourcingCostArPerKgRice: 1850,
      millingAndPackagingCostArPerKg: 140,
      logisticsAndOverheadArPerKg: 280,
      sellingPriceArPerKg: 2550,
      marketSharePct: 19,
      millingYieldPct: 72,
      strengthTag: 'Approvisionnement continu port',
      active: true,
    },
    {
      id: 'comp-cooperatives-locales',
      name: 'Coopératives Rizicoles Locales',
      actorType: 'cooperative',
      region: 'Marovoay / Sofia',
      paddySourcingCostArPerKgRice: 1540,
      millingAndPackagingCostArPerKg: 270,
      logisticsAndOverheadArPerKg: 370,
      sellingPriceArPerKg: 2650,
      marketSharePct: 11,
      millingYieldPct: 64,
      strengthTag: 'Circuits courts producteurs',
      active: true,
    },
    {
      id: 'comp-decortiqueurs-informels',
      name: 'Décortiqueurs & Négociants Locaux',
      actorType: 'negociant_local',
      region: 'Marchés hebdomadaires',
      paddySourcingCostArPerKgRice: 1740,
      millingAndPackagingCostArPerKg: 290,
      logisticsAndOverheadArPerKg: 230,
      sellingPriceArPerKg: 2600,
      marketSharePct: 10,
      millingYieldPct: 61,
      strengthTag: 'Proximité immédiate clients',
      active: true,
    },
  ],
};

export function getResolvedCompetitors(
  assumptions: FinancialAssumptions
): CompetitorBenchmarkAssumptions {
  const incoming = assumptions.competitors;
  if (!incoming || !Array.isArray(incoming.actors) || incoming.actors.length === 0) {
    return DEFAULT_COMPETITOR_BENCHMARK;
  }
  return {
    ourTargetSharePct:
      typeof incoming.ourTargetSharePct === 'number' && Number.isFinite(incoming.ourTargetSharePct)
        ? incoming.ourTargetSharePct
        : DEFAULT_COMPETITOR_BENCHMARK.ourTargetSharePct,
    actors: incoming.actors,
  };
}

export interface CompetitorComputedRow {
  id: string;
  isOurProject: boolean;
  name: string;
  actorTypeLabel: string;
  region: string;
  color: string;
  paddySourcingArPerKg: number;
  millingPackagingArPerKg: number;
  logisticsOverheadArPerKg: number;
  totalUnitCostArPerKg: number;
  sellingPriceArPerKg: number;
  unitMarginArPerKg: number;
  unitMarginPct: number;
  costGapVsUsAr: number;
  marketSharePct: number;
  millingYieldPct: number;
  strengthTag: string;
  active: boolean;
}

export interface CompetitorLandscapeSummary {
  ourActor: CompetitorComputedRow;
  competitorRows: CompetitorComputedRow[];
  allRows: CompetitorComputedRow[];
  weightedMarketCostArPerKg: number;
  weightedMarketPriceArPerKg: number;
  costAdvantageArPerKg: number; // positive means we are cheaper to produce than market average
  costAdvantagePct: number;
  totalClaimedSharePct: number;
  residualMarketSharePct: number;
  hhiIndex: number; // 0..10000 concentration index
  concentrationLabel: 'Marché fragmenté' | 'Concurrence modérée' | 'Marché concentré';
  costLeaderName: string;
  marketLeaderName: string;
}

export function computeCompetitorLandscape(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  competitorsInput?: CompetitorBenchmarkAssumptions
): CompetitorLandscapeSummary {
  const competitors = competitorsInput ?? getResolvedCompetitors(assumptions);

  const totalRiceKg = Math.max(1, model.year1.totalRiceKgSold);
  const totalPaddyKg = model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg;
  const weightedYieldPct =
    totalPaddyKg > 0 ? (totalRiceKg / totalPaddyKg) * 100 : assumptions.hauteSaison.yieldPaddyToRice * 100;

  // Break down our Year 1 costs per kg of milled rice sold
  const hsPaddyRawCost =
    model.hauteSaison.paddyCostPerRotationAr * model.hauteSaison.totalRotations;
  const bsPaddyRawCost =
    model.basseSaison.paddyCostPerRotationAr * model.basseSaison.totalRotations;
  const totalPaddyCostAr = hsPaddyRawCost + bsPaddyRawCost;

  // Approximate milling + bagging from bags + variable non-paddy costs
  const bagCostsAr =
    model.hauteSaison.bagCostPerRotationAr * model.hauteSaison.totalRotations +
    model.basseSaison.bagCostPerRotationAr * model.basseSaison.totalRotations;

  // Estimate paddy purchase component specifically using 'cost-paddy' if present
  const paddyLine = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const purePaddyAr = paddyLine
    ? paddyLine.costHS * model.hauteSaison.totalPaddyKg +
      paddyLine.costBS * model.basseSaison.totalPaddyKg
    : totalPaddyCostAr * 0.85;

  const millingAndVariableAr = Math.max(0, totalPaddyCostAr - purePaddyAr) + bagCostsAr;
  const rotationCostsAr =
    model.hauteSaison.otherCostsPerRotationAr * model.hauteSaison.totalRotations +
    model.basseSaison.otherCostsPerRotationAr * model.basseSaison.totalRotations;
  const fixedOverheadsAr = model.year1.annualFixedChargesAr;

  const ourPaddySourcingArPerKg = Math.round(purePaddyAr / totalRiceKg);
  const ourMillingPackagingArPerKg = Math.round(millingAndVariableAr / totalRiceKg);
  const ourLogisticsOverheadArPerKg = Math.round((rotationCostsAr + fixedOverheadsAr) / totalRiceKg);
  const ourTotalUnitCost =
    ourPaddySourcingArPerKg + ourMillingPackagingArPerKg + ourLogisticsOverheadArPerKg;
  const ourSellingPrice = Math.round(model.year1.totalTurnoverAr / totalRiceKg);
  const ourUnitMargin = ourSellingPrice - ourTotalUnitCost;

  const ourActor: CompetitorComputedRow = {
    id: 'our-project',
    isOurProject: true,
    name: 'Notre Projet (Rizerie)',
    actorTypeLabel: 'Projet modélisé',
    region: assumptions.selectedRegionId === 'current' ? 'Référence projet' : assumptions.selectedRegionId || 'Madagascar',
    color: '#14b8a6',
    paddySourcingArPerKg: ourPaddySourcingArPerKg,
    millingPackagingArPerKg: ourMillingPackagingArPerKg,
    logisticsOverheadArPerKg: ourLogisticsOverheadArPerKg,
    totalUnitCostArPerKg: ourTotalUnitCost,
    sellingPriceArPerKg: ourSellingPrice,
    unitMarginArPerKg: ourUnitMargin,
    unitMarginPct: ourSellingPrice > 0 ? (ourUnitMargin / ourSellingPrice) * 100 : 0,
    costGapVsUsAr: 0,
    marketSharePct: Math.max(0, competitors.ourTargetSharePct),
    millingYieldPct: Number(weightedYieldPct.toFixed(1)),
    strengthTag: 'Modèle actif',
    active: true,
  };

  const competitorRows: CompetitorComputedRow[] = competitors.actors.map((actor) => {
    const unitCost =
      Math.max(0, actor.paddySourcingCostArPerKgRice) +
      Math.max(0, actor.millingAndPackagingCostArPerKg) +
      Math.max(0, actor.logisticsAndOverheadArPerKg);
    const margin = actor.sellingPriceArPerKg - unitCost;
    const meta = ACTOR_TYPE_META[actor.actorType];
    return {
      id: actor.id,
      isOurProject: false,
      name: actor.name,
      actorTypeLabel: meta?.shortLabel || actor.actorType,
      region: actor.region,
      color: meta?.color || '#6366f1',
      paddySourcingArPerKg: actor.paddySourcingCostArPerKgRice,
      millingPackagingArPerKg: actor.millingAndPackagingCostArPerKg,
      logisticsOverheadArPerKg: actor.logisticsAndOverheadArPerKg,
      totalUnitCostArPerKg: Math.round(unitCost),
      sellingPriceArPerKg: Math.round(actor.sellingPriceArPerKg),
      unitMarginArPerKg: Math.round(margin),
      unitMarginPct: actor.sellingPriceArPerKg > 0 ? (margin / actor.sellingPriceArPerKg) * 100 : 0,
      costGapVsUsAr: Math.round(unitCost - ourTotalUnitCost),
      marketSharePct: Math.max(0, actor.marketSharePct),
      millingYieldPct: actor.millingYieldPct,
      strengthTag: actor.strengthTag,
      active: actor.active,
    };
  });

  const activeCompetitors = competitorRows.filter((r) => r.active);
  const compShareSum = activeCompetitors.reduce((s, r) => s + r.marketSharePct, 0);

  const weightedMarketCostArPerKg =
    compShareSum > 0
      ? Math.round(
          activeCompetitors.reduce((s, r) => s + r.totalUnitCostArPerKg * r.marketSharePct, 0) /
            compShareSum
        )
      : ourTotalUnitCost;

  const weightedMarketPriceArPerKg =
    compShareSum > 0
      ? Math.round(
          activeCompetitors.reduce((s, r) => s + r.sellingPriceArPerKg * r.marketSharePct, 0) /
            compShareSum
        )
      : ourSellingPrice;

  const costAdvantageArPerKg = weightedMarketCostArPerKg - ourTotalUnitCost;
  const costAdvantagePct =
    weightedMarketCostArPerKg > 0 ? (costAdvantageArPerKg / weightedMarketCostArPerKg) * 100 : 0;

  const allActive = [ourActor, ...activeCompetitors];
  const totalClaimedSharePct = allActive.reduce((s, r) => s + r.marketSharePct, 0);
  const residualMarketSharePct = Math.max(0, Number((100 - totalClaimedSharePct).toFixed(1)));

  // Normalize shares if > 0 for HHI calculation
  const normBase = totalClaimedSharePct > 100 ? totalClaimedSharePct : 100;
  const hhiIndex = Math.round(
    allActive.reduce((s, r) => {
      const pct = (r.marketSharePct / normBase) * 100;
      return s + pct * pct;
    }, 0)
  );

  const concentrationLabel: CompetitorLandscapeSummary['concentrationLabel'] =
    hhiIndex >= 2500
      ? 'Marché concentré'
      : hhiIndex >= 1500
        ? 'Concurrence modérée'
        : 'Marché fragmenté';

  const byLowestCost = [...allActive].sort(
    (a, b) => a.totalUnitCostArPerKg - b.totalUnitCostArPerKg
  );
  const byHighestShare = [...allActive].sort((a, b) => b.marketSharePct - a.marketSharePct);

  return {
    ourActor,
    competitorRows,
    allRows: [ourActor, ...competitorRows],
    weightedMarketCostArPerKg,
    weightedMarketPriceArPerKg,
    costAdvantageArPerKg,
    costAdvantagePct,
    totalClaimedSharePct: Number(totalClaimedSharePct.toFixed(1)),
    residualMarketSharePct,
    hhiIndex,
    concentrationLabel,
    costLeaderName: byLowestCost[0]?.name || ourActor.name,
    marketLeaderName: byHighestShare[0]?.name || ourActor.name,
  };
}

export function exportCompetitorsCsv(summary: CompetitorLandscapeSummary): void {
  const header = [
    'Acteur',
    'Catégorie',
    'Bassin',
    'Coût Paddy (Ar/kg)',
    'Usinage & Sacs (Ar/kg)',
    'Logistique & Structure (Ar/kg)',
    'Prix de revient complet (Ar/kg)',
    'Prix de vente (Ar/kg)',
    'Marge unitaire (Ar/kg)',
    'Part de marché estimée (%)',
    'Rendement usinage (%)',
  ].join(';');

  const rows = summary.allRows
    .filter((r) => r.active)
    .map((r) =>
      [
        `"${r.name.replace(/"/g, '""')}"`,
        `"${r.actorTypeLabel}"`,
        `"${r.region}"`,
        r.paddySourcingArPerKg,
        r.millingPackagingArPerKg,
        r.logisticsOverheadArPerKg,
        r.totalUnitCostArPerKg,
        r.sellingPriceArPerKg,
        r.unitMarginArPerKg,
        r.marketSharePct,
        r.millingYieldPct,
      ].join(';')
    );

  const csv = '\uFEFF' + [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `concurrence_filiere_riz_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
