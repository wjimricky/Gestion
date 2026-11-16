import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { FinancingPlanAnchorId } from '../types/project';
import { formatAriary, formatMonths, formatPercent } from './formatters';

export interface FinancingPlanAnchor {
  id: FinancingPlanAnchorId;
  code: string;
  label: string;
  shortLabel: string;
  metricSummary: string;
  contextDetail: string;
}

export const EXPERT_ROLE_OPTIONS = [
  'Analyste financier',
  'Comité investissement',
  'Direction exploitation',
  'Responsable collecte & logistique',
  'Expert agronome',
] as const;

export function buildFinancingPlanAnchors(
  model: FullFinancialModel,
  assumptions: FinancialAssumptions,
  inMillions: boolean
): FinancingPlanAnchor[] {
  const capexFixed =
    model.investment.materielAr + model.investment.enregistrementAr;
  const bfrPlusBuffer =
    model.investment.rotationWorkingCapitalHSAr + model.investment.cashBufferAr;

  return [
    {
      id: 'fonds_a_lever',
      code: '01',
      label: 'Enveloppe totale à lever (I₀)',
      shortLabel: 'Fonds I₀',
      metricSummary: formatAriary(model.investment.fundsToRaiseAr, { inMillions }),
      contextDetail: `CAPEX + BFR 1ère rotation HS + Buffer · ROI ${model.investment.roiRatio.toFixed(2)}x`,
    },
    {
      id: 'capex_materiel',
      code: '02',
      label: 'Matériel, équipements & enregistrement',
      shortLabel: 'CAPEX fixe',
      metricSummary: formatAriary(capexFixed, { inMillions }),
      contextDetail: `Matériel ${formatAriary(model.investment.materielAr, { inMillions })} · Légal ${formatAriary(model.investment.enregistrementAr, { inMillions })}`,
    },
    {
      id: 'bfr_soudure',
      code: '03',
      label: 'BFR initial & réserve de trésorerie',
      shortLabel: 'BFR & Buffer',
      metricSummary: formatAriary(bfrPlusBuffer, { inMillions }),
      contextDetail: `1 rot. HS ${formatAriary(model.investment.rotationWorkingCapitalHSAr, { inMillions })} · Buffer ${formatAriary(model.investment.cashBufferAr, { inMillions })}`,
    },
    {
      id: 'haute_saison',
      code: '04',
      label: `Exploitation Haute Saison (${assumptions.hauteSaison.months} mois)`,
      shortLabel: 'Haute Saison',
      metricSummary: `${formatAriary(model.hauteSaison.seasonNetResultBeforeTaxAr, { inMillions })} avant IR`,
      contextDetail: `Marge brute ${formatPercent(model.hauteSaison.grossMarginRate, 1)} · ${model.hauteSaison.totalRotations} rot.`,
    },
    {
      id: 'basse_saison',
      code: '05',
      label: `Exploitation Basse Saison (${assumptions.basseSaison.months} mois)`,
      shortLabel: 'Basse Saison',
      metricSummary: `${formatAriary(model.basseSaison.seasonNetResultBeforeTaxAr, { inMillions })} avant IR`,
      contextDetail: `Marge brute ${formatPercent(model.basseSaison.grossMarginRate, 1)} · ${model.basseSaison.totalRotations} rot.`,
    },
    {
      id: 'seuil_rentabilite',
      code: '06',
      label: 'Seuil de rentabilité & point mort',
      shortLabel: 'Point mort',
      metricSummary: `${formatAriary(model.breakEven.annualBreakEvenTurnoverAr, { inMillions })} / an`,
      contextDetail: `Marge de sécurité ${formatPercent(model.breakEven.safetyMarginRate, 1)} · ${Math.round(model.breakEven.requiredActiveClients)} clients`,
    },
    {
      id: 'van_tri_payback',
      code: '07',
      label: 'Rentabilité 3 ans (VAN, TRI & Payback)',
      shortLabel: 'VAN / TRI',
      metricSummary: `VAN ${formatAriary(model.npv.npvAr, { inMillions: true })} · TRI ${Number.isFinite(model.irr.irrValue) ? formatPercent(model.irr.irrValue, 1) : 'N/A'}`,
      contextDetail: `Payback ${model.payback.isRecoveredWithin36Months ? formatMonths(model.payback.paybackMonths) : '> 36 mois'} (r = ${formatPercent(assumptions.discountRate, 0)})`,
    },
    {
      id: 'repartition_benefice',
      code: '08',
      label: 'Répartition du résultat (Investisseur / Société)',
      shortLabel: 'Dividendes',
      metricSummary: `${formatPercent(assumptions.investorShare, 0)} / ${formatPercent(1 - assumptions.investorShare, 0)}`,
      contextDetail: `Investisseur ${formatAriary(model.year1.investorShareAr, { inMillions })} · Entreprise ${formatAriary(model.year1.companyShareAr, { inMillions })}`,
    },
  ];
}
