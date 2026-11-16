import {
  DepreciationMethod,
  FinancialAssumptions,
  FixedAssetCategory,
  FixedAssetItem,
  FixedAssetsAssumptions,
  FullFinancialModel,
} from '../types/finance';

export const ASSET_CATEGORY_META: Record<
  FixedAssetCategory,
  { label: string; shortLabel: string; defaultLifeYears: number; color: string }
> = {
  unite_decorticage: {
    label: 'Unité de décorticage & usinage',
    shortLabel: 'Décorticage',
    defaultLifeYears: 5,
    color: '#6366f1',
  },
  materiel_agricole: {
    label: 'Matériel agricole & séchage',
    shortLabel: 'Agricole',
    defaultLifeYears: 5,
    color: '#10b981',
  },
  transport_manutention: {
    label: 'Logistique & manutention',
    shortLabel: 'Transport',
    defaultLifeYears: 4,
    color: '#0ea5e9',
  },
  energie_infra: {
    label: 'Énergie, groupe & entrepôt',
    shortLabel: 'Énergie / Silo',
    defaultLifeYears: 8,
    color: '#f59e0b',
  },
};

/**
 * Coefficients fiscaux d'amortissement dégressif selon les usages CGI Madagascar :
 * 1,5 (3–4 ans), 2,0 (5–6 ans), 2,5 (> 6 ans).
 */
export function getMadagascarDegressiveCoeff(usefulLifeYears: number): number {
  if (usefulLifeYears <= 4) return 1.5;
  if (usefulLifeYears <= 6) return 2.0;
  return 2.5;
}

export const DEFAULT_FIXED_ASSETS: FixedAssetsAssumptions = {
  enabled: true,
  applyToModel: false,
  syncCapexToInvestment: false,
  baselineMaterielAr: 4500000,
  items: [
    {
      id: 'asset-decortiqueuse-sb30',
      name: 'Unité de décorticage & polissage SB30',
      category: 'unite_decorticage',
      acquisitionValueAr: 18500000,
      residualValueAr: 1500000,
      usefulLifeYears: 5,
      method: 'degressif',
      acquisitionYear: 1,
      active: true,
      notes: 'Capacité 1,2 t/h avec épierreur & blutoir',
    },
    {
      id: 'asset-batteuse-sechoir',
      name: 'Batteuse-vanneuse & bâches de séchage',
      category: 'materiel_agricole',
      acquisitionValueAr: 6500000,
      residualValueAr: 500000,
      usefulLifeYears: 5,
      method: 'lineaire',
      acquisitionYear: 1,
      active: true,
      notes: 'Post-récolte bord-champ et contrôle humidité',
    },
    {
      id: 'asset-pesage-ensacheuse',
      name: 'Bascules 500 kg, couseuse & palettes PP',
      category: 'transport_manutention',
      acquisitionValueAr: 4500000,
      residualValueAr: 0,
      usefulLifeYears: 3,
      method: 'lineaire',
      acquisitionYear: 1,
      active: true,
      notes: 'Équipement de conditionnement initial I₀',
    },
    {
      id: 'asset-groupe-electrogene',
      name: 'Groupe électrogène secours 25 kVA',
      category: 'energie_infra',
      acquisitionValueAr: 9000000,
      residualValueAr: 1000000,
      usefulLifeYears: 8,
      method: 'degressif',
      acquisitionYear: 1,
      active: true,
      notes: 'Continuité usinage hors réseau JIRAMA',
    },
  ],
};

export function getResolvedFixedAssets(
  assumptions: FinancialAssumptions
): FixedAssetsAssumptions {
  const existing = assumptions.fixedAssets;
  if (!existing) {
    return {
      ...DEFAULT_FIXED_ASSETS,
      baselineMaterielAr: assumptions.investment.materielAr,
    };
  }
  return {
    enabled: existing.enabled ?? true,
    applyToModel: existing.applyToModel ?? false,
    syncCapexToInvestment: existing.syncCapexToInvestment ?? false,
    baselineMaterielAr:
      typeof existing.baselineMaterielAr === 'number' &&
      Number.isFinite(existing.baselineMaterielAr)
        ? existing.baselineMaterielAr
        : assumptions.investment.materielAr,
    items: Array.isArray(existing.items) ? existing.items : DEFAULT_FIXED_ASSETS.items,
  };
}

export interface AssetAnnualScheduleRow {
  year: number; // 1..5
  depreciationAr: number;
  cumulativeDepreciationAr: number;
  netBookValueAr: number;
}

export interface ComputedAssetDetail {
  item: FixedAssetItem;
  depreciableBaseAr: number;
  schedule5Y: AssetAnnualScheduleRow[]; // relative to Year 1..5 of model
  year1DepreciationAr: number;
  year2DepreciationAr: number;
  year3DepreciationAr: number;
  netBookValueEndYear3Ar: number;
}

export function computeSingleAssetSchedule(
  item: FixedAssetItem,
  horizonYears = 5
): ComputedAssetDetail {
  const gross = Math.max(0, item.acquisitionValueAr);
  const residual = Math.max(0, Math.min(gross, item.residualValueAr));
  const life = Math.max(1, Math.min(30, Math.round(item.usefulLifeYears)));
  const startYr = Math.max(1, Math.min(3, item.acquisitionYear));
  const method: DepreciationMethod = item.method || 'lineaire';

  // Accounting depreciable base
  const depreciableBase = Math.max(0, gross - residual);
  const coeff = method === 'degressif' ? getMadagascarDegressiveCoeff(life) : 1;
  const degressiveRate = Math.min(0.95, (1 / life) * coeff);

  // Compute service-year depreciation vector (k = 1..life)
  const serviceDepreciations: number[] = [];
  let vnc = gross;
  let cumDep = 0;

  for (let k = 1; k <= life; k++) {
    const remainingYears = life - k + 1;
    let dep = 0;

    if (!item.active || depreciableBase <= 0) {
      dep = 0;
    } else if (method === 'lineaire') {
      dep = k === life ? Math.max(0, depreciableBase - cumDep) : depreciableBase / life;
    } else {
      // Degressive on VNC (capped so VNC never drops below residual), switching to linear when linear > degressive
      const remainingDepreciable = Math.max(0, vnc - residual);
      const linearRemaining = remainingYears > 0 ? remainingDepreciable / remainingYears : remainingDepreciable;
      const degressiveCharge = vnc * degressiveRate;

      if (k === life) {
        dep = remainingDepreciable;
      } else if (linearRemaining >= degressiveCharge) {
        dep = linearRemaining;
      } else {
        dep = Math.min(remainingDepreciable, degressiveCharge);
      }
    }

    dep = Math.max(0, Math.round(dep));
    cumDep += dep;
    vnc = Math.max(residual, vnc - dep);
    serviceDepreciations.push(dep);
  }

  // Map onto Model Year 1..horizonYears
  const schedule5Y: AssetAnnualScheduleRow[] = [];
  let modelCumDep = 0;
  for (let modelYr = 1; modelYr <= horizonYears; modelYr++) {
    const serviceIdx = modelYr - startYr; // 0-based service year
    const dep =
      item.active && serviceIdx >= 0 && serviceIdx < serviceDepreciations.length
        ? serviceDepreciations[serviceIdx]
        : 0;
    modelCumDep += dep;
    const isAcquired = item.active && modelYr >= startYr;
    const nbv = isAcquired ? Math.max(residual, gross - modelCumDep) : 0;

    schedule5Y.push({
      year: modelYr,
      depreciationAr: dep,
      cumulativeDepreciationAr: modelCumDep,
      netBookValueAr: Math.round(nbv),
    });
  }

  return {
    item,
    depreciableBaseAr: depreciableBase,
    schedule5Y,
    year1DepreciationAr: schedule5Y[0]?.depreciationAr ?? 0,
    year2DepreciationAr: schedule5Y[1]?.depreciationAr ?? 0,
    year3DepreciationAr: schedule5Y[2]?.depreciationAr ?? 0,
    netBookValueEndYear3Ar: schedule5Y[2]?.netBookValueAr ?? 0,
  };
}

export interface FixedAssetsAnnualSummaryRow {
  year: number;
  label: string;
  depreciationAr: number;
  taxShieldAr: number;
  netBookValueAr: number;
  capexAddedAr: number;
}

export interface FixedAssetsAnalysis {
  config: FixedAssetsAssumptions;
  assetDetails: ComputedAssetDetail[];
  activeCount: number;
  totalGrossValueAr: number;
  year1CapexAr: number;
  year1DepreciationAr: number;
  year2DepreciationAr: number;
  year3DepreciationAr: number;
  threeYearTotalDepreciationAr: number;
  ebitdaYear1Ar: number; // Résultat avant amortissements & IR
  ebtAfterDepreciationYear1Ar: number; // Résultat avant IR après dotations
  taxWithoutDepreciationAr: number;
  taxWithDepreciationAr: number;
  taxShieldYear1Ar: number; // Économie d'impôt IR Année 1
  taxShield3YearsAr: number;
  netResultWithoutDepAr: number;
  netResultWithDepAr: number;
  cafCashFlowYear1Ar: number; // Résultat net après IR + Dotations (= EBE - IR réduit)
  annualSchedule5Y: FixedAssetsAnnualSummaryRow[];
}

export function computeFixedAssetsAnalysis(
  assumptions: FinancialAssumptions,
  model?: FullFinancialModel
): FixedAssetsAnalysis {
  const config = getResolvedFixedAssets(assumptions);
  const taxRate = Math.max(0, Math.min(0.99, assumptions.corporateTaxRate));

  const assetDetails = config.items.map((item) => computeSingleAssetSchedule(item, 5));
  const activeItems = config.items.filter((i) => i.active);

  const totalGrossValueAr = activeItems.reduce((s, i) => s + Math.max(0, i.acquisitionValueAr), 0);
  const year1CapexAr = activeItems
    .filter((i) => i.acquisitionYear === 1)
    .reduce((s, i) => s + Math.max(0, i.acquisitionValueAr), 0);

  const annualSchedule5Y: FixedAssetsAnnualSummaryRow[] = [1, 2, 3, 4, 5].map((yr) => {
    const depreciationAr = assetDetails.reduce(
      (s, d) => s + (d.schedule5Y[yr - 1]?.depreciationAr ?? 0),
      0
    );
    const netBookValueAr = assetDetails.reduce(
      (s, d) => s + (d.schedule5Y[yr - 1]?.netBookValueAr ?? 0),
      0
    );
    const capexAddedAr = activeItems
      .filter((i) => i.acquisitionYear === yr)
      .reduce((s, i) => s + Math.max(0, i.acquisitionValueAr), 0);
    return {
      year: yr,
      label: `A${yr}`,
      depreciationAr,
      taxShieldAr: Math.round(depreciationAr * taxRate),
      netBookValueAr,
      capexAddedAr,
    };
  });

  const year1DepreciationAr = annualSchedule5Y[0]?.depreciationAr ?? 0;
  const year2DepreciationAr = annualSchedule5Y[1]?.depreciationAr ?? 0;
  const year3DepreciationAr = annualSchedule5Y[2]?.depreciationAr ?? 0;
  const threeYearTotalDepreciationAr =
    year1DepreciationAr + year2DepreciationAr + year3DepreciationAr;

  // Baseline EBE (EBITDA) before depreciation
  const ebitdaYear1Ar = model
    ? model.year1.annualGrossProfitAr - model.year1.annualFixedChargesAr
    : 0;
  const ebtAfterDepreciationYear1Ar = ebitdaYear1Ar - year1DepreciationAr;

  const taxWithoutDepreciationAr = Math.max(0, ebitdaYear1Ar) * taxRate;
  const taxWithDepreciationAr = Math.max(0, ebtAfterDepreciationYear1Ar) * taxRate;
  const taxShieldYear1Ar = Math.max(0, taxWithoutDepreciationAr - taxWithDepreciationAr);

  const netResultWithoutDepAr = ebitdaYear1Ar - taxWithoutDepreciationAr;
  const netResultWithDepAr = ebtAfterDepreciationYear1Ar - taxWithDepreciationAr;
  const cafCashFlowYear1Ar = netResultWithDepAr + year1DepreciationAr;

  const taxShield3YearsAr = annualSchedule5Y
    .slice(0, 3)
    .reduce((s, r) => s + r.taxShieldAr, 0);

  return {
    config,
    assetDetails,
    activeCount: activeItems.length,
    totalGrossValueAr,
    year1CapexAr,
    year1DepreciationAr,
    year2DepreciationAr,
    year3DepreciationAr,
    threeYearTotalDepreciationAr,
    ebitdaYear1Ar,
    ebtAfterDepreciationYear1Ar,
    taxWithoutDepreciationAr,
    taxWithDepreciationAr,
    taxShieldYear1Ar,
    taxShield3YearsAr,
    netResultWithoutDepAr,
    netResultWithDepAr,
    cafCashFlowYear1Ar,
    annualSchedule5Y,
  };
}
