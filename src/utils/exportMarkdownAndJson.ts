import { FullFinancialModel } from '../types/finance';
import { formatAriary, formatMonths, formatPercent } from './formatters';
import { GeneralLiquidityRatioResult } from './liquidityAndCampaign';

export interface ExecutiveExportParams {
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
  liquidity?: GeneralLiquidityRatioResult;
  dashboardNotes?: string;
}

export function exportExecutiveSummaryMarkdown(params: ExecutiveExportParams): void {
  const { model, projectName, scenarioName, liquidity, dashboardNotes } = params;
  const y1 = model.year1;
  const irrFinite = Number.isFinite(model.irr.irrValue);
  const irrGap = irrFinite ? model.irr.irrValue - model.npv.discountRate : -1;

  const vanStatus =
    model.npv.npvAr > 0
      ? 'GO — Création de valeur nette positive'
      : 'NO-GO — VAN négative';
  const triStatus =
    irrFinite && model.irr.isAcceptable
      ? `GO — Marge de ${formatPercent(irrGap, 1)} au-dessus du hurdle`
      : 'VIGILANCE — TRI inférieur au coût du capital';
  const paybackStatus =
    model.payback.isRecoveredWithin36Months && model.payback.paybackMonths <= 24
      ? 'GO — Récupération rapide (≤ 24 mois)'
      : model.payback.isRecoveredWithin36Months
      ? 'CONDITIONNEL — Récupération entre 24 et 36 mois'
      : 'NO-GO — Payback > 36 mois';
  const liquidityStatus = liquidity
    ? liquidity.ratio >= 1.5
      ? 'GO — Liquidité solide (≥ 1,50x)'
      : liquidity.ratio >= 1.0
      ? 'CONDITIONNEL — Équilibre court terme'
      : 'ALERTE — Tension de liquidité (< 1,00x)'
    : 'N/D';

  const overallGo =
    model.npv.npvAr > 0 &&
    irrFinite &&
    model.irr.isAcceptable &&
    model.payback.isRecoveredWithin36Months;

  const dateStr = new Date().toISOString().slice(0, 10);
  const lines: string[] = [
    `# Executive Summary — ${projectName}`,
    '',
    `- **Scénario analysé** : ${scenarioName}`,
    `- **Date d’édition** : ${new Date().toLocaleDateString('fr-FR')}`,
    `- **Décision Comité d’Investissement** : **${
      overallGo ? 'AVIS FAVORABLE (PROJET BANCABLE)' : 'AVIS CONDITIONNEL / REVUE REQUISE'
    }**`,
    '',
    '---',
    '',
    '## 1. Synthèse des Indicateurs Clés (Année 1 & Horizon 3 ans)',
    '',
    '| Indicateur | Valeur Calculée | Référence / Cible |',
    '| :--- | ---: | ---: |',
    `| Investissement initial à lever ($I_0$) | ${formatAriary(model.investment.fundsToRaiseAr, { inMillions: true })} | BFR 1ère rot. + CAPEX + Cash Buffer |`,
    `| Chiffre d’affaires Année 1 | ${formatAriary(y1.totalTurnoverAr, { inMillions: true })} | ${Math.round(y1.totalRiceKgSold).toLocaleString('fr-FR')} kg riz/an |`,
    `| Marge brute annuelle | ${formatAriary(y1.annualGrossProfitAr, { inMillions: true })} | ${formatPercent(y1.grossMarginRate, 1)} du CA |`,
    `| Résultat net après IR | ${formatAriary(y1.netResultAfterTaxAr, { inMillions: true })} | ${formatPercent(y1.netMarginAfterTaxRate, 1)} du CA |`,
    `| VAN à 3 ans ($r = ${formatPercent(model.npv.discountRate, 0)}$) | ${formatAriary(model.npv.npvAr, { inMillions: true })} | > 0 Ar |`,
    `| TRI à 3 ans | ${irrFinite ? formatPercent(model.irr.irrValue, 1) : 'N/A'} | > ${formatPercent(model.npv.discountRate, 0)} |`,
    `| Payback saisonnier | ${model.payback.isRecoveredWithin36Months ? formatMonths(model.payback.paybackMonths) : '> 36 mois'} | ≤ 24 mois |`,
    `| Point mort mensuel | ${formatAriary(model.breakEven.monthlyBreakEvenTurnoverAr, { inMillions: true })} | Marge sécurité ${formatPercent(model.breakEven.safetyMarginRate, 1)} |`,
    ...(liquidity
      ? [
          `| Ratio de Liquidité Générale | ${liquidity.ratio.toFixed(2)}x | ≥ 1,50x (${liquidity.statusLabel}) |`,
        ]
      : []),
    '',
    '## 2. Matrice d’Aide à la Décision Investisseurs',
    '',
    '| Critère Décisionnel | Mesure | Seuil Investisseur | Statut |',
    '| :--- | :---: | :---: | :--- |',
    `| **VAN (Valeur Actuelle Nette)** | ${formatAriary(model.npv.npvAr, { inMillions: true })} | > 0 M Ar | ${vanStatus} |`,
    `| **TRI (Taux de Rentabilité Interne)** | ${irrFinite ? formatPercent(model.irr.irrValue, 1) : 'N/A'} | > ${formatPercent(model.npv.discountRate, 0)} | ${triStatus} |`,
    `| **Payback (Récupération $I_0$)** | ${model.payback.isRecoveredWithin36Months ? formatMonths(model.payback.paybackMonths) : '> 36 mois'} | ≤ 24 mois | ${paybackStatus} |`,
    `| **Solvabilité Court Terme** | ${liquidity ? `${liquidity.ratio.toFixed(2)}x` : 'N/D'} | ≥ 1,50x | ${liquidityStatus} |`,
    '',
    '## 3. Projections Triennales (Scénario Réaliste)',
    '',
    '| Année | Résultat Net Avant IR | Résultat Net Après IR | Croissance |',
    '| :--- | ---: | ---: | ---: |',
    ...model.projections.realistic.map(
      (p) =>
        `| Année ${p.year} | ${formatAriary(p.netResultBeforeTaxAr, { inMillions: true })} | ${formatAriary(p.netResultAfterTaxAr, { inMillions: true })} | ${
          p.growthRate !== null ? formatPercent(p.growthRate, 0) : 'Base'
        } |`
    ),
    '',
    '## 4. Comparaison des Scénarios Stratégiques',
    '',
    '| Scénario | CA Annuel | Bénéfice Net Après IR | Marge Nette | Verdict |',
    '| :--- | ---: | ---: | ---: | :--- |',
    ...[model.scenarios.pessimiste, model.scenarios.realiste, model.scenarios.optimiste].map(
      (s) =>
        `| ${s.definition.name} | ${formatAriary(s.annualTurnoverAr, { inMillions: true })} | ${formatAriary(s.annualNetAfterTaxAr, { inMillions: true })} | ${formatPercent(s.annualNetMarginRate, 1)} | ${s.verdict} |`
    ),
  ];

  if (dashboardNotes && dashboardNotes.trim()) {
    lines.push('', '## 5. Notes de Commentaire & Recommandations', '', dashboardNotes.trim());
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `executive_summary_${projectName.toLowerCase().replace(/[^a-z0-9]+/gi, '_')}_${dateStr}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportStructuredCooperativeJson(params: {
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
  liquidity?: GeneralLiquidityRatioResult;
}): void {
  const { model, projectName, scenarioName, liquidity } = params;
  const payload = {
    schemaVersion: 'riz-madagascar-coop-v1.0',
    exportedAt: new Date().toISOString(),
    metadata: {
      projectName,
      scenarioName,
      regionId: model.assumptions.selectedRegionId || 'current',
      currency: 'MGA',
    },
    operationalCampaign: {
      hauteSaison: model.hauteSaison,
      basseSaison: model.basseSaison,
      annualPaddyKg: model.hauteSaison.totalPaddyKg + model.basseSaison.totalPaddyKg,
      annualRiceKg: model.year1.totalRiceKgSold,
    },
    financialKpis: {
      fundsToRaiseAr: model.investment.fundsToRaiseAr,
      year1TurnoverAr: model.year1.totalTurnoverAr,
      year1GrossProfitAr: model.year1.annualGrossProfitAr,
      year1NetResultAfterTaxAr: model.year1.netResultAfterTaxAr,
      grossMarginRate: model.year1.grossMarginRate,
      netMarginAfterTaxRate: model.year1.netMarginAfterTaxRate,
      npv3YAr: model.npv.npvAr,
      irrRate: Number.isFinite(model.irr.irrValue) ? model.irr.irrValue : null,
      paybackMonths: model.payback.paybackMonths,
      breakEvenMonthlyTurnoverAr: model.breakEven.monthlyBreakEvenTurnoverAr,
      generalLiquidityRatio: liquidity ? Number(liquidity.ratio.toFixed(3)) : null,
    },
    projectionsRealistic3Y: model.projections.realistic,
    assumptions: model.assumptions,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8;',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `modele_cooperatif_struct_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
