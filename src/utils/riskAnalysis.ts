import {
  FinancialAssumptions,
  OperationalRiskCategory,
  OperationalRiskItem,
  RiskAnalysisAssumptions,
} from '../types/finance';

export const RISK_CATEGORY_LABELS: Record<OperationalRiskCategory, string> = {
  equipement: 'Équipement & Décorticage',
  rendement: 'Rendement & Qualité',
  approvisionnement: 'Collecte Paddy',
  stockage: 'Stockage & Humidité',
  logistique: 'Logistique & Pistes',
  marche: 'Marché & Contrepartie',
};

export const DEFAULT_OPERATIONAL_RISKS: OperationalRiskItem[] = [
  {
    id: 'risk-machine-breakdown',
    label: 'Panne décortiqueuse / groupe électrogène',
    category: 'equipement',
    probabilityPct: 18,
    financialImpactAr: 8_500_000,
    mitigationCostAr: 1_200_000,
    active: true,
    notes: 'Arrêt technique en pleine Haute Saison, frais de réparation urgente et location de secours.',
  },
  {
    id: 'risk-yield-drop',
    label: 'Baisse de rendement d’usinage (humidité / brisures)',
    category: 'rendement',
    probabilityPct: 22,
    financialImpactAr: 11_000_000,
    mitigationCostAr: 900_000,
    active: true,
    notes: 'Lot de paddy mal séché réduisant le taux de riz entier marchand de 3 à 4 points.',
  },
  {
    id: 'risk-supply-shortage',
    label: 'Tension de collecte / flambée ponctuelle du paddy',
    category: 'approvisionnement',
    probabilityPct: 15,
    financialImpactAr: 14_000_000,
    mitigationCostAr: 1_500_000,
    active: true,
    notes: 'Concurrence accrue de collecteurs externes obligeant un surcoût à l’achat bord-champ.',
  },
  {
    id: 'risk-storage-spoilage',
    label: 'Avarie de stockage / pertes post-récolte',
    category: 'stockage',
    probabilityPct: 12,
    financialImpactAr: 6_500_000,
    mitigationCostAr: 800_000,
    active: true,
    notes: 'Dégradation partielle en magasin par humidité, ravageurs ou moisissure avant usinage.',
  },
  {
    id: 'risk-logistics-delay',
    label: 'Coupure piste pluviale / retard transport',
    category: 'logistique',
    probabilityPct: 20,
    financialImpactAr: 5_500_000,
    mitigationCostAr: 600_000,
    active: true,
    notes: 'Surcharge camion ou immobilisation des rotations lors des pluies saisonnières.',
  },
];

export const DEFAULT_RISK_ANALYSIS_ASSUMPTIONS: RiskAnalysisAssumptions = {
  enabled: true,
  integrateIntoScenarios: false,
  pessimisticMultiplier: 1.5,
  optimisticResidualRatio: 0.35,
  risks: DEFAULT_OPERATIONAL_RISKS,
};

export interface EvaluatedRiskItem extends OperationalRiskItem {
  expectedLossAr: number;
  netMitigatedBenefitAr: number;
  severityScore: number; // probabilityPct * financialImpactAr
}

export interface RiskAnalysisSummary {
  settings: RiskAnalysisAssumptions;
  items: EvaluatedRiskItem[];
  activeCount: number;
  totalExpectedLossAr: number;
  pessimisticExpectedLossAr: number;
  realisticExpectedLossAr: number;
  optimisticExpectedLossAr: number;
  maxSingleImpactAr: number;
  totalMitigationCostAr: number;
  weightedAvgProbabilityPct: number;
  riskExposureIndex: 'faible' | 'modere' | 'eleve';
}

export function getResolvedRiskAnalysis(
  assumptions: FinancialAssumptions
): RiskAnalysisAssumptions {
  const raw = assumptions.riskAnalysis;
  if (!raw) {
    return {
      ...DEFAULT_RISK_ANALYSIS_ASSUMPTIONS,
      risks: DEFAULT_OPERATIONAL_RISKS.map((r) => ({ ...r })),
    };
  }
  return {
    enabled: raw.enabled ?? true,
    integrateIntoScenarios: raw.integrateIntoScenarios ?? false,
    pessimisticMultiplier:
      typeof raw.pessimisticMultiplier === 'number' && Number.isFinite(raw.pessimisticMultiplier)
        ? Math.max(1, Math.min(3, raw.pessimisticMultiplier))
        : 1.5,
    optimisticResidualRatio:
      typeof raw.optimisticResidualRatio === 'number' && Number.isFinite(raw.optimisticResidualRatio)
        ? Math.max(0, Math.min(1, raw.optimisticResidualRatio))
        : 0.35,
    risks: Array.isArray(raw.risks)
      ? raw.risks.map((r) => ({ ...r }))
      : DEFAULT_OPERATIONAL_RISKS.map((r) => ({ ...r })),
  };
}

export function computeRiskAnalysisSummary(
  assumptions: FinancialAssumptions,
  cashBufferAr = 0
): RiskAnalysisSummary {
  const settings = getResolvedRiskAnalysis(assumptions);

  const items: EvaluatedRiskItem[] = settings.risks.map((risk) => {
    const prob = Math.max(0, Math.min(100, Number(risk.probabilityPct) || 0));
    const impact = Math.max(0, Number(risk.financialImpactAr) || 0);
    const mitigation = Math.max(0, Number(risk.mitigationCostAr) || 0);
    const expectedLossAr = risk.active ? (prob / 100) * impact : 0;

    return {
      ...risk,
      probabilityPct: prob,
      financialImpactAr: impact,
      mitigationCostAr: mitigation,
      expectedLossAr,
      netMitigatedBenefitAr: expectedLossAr - mitigation,
      severityScore: expectedLossAr,
    };
  });

  const activeItems = items.filter((r) => r.active);
  const totalExpectedLossAr = activeItems.reduce((sum, r) => sum + r.expectedLossAr, 0);
  const maxSingleImpactAr = activeItems.reduce(
    (max, r) => Math.max(max, r.financialImpactAr),
    0
  );
  const totalMitigationCostAr = activeItems.reduce((sum, r) => sum + r.mitigationCostAr, 0);

  const totalWeight = activeItems.reduce((sum, r) => sum + r.financialImpactAr, 0);
  const weightedAvgProbabilityPct =
    totalWeight > 0
      ? activeItems.reduce((sum, r) => sum + r.probabilityPct * r.financialImpactAr, 0) /
        totalWeight
      : 0;

  const pessimisticExpectedLossAr = totalExpectedLossAr * settings.pessimisticMultiplier;
  const realisticExpectedLossAr = totalExpectedLossAr;
  const optimisticExpectedLossAr = totalExpectedLossAr * settings.optimisticResidualRatio;

  const bufferRatio = cashBufferAr > 0 ? totalExpectedLossAr / cashBufferAr : 0;
  const riskExposureIndex: RiskAnalysisSummary['riskExposureIndex'] =
    bufferRatio >= 1.2 || totalExpectedLossAr >= 20_000_000
      ? 'eleve'
      : bufferRatio >= 0.6 || totalExpectedLossAr >= 8_000_000
      ? 'modere'
      : 'faible';

  return {
    settings,
    items,
    activeCount: activeItems.length,
    totalExpectedLossAr,
    pessimisticExpectedLossAr,
    realisticExpectedLossAr,
    optimisticExpectedLossAr,
    maxSingleImpactAr,
    totalMitigationCostAr,
    weightedAvgProbabilityPct,
    riskExposureIndex,
  };
}

export function getScenarioExpectedRiskLoss(
  assumptions: FinancialAssumptions,
  scenarioId: string
): number {
  const raw = assumptions.riskAnalysis;
  if (!raw || !raw.enabled || !raw.integrateIntoScenarios) return 0;

  const summary = computeRiskAnalysisSummary(assumptions);
  if (scenarioId === 'pessimiste') {
    return summary.pessimisticExpectedLossAr;
  }
  if (scenarioId === 'optimiste') {
    return summary.optimisticExpectedLossAr;
  }
  return summary.realisticExpectedLossAr;
}
