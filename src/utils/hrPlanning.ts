import {
  FinancialAssumptions,
  FixedMonthlyCharge,
  HrPoleType,
  HrRoleItem,
  HumanResourcesAssumptions,
} from '../types/finance';

export const HR_FIXED_CHARGE_ID = 'fix-hr-saisonnier';

export const DEFAULT_HR_ROLES: HrRoleItem[] = [
  {
    id: 'hr-recolte-riz',
    label: 'Saisonniers Récolte & Battage (Rizières)',
    pole: 'rizieres',
    headcountHS: 14,
    headcountBS: 5,
    monthlyGrossSalaryAr: 260000,
    annualTrainingPerPersonAr: 45000,
    active: true,
  },
  {
    id: 'hr-irrigation-sarclage',
    label: 'Équipe Repiquage SRI & Gestion Eau',
    pole: 'rizieres',
    headcountHS: 8,
    headcountBS: 4,
    monthlyGrossSalaryAr: 280000,
    annualTrainingPerPersonAr: 60000,
    active: true,
  },
  {
    id: 'hr-operateurs-usinage',
    label: 'Opérateurs Décorticage & Polissage',
    pole: 'transformation',
    headcountHS: 4,
    headcountBS: 3,
    monthlyGrossSalaryAr: 420000,
    annualTrainingPerPersonAr: 110000,
    active: true,
  },
  {
    id: 'hr-manutention-tri',
    label: 'Manutentionnaires, Triage & Ensachage',
    pole: 'transformation',
    headcountHS: 6,
    headcountBS: 4,
    monthlyGrossSalaryAr: 290000,
    annualTrainingPerPersonAr: 50000,
    active: true,
  },
];

export const DEFAULT_HR_ASSUMPTIONS: HumanResourcesAssumptions = {
  enabled: true,
  applyToModel: false, // Opt-in pour préserver la base nominale Excel
  socialChargesRatePct: 18, // Madagascar CNaPS (13 %) + OSTIE (5 %)
  roles: DEFAULT_HR_ROLES,
};

export function getResolvedHrPlanning(
  assumptions: FinancialAssumptions
): HumanResourcesAssumptions {
  const existing = assumptions.hrPlanning;
  return {
    enabled: existing?.enabled ?? DEFAULT_HR_ASSUMPTIONS.enabled,
    applyToModel: existing?.applyToModel ?? false,
    socialChargesRatePct:
      existing?.socialChargesRatePct ?? DEFAULT_HR_ASSUMPTIONS.socialChargesRatePct,
    roles:
      Array.isArray(existing?.roles) && existing.roles.length > 0
        ? existing.roles
        : DEFAULT_HR_ROLES,
  };
}

export interface HrPoleBreakdown {
  pole: HrPoleType;
  label: string;
  avgHeadcountHS: number;
  avgHeadcountBS: number;
  annualGrossSalaryAr: number;
  annualSocialChargesAr: number;
  annualTrainingCostAr: number;
  annualTotalCostAr: number;
}

export interface HrPlanningSummary {
  socialRate: number;
  hsMonths: number;
  bsMonths: number;
  totalHeadcountHS: number;
  totalHeadcountBS: number;
  monthlyPayrollHSAr: number;
  monthlyPayrollBSAr: number;
  annualGrossSalariesAr: number;
  annualSocialChargesAr: number;
  annualTrainingCostAr: number;
  annualTotalCostAr: number;
  averageMonthlyCostAr: number;
  poles: {
    rizieres: HrPoleBreakdown;
    transformation: HrPoleBreakdown;
  };
}

export function computeHrPlanningSummary(
  assumptions: FinancialAssumptions,
  hr: HumanResourcesAssumptions
): HrPlanningSummary {
  const hsMonths = Math.max(1, assumptions.hauteSaison.months);
  const bsMonths = Math.max(1, assumptions.basseSaison.months);
  const totalMonths = Math.max(1, hsMonths + bsMonths);
  const socialRate = Math.max(0, Math.min(0.6, (hr.socialChargesRatePct || 0) / 100));

  const initPole = (pole: HrPoleType, label: string): HrPoleBreakdown => ({
    pole,
    label,
    avgHeadcountHS: 0,
    avgHeadcountBS: 0,
    annualGrossSalaryAr: 0,
    annualSocialChargesAr: 0,
    annualTrainingCostAr: 0,
    annualTotalCostAr: 0,
  });

  const rizieres = initPole('rizieres', 'Main-d’œuvre Rizières & Collecte');
  const transformation = initPole('transformation', 'Unité de Transformation & Ensachage');

  let totalHeadcountHS = 0;
  let totalHeadcountBS = 0;
  let monthlyPayrollHSAr = 0;
  let monthlyPayrollBSAr = 0;

  for (const role of hr.roles) {
    if (!role.active) continue;
    const hcHS = Math.max(0, role.headcountHS || 0);
    const hcBS = Math.max(0, role.headcountBS || 0);
    const salary = Math.max(0, role.monthlyGrossSalaryAr || 0);
    const trainingUnit = Math.max(0, role.annualTrainingPerPersonAr || 0);
    const peakHeadcount = Math.max(hcHS, hcBS);

    const grossHS = hcHS * salary * hsMonths;
    const grossBS = hcBS * salary * bsMonths;
    const grossTotal = grossHS + grossBS;
    const socialTotal = grossTotal * socialRate;
    const trainingTotal = peakHeadcount * trainingUnit;

    totalHeadcountHS += hcHS;
    totalHeadcountBS += hcBS;
    monthlyPayrollHSAr += hcHS * salary * (1 + socialRate);
    monthlyPayrollBSAr += hcBS * salary * (1 + socialRate);

    const target = role.pole === 'rizieres' ? rizieres : transformation;
    target.avgHeadcountHS += hcHS;
    target.avgHeadcountBS += hcBS;
    target.annualGrossSalaryAr += grossTotal;
    target.annualSocialChargesAr += socialTotal;
    target.annualTrainingCostAr += trainingTotal;
    target.annualTotalCostAr += grossTotal + socialTotal + trainingTotal;
  }

  const annualGrossSalariesAr =
    rizieres.annualGrossSalaryAr + transformation.annualGrossSalaryAr;
  const annualSocialChargesAr =
    rizieres.annualSocialChargesAr + transformation.annualSocialChargesAr;
  const annualTrainingCostAr =
    rizieres.annualTrainingCostAr + transformation.annualTrainingCostAr;
  const annualTotalCostAr =
    annualGrossSalariesAr + annualSocialChargesAr + annualTrainingCostAr;
  const averageMonthlyCostAr = Math.round(annualTotalCostAr / totalMonths);

  return {
    socialRate,
    hsMonths,
    bsMonths,
    totalHeadcountHS,
    totalHeadcountBS,
    monthlyPayrollHSAr: Math.round(monthlyPayrollHSAr),
    monthlyPayrollBSAr: Math.round(monthlyPayrollBSAr),
    annualGrossSalariesAr: Math.round(annualGrossSalariesAr),
    annualSocialChargesAr: Math.round(annualSocialChargesAr),
    annualTrainingCostAr: Math.round(annualTrainingCostAr),
    annualTotalCostAr: Math.round(annualTotalCostAr),
    averageMonthlyCostAr,
    poles: { rizieres, transformation },
  };
}

export function applyHrPlanningToFixedCharges(
  fixedMonthlyCharges: FixedMonthlyCharge[],
  hr: HumanResourcesAssumptions,
  assumptions: FinancialAssumptions
): FixedMonthlyCharge[] {
  const withoutHr = fixedMonthlyCharges.filter((c) => c.id !== HR_FIXED_CHARGE_ID);
  if (!hr.enabled || !hr.applyToModel) {
    return withoutHr;
  }
  const summary = computeHrPlanningSummary(assumptions, hr);
  if (summary.averageMonthlyCostAr <= 0) {
    return withoutHr;
  }
  return [
    ...withoutHr,
    {
      id: HR_FIXED_CHARGE_ID,
      label: 'RH saisonnières, CNaPS/OSTIE & Formation',
      amount: summary.averageMonthlyCostAr,
    },
  ];
}
