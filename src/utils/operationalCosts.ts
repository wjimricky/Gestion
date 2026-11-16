import { FinancialAssumptions, FullFinancialModel } from '../types/finance';

export type OperationalCostCategoryId =
  | 'collecte'
  | 'transformation'
  | 'logistique'
  | 'commercialisation';

export interface OperationalCostSlice {
  id: OperationalCostCategoryId;
  label: string;
  shortLabel: string;
  description: string;
  color: string;
  amountAr: number;
  hsAmountAr: number;
  bsAmountAr: number;
  sharePct: number;
  itemsSummary: string;
}

export interface OperationalCostBreakdownResult {
  includeFixedCharges: boolean;
  totalCostsAr: number;
  totalDirectOperationalAr: number;
  totalFixedChargesAr: number;
  slices: OperationalCostSlice[];
  topCategory: OperationalCostSlice;
}

/**
 * Splits Year 1 operational costs into 4 exact, non-overlapping buckets:
 * Collecte, Transformation, Logistique, Commercialisation.
 * Sum of slice amounts equals `model.year1.totalPurchaseAndOperatingCostsAr` (direct mode)
 * or `totalPurchaseAndOperatingCostsAr + annualFixedChargesAr` (full mode).
 */
export function computeOperationalCostBreakdown(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  includeFixedCharges = false
): OperationalCostBreakdownResult {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;

  // 1. Per-kg paddy costs
  let collecteHS = 0;
  let collecteBS = 0;
  let transfoKgHS = 0;
  let transfoKgBS = 0;

  for (const item of assumptions.costsPerKgPaddy) {
    const hsTotal = item.costHS * hs.totalPaddyKg;
    const bsTotal = item.costBS * bs.totalPaddyKg;
    if (item.id === 'cost-paddy') {
      collecteHS += hsTotal;
      collecteBS += bsTotal;
    } else {
      // Decorticage, docker, other milling/handling per kg -> Transformation
      transfoKgHS += hsTotal;
      transfoKgBS += bsTotal;
    }
  }

  // 2. Per-rotation costs (Carburant -> Logistique, Admin/Other -> Commercialisation)
  let logRotHS = 0;
  let logRotBS = 0;
  let commRotHS = 0;
  let commRotBS = 0;

  for (const item of assumptions.costsPerRotation) {
    const hsTotal = item.costHS * hs.totalRotations;
    const bsTotal = item.costBS * bs.totalRotations;
    const lower = `${item.id} ${item.label}`.toLowerCase();
    if (
      item.id === 'rot-carburant' ||
      lower.includes('carburant') ||
      lower.includes('transport') ||
      lower.includes('fret')
    ) {
      logRotHS += hsTotal;
      logRotBS += bsTotal;
    } else {
      commRotHS += hsTotal;
      commRotBS += bsTotal;
    }
  }

  // 3. Packaging bags -> Commercialisation
  const bagHS = hs.bagCostPerRotationAr * hs.totalRotations;
  const bagBS = bs.bagCostPerRotationAr * bs.totalRotations;
  commRotHS += bagHS;
  commRotBS += bagBS;

  // 4. Optional Fixed Monthly Charges (if includeFixedCharges === true)
  let fixedTransfoAnnual = 0;
  let fixedLogAnnual = 0;
  let fixedCommAnnual = 0;

  if (includeFixedCharges) {
    for (const fix of assumptions.fixedMonthlyCharges) {
      const annual = fix.amount * 12;
      const lower = `${fix.id} ${fix.label}`.toLowerCase();
      if (
        fix.id === 'fix-entretien-vehicule' ||
        lower.includes('vehicule') ||
        lower.includes('véhicule') ||
        lower.includes('camion') ||
        lower.includes('transport')
      ) {
        fixedLogAnnual += annual;
      } else if (
        fix.id === 'fix-jirama' ||
        fix.id === 'fix-terrain' ||
        fix.id === 'fix-aide-2' ||
        lower.includes('jirama') ||
        lower.includes('usine') ||
        lower.includes('machine') ||
        lower.includes('electric')
      ) {
        fixedTransfoAnnual += annual;
      } else {
        fixedCommAnnual += annual;
      }
    }
  }

  const totalMonths = Math.max(1, hs.months + bs.months);
  const hsWeight = hs.months / totalMonths;
  const bsWeight = bs.months / totalMonths;

  const collecteAmount = collecteHS + collecteBS;
  const transfoHS = transfoKgHS + fixedTransfoAnnual * hsWeight;
  const transfoBS = transfoKgBS + fixedTransfoAnnual * bsWeight;
  const transfoAmount = transfoHS + transfoBS;

  const logHS = logRotHS + fixedLogAnnual * hsWeight;
  const logBS = logRotBS + fixedLogAnnual * bsWeight;
  const logAmount = logHS + logBS;

  const commHS = commRotHS + fixedCommAnnual * hsWeight;
  const commBS = commRotBS + fixedCommAnnual * bsWeight;
  const commAmount = commHS + commBS;

  const totalDirectOperationalAr = model.year1.totalPurchaseAndOperatingCostsAr;
  const totalFixedChargesAr = model.year1.annualFixedChargesAr;
  const rawTotal = collecteAmount + transfoAmount + logAmount + commAmount;
  const denom = Math.max(rawTotal, 1);

  const slices: OperationalCostSlice[] = [
    {
      id: 'collecte',
      label: 'Collecte (Achat paddy)',
      shortLabel: 'Collecte',
      description: 'Approvisionnement paddy bord-champ & coopératives (HS + BS).',
      color: '#6366f1',
      amountAr: collecteAmount,
      hsAmountAr: collecteHS,
      bsAmountAr: collecteBS,
      sharePct: (collecteAmount / denom) * 100,
      itemsSummary: 'Paddy HS & BS',
    },
    {
      id: 'transformation',
      label: 'Transformation (Usinage)',
      shortLabel: 'Transformation',
      description: includeFixedCharges
        ? 'Décorticage, docker, manutention & énergie usine (Jirama / main-d’œuvre).'
        : 'Décorticage, docker (in/out) et frais de transformation par kg.',
      color: '#14b8a6',
      amountAr: transfoAmount,
      hsAmountAr: transfoHS,
      bsAmountAr: transfoBS,
      sharePct: (transfoAmount / denom) * 100,
      itemsSummary: includeFixedCharges ? 'Décorticage, docker & atelier' : 'Décorticage & docker',
    },
    {
      id: 'logistique',
      label: 'Logistique (Transport)',
      shortLabel: 'Logistique',
      description: includeFixedCharges
        ? 'Carburant de collecte, usure routes & entretien mensuel des véhicules.'
        : 'Carburant et frais kilométriques des rotations de collecte.',
      color: '#f59e0b',
      amountAr: logAmount,
      hsAmountAr: logHS,
      bsAmountAr: logBS,
      sharePct: (logAmount / denom) * 100,
      itemsSummary: includeFixedCharges ? 'Carburant & flotte' : 'Carburant / rotations',
    },
    {
      id: 'commercialisation',
      label: 'Commercialisation & Gestion',
      shortLabel: 'Commercialisation',
      description: includeFixedCharges
        ? 'Sacs de conditionnement, frais administratifs, équipe commerciale & loyer.'
        : 'Sacs de conditionnement et frais administratifs par rotation.',
      color: '#ec4899',
      amountAr: commAmount,
      hsAmountAr: commHS,
      bsAmountAr: commBS,
      sharePct: (commAmount / denom) * 100,
      itemsSummary: includeFixedCharges ? 'Sacs, admin & commercial' : 'Sacs & admin / rotation',
    },
  ];

  const topCategory = [...slices].sort((a, b) => b.amountAr - a.amountAr)[0];

  return {
    includeFixedCharges,
    totalCostsAr: rawTotal,
    totalDirectOperationalAr,
    totalFixedChargesAr,
    slices,
    topCategory,
  };
}
