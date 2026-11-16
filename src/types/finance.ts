export interface BagOption {
  id: string;
  capacityKg: number;
  unitPriceAr: number;
}

export interface VariableCostPerKg {
  id: string;
  label: string;
  costHS: number;
  costBS: number;
}

export interface CostPerRotation {
  id: string;
  label: string;
  costHS: number;
  costBS: number;
}

export interface FixedMonthlyCharge {
  id: string;
  label: string;
  amount: number;
}

export interface SeasonAssumptions {
  months: number;
  rotationsPerMonth: number;
  paddyBoughtKgPerRotation: number;
  yieldPaddyToRice: number; // e.g. 0.70
  riceSellingPriceArPerKg: number;
  byproductSellingPriceArPerKg: number;
}

export interface InvestmentAssumptions {
  materielAr: number;
  enregistrementAr: number;
  cashBufferAr: number;
}

export type RoadCondition = 'goudronnee' | 'piste_praticable' | 'piste_degradee';

export interface LogisticsAssumptions {
  enabled: boolean;
  distanceOneWayKmHS: number;
  distanceOneWayKmBS: number;
  roadConditionHS: RoadCondition;
  roadConditionBS: RoadCondition;
  fuelPriceArPerLiter: number;
  fuelConsumptionLPer100Km: number;
  truckTollAndWearArPerKm: number;
  // Segment 2: Distribution Centre de Transformation -> Marchés Urbains
  includeUrbanDistribution?: boolean;
  distanceToUrbanMarketKmHS?: number;
  distanceToUrbanMarketKmBS?: number;
  urbanRoadConditionHS?: RoadCondition;
  urbanRoadConditionBS?: RoadCondition;
  urbanFreightArPerTonKm?: number;
  urbanHandlingAndTollArPerRot?: number;
  corridorPresetId?: string;
}

export interface KpiAlertThresholds {
  minNpvAr: number;
  minIrrRate: number; // decimal ratio, e.g. 0.12 = 12%
  maxPaybackMonths: number;
  minNetMarginRate?: number; // decimal ratio, e.g. 0.08 = 8% (Résultat net après IR / CA)
  minOperatingMarginRate?: number; // decimal ratio, e.g. 0.10 = 10% (Résultat opérationnel avant IR / CA)
  minGrossMarginRate?: number; // decimal ratio, e.g. 0.20 = 20%
}

export type ClimateHazardType =
  | 'normal'
  | 'secheresse_moderee'
  | 'secheresse_severe'
  | 'inondation_moderee'
  | 'cyclone_inondation';

export type ClimateCoefficientCategory =
  | 'cyclone'
  | 'secheresse'
  | 'inondation'
  | 'autre';

export interface ClimateLossCoefficient {
  id: string;
  label: string;
  category: ClimateCoefficientCategory;
  seasonScope: 'both' | 'hauteSaison' | 'basseSaison';
  fieldLossPercent: number; // positive loss ratio e.g. 0.25 = -25% field yield
  millingLossPoints: number; // positive points loss e.g. 0.02 = -2.0 pts milling yield
  probabilityPercent: number; // 0..100 occurrence probability for expected-loss mode
  active: boolean;
}

export interface ClimateImpactAssumptions {
  enabled: boolean;
  hazardType: ClimateHazardType;
  nominalYieldKgPerHa: number;
  cultivatedAreaHa: number;
  fieldYieldShockPercent: number; // decimal ratio, e.g. -0.18 = -18%
  millingYieldDeltaPoints: number; // decimal points on paddy->rice yield, e.g. -0.02 = -2 pts
  affectedSeason: 'both' | 'hauteSaison' | 'basseSaison';
  baselinePaddyKgHS: number;
  baselinePaddyKgBS: number;
  baselineMillingYieldHS: number;
  baselineMillingYieldBS: number;
  useCustomCoefficients?: boolean;
  coefficientAggregationMode?: 'cumulative' | 'expected_probability';
  customCoefficients?: ClimateLossCoefficient[];
}

export type FxCurrencyReference = 'EUR' | 'USD' | 'mixte';

export interface FxRiskAssumptions {
  enabled: boolean;
  referenceCurrency: FxCurrencyReference;
  eurArRateBaseline: number;
  usdArRateBaseline: number;
  ariaryFluctuationPercent: number; // e.g. +0.15 = +15% MGA depreciation (cost increase)
  fertilizerBaseCostArPerKgPaddy: number; // reference imported input cost per kg paddy
  importedFertilizerShare: number; // 0..1 share exposed to FX
  baselineMaterielAr: number; // initial equipment CAPEX before FX shock
  importedMachineryShare: number; // 0..1 share of equipment exposed to FX
}

export type StorageMethodType =
  | 'sacs_standard'
  | 'grenier_ventile'
  | 'sacs_hermetiques_pics';

export interface StorageOptimizationAssumptions {
  enabled: boolean;
  storageDurationDays: number; // 15..180 days
  moisturePercent: number; // 11..24 %
  storageMethod: StorageMethodType;
  affectedSeason: 'both' | 'hauteSaison' | 'basseSaison';
  storageCapacityKg?: number; // warehouse capacity in kg (e.g. 40000 = 40T)
}

export interface StockManagementAssumptions {
  enabled: boolean;
  syncCostsToModel: boolean;
  paddyHoldingDaysHS: number;
  paddyHoldingDaysBS: number;
  paddySafetyStockDays: number;
  paddyMaxShelfLifeDays: number;
  paddyStorageCostArPerTonMonth: number;
  milledRiceHoldingDaysHS: number;
  milledRiceHoldingDaysBS: number;
  milledRiceSafetyStockDays: number;
  milledRiceMaxShelfLifeDays: number;
  milledRiceStorageCostArPerTonMonth: number;
  workingCapitalFinancingRateAnnual: number; // e.g. 0.18 = 18%/year
  targetHoldingReductionPct: number; // e.g. 25% optimization lever
}

export interface CooperativePartner {
  id: string;
  name: string;
  region: string;
  sharePercent: number; // relative sourcing share weight (e.g. 0..100)
  paddyPriceArPerKgHS: number;
  paddyPriceArPerKgBS: number;
  collectionFeeArPerKg: number; // cooperative commission / triage / bagging fee per kg paddy
  active: boolean;
  note?: string;
}

export interface TransporterPartner {
  id: string;
  name: string;
  corridor: string;
  vehicleCapacityTons: number;
  sharePercent: number; // relative transport volume share weight (e.g. 0..100)
  costPerRotationHS: number;
  costPerRotationBS: number;
  reliabilityPercent: number;
  active: boolean;
  note?: string;
}

export interface PartnersEcosystemAssumptions {
  syncPaddyCosts: boolean;
  syncTransportCosts: boolean;
  cooperatives: CooperativePartner[];
  transporters: TransporterPartner[];
}

export interface PaddyStockAssumptions {
  currentStockKg: number;
  upcomingOrdersRiceKg: number;
  replenishmentLeadDays: number;
  safetyMarginDays: number;
}

export type SubsidyDonorType = 'national' | 'international' | 'mixte';

export interface SubsidiesAssumptions {
  enabled: boolean;
  programName: string;
  donorType: SubsidyDonorType;
  capexGrantPercent: number; // 0..0.90 applied to initial equipment & registration
  capexGrantFixedAr: number; // additional direct CAPEX grant in Ar
  bfrWorkingCapitalGrantAr?: number; // direct working-capital / BFR grant (e.g. dotation BFR de campagne)
  opexPaddySubsidyArPerKg: number; // 0..400 Ar/kg paddy variable input/milling subsidy
  opexFixedMonthlySubsidyAr: number; // 0..5000000 Ar/month operating support
  baselineMaterielAr: number;
  baselineEnregistrementAr: number;
  baselineCashBufferAr?: number;
  baselineCostPaddyHS: number;
  baselineCostPaddyBS: number;
  baselineCostDecorticageHS: number;
  baselineCostDecorticageBS: number;
  baselineFixedCharges: Array<{ id: string; amount: number }>;
}

export type CertificationType =
  | 'none'
  | 'bio'
  | 'commerce_equitable'
  | 'bio_equitable'
  | 'igp_local';

export interface TraceabilityCertificationAssumptions {
  enabled: boolean;
  certificationType: CertificationType;
  labelName: string;
  extraCostArPerKgPaddy: number;
  annualAuditFixedCostAr: number;
  sellingPricePremiumPercent: number; // e.g. 0.18 = +18%
  targetMarketSharePercent: number; // e.g. 12 = 12% target share
  addressableMarketVolumeKgAnnual: number; // addressable market volume in kg rice/yr
  baselinePriceHS: number;
  baselinePriceBS: number;
}

export type ImportedRiceGrade = 'brise' | 'standard' | 'parfume' | 'premium';
export type MarketPositioningStrategy = 'competitif' | 'parite' | 'premium_qualite';

export interface ImportedRiceBenchmark {
  id: string;
  name: string;
  origin: string;
  grade: ImportedRiceGrade;
  priceArPerKg: number;
  marketShareEstimatePct: number;
  notes?: string;
}

export interface MarketComparisonAssumptions {
  benchmarks: ImportedRiceBenchmark[];
  positioningStrategy: MarketPositioningStrategy;
}

export type LocalCompetitorActorType =
  | 'rizerie_industrielle'
  | 'collecteur_usinier'
  | 'cooperative'
  | 'importateur_urbain'
  | 'negociant_local';

export interface LocalCompetitorActor {
  id: string;
  name: string;
  actorType: LocalCompetitorActorType;
  region: string;
  paddySourcingCostArPerKgRice: number;
  millingAndPackagingCostArPerKg: number;
  logisticsAndOverheadArPerKg: number;
  sellingPriceArPerKg: number;
  marketSharePct: number;
  millingYieldPct: number;
  strengthTag: string;
  active: boolean;
}

export interface CompetitorBenchmarkAssumptions {
  ourTargetSharePct: number;
  actors: LocalCompetitorActor[];
}

export type MaintenanceEquipmentCategory =
  | 'decortiqueuse'
  | 'polisseur_blanchiment'
  | 'trieuse_ensacheuse'
  | 'camion_collecte'
  | 'groupe_electrogene';

export type MaintenanceInterventionType =
  | 'preventive'
  | 'revision_annuelle'
  | 'corrective';

export interface MachineMaintenanceEvent {
  id: string;
  machineName: string;
  category: MaintenanceEquipmentCategory;
  monthIndex: number; // 1..12
  downtimeDays: number; // 0..30
  capacityImpactRatio: number; // 0..1 (1 = 100% stoppage)
  maintenanceCostAr: number;
  maintenanceType: MaintenanceInterventionType;
  notes?: string;
}

export interface MachineMaintenanceSchedule {
  applyProductionLossToModel: boolean;
  operatingDaysPerMonth: number;
  baselineRotationsHS: number;
  baselineRotationsBS: number;
  events: MachineMaintenanceEvent[];
}

export type VatRegime = 'assujetti_reel' | 'exonere_agricole' | 'synthetique_is';
export type VatRiceOutputMode = 'exonere_ppn' | 'assujetti_20' | 'mixte_b2b';

export interface VatAssumptions {
  enabled: boolean;
  applyToCashFlow: boolean;
  regime: VatRegime;
  vatRate: number; // standard 0.20 in Madagascar CGI
  riceOutputMode: VatRiceOutputMode;
  taxableRiceSharePct: number; // 0..100 when riceOutputMode === 'mixte_b2b'
  byproductTaxable: boolean; // son & brisure
  fuelVatDeductibleQuotaPct: number; // e.g. 80 or 100%
  millingAndBagsVatApplicable: boolean;
  fixedChargesTaxableSharePct: number; // e.g. 45% (excluding salaries)
  capexVatRecoverable: boolean;
}

export type CommunalTaxPresetId =
  | 'custom'
  | 'alaotra_type1'
  | 'marovoay_irri'
  | 'hauts_plateaux';

export interface CommunalTaxesAssumptions {
  enabled: boolean;
  applyToModel: boolean;
  presetId: CommunalTaxPresetId;
  communeName: string;
  ristourneArPerKgPaddy: number; // Ristourne communale par kg de paddy collecté
  marketFeePerRotationAr: number; // Droit de marché, laissez-passer & pesage par rotation
  cultivatedLandHa: number; // Surface foncière agricole (ha)
  landRoyaltyArPerHaYear: number; // Redevance foncière / AUE périmètre irrigué (Ar/ha/an)
  ifpbAndPatentMonthlyAr: number; // IFPB & Patente communale mensualisée (Ar/mois)
}

export type FixedAssetCategory =
  | 'unite_decorticage'
  | 'materiel_agricole'
  | 'transport_manutention'
  | 'energie_infra';

export type DepreciationMethod = 'lineaire' | 'degressif';

export interface FixedAssetItem {
  id: string;
  name: string;
  category: FixedAssetCategory;
  acquisitionValueAr: number;
  residualValueAr: number;
  usefulLifeYears: number;
  method: DepreciationMethod;
  acquisitionYear: 1 | 2 | 3;
  active: boolean;
  notes?: string;
}

export interface FixedAssetsAssumptions {
  enabled: boolean;
  applyToModel: boolean;
  syncCapexToInvestment: boolean;
  baselineMaterielAr: number;
  items: FixedAssetItem[];
}

export interface FinancialAssumptions {
  // Haute Saison
  hauteSaison: SeasonAssumptions;
  // Basse Saison
  basseSaison: SeasonAssumptions;
  // Bag configuration
  bagOptions: BagOption[];
  selectedBagCapacityKg: number; // e.g. 60
  // Costs per kg of paddy
  costsPerKgPaddy: VariableCostPerKg[];
  // Costs per rotation (excluding paddy and bags which are calculated)
  costsPerRotation: CostPerRotation[];
  // Detailed Logistics & Paddy Collection modeling (syncs with Carburant / rotation)
  logistics?: LogisticsAssumptions;
  // Selected Madagascar rice production region preset
  selectedRegionId?: 'current' | 'alaotra' | 'itasy' | 'marovoay' | 'vakinankaratra' | 'sofia';
  // Fixed assets register & annual depreciation (matériel agricole & unités de décorticage)
  fixedAssets?: FixedAssetsAssumptions;
  // Climate hazard & yield shock modeling (syncs with paddy volume & milling yield)
  climateImpact?: ClimateImpactAssumptions;
  // Ariary exchange rate risk modeling on imported inputs & machinery
  fxRisk?: FxRiskAssumptions;
  // Post-harvest storage weight loss & valorizable stock modeling
  storageOptimization?: StorageOptimizationAssumptions;
  // Local agricultural cooperatives & transporters ecosystem modeling
  partnersEcosystem?: PartnersEcosystemAssumptions;
  // Paddy inventory & safety threshold monitoring for upcoming orders
  paddyStock?: PaddyStockAssumptions;
  // National or international agricultural subsidies & grants modeling
  subsidies?: SubsidiesAssumptions;
  // Traceability & organic / fair-trade certifications modeling
  traceabilityCertification?: TraceabilityCertificationAssumptions;
  // Imported rice market benchmarks & price positioning
  marketComparison?: MarketComparisonAssumptions;
  // Local rice value-chain competitors (cost price & market shares)
  competitors?: CompetitorBenchmarkAssumptions;
  // Machine maintenance calendar & technical downtime loss calculation
  machineMaintenance?: MachineMaintenanceSchedule;
  // Madagascar Agricultural VAT (TVA) modeling
  vatSettings?: VatAssumptions;
  // Madagascar Communal Taxes & Land Royalties modeling
  communalTaxes?: CommunalTaxesAssumptions;
  // Paddy & Milled Rice Inventory Holding Costs & Working Capital (BFR) Optimization
  stockManagement?: StockManagementAssumptions;
  // Fixed monthly charges
  fixedMonthlyCharges: FixedMonthlyCharge[];
  // Investment components
  investment: InvestmentAssumptions;
  // Tax & discounting
  corporateTaxRate: number; // 0.20
  discountRate: number; // 0.12
  investorShare: number; // 0.70
  // 3-Year Projections growth rates
  growthRateYear2: number; // 0.48
  growthRateYear3: number; // 0.60
  ambitiousGrowthRateYear2: number; // 0.98
  ambitiousGrowthRateYear3: number; // 0.60
  // Break-even client assumptions
  avgVolumePerClientKgMonthly: number; // 300
  // Visual alert thresholds for Dashboard KPIs
  kpiThresholds?: KpiAlertThresholds;
}

export interface SeasonResult {
  months: number;
  rotationsPerMonth: number;
  totalRotations: number;
  paddyKgPerRotation: number;
  totalPaddyKg: number;
  yieldRatio: number;
  riceKgPerRotation: number;
  totalRiceKg: number;
  byproductsKgPerRotation: number;
  totalByproductsKg: number;
  monthlyRiceKgSold: number;
  riceSellingPriceAr: number;
  byproductSellingPriceAr: number;
  turnoverPerRotationAr: number;
  totalTurnoverAr: number;
  // Bags
  bagsPerRotation: number;
  bagUnitPriceAr: number;
  bagCostPerRotationAr: number;
  // Cost breakdown per rotation
  costPerKgPaddyAr: number;
  paddyCostPerRotationAr: number;
  otherCostsPerRotationAr: number;
  totalCostPerRotationAr: number;
  totalPurchaseAndOperatingCostsAr: number;
  // Margins
  grossProfitPerRotationAr: number;
  monthlyGrossProfitAr: number;
  seasonGrossProfitAr: number;
  grossMarginRate: number;
  // Fixed charges allocated
  seasonFixedChargesAr: number;
  monthlyNetResultBeforeTaxAr: number;
  seasonNetResultBeforeTaxAr: number;
}

export interface Year1Result {
  totalRiceKgSold: number;
  totalTurnoverAr: number;
  totalPurchaseAndOperatingCostsAr: number;
  annualGrossProfitAr: number;
  grossMarginRate: number;
  monthlyFixedChargesAr: number;
  annualFixedChargesAr: number;
  netResultBeforeTaxAr: number;
  netMarginBeforeTaxRate: number;
  corporateTaxAr: number;
  netResultAfterTaxAr: number;
  netMarginAfterTaxRate: number;
  investorShareAr: number;
  companyShareAr: number;
  annualDepreciationAr?: number;
  depreciationTaxShieldAr?: number;
  operatingCashFlowAfterTaxAr?: number;
}

export interface InvestmentResult {
  rotationWorkingCapitalHSAr: number;
  materielAr: number;
  enregistrementAr: number;
  workingCapitalTotalAr: number;
  cashBufferAr: number;
  fundsToRaiseAr: number; // I0 rounded to thousands
  roiRatio: number; // Net profit after tax / funds to raise
}

export interface BreakEvenResult {
  monthlyFixedChargesAr: number;
  annualFixedChargesAr: number;
  grossMarginRate: number;
  annualBreakEvenTurnoverAr: number;
  monthlyBreakEvenTurnoverAr: number;
  weightedAvgSellingPriceAr: number;
  annualBreakEvenVolumeKg: number;
  monthlyBreakEvenVolumeKg: number;
  breakEvenPercentOfTarget: number;
  safetyMarginRate: number;
  avgVolumePerClientKgMonthly: number;
  requiredActiveClients: number;
  vigilanceThresholds: {
    level: string;
    monthlyVolumeKg: number;
    monthlyTurnoverAr: number;
    status: string;
  }[];
}

export interface MonthlyCashFlow {
  month: number;
  period: 'HS' | 'BS' | 'A2' | 'A3';
  resultBeforeTaxAr: number;
  netCashFlowAfterTaxAr: number;
  cumulativeCashFlowAr: number;
  recoveryMonth: number | null;
}

export interface PaybackResult {
  fundsInvestedAr: number;
  annualNetCashFlowYear1Ar: number;
  paybackMonths: number;
  paybackYears: number;
  simplePaybackMonths: number;
  monthlyCashFlows: MonthlyCashFlow[];
  isRecoveredWithin36Months: boolean;
}

export interface ProjectionYear {
  year: number;
  label: string;
  netResultAfterTaxAr: number;
  growthRate: number | null;
  netResultBeforeTaxAr: number;
  method: string;
}

export interface ProjectionResult {
  realistic: ProjectionYear[];
  ambitious: ProjectionYear[];
}

export interface DiscountSensitivityItem {
  rate: number;
  pvYear1Ar: number;
  pvYear2Ar: number;
  pvYear3Ar: number;
  totalPvAr: number;
  npvAr: number;
  decision: 'Investir ✓' | 'Refuser ✗' | 'Seuil = TRI';
}

export interface NPVResult {
  discountRate: number;
  initialInvestmentAr: number; // negative CF0
  cfYear1Ar: number;
  cfYear2Ar: number;
  cfYear3Ar: number;
  pvYear1Ar: number;
  pvYear2Ar: number;
  pvYear3Ar: number;
  totalPvAr: number;
  lossFromWaitingAr: number;
  npvAr: number;
  decision: 'Investir ✓' | 'Refuser ✗';
  sensitivityTable: DiscountSensitivityItem[];
}

export interface IRRResult {
  irrValue: number; // e.g. 5.17556 -> 517.56%
  npvAtIrrAr: number;
  isAcceptable: boolean;
  benchmarkDiscountRate: number;
  linearInterpolation: {
    i1: number;
    i2: number;
    npv1Ar: number;
    npv2Ar: number;
    approxIrr: number;
    error: number;
    bracketValid: boolean;
  };
}

export interface ScenarioDefinition {
  id: string;
  name: string;
  deltaYieldPoints: number; // e.g. -0.05
  deltaSellingPricePercent: number; // e.g. -0.05
  deltaPaddyPricePercent: number; // e.g. +0.05
  deltaRotationsPerMonth: number; // e.g. -0.5
  note?: string;
}

export interface ScenarioResult {
  definition: ScenarioDefinition;
  yieldHS: number;
  yieldBS: number;
  ricePriceHS: number;
  ricePriceBS: number;
  paddyPriceHS: number;
  paddyPriceBS: number;
  rotationsHS: number;
  rotationsBS: number;
  caRotationHS: number;
  caRotationBS: number;
  costRotationHS: number;
  costRotationBS: number;
  profitRotationHS: number;
  profitRotationBS: number;
  monthlyNetHS: number;
  monthlyNetBS: number;
  seasonNetHS: number;
  seasonNetBS: number;
  annualTurnoverAr: number;
  annualTotalCostsAr: number;
  annualNetBeforeTaxAr: number;
  annualTaxAr: number;
  annualNetAfterTaxAr: number;
  annualNetMarginRate: number;
  varianceFromRealisticAr: number;
  verdict: 'Rentable sur les 2 saisons' | 'Une saison déficitaire' | 'Perte annuelle';
}

export interface SensitivityMatrix {
  variableX: {
    id: string;
    label: string;
    unit: string;
    values: number[];
  };
  variableY: {
    id: string;
    label: string;
    unit: string;
    values: number[];
  };
  matrix: number[][]; // [row (Y)][col (X)] -> Annual net profit before tax in Ariary
  currentXValue: number;
  currentYValue: number;
}

export interface FullFinancialModel {
  assumptions: FinancialAssumptions;
  hauteSaison: SeasonResult;
  basseSaison: SeasonResult;
  year1: Year1Result;
  investment: InvestmentResult;
  breakEven: BreakEvenResult;
  payback: PaybackResult;
  projections: ProjectionResult;
  npv: NPVResult;
  irr: IRRResult;
  scenarios: {
    pessimiste: ScenarioResult;
    realiste: ScenarioResult;
    optimiste: ScenarioResult;
    customScenarios: ScenarioResult[];
  };
}
