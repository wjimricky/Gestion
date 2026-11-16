import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { FullFinancialModel } from '../types/finance';
import { PestelAnalysisData } from '../types/project';
import { formatAriary, formatKg, formatMonths, formatPercent } from './formatters';
import { buildAnnualComparison5Y } from './annualComparison';
import { buildMonthlyTreasuryPlan, DEFAULT_TREASURY_SETTINGS } from './treasury';
import { evaluateConsecutiveNegativeCashAlert } from './treasuryAlerts';
import { generateStrategicRecommendations } from './strategicAdvisor';

export interface DocxReportOptions {
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
  unitDisplay: 'standard' | 'millions';
  pestelAnalysis?: PestelAnalysisData;
}

function buildAutomatedPerformanceNarrative(model: FullFinancialModel): {
  headlineVerdict: string;
  paragraphs: string[];
  recommendations: string[];
} {
  const y1 = model.year1;
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const inv = model.investment;
  const be = model.breakEven;
  const irrFinite = Number.isFinite(model.irr.irrValue);
  const opMarginRate = y1.totalTurnoverAr > 0 ? y1.netResultBeforeTaxAr / y1.totalTurnoverAr : 0;

  const treasury = buildMonthlyTreasuryPlan(model, DEFAULT_TREASURY_SETTINGS);
  const treasuryAlert = evaluateConsecutiveNegativeCashAlert(model, DEFAULT_TREASURY_SETTINGS);
  const advice = generateStrategicRecommendations(model.assumptions, model);
  const annual5Y = buildAnnualComparison5Y(model, 'realistic');

  let headlineVerdict = 'Projet à rentabilité modérée — optimisation opérationnelle recommandée';
  if (model.npv.npvAr > 0 && y1.netResultAfterTaxAr > 0 && opMarginRate >= 0.12) {
    headlineVerdict =
      'Performance financière solide — création de valeur nette positive et couverture confortable du capital';
  } else if (model.npv.npvAr < 0 || y1.netResultAfterTaxAr <= 0) {
    headlineVerdict =
      'Alerte de rentabilité — le modèle génère une tension sur la marge nette ou une VAN négative';
  }

  const p1 =
    `Sur l’exercice Année 1, le projet génère un chiffre d’affaires consolidé de ${formatAriary(y1.totalTurnoverAr)} ` +
    `pour un volume commercialisé de ${formatKg(y1.totalRiceKgSold)} de riz usiné. La marge brute s’établit à ` +
    `${formatAriary(y1.annualGrossProfitAr)} (${formatPercent(y1.grossMarginRate, 1)} du CA), tandis que le résultat ` +
    `opérationnel avant impôt atteint ${formatAriary(y1.netResultBeforeTaxAr)} (marge opérationnelle de ${formatPercent(opMarginRate, 1)}). ` +
    `Après imputation de l’impôt sur le revenu (${formatPercent(model.assumptions.corporateTaxRate, 0)}), le bénéfice net ` +
    `ressort à ${formatAriary(y1.netResultAfterTaxAr)} (${formatPercent(y1.netMarginAfterTaxRate, 1)} de marge nette).`;

  const p2 =
    `L’analyse saisonnière met en évidence un déséquilibre structurel typique de la filière rizicole malgache : ` +
    `la Haute Saison (${hs.months} mois) contribue à hauteur de ${formatAriary(hs.totalTurnoverAr)} de chiffre d’affaires ` +
    `et ${formatAriary(hs.seasonNetResultBeforeTaxAr)} de résultat avant IR, contre ${formatAriary(bs.totalTurnoverAr)} ` +
    `et ${formatAriary(bs.seasonNetResultBeforeTaxAr)} en Basse Saison (${bs.months} mois). ` +
    `Le capital initial à mobiliser (I₀) s’élève à ${formatAriary(inv.fundsToRaiseAr)}, incluant un BFR de rotation HS de ` +
    `${formatAriary(inv.rotationWorkingCapitalHSAr)}. Le ROI Année 1 ressort à ${inv.roiRatio.toFixed(2)}x, la VAN à 3 ans ` +
    `(taux ${formatPercent(model.npv.discountRate, 1)}) à ${formatAriary(model.npv.npvAr)} et le TRI à ` +
    `${irrFinite ? formatPercent(model.irr.irrValue, 1) : 'non calculable'}, avec un délai de récupération de ` +
    `${model.payback.isRecoveredWithin36Months ? formatMonths(model.payback.paybackMonths) : '> 36 mois'}.`;

  const p3 =
    `Concernant la gestion des risques, le seuil de rentabilité annuel est calculé à ${formatAriary(be.annualBreakEvenTurnoverAr)} ` +
    `(soit ${formatKg(be.annualBreakEvenVolumeKg)} de riz vendu par an, ou ${formatKg(be.monthlyBreakEvenVolumeKg)}/mois). ` +
    `La marge de sécurité actuelle est de ${formatPercent(be.safetyMarginRate, 1)}. ` +
    `Sur le plan de la trésorerie mensuelle M1–M12, le point bas s’établit à ${formatAriary(treasury.minCashTroughAr)} ` +
    `en ${treasury.minCashTroughMonthLabel} (${treasuryAlert.maxConsecutiveMonths} mois négatif(s) consécutif(s) max). ` +
    `À horizon 5 ans (scénario réaliste), le chiffre d’affaires progresse à un rythme annualisé (CAGR) de ` +
    `${formatPercent(annual5Y.cagrTurnover, 1)} pour atteindre ${formatAriary(annual5Y.rows[4]?.turnoverAr ?? 0)} en Année 5.`;

  const recommendations = advice.recommendations.slice(0, 4).map(
    (rec) =>
      `${rec.title} — ${rec.actionSummary} (Impact VAN estimé : ${rec.deltas.npvAr >= 0 ? '+' : ''}${formatAriary(rec.deltas.npvAr, { inMillions: true })})`
  );

  return {
    headlineVerdict,
    paragraphs: [p1, p2, p3],
    recommendations,
  };
}

function makeCell(
  text: string,
  options?: { bold?: boolean; alignRight?: boolean; header?: boolean; fillHex?: string }
): TableCell {
  return new TableCell({
    shading: options?.header
      ? { type: ShadingType.CLEAR, fill: '1E1B4B', color: 'auto' }
      : options?.fillHex
      ? { type: ShadingType.CLEAR, fill: options.fillHex, color: 'auto' }
      : undefined,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    children: [
      new Paragraph({
        alignment: options?.alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: [
          new TextRun({
            text,
            bold: Boolean(options?.bold || options?.header),
            color: options?.header ? 'FFFFFF' : '18181B',
            size: 18, // 9pt
          }),
        ],
      }),
    ],
  });
}

function buildStyledTable(headers: string[], rows: string[][], rightAlignedCols: number[]): Table {
  const rightSet = new Set(rightAlignedCols);
  const borderColor = 'CBD5E1';

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      bottom: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      left: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      right: { style: BorderStyle.SINGLE, size: 1, color: borderColor },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: 'E2E8F0' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: headers.map((h, i) =>
          makeCell(h, { header: true, alignRight: rightSet.has(i) })
        ),
      }),
      ...rows.map(
        (row, rIdx) =>
          new TableRow({
            children: row.map((cell, cIdx) =>
              makeCell(cell, {
                alignRight: rightSet.has(cIdx),
                bold: cIdx === 0 && (cell.includes('Total') || cell.includes('Bénéfice') || cell.includes('Résultat')),
                fillHex: rIdx % 2 === 1 ? 'F8FAFC' : undefined,
              })
            ),
          })
      ),
    ],
  });
}

export async function exportModelToDocx(options: DocxReportOptions): Promise<void> {
  const { model, projectName, scenarioName, unitDisplay } = options;
  const inM = unitDisplay === 'millions';
  const y1 = model.year1;
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const taxRate = model.assumptions.corporateTaxRate;
  const hsTax = hs.seasonNetResultBeforeTaxAr > 0 ? hs.seasonNetResultBeforeTaxAr * taxRate : 0;
  const bsTax = bs.seasonNetResultBeforeTaxAr > 0 ? bs.seasonNetResultBeforeTaxAr * taxRate : 0;

  const narrative = buildAutomatedPerformanceNarrative(model);
  const annual5Y = buildAnnualComparison5Y(model, 'realistic');

  const kpiRows: string[][] = [
    ['Chiffre d’affaires Année 1', formatAriary(y1.totalTurnoverAr, { inMillions: inM }), formatKg(y1.totalRiceKgSold)],
    ['Marge brute annuelle', formatAriary(y1.annualGrossProfitAr, { inMillions: inM }), `Taux : ${formatPercent(y1.grossMarginRate, 1)}`],
    ['Charges fixes annuelles', formatAriary(y1.annualFixedChargesAr, { inMillions: inM }), `${formatAriary(y1.monthlyFixedChargesAr)} / mois`],
    ['Résultat opérationnel (avant IR)', formatAriary(y1.netResultBeforeTaxAr, { inMillions: inM }), `Marge op. : ${formatPercent(y1.netMarginBeforeTaxRate, 1)}`],
    ['Bénéfice net après IR', formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }), `Marge nette : ${formatPercent(y1.netMarginAfterTaxRate, 1)}`],
    ['Capital initial à lever (I₀)', formatAriary(model.investment.fundsToRaiseAr, { inMillions: inM }), `ROI A1 : ${model.investment.roiRatio.toFixed(2)}x`],
    ['VAN 3 ans', formatAriary(model.npv.npvAr, { inMillions: true }), model.npv.decision],
    ['TRI 3 ans', Number.isFinite(model.irr.irrValue) ? formatPercent(model.irr.irrValue, 1) : 'N/A', `Actualisation r = ${formatPercent(model.npv.discountRate, 1)}`],
    ['Payback saisonnier', model.payback.isRecoveredWithin36Months ? formatMonths(model.payback.paybackMonths) : '> 36 mois', `Simple : ${formatMonths(model.payback.simplePaybackMonths)}`],
    ['Seuil de rentabilité annuel', formatAriary(model.breakEven.annualBreakEvenTurnoverAr, { inMillions: inM }), `Marge sécurité : ${formatPercent(model.breakEven.safetyMarginRate, 1)}`],
  ];

  const incomeRows: string[][] = [
    ['Chiffre d’affaires', formatAriary(hs.totalTurnoverAr, { inMillions: inM }), formatAriary(bs.totalTurnoverAr, { inMillions: inM }), formatAriary(y1.totalTurnoverAr, { inMillions: inM }), '100,0 %'],
    ['Coûts variables d’exploitation', formatAriary(hs.totalPurchaseAndOperatingCostsAr, { inMillions: inM }), formatAriary(bs.totalPurchaseAndOperatingCostsAr, { inMillions: inM }), formatAriary(y1.totalPurchaseAndOperatingCostsAr, { inMillions: inM }), formatPercent(y1.totalTurnoverAr > 0 ? y1.totalPurchaseAndOperatingCostsAr / y1.totalTurnoverAr : 0, 1)],
    ['Marge brute', formatAriary(hs.seasonGrossProfitAr, { inMillions: inM }), formatAriary(bs.seasonGrossProfitAr, { inMillions: inM }), formatAriary(y1.annualGrossProfitAr, { inMillions: inM }), formatPercent(y1.grossMarginRate, 1)],
    ['Charges fixes', formatAriary(hs.seasonFixedChargesAr, { inMillions: inM }), formatAriary(bs.seasonFixedChargesAr, { inMillions: inM }), formatAriary(y1.annualFixedChargesAr, { inMillions: inM }), formatPercent(y1.totalTurnoverAr > 0 ? y1.annualFixedChargesAr / y1.totalTurnoverAr : 0, 1)],
    ['Résultat opérationnel (avant IR)', formatAriary(hs.seasonNetResultBeforeTaxAr, { inMillions: inM }), formatAriary(bs.seasonNetResultBeforeTaxAr, { inMillions: inM }), formatAriary(y1.netResultBeforeTaxAr, { inMillions: inM }), formatPercent(y1.netMarginBeforeTaxRate, 1)],
    [`Impôt IR (${formatPercent(taxRate, 0)})`, formatAriary(hsTax, { inMillions: inM }), formatAriary(bsTax, { inMillions: inM }), formatAriary(y1.corporateTaxAr, { inMillions: inM }), formatPercent(y1.totalTurnoverAr > 0 ? y1.corporateTaxAr / y1.totalTurnoverAr : 0, 1)],
    ['Résultat net après IR', formatAriary(hs.seasonNetResultBeforeTaxAr - hsTax, { inMillions: inM }), formatAriary(bs.seasonNetResultBeforeTaxAr - bsTax, { inMillions: inM }), formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }), formatPercent(y1.netMarginAfterTaxRate, 1)],
  ];

  const fiveYearRows: string[][] = annual5Y.rows.map((r) => [
    r.label,
    formatAriary(r.turnoverAr, { inMillions: inM }),
    formatAriary(r.grossProfitAr, { inMillions: inM }),
    formatAriary(r.operatingIncomeAr, { inMillions: inM }),
    formatPercent(r.operatingMarginRate, 1),
    formatAriary(r.netResultAfterTaxAr, { inMillions: inM }),
  ]);

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            heading: HeadingLevel.TITLE,
            spacing: { after: 100 },
            children: [
              new TextRun({
                text: 'Rapport d’Analyse Financière — Filière Riz Madagascar',
                bold: true,
                size: 36,
                color: '1E1B4B',
              }),
            ],
          }),
          new Paragraph({
            spacing: { after: 240 },
            children: [
              new TextRun({
                text: `Projet : ${projectName}  ·  Scénario : ${scenarioName}  ·  Édité le ${new Date().toLocaleDateString('fr-FR')}`,
                size: 20,
                color: '475569',
              }),
            ],
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120, after: 100 },
            children: [new TextRun({ text: '1. Synthèse Automatisée des Performances', bold: true, color: '1E1B4B' })],
          }),
          new Paragraph({
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: `Diagnostic global : ${narrative.headlineVerdict}.`,
                bold: true,
                size: 22,
                color: model.npv.npvAr > 0 ? '0F766E' : 'BE123C',
              }),
            ],
          }),
          ...narrative.paragraphs.map(
            (text) =>
              new Paragraph({
                spacing: { after: 120 },
                children: [new TextRun({ text, size: 21, color: '1E293B' })],
              })
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 200, after: 120 },
            children: [new TextRun({ text: '2. Tableau de Synthèse des Indicateurs Clés (KPI)', bold: true, color: '1E1B4B' })],
          }),
          buildStyledTable(['Indicateur financier', 'Valeur calculée', 'Précision / Repère'], kpiRows, [1]),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [new TextRun({ text: '3. Compte de Résultat Saisonnier (Année 1)', bold: true, color: '1E1B4B' })],
          }),
          buildStyledTable(
            ['Rubrique', `Haute Saison (${hs.months}m)`, `Basse Saison (${bs.months}m)`, 'Année 1', '% CA'],
            incomeRows,
            [1, 2, 3, 4]
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
            children: [
              new TextRun({
                text: `4. Comparaison Pluriannuelle 5 ans (CAGR CA : ${formatPercent(annual5Y.cagrTurnover, 1)} · Δ Marge op. : ${annual5Y.operatingMarginDeltaPts >= 0 ? '+' : ''}${annual5Y.operatingMarginDeltaPts.toFixed(1)} pts)`,
                bold: true,
                color: '1E1B4B',
              }),
            ],
          }),
          buildStyledTable(
            ['Exercice', 'Chiffre d’affaires', 'Marge brute', 'Résultat op.', 'Marge op. %', 'Résultat net'],
            fiveYearRows,
            [1, 2, 3, 4, 5]
          ),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 100 },
            children: [new TextRun({ text: '5. Recommandations Stratégiques Prioritaires', bold: true, color: '1E1B4B' })],
          }),
          ...narrative.recommendations.map(
            (rec, idx) =>
              new Paragraph({
                spacing: { after: 90 },
                children: [
                  new TextRun({
                    text: `${idx + 1}. ${rec}`,
                    size: 20,
                    color: '1E293B',
                  }),
                ],
              })
          ),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeName = projectName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rapport_financier_${safeName || 'rizmadagascar'}_${new Date().toISOString().slice(0, 10)}.docx`;
  a.click();
  URL.revokeObjectURL(url);
}
