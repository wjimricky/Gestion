import {
  CertificationType,
  FinancialAssumptions,
  TraceabilityCertificationAssumptions,
} from '../types/finance';
import { calculateFullModel } from '../engine/calculator';

export interface CertificationPreset {
  id: CertificationType;
  label: string;
  labelName: string;
  extraCostArPerKgPaddy: number;
  annualAuditFixedCostAr: number;
  sellingPricePremiumPercent: number;
  targetMarketSharePercent: number;
  description: string;
}

export const CERTIFICATION_PRESETS: CertificationPreset[] = [
  {
    id: 'none',
    label: 'Sans certification',
    labelName: 'Riz conventionnel (sans label)',
    extraCostArPerKgPaddy: 0,
    annualAuditFixedCostAr: 0,
    sellingPricePremiumPercent: 0,
    targetMarketSharePercent: 8,
    description: 'Production standard sans surcoût d’audit ni prime prix certifiée.',
  },
  {
    id: 'igp_local',
    label: 'IGP & Traçabilité Mada',
    labelName: 'Traçabilité Lot & Label Qualité Madagascar',
    extraCostArPerKgPaddy: 20,
    annualAuditFixedCostAr: 1800000,
    sellingPricePremiumPercent: 0.08,
    targetMarketSharePercent: 12,
    description:
      'Traçabilité QR par lot coopératif et contrôle qualité humidité/pureté (+8 % prix cible).',
  },
  {
    id: 'bio',
    label: 'Bio (ECOCERT)',
    labelName: 'Certification Agriculture Biologique (ECOCERT)',
    extraCostArPerKgPaddy: 65,
    annualAuditFixedCostAr: 4800000,
    sellingPricePremiumPercent: 0.22,
    targetMarketSharePercent: 14,
    description:
      'Cahier des charges zéro intrant chimique, séparation de lots et audit annuel (+22 % prix premium).',
  },
  {
    id: 'commerce_equitable',
    label: 'Commerce Équitable',
    labelName: 'Certification Commerce Équitable (Fairtrade)',
    extraCostArPerKgPaddy: 55,
    annualAuditFixedCostAr: 3600000,
    sellingPricePremiumPercent: 0.16,
    targetMarketSharePercent: 15,
    description:
      'Prime prix garantie aux coopératives (+55 Ar/kg paddy) et accès circuits CHR / export (+16 %).',
  },
  {
    id: 'bio_equitable',
    label: 'Double Label Bio + Équitable',
    labelName: 'Double Certification Bio & Commerce Équitable',
    extraCostArPerKgPaddy: 95,
    annualAuditFixedCostAr: 6400000,
    sellingPricePremiumPercent: 0.30,
    targetMarketSharePercent: 18,
    description:
      'Positionnement export / grande distribution premium combinant traçabilité intégrale (+30 % prix).',
  },
];

const CERT_COST_ID = 'cost-certification';
const CERT_FIXED_ID = 'fix-certification';

export function getResolvedTraceability(
  assumptions: FinancialAssumptions
): TraceabilityCertificationAssumptions {
  const existing = assumptions.traceabilityCertification;
  return {
    enabled: existing?.enabled ?? true,
    certificationType: existing?.certificationType ?? 'none',
    labelName: existing?.labelName ?? 'Riz conventionnel (sans label)',
    extraCostArPerKgPaddy: existing?.extraCostArPerKgPaddy ?? 0,
    annualAuditFixedCostAr: existing?.annualAuditFixedCostAr ?? 0,
    sellingPricePremiumPercent: existing?.sellingPricePremiumPercent ?? 0,
    targetMarketSharePercent: existing?.targetMarketSharePercent ?? 8,
    addressableMarketVolumeKgAnnual:
      existing?.addressableMarketVolumeKgAnnual ?? 3000000,
    baselinePriceHS:
      existing?.baselinePriceHS ?? assumptions.hauteSaison.riceSellingPriceArPerKg,
    baselinePriceBS:
      existing?.baselinePriceBS ?? assumptions.basseSaison.riceSellingPriceArPerKg,
  };
}

export function hasActiveCertificationImpact(
  cert: TraceabilityCertificationAssumptions
): boolean {
  return (
    cert.certificationType !== 'none' ||
    cert.extraCostArPerKgPaddy > 0.5 ||
    cert.annualAuditFixedCostAr > 0.5 ||
    Math.abs(cert.sellingPricePremiumPercent) > 1e-6
  );
}

/**
 * Applies traceability / certification costs & premium pricing cleanly onto
 * assumptions without altering baseline Excel math when inactive or set to 'none'.
 */
export function applyTraceabilityToAssumptions(
  assumptions: FinancialAssumptions,
  cert: TraceabilityCertificationAssumptions
): Pick<
  FinancialAssumptions,
  'hauteSaison' | 'basseSaison' | 'costsPerKgPaddy' | 'fixedMonthlyCharges'
> {
  const cleanCosts = assumptions.costsPerKgPaddy.filter((c) => c.id !== CERT_COST_ID);
  const cleanFixed = assumptions.fixedMonthlyCharges.filter((f) => f.id !== CERT_FIXED_ID);

  const restoredHS = {
    ...assumptions.hauteSaison,
    riceSellingPriceArPerKg: Math.max(100, Math.round(cert.baselinePriceHS)),
  };
  const restoredBS = {
    ...assumptions.basseSaison,
    riceSellingPriceArPerKg: Math.max(100, Math.round(cert.baselinePriceBS)),
  };

  if (!cert.enabled || !hasActiveCertificationImpact(cert)) {
    return {
      hauteSaison: restoredHS,
      basseSaison: restoredBS,
      costsPerKgPaddy: cleanCosts,
      fixedMonthlyCharges: cleanFixed,
    };
  }

  const premiumFactor = 1 + Math.max(-0.5, Math.min(1.5, cert.sellingPricePremiumPercent));
  const nextPriceHS = Math.max(100, Math.round(cert.baselinePriceHS * premiumFactor));
  const nextPriceBS = Math.max(100, Math.round(cert.baselinePriceBS * premiumFactor));

  const extraKg = Math.max(0, Math.round(cert.extraCostArPerKgPaddy));
  const nextCosts =
    extraKg > 0
      ? [
          ...cleanCosts,
          {
            id: CERT_COST_ID,
            label: `Traçabilité & ${CERTIFICATION_PRESETS.find((p) => p.id === cert.certificationType)?.label || 'Certification'}`,
            costHS: extraKg,
            costBS: extraKg,
          },
        ]
      : cleanCosts;

  const monthlyAudit = Math.max(0, Math.round(cert.annualAuditFixedCostAr / 12));
  const nextFixed =
    monthlyAudit > 0
      ? [
          ...cleanFixed,
          {
            id: CERT_FIXED_ID,
            label: 'Audit & contrôle certification (mensualisé)',
            amount: monthlyAudit,
          },
        ]
      : cleanFixed;

  return {
    hauteSaison: {
      ...restoredHS,
      riceSellingPriceArPerKg: nextPriceHS,
    },
    basseSaison: {
      ...restoredBS,
      riceSellingPriceArPerKg: nextPriceBS,
    },
    costsPerKgPaddy: nextCosts,
    fixedMonthlyCharges: nextFixed,
  };
}

export interface TraceabilitySimulationPreview {
  beforeModel: ReturnType<typeof calculateFullModel>;
  afterModel: ReturnType<typeof calculateFullModel>;
  certifiedPriceHS: number;
  certifiedPriceBS: number;
  extraVariableCostAnnualAr: number;
  annualAuditCostAr: number;
  totalCertificationCostAnnualAr: number;
  turnoverDeltaAr: number;
  netProfitDeltaAr: number;
  npvDeltaAr: number;
  irrBefore: number;
  irrAfter: number;
  annualRiceVolumeKg: number;
  capturedMarketSharePct: number;
  targetMarketVolumeKg: number;
  volumeCoverageOfTargetPct: number;
  certificationRoiRatio: number;
}

export function computeTraceabilityPreview(
  assumptions: FinancialAssumptions,
  cert: TraceabilityCertificationAssumptions
): TraceabilitySimulationPreview {
  const basePatch = applyTraceabilityToAssumptions(assumptions, {
    ...cert,
    enabled: false,
  });
  const beforeModel = calculateFullModel({
    ...assumptions,
    ...basePatch,
  });

  const simPatch = applyTraceabilityToAssumptions(assumptions, {
    ...cert,
    enabled: true,
  });
  const afterModel = calculateFullModel({
    ...assumptions,
    ...simPatch,
  });

  const totalPaddyAnnualKg =
    afterModel.hauteSaison.totalPaddyKg + afterModel.basseSaison.totalPaddyKg;
  const extraVariableCostAnnualAr = Math.round(
    totalPaddyAnnualKg * Math.max(0, cert.extraCostArPerKgPaddy)
  );
  const annualAuditCostAr = Math.round(Math.max(0, cert.annualAuditFixedCostAr));
  const totalCertificationCostAnnualAr =
    extraVariableCostAnnualAr + annualAuditCostAr;

  const annualRiceVolumeKg = afterModel.year1.totalRiceKgSold;
  const addressableKg = Math.max(1, cert.addressableMarketVolumeKgAnnual);
  const capturedMarketSharePct = (annualRiceVolumeKg / addressableKg) * 100;
  const targetMarketVolumeKg =
    addressableKg * (Math.max(0, cert.targetMarketSharePercent) / 100);
  const volumeCoverageOfTargetPct =
    targetMarketVolumeKg > 0 ? (annualRiceVolumeKg / targetMarketVolumeKg) * 100 : 0;

  const netProfitDeltaAr =
    afterModel.year1.netResultAfterTaxAr - beforeModel.year1.netResultAfterTaxAr;
  const certificationRoiRatio =
    totalCertificationCostAnnualAr > 0
      ? netProfitDeltaAr / totalCertificationCostAnnualAr
      : 0;

  return {
    beforeModel,
    afterModel,
    certifiedPriceHS: simPatch.hauteSaison.riceSellingPriceArPerKg,
    certifiedPriceBS: simPatch.basseSaison.riceSellingPriceArPerKg,
    extraVariableCostAnnualAr,
    annualAuditCostAr,
    totalCertificationCostAnnualAr,
    turnoverDeltaAr: afterModel.year1.totalTurnoverAr - beforeModel.year1.totalTurnoverAr,
    netProfitDeltaAr,
    npvDeltaAr: afterModel.npv.npvAr - beforeModel.npv.npvAr,
    irrBefore: Number.isFinite(beforeModel.irr.irrValue) ? beforeModel.irr.irrValue : 0,
    irrAfter: Number.isFinite(afterModel.irr.irrValue) ? afterModel.irr.irrValue : 0,
    annualRiceVolumeKg,
    capturedMarketSharePct,
    targetMarketVolumeKg,
    volumeCoverageOfTargetPct,
    certificationRoiRatio,
  };
}
