import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { computeSeasonLogisticsBreakdown, computeUrbanDistributionBreakdown, getResolvedLogistics } from '../utils/logistics';
import { computeStockBfrAnalysis, getResolvedStockManagement } from '../utils/stockManagement';
import { KpiAlertsEvaluation } from '../utils/logistics';

export type AnalysisFocus = 'executive' | 'banker' | 'risks';

export interface AiVigilancePoint {
  title: string;
  severity: 'elevee' | 'moderee' | 'info';
  metric: string;
  explanation: string;
  mitigation: string;
}

export interface AiFinancialAnalysisResult {
  verdictLabel: string;
  verdictLevel: 'favorable' | 'conditionnel' | 'critique';
  executiveSummary: string;
  vanTriInterpretation: string;
  strengths: string[];
  vigilancePoints: AiVigilancePoint[];
  recommendations: string[];
  reportReadyParagraph: string;
}

export interface AiFinancialAnalysisResponse {
  analysis: AiFinancialAnalysisResult;
  generatedAt: string;
  model: string;
}

export async function generateAiFinancialAnalysis(params: {
  projectName: string;
  focus: AnalysisFocus;
  customQuestion?: string;
  assumptions: FinancialAssumptions;
  model: FullFinancialModel;
  kpiAlerts: KpiAlertsEvaluation;
}): Promise<AiFinancialAnalysisResponse> {
  const { projectName, focus, customQuestion, assumptions, model, kpiAlerts } = params;

  const logistics = getResolvedLogistics(assumptions);
  const hsLog = computeSeasonLogisticsBreakdown(logistics, 'hauteSaison');
  const bsLog = computeSeasonLogisticsBreakdown(logistics, 'basseSaison');
  const hsRiceKg =
    assumptions.hauteSaison.paddyBoughtKgPerRotation * assumptions.hauteSaison.yieldPaddyToRice;
  const bsRiceKg =
    assumptions.basseSaison.paddyBoughtKgPerRotation * assumptions.basseSaison.yieldPaddyToRice;
  const hsUrb = logistics.includeUrbanDistribution
    ? computeUrbanDistributionBreakdown(logistics, hsRiceKg, 'hauteSaison').totalCostPerRotationAr
    : 0;
  const bsUrb = logistics.includeUrbanDistribution
    ? computeUrbanDistributionBreakdown(logistics, bsRiceKg, 'basseSaison').totalCostPerRotationAr
    : 0;
  const annualLog =
    (hsLog.totalCostPerRotationAr + hsUrb) * model.hauteSaison.totalRotations +
    (bsLog.totalCostPerRotationAr + bsUrb) * model.basseSaison.totalRotations;
  const logisticsSharePct =
    model.year1.totalPurchaseAndOperatingCostsAr > 0
      ? (annualLog / model.year1.totalPurchaseAndOperatingCostsAr) * 100
      : 0;

  const stock = getResolvedStockManagement(assumptions);
  const stockAnalysis = computeStockBfrAnalysis(assumptions, model, stock);

  const cashFlows = model.payback.monthlyCashFlows;
  const minCashAr =
    cashFlows.length > 0
      ? Math.min(...cashFlows.map((m) => m.cumulativeCashFlowAr))
      : 0;
  const year3CumulativeCashAr =
    cashFlows.length > 0
      ? cashFlows[cashFlows.length - 1].cumulativeCashFlowAr
      : 0;

  const response = await fetch('/api/gemini/financial-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      projectName,
      focus,
      customQuestion,
      metrics: {
        totalInvestmentAr: model.investment.fundsToRaiseAr,
        year1TurnoverAr: model.year1.totalTurnoverAr,
        year1NetResultAr: model.year1.netResultAfterTaxAr,
        year1GrossMarginRate: model.year1.grossMarginRate,
        year1NetMarginRate: model.year1.netMarginAfterTaxRate,
        npvAr: model.npv.npvAr,
        irrRate: Number.isFinite(model.irr.irrValue) ? model.irr.irrValue : null,
        paybackMonths:
          model.payback.isRecoveredWithin36Months && Number.isFinite(model.payback.paybackMonths)
            ? model.payback.paybackMonths
            : null,
        discountRate: assumptions.discountRate,
        corporateTaxRate: assumptions.corporateTaxRate,
        hsPaddyPriceAr: model.hauteSaison.costPerKgPaddyAr,
        hsRicePriceAr: assumptions.hauteSaison.riceSellingPriceArPerKg,
        bsPaddyPriceAr: model.basseSaison.costPerKgPaddyAr,
        bsRicePriceAr: assumptions.basseSaison.riceSellingPriceArPerKg,
        hsYield: assumptions.hauteSaison.yieldPaddyToRice,
        bsYield: assumptions.basseSaison.yieldPaddyToRice,
        minCashAr,
        year3CumulativeCashAr,
        logisticsSharePct,
        stockBfrAr: stockAnalysis.totalStockBfrAr,
        breachedAlerts: kpiAlerts.breachedItems.map((i) => `${i.label}: ${i.reason}`),
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error || 'Impossible de générer l’analyse qualitative.');
  }

  return data as AiFinancialAnalysisResponse;
}
