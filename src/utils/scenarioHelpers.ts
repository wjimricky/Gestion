import { FinancialAssumptions, ScenarioDefinition } from '../types/finance';

/**
 * Applies a ScenarioDefinition's relative adjustments onto a baseline FinancialAssumptions
 * object so a full financial model (including NPV, IRR, and Payback) can be evaluated.
 */
export function applyScenarioDefinitionToAssumptions(
  base: FinancialAssumptions,
  def: ScenarioDefinition
): FinancialAssumptions {
  const yieldHS = Math.max(
    0.01,
    Math.min(1, base.hauteSaison.yieldPaddyToRice + def.deltaYieldPoints)
  );
  const yieldBS = Math.max(
    0.01,
    Math.min(1, base.basseSaison.yieldPaddyToRice + def.deltaYieldPoints)
  );

  return {
    ...base,
    hauteSaison: {
      ...base.hauteSaison,
      yieldPaddyToRice: yieldHS,
      riceSellingPriceArPerKg: Math.max(
        1,
        base.hauteSaison.riceSellingPriceArPerKg * (1 + def.deltaSellingPricePercent)
      ),
      rotationsPerMonth: Math.max(
        0,
        base.hauteSaison.rotationsPerMonth + def.deltaRotationsPerMonth
      ),
    },
    basseSaison: {
      ...base.basseSaison,
      yieldPaddyToRice: yieldBS,
      riceSellingPriceArPerKg: Math.max(
        1,
        base.basseSaison.riceSellingPriceArPerKg * (1 + def.deltaSellingPricePercent)
      ),
      rotationsPerMonth: Math.max(
        0,
        base.basseSaison.rotationsPerMonth + def.deltaRotationsPerMonth
      ),
    },
    costsPerKgPaddy: base.costsPerKgPaddy.map((c) =>
      c.id === 'cost-paddy'
        ? {
            ...c,
            costHS: Math.max(0, c.costHS * (1 + def.deltaPaddyPricePercent)),
            costBS: Math.max(0, c.costBS * (1 + def.deltaPaddyPricePercent)),
          }
        : c
    ),
  };
}
