import { FinancialAssumptions } from '../types/finance';
import {
  computeSeason,
  computeYear1,
  computeInvestment,
  computeProjections,
  computePayback,
  computeNPV,
} from '../engine/calculator';

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  category: 'coherence' | 'rentabilite';
  title: string;
  message: string;
  recommendation?: string;
}

export interface ProfitabilityDiagnostics {
  hsUnitCostPerRiceKg: number;
  hsSellingPricePerKg: number;
  hsFullCostPerRiceKg: number;
  bsUnitCostPerRiceKg: number;
  bsSellingPricePerKg: number;
  bsFullCostPerRiceKg: number;
  year1NetBeforeTaxAr: number;
  npvAr: number;
  isRecoveredWithin36Months: boolean;
}

export interface ValidationResult {
  errors: Record<string, string>;
  warnings: ValidationIssue[];
  diagnostics: ProfitabilityDiagnostics;
  isValid: boolean;
}

const fmtAr = (n: number) => `${Math.round(n).toLocaleString('fr-FR')} Ar`;

/**
 * Validates all user-editable assumptions, including real-time profitability
 * diagnostics (unit cost vs selling price, seasonal net losses, annual deficit, negative NPV).
 */
export function validateAssumptions(a: FinancialAssumptions): ValidationResult {
  const errors: Record<string, string> = {};
  const warnings: ValidationIssue[] = [];

  const checkSeason = (key: 'hauteSaison' | 'basseSaison', label: string) => {
    const s = a[key];
    if (!Number.isFinite(s.months) || s.months < 1 || s.months > 11) {
      errors[`${key}.months`] = `${label} : doit être entre 1 et 11 mois.`;
    }
    if (!Number.isFinite(s.rotationsPerMonth) || s.rotationsPerMonth <= 0) {
      errors[`${key}.rotationsPerMonth`] = 'Les rotations par mois doivent être strictement positives.';
    } else if (s.rotationsPerMonth > 15) {
      warnings.push({
        field: `${key}.rotationsPerMonth`,
        severity: 'warning',
        category: 'coherence',
        title: `Cadence très élevée (${label})`,
        message: `${label} : ${s.rotationsPerMonth} rotations/mois dépasse le rythme logistique habituel.`,
        recommendation: 'Vérifiez la capacité d’usinage et de stockage avant de valider ce volume.',
      });
    }
    if (!Number.isFinite(s.paddyBoughtKgPerRotation) || s.paddyBoughtKgPerRotation <= 0) {
      errors[`${key}.paddyBoughtKgPerRotation`] = 'La quantité de paddy par rotation doit être > 0 kg.';
    }
    if (!Number.isFinite(s.yieldPaddyToRice) || s.yieldPaddyToRice <= 0 || s.yieldPaddyToRice > 1) {
      errors[`${key}.yieldPaddyToRice`] = 'Le rendement doit être compris entre 0,01 (1 %) et 1,00 (100 %).';
    }
    if (!Number.isFinite(s.riceSellingPriceArPerKg) || s.riceSellingPriceArPerKg <= 0) {
      errors[`${key}.riceSellingPriceArPerKg`] = 'Le prix de vente du riz doit être > 0 Ar/kg.';
    }
    if (!Number.isFinite(s.byproductSellingPriceArPerKg) || s.byproductSellingPriceArPerKg < 0) {
      errors[`${key}.byproductSellingPriceArPerKg`] = 'Le prix des sous-produits ne peut pas être négatif.';
    }
  };

  checkSeason('hauteSaison', 'Haute Saison');
  checkSeason('basseSaison', 'Basse Saison');

  const totalMonths = (a.hauteSaison.months || 0) + (a.basseSaison.months || 0);
  if (totalMonths !== 12) {
    warnings.push({
      field: 'seasons.totalMonths',
      severity: 'warning',
      category: 'coherence',
      title: 'Durée annuelle différente de 12 mois',
      message: `La somme des mois (${a.hauteSaison.months} + ${a.basseSaison.months} = ${totalMonths} mois) diffère de 12 mois.`,
      recommendation: 'Activez le verrouillage « Maintenir HS + BS = 12 mois » ou ajustez les durées saisonnières.',
    });
  }

  // Bags
  a.bagOptions.forEach((b) => {
    if (!Number.isFinite(b.capacityKg) || b.capacityKg <= 0) {
      errors[`bag.${b.id}.capacityKg`] = 'Contenance > 0 kg requise.';
    }
    if (!Number.isFinite(b.unitPriceAr) || b.unitPriceAr < 0) {
      errors[`bag.${b.id}.unitPriceAr`] = 'Prix unitaire ≥ 0 Ar requis.';
    }
  });

  // Variable costs per kg
  a.costsPerKgPaddy.forEach((c) => {
    if (c.costHS < 0 || c.costBS < 0) {
      errors[`costKg.${c.id}`] = 'Les coûts par kg doivent être positifs ou nuls.';
    }
  });

  // Rotation costs
  a.costsPerRotation.forEach((c) => {
    if (c.costHS < 0 || c.costBS < 0) {
      errors[`costRot.${c.id}`] = 'Les coûts par rotation doivent être positifs ou nuls.';
    }
  });

  // Fixed charges
  a.fixedMonthlyCharges.forEach((f) => {
    if (f.amount < 0) {
      errors[`fixed.${f.id}`] = 'Le montant d’une charge fixe doit être ≥ 0 Ar.';
    }
  });

  // Investment
  if (a.investment.materielAr < 0) {
    errors['investment.materielAr'] = 'Le montant matériel doit être ≥ 0 Ar.';
  }
  if (a.investment.enregistrementAr < 0) {
    errors['investment.enregistrementAr'] = 'Les frais d’enregistrement doivent être ≥ 0 Ar.';
  }
  if (a.investment.cashBufferAr < 0) {
    errors['investment.cashBufferAr'] = 'Le cash buffer doit être ≥ 0 Ar.';
  }
  if (!Number.isFinite(a.avgVolumePerClientKgMonthly) || a.avgVolumePerClientKgMonthly < 1) {
    errors['avgVolumePerClientKgMonthly'] = 'Le volume moyen par client doit être ≥ 1 kg/mois.';
  }

  // Tax, discount, investor share, growth rates
  if (!Number.isFinite(a.corporateTaxRate) || a.corporateTaxRate < 0 || a.corporateTaxRate >= 1) {
    errors['corporateTaxRate'] = 'Le taux IR doit être compris entre 0 (0 %) et 0,99 (99 %).';
  }
  if (!Number.isFinite(a.discountRate) || a.discountRate < 0 || a.discountRate > 5) {
    errors['discountRate'] = 'Le taux d’actualisation doit être compris entre 0 et 5,00 (500 %).';
  }
  if (!Number.isFinite(a.investorShare) || a.investorShare < 0 || a.investorShare > 1) {
    errors['investorShare'] = 'La part investisseur doit être comprise entre 0 (0 %) et 1 (100 %).';
  }
  if (!Number.isFinite(a.growthRateYear2) || a.growthRateYear2 < -0.99) {
    errors['growthRateYear2'] = 'La croissance A2 doit être supérieure à -99 %.';
  }
  if (!Number.isFinite(a.growthRateYear3) || a.growthRateYear3 < -0.99) {
    errors['growthRateYear3'] = 'La croissance A3 doit être supérieure à -99 %.';
  }
  if (!Number.isFinite(a.ambitiousGrowthRateYear2) || a.ambitiousGrowthRateYear2 < -0.99) {
    errors['ambitiousGrowthRateYear2'] = 'La croissance ambitieuse A2 doit être > -99 %.';
  }
  if (!Number.isFinite(a.ambitiousGrowthRateYear3) || a.ambitiousGrowthRateYear3 < -0.99) {
    errors['ambitiousGrowthRateYear3'] = 'La croissance ambitieuse A3 doit être > -99 %.';
  }

  // Logistics validation (if present)
  if (a.logistics) {
    if (!Number.isFinite(a.logistics.distanceOneWayKmHS) || a.logistics.distanceOneWayKmHS < 0) {
      errors['logistics.distanceOneWayKmHS'] = 'La distance aller HS doit être ≥ 0 km.';
    }
    if (!Number.isFinite(a.logistics.distanceOneWayKmBS) || a.logistics.distanceOneWayKmBS < 0) {
      errors['logistics.distanceOneWayKmBS'] = 'La distance aller BS doit être ≥ 0 km.';
    }
    if (!Number.isFinite(a.logistics.fuelPriceArPerLiter) || a.logistics.fuelPriceArPerLiter < 0) {
      errors['logistics.fuelPriceArPerLiter'] = 'Le prix du carburant doit être ≥ 0 Ar/L.';
    }
    if (!Number.isFinite(a.logistics.fuelConsumptionLPer100Km) || a.logistics.fuelConsumptionLPer100Km < 0) {
      errors['logistics.fuelConsumptionLPer100Km'] = 'La consommation doit être ≥ 0 L/100 km.';
    }
    if (!Number.isFinite(a.logistics.truckTollAndWearArPerKm) || a.logistics.truckTollAndWearArPerKm < 0) {
      errors['logistics.truckTollAndWearArPerKm'] = 'Les frais d’usure/km doivent être ≥ 0 Ar/km.';
    }
    if (
      a.logistics.distanceToUrbanMarketKmHS !== undefined &&
      (!Number.isFinite(a.logistics.distanceToUrbanMarketKmHS) || a.logistics.distanceToUrbanMarketKmHS < 0)
    ) {
      errors['logistics.distanceToUrbanMarketKmHS'] = 'La distance marché urbain HS doit être ≥ 0 km.';
    }
    if (
      a.logistics.distanceToUrbanMarketKmBS !== undefined &&
      (!Number.isFinite(a.logistics.distanceToUrbanMarketKmBS) || a.logistics.distanceToUrbanMarketKmBS < 0)
    ) {
      errors['logistics.distanceToUrbanMarketKmBS'] = 'La distance marché urbain BS doit être ≥ 0 km.';
    }
    if (
      a.logistics.urbanFreightArPerTonKm !== undefined &&
      (!Number.isFinite(a.logistics.urbanFreightArPerTonKm) || a.logistics.urbanFreightArPerTonKm < 0)
    ) {
      errors['logistics.urbanFreightArPerTonKm'] = 'Le tarif fret urbain doit être ≥ 0 Ar/t·km.';
    }
  }

  // Stock Management & BFR validation (if present)
  if (a.stockManagement) {
    if (!Number.isFinite(a.stockManagement.paddyHoldingDaysHS) || a.stockManagement.paddyHoldingDaysHS < 0) {
      errors['stockManagement.paddyHoldingDaysHS'] = 'La durée de conservation paddy HS doit être ≥ 0 j.';
    }
    if (!Number.isFinite(a.stockManagement.paddyHoldingDaysBS) || a.stockManagement.paddyHoldingDaysBS < 0) {
      errors['stockManagement.paddyHoldingDaysBS'] = 'La durée de conservation paddy BS doit être ≥ 0 j.';
    }
    if (
      !Number.isFinite(a.stockManagement.paddyStorageCostArPerTonMonth) ||
      a.stockManagement.paddyStorageCostArPerTonMonth < 0
    ) {
      errors['stockManagement.paddyStorageCostArPerTonMonth'] = 'Le coût de stockage paddy doit être ≥ 0.';
    }
    if (
      !Number.isFinite(a.stockManagement.milledRiceStorageCostArPerTonMonth) ||
      a.stockManagement.milledRiceStorageCostArPerTonMonth < 0
    ) {
      errors['stockManagement.milledRiceStorageCostArPerTonMonth'] = 'Le coût de stockage riz usiné doit être ≥ 0.';
    }
  }

  // KPI Alert thresholds validation (if present)
  if (a.kpiThresholds) {
    if (!Number.isFinite(a.kpiThresholds.minNpvAr)) {
      errors['kpiThresholds.minNpvAr'] = 'Le seuil de VAN minimale doit être un nombre valide.';
    }
    if (!Number.isFinite(a.kpiThresholds.minIrrRate) || a.kpiThresholds.minIrrRate < -0.9) {
      errors['kpiThresholds.minIrrRate'] = 'Le seuil de TRI minimal doit être supérieur à -90 %.';
    }
    if (!Number.isFinite(a.kpiThresholds.maxPaybackMonths) || a.kpiThresholds.maxPaybackMonths <= 0) {
      errors['kpiThresholds.maxPaybackMonths'] = 'Le délai de récupération maximal doit être > 0 mois.';
    }
    if (
      a.kpiThresholds.minNetMarginRate !== undefined &&
      (!Number.isFinite(a.kpiThresholds.minNetMarginRate) ||
        a.kpiThresholds.minNetMarginRate < -1 ||
        a.kpiThresholds.minNetMarginRate > 1)
    ) {
      errors['kpiThresholds.minNetMarginRate'] =
        'Le seuil de marge nette doit être entre -100 % et 100 %.';
    }
    if (
      a.kpiThresholds.minOperatingMarginRate !== undefined &&
      (!Number.isFinite(a.kpiThresholds.minOperatingMarginRate) ||
        a.kpiThresholds.minOperatingMarginRate < -1 ||
        a.kpiThresholds.minOperatingMarginRate > 1)
    ) {
      errors['kpiThresholds.minOperatingMarginRate'] =
        'Le seuil de marge opérationnelle doit être entre -100 % et 100 %.';
    }
    if (
      a.kpiThresholds.minGrossMarginRate !== undefined &&
      (!Number.isFinite(a.kpiThresholds.minGrossMarginRate) ||
        a.kpiThresholds.minGrossMarginRate < -1 ||
        a.kpiThresholds.minGrossMarginRate > 1)
    ) {
      errors['kpiThresholds.minGrossMarginRate'] =
        'Le seuil de marge brute doit être entre -100 % et 100 %.';
    }
  }

  // Climate impact validation (if present)
  if (a.climateImpact) {
    if (
      !Number.isFinite(a.climateImpact.nominalYieldKgPerHa) ||
      a.climateImpact.nominalYieldKgPerHa <= 0
    ) {
      errors['climate.nominalYieldKgPerHa'] = 'Le rendement nominal à l’hectare doit être > 0 kg/ha.';
    }
    if (
      !Number.isFinite(a.climateImpact.cultivatedAreaHa) ||
      a.climateImpact.cultivatedAreaHa <= 0
    ) {
      errors['climate.cultivatedAreaHa'] = 'La surface du bassin suivi doit être > 0 ha.';
    }
    if (
      !Number.isFinite(a.climateImpact.fieldYieldShockPercent) ||
      a.climateImpact.fieldYieldShockPercent < -0.9 ||
      a.climateImpact.fieldYieldShockPercent > 1
    ) {
      errors['climate.fieldYieldShockPercent'] =
        'L’impact climatique doit être compris entre −90 % et +100 %.';
    }
    if (
      !Number.isFinite(a.climateImpact.millingYieldDeltaPoints) ||
      a.climateImpact.millingYieldDeltaPoints < -0.5 ||
      a.climateImpact.millingYieldDeltaPoints > 0.3
    ) {
      errors['climate.millingYieldDeltaPoints'] =
        'L’impact sur le rendement usinage doit être entre −50 pts et +30 pts.';
    }
  }

  // FX Risk validation (if present)
  if (a.fxRisk) {
    if (!Number.isFinite(a.fxRisk.eurArRateBaseline) || a.fxRisk.eurArRateBaseline <= 0) {
      errors['fxRisk.eurArRateBaseline'] = 'Le taux de change EUR/MGA doit être > 0 Ar.';
    }
    if (!Number.isFinite(a.fxRisk.usdArRateBaseline) || a.fxRisk.usdArRateBaseline <= 0) {
      errors['fxRisk.usdArRateBaseline'] = 'Le taux de change USD/MGA doit être > 0 Ar.';
    }
    if (
      !Number.isFinite(a.fxRisk.ariaryFluctuationPercent) ||
      a.fxRisk.ariaryFluctuationPercent < -0.5 ||
      a.fxRisk.ariaryFluctuationPercent > 2
    ) {
      errors['fxRisk.ariaryFluctuationPercent'] =
        'La fluctuation de l’Ariary doit être entre −50 % et +200 %.';
    }
    if (
      !Number.isFinite(a.fxRisk.fertilizerBaseCostArPerKgPaddy) ||
      a.fxRisk.fertilizerBaseCostArPerKgPaddy < 0
    ) {
      errors['fxRisk.fertilizerBaseCostArPerKgPaddy'] =
        'Le coût des intrants importés doit être ≥ 0 Ar/kg.';
    }
  }

  // Storage optimization validation (if present)
  if (a.storageOptimization) {
    if (
      !Number.isFinite(a.storageOptimization.storageDurationDays) ||
      a.storageOptimization.storageDurationDays < 0 ||
      a.storageOptimization.storageDurationDays > 365
    ) {
      errors['storage.storageDurationDays'] =
        'La durée de stockage doit être comprise entre 0 et 365 jours.';
    }
    if (
      !Number.isFinite(a.storageOptimization.moisturePercent) ||
      a.storageOptimization.moisturePercent < 8 ||
      a.storageOptimization.moisturePercent > 35
    ) {
      errors['storage.moisturePercent'] =
        'Le taux d’humidité du paddy doit être compris entre 8 % et 35 %.';
    }
    if (
      a.storageOptimization.storageCapacityKg !== undefined &&
      (!Number.isFinite(a.storageOptimization.storageCapacityKg) ||
        a.storageOptimization.storageCapacityKg < 1000)
    ) {
      errors['storage.storageCapacityKg'] =
        'La capacité de stockage doit être au minimum de 1 000 kg (1 T).';
    }
  }

  // Paddy stock security validation (if present)
  if (a.paddyStock) {
    if (!Number.isFinite(a.paddyStock.currentStockKg) || a.paddyStock.currentStockKg < 0) {
      errors['paddyStock.currentStockKg'] = 'Le stock actuel de paddy doit être ≥ 0 kg.';
    }
    if (!Number.isFinite(a.paddyStock.upcomingOrdersRiceKg) || a.paddyStock.upcomingOrdersRiceKg < 0) {
      errors['paddyStock.upcomingOrdersRiceKg'] = 'Les commandes de riz à honorer doivent être ≥ 0 kg.';
    }
    if (!Number.isFinite(a.paddyStock.replenishmentLeadDays) || a.paddyStock.replenishmentLeadDays < 0) {
      errors['paddyStock.replenishmentLeadDays'] = 'Le délai de réapprovisionnement doit être ≥ 0 jours.';
    }
    if (!Number.isFinite(a.paddyStock.safetyMarginDays) || a.paddyStock.safetyMarginDays < 0) {
      errors['paddyStock.safetyMarginDays'] = 'La marge de sécurité en jours doit être ≥ 0 jours.';
    }
  }

  // Subsidies validation (if present)
  if (a.subsidies) {
    if (
      !Number.isFinite(a.subsidies.capexGrantPercent) ||
      a.subsidies.capexGrantPercent < 0 ||
      a.subsidies.capexGrantPercent > 0.9
    ) {
      errors['subsidies.capexGrantPercent'] =
        'Le taux de subvention CAPEX doit être compris entre 0 % et 90 %.';
    }
    if (!Number.isFinite(a.subsidies.capexGrantFixedAr) || a.subsidies.capexGrantFixedAr < 0) {
      errors['subsidies.capexGrantFixedAr'] = 'La subvention CAPEX directe doit être ≥ 0 Ar.';
    }
    if (
      !Number.isFinite(a.subsidies.opexPaddySubsidyArPerKg) ||
      a.subsidies.opexPaddySubsidyArPerKg < 0
    ) {
      errors['subsidies.opexPaddySubsidyArPerKg'] =
        'L’aide sur intrants/usinage doit être ≥ 0 Ar/kg.';
    }
    if (
      !Number.isFinite(a.subsidies.opexFixedMonthlySubsidyAr) ||
      a.subsidies.opexFixedMonthlySubsidyAr < 0
    ) {
      errors['subsidies.opexFixedMonthlySubsidyAr'] =
        'L’appui mensuel aux charges d’exploitation doit être ≥ 0 Ar/mois.';
    }
  }

  // Traceability & certifications validation (if present)
  if (a.traceabilityCertification) {
    if (
      !Number.isFinite(a.traceabilityCertification.extraCostArPerKgPaddy) ||
      a.traceabilityCertification.extraCostArPerKgPaddy < 0
    ) {
      errors['traceability.extraCostArPerKgPaddy'] =
        'Le surcoût traçabilité par kg doit être ≥ 0 Ar/kg.';
    }
    if (
      !Number.isFinite(a.traceabilityCertification.annualAuditFixedCostAr) ||
      a.traceabilityCertification.annualAuditFixedCostAr < 0
    ) {
      errors['traceability.annualAuditFixedCostAr'] =
        'Le coût annuel d’audit doit être ≥ 0 Ar.';
    }
    if (
      !Number.isFinite(a.traceabilityCertification.sellingPricePremiumPercent) ||
      a.traceabilityCertification.sellingPricePremiumPercent < -0.5 ||
      a.traceabilityCertification.sellingPricePremiumPercent > 1.5
    ) {
      errors['traceability.sellingPricePremiumPercent'] =
        'La prime prix doit être comprise entre −50 % et +150 %.';
    }
    if (
      !Number.isFinite(a.traceabilityCertification.targetMarketSharePercent) ||
      a.traceabilityCertification.targetMarketSharePercent < 0 ||
      a.traceabilityCertification.targetMarketSharePercent > 100
    ) {
      errors['traceability.targetMarketSharePercent'] =
        'La part de marché cible doit être comprise entre 0 % et 100 %.';
    }
  }

  // Machine maintenance schedule validation (if present)
  if (a.machineMaintenance) {
    if (
      !Number.isFinite(a.machineMaintenance.operatingDaysPerMonth) ||
      a.machineMaintenance.operatingDaysPerMonth < 15 ||
      a.machineMaintenance.operatingDaysPerMonth > 31
    ) {
      errors['maintenance.operatingDaysPerMonth'] =
        'Les jours ouvrés par mois doivent être entre 15 et 31 jours.';
    }
  }

  // Communal taxes & land royalties validation (if present)
  if (a.communalTaxes) {
    if (
      !Number.isFinite(a.communalTaxes.ristourneArPerKgPaddy) ||
      a.communalTaxes.ristourneArPerKgPaddy < 0
    ) {
      errors['communalTaxes.ristourneArPerKgPaddy'] =
        'La ristourne communale par kg doit être ≥ 0 Ar/kg.';
    }
    if (
      !Number.isFinite(a.communalTaxes.marketFeePerRotationAr) ||
      a.communalTaxes.marketFeePerRotationAr < 0
    ) {
      errors['communalTaxes.marketFeePerRotationAr'] =
        'Les droits de marché par rotation doivent être ≥ 0 Ar.';
    }
    if (
      !Number.isFinite(a.communalTaxes.cultivatedLandHa) ||
      a.communalTaxes.cultivatedLandHa < 0
    ) {
      errors['communalTaxes.cultivatedLandHa'] =
        'La surface foncière déclarée doit être ≥ 0 ha.';
    }
    if (
      !Number.isFinite(a.communalTaxes.landRoyaltyArPerHaYear) ||
      a.communalTaxes.landRoyaltyArPerHaYear < 0
    ) {
      errors['communalTaxes.landRoyaltyArPerHaYear'] =
        'La redevance foncière par hectare doit être ≥ 0 Ar/ha/an.';
    }
    if (
      !Number.isFinite(a.communalTaxes.ifpbAndPatentMonthlyAr) ||
      a.communalTaxes.ifpbAndPatentMonthlyAr < 0
    ) {
      errors['communalTaxes.ifpbAndPatentMonthlyAr'] =
        'La patente et IFPB mensuels doivent être ≥ 0 Ar/mois.';
    }
  }

  // Real-time intelligent profitability & unit-cost checks
  const hs = computeSeason(a, 'hauteSaison');
  const bs = computeSeason(a, 'basseSaison');
  const year1 = computeYear1(hs, bs, a.corporateTaxRate, a.investorShare);
  const investment = computeInvestment(hs, a, year1);
  const projections = computeProjections(
    year1,
    a.corporateTaxRate,
    a.growthRateYear2,
    a.growthRateYear3,
    a.ambitiousGrowthRateYear2,
    a.ambitiousGrowthRateYear3
  );
  const payback = computePayback(
    investment.fundsToRaiseAr,
    hs,
    bs,
    year1,
    projections,
    a.corporateTaxRate
  );
  const npv = computeNPV(investment.fundsToRaiseAr, projections, a.discountRate);

  const analyzeSeasonEconomics = (
    seasonKey: 'hauteSaison' | 'basseSaison',
    seasonLabel: string,
    res: typeof hs
  ) => {
    const riceKgRot = res.riceKgPerRotation;
    const byproductRevenueRot = res.byproductsKgPerRotation * res.byproductSellingPriceAr;
    const netVariableCostPerRiceKg =
      riceKgRot > 0 ? (res.totalCostPerRotationAr - byproductRevenueRot) / riceKgRot : 0;

    const monthlyFixed = res.months > 0 ? res.seasonFixedChargesAr / res.months : 0;
    const monthlyRiceKg = riceKgRot * res.rotationsPerMonth;
    const fullCostPerRiceKg =
      monthlyRiceKg > 0
        ? netVariableCostPerRiceKg + monthlyFixed / monthlyRiceKg
        : netVariableCostPerRiceKg;

    if (riceKgRot > 0 && res.grossProfitPerRotationAr <= 0) {
      warnings.push({
        field: `${seasonKey}.unitProfitability`,
        severity: 'error',
        category: 'rentabilite',
        title: `Coût de revient supérieur au prix de vente (${seasonLabel})`,
        message: `Le coût de revient variable net (${fmtAr(netVariableCostPerRiceKg)}/kg) dépasse ou égale le prix de vente (${fmtAr(res.riceSellingPriceAr)}/kg). Chaque rotation génère ${fmtAr(res.grossProfitPerRotationAr)}.`,
        recommendation:
          'Augmentez le prix de vente du riz, améliorez le rendement paddy→riz ou réduisez les coûts d’achat/usinage.',
      });
    } else if (res.monthlyNetResultBeforeTaxAr < 0) {
      warnings.push({
        field: `${seasonKey}.monthlyProfitability`,
        severity: 'warning',
        category: 'rentabilite',
        title: `${seasonLabel} déficitaire après charges fixes`,
        message: `Coût de revient complet estimé à ${fmtAr(fullCostPerRiceKg)}/kg contre un prix de vente de ${fmtAr(res.riceSellingPriceAr)}/kg (résultat mensuel : ${fmtAr(res.monthlyNetResultBeforeTaxAr)}/mois).`,
        recommendation:
          'Augmentez le nombre de rotations par mois ou le volume par rotation pour mieux absorber les charges fixes.',
      });
    } else if (res.grossMarginRate > 0 && res.grossMarginRate < 0.08) {
      warnings.push({
        field: `${seasonKey}.tightMargin`,
        severity: 'warning',
        category: 'rentabilite',
        title: `Marge brute critique en ${seasonLabel} (${(res.grossMarginRate * 100).toFixed(1)} %)`,
        message: `L’écart entre le prix de vente (${fmtAr(res.riceSellingPriceAr)}/kg) et le coût variable (${fmtAr(netVariableCostPerRiceKg)}/kg) offre une marge très faible.`,
        recommendation:
          'Une hausse mineure du prix du paddy pourrait rendre cette saison déficitaire.',
      });
    }

    return { netVariableCostPerRiceKg, fullCostPerRiceKg };
  };

  const hsEcon = analyzeSeasonEconomics('hauteSaison', 'Haute Saison', hs);
  const bsEcon = analyzeSeasonEconomics('basseSaison', 'Basse Saison', bs);

  if (year1.netResultBeforeTaxAr <= 0) {
    warnings.push({
      field: 'annual.profitability',
      severity: 'error',
      category: 'rentabilite',
      title: 'Projet non rentable sur l’Année 1',
      message: `Le résultat net annuel avant IR est négatif ou nul (${fmtAr(year1.netResultBeforeTaxAr)}). Les charges fixes annuelles (${fmtAr(year1.annualFixedChargesAr)}) ne sont pas couvertes.`,
      recommendation:
        'Revoyez la structure des prix, les coûts au kg ou le nombre annuel de rotations avant de valider ce scénario.',
    });
  } else if (npv.npvAr < 0 || !payback.isRecoveredWithin36Months) {
    warnings.push({
      field: 'investment.npv',
      severity: 'warning',
      category: 'rentabilite',
      title: 'Rentabilité du capital insuffisante à 3 ans',
      message:
        npv.npvAr < 0
          ? `La Valeur Actuelle Nette (VAN) est négative (${fmtAr(npv.npvAr)}) au taux exigé de ${(a.discountRate * 100).toFixed(1)} %.`
          : `Le capital investi I₀ (${fmtAr(investment.fundsToRaiseAr)}) n’est pas récupéré dans les 36 mois.`,
      recommendation:
        'Réduisez le besoin en matériel/cash buffer initial ou améliorez la capacité bénéficiaire annuelle.',
    });
  }

  return {
    errors,
    warnings,
    diagnostics: {
      hsUnitCostPerRiceKg: hsEcon.netVariableCostPerRiceKg,
      hsSellingPricePerKg: hs.riceSellingPriceAr,
      hsFullCostPerRiceKg: hsEcon.fullCostPerRiceKg,
      bsUnitCostPerRiceKg: bsEcon.netVariableCostPerRiceKg,
      bsSellingPricePerKg: bs.riceSellingPriceAr,
      bsFullCostPerRiceKg: bsEcon.fullCostPerRiceKg,
      year1NetBeforeTaxAr: year1.netResultBeforeTaxAr,
      npvAr: npv.npvAr,
      isRecoveredWithin36Months: payback.isRecoveredWithin36Months,
    },
    isValid: Object.keys(errors).length === 0,
  };
}
