import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FullFinancialModel } from '../types/finance';
import { PestelAnalysisData, PestelCategoryKey } from '../types/project';
import { computeSensitivityMatrix } from '../engine/calculator';
import { formatAriary, formatMonths, formatPercent } from './formatters';
import {
  PESTEL_CATEGORIES_META,
  PESTEL_HORIZON_LABELS,
  PESTEL_IMPACT_LABELS,
} from './pestelDefaults';

export interface PdfExportSectionsConfig {
  dashboard: boolean; // KPIs & Diagnostic sanitaire
  charts: boolean; // Graphiques Recharts Cash-Flow & P&L
  incomeStatement: boolean; // Compte de résultat A1
  projections3Y: boolean; // Projections CF A1–A3
  pestel: boolean; // Analyse PESTEL Madagascar
  sensitivity: boolean; // Matrices de sensibilité 2D
  notes: boolean; // Notes & commentaires du Tableau de bord
}

export const DEFAULT_PDF_SECTIONS: PdfExportSectionsConfig = {
  dashboard: true,
  charts: true,
  incomeStatement: true,
  projections3Y: true,
  pestel: true,
  sensitivity: true,
  notes: true,
};

interface ExportPdfParams {
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
  unitDisplay: 'standard' | 'millions';
  pestelAnalysis?: PestelAnalysisData;
  dashboardNotes?: string;
  sections?: Partial<PdfExportSectionsConfig>;
}

type JsPdfWithAutoTable = jsPDF & {
  lastAutoTable?: { finalY?: number };
};

/**
 * Standard PDF fonts (Helvetica) cannot render U+202F (narrow no-break space)
 * or certain Unicode subscripts/arrows without glyph corruption.
 */
function cleanPdfText(input: string): string {
  return input
    .replace(/[\u00A0\u202F\u2009]/g, ' ')
    .replace(/→/g, '->')
    .replace(/←/g, '<-')
    .replace(/×/g, 'x')
    .replace(/—/g, '-')
    .replace(/–/g, '-')
    .replace(/₀/g, '0')
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/’/g, "'")
    .replace(/[«»]/g, '"');
}

function isVeryLightColor(color: string | null): boolean {
  if (!color || color === 'none' || color === 'transparent') return false;
  const c = color.trim().toLowerCase();
  if (c === '#fff' || c === '#ffffff' || c === 'white') return true;
  const rgbMatch = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = Number(rgbMatch[1]);
    const g = Number(rgbMatch[2]);
    const b = Number(rgbMatch[3]);
    return r > 195 && g > 195 && b > 195;
  }
  return false;
}

async function captureChartAsPng(
  containerSelector: string
): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (typeof document === 'undefined') return null;
  const container = document.querySelector(containerSelector);
  if (!container) return null;

  const svgEl =
    (container.querySelector('svg.recharts-surface') as SVGSVGElement | null) ||
    (container.querySelector('svg') as SVGSVGElement | null);
  if (!svgEl) return null;

  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 520);
  const height = Math.max(Math.round(rect.height), 240);

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  // Normalize dark-mode light labels/gridlines so charts render cleanly on white PDF pages
  const origTexts = svgEl.querySelectorAll('text, tspan');
  const cloneTexts = clone.querySelectorAll('text, tspan');
  cloneTexts.forEach((node, idx) => {
    const el = node as SVGElement;
    const orig = origTexts[idx] as SVGElement | undefined;
    const computedFill = orig ? window.getComputedStyle(orig).fill : el.getAttribute('fill');
    if (isVeryLightColor(computedFill) || isVeryLightColor(el.getAttribute('fill'))) {
      el.setAttribute('fill', '#27272a');
    } else if (!el.getAttribute('fill') && computedFill) {
      el.setAttribute('fill', computedFill);
    }
    el.style.fontFamily = 'Helvetica, Arial, sans-serif';
  });

  const origLines = svgEl.querySelectorAll('line, path');
  const cloneLines = clone.querySelectorAll('line, path');
  cloneLines.forEach((node, idx) => {
    const el = node as SVGElement;
    const orig = origLines[idx] as SVGElement | undefined;
    const stroke = el.getAttribute('stroke') || (orig ? window.getComputedStyle(orig).stroke : '');
    if (stroke && stroke.includes('255, 255, 255')) {
      el.setAttribute('stroke', '#e4e4e7');
    }
  });

  // White background backdrop
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('fill', '#ffffff');
  clone.insertBefore(bgRect, clone.firstChild);

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const scale = 2;
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width,
          height,
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = svgDataUrl;
  });
}

function ensureSpace(doc: jsPDF, currentY: number, neededHeight: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (currentY + neededHeight > pageHeight - 18) {
    doc.addPage();
    return 18;
  }
  return currentY;
}

export async function exportDashboardToPdf({
  model,
  projectName,
  scenarioName,
  unitDisplay,
  pestelAnalysis,
  dashboardNotes,
  sections,
}: ExportPdfParams): Promise<{ chartsIncluded: number }> {
  const cfg: PdfExportSectionsConfig = {
    ...DEFAULT_PDF_SECTIONS,
    ...(sections ?? {}),
  };

  const inM = unitDisplay === 'millions';
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' }) as JsPdfWithAutoTable;
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const usableWidth = pageWidth - marginX * 2;

  const fmtAr = (v: number, forceMillions = inM) =>
    cleanPdfText(formatAriary(v, { inMillions: forceMillions }));

  // Capture live Recharts visuals only when charts section is enabled
  const [cashFlowChartImg, profitLossChartImg] = cfg.charts
    ? await Promise.all([
        captureChartAsPng('[data-pdf-chart="cashflow"]'),
        captureChartAsPng('[data-pdf-chart="profitloss"]'),
      ])
    : [null, null];

  let chartsIncluded = 0;
  let sectionIdx = 1;
  const nextSectionPrefix = () => `${sectionIdx++}.`;

  // Selected modules summary for header
  const activeLabels: string[] = [];
  if (cfg.dashboard) activeLabels.push('Tableau de bord');
  if (cfg.charts) activeLabels.push('Graphiques');
  if (cfg.incomeStatement) activeLabels.push('Compte de resultat');
  if (cfg.projections3Y) activeLabels.push('Projections');
  if (cfg.pestel && pestelAnalysis) activeLabels.push('PESTEL');
  if (cfg.sensitivity) activeLabels.push('Sensibilite 2D');
  if (cfg.notes && (dashboardNotes || '').trim().length > 0) activeLabels.push('Notes');

  // 1. Header Banner
  doc.setFillColor(17, 16, 28); // #11101C
  doc.rect(0, 0, pageWidth, 32, 'F');

  doc.setTextColor(165, 180, 252);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(cleanPdfText('RIZMADAGASCAR - RAPPORT FINANCIER PERSONNALISE'), marginX, 9);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13.5);
  doc.text(cleanPdfText(`Rapport : ${projectName}`), marginX, 16.5);

  doc.setTextColor(203, 213, 225);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateStr = new Date().toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.text(
    cleanPdfText(
      `Scenario : ${scenarioName}  |  Unite : ${
        inM ? "Millions d'Ariary (M Ar)" : 'Ariary (Ar)'
      }  |  Edite le ${dateStr}`
    ),
    marginX,
    22.5
  );
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7.4);
  doc.text(
    cleanPdfText(`Sections incluses : ${activeLabels.join(' · ') || 'Synthese'}`),
    marginX,
    28
  );

  let y = 39;

  // SECTION: Tableau de bord (KPIs & Diagnostic)
  if (cfg.dashboard) {
    doc.setTextColor(24, 24, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(
      cleanPdfText(`${nextSectionPrefix()} Indicateurs Cles de Performance (Annee 1 & Triennal)`),
      marginX,
      y
    );
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[cleanPdfText('Indicateur'), cleanPdfText('Valeur'), cleanPdfText('Precision / Repere')]],
      body: [
        [
          cleanPdfText("Chiffre d'affaires Annuel (A1)"),
          fmtAr(model.year1.totalTurnoverAr),
          cleanPdfText(
            `HS: ${fmtAr(model.hauteSaison.totalTurnoverAr)} | BS: ${fmtAr(
              model.basseSaison.totalTurnoverAr
            )}`
          ),
        ],
        [
          cleanPdfText('Marge Brute Annuelle'),
          fmtAr(model.year1.annualGrossProfitAr),
          cleanPdfText(`Taux de marge brute : ${formatPercent(model.year1.grossMarginRate)}`),
        ],
        [
          cleanPdfText('Benefice Net Apres IR'),
          fmtAr(model.year1.netResultAfterTaxAr),
          cleanPdfText(
            `Marge nette : ${formatPercent(model.year1.netMarginAfterTaxRate)} (IR ${formatPercent(
              model.assumptions.corporateTaxRate,
              0
            )})`
          ),
        ],
        [
          cleanPdfText('Fonds Initial a Lever (I0)'),
          fmtAr(model.investment.fundsToRaiseAr),
          cleanPdfText(`ROI Annee 1 : ${model.investment.roiRatio.toFixed(2)}x`),
        ],
        [
          cleanPdfText('Seuil de Rentabilite (Break-Even)'),
          fmtAr(model.breakEven.annualBreakEvenTurnoverAr),
          cleanPdfText(
            `Marge de securite : ${formatPercent(model.breakEven.safetyMarginRate)} (${Math.round(
              model.breakEven.monthlyBreakEvenVolumeKg
            ).toLocaleString('fr-FR')} kg/mois)`
          ),
        ],
        [
          cleanPdfText('Delai de Recuperation (Payback)'),
          cleanPdfText(formatMonths(model.payback.paybackMonths)),
          cleanPdfText(`Payback lineaire simple : ${formatMonths(model.payback.simplePaybackMonths)}`),
        ],
        [
          cleanPdfText('VAN (3 ans) & TRI'),
          fmtAr(model.npv.npvAr, true),
          cleanPdfText(
            `TRI : ${
              Number.isFinite(model.irr.irrValue) ? formatPercent(model.irr.irrValue, 1) : 'N/A'
            } | Decision : ${model.npv.decision}`
          ),
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8.2, cellPadding: 2.3, textColor: [24, 24, 27] },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right', fontStyle: 'bold' },
      },
    });

    y = (doc.lastAutoTable?.finalY || y) + 8;

    // Diagnostic Sanitaire Table
    y = ensureSpace(doc, y, 48);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(cleanPdfText(`${nextSectionPrefix()} Diagnostic Sanitaire & Viabilite du Projet`), marginX, y);
    y += 3;

    const netMarginPct = model.year1.netMarginAfterTaxRate * 100;
    const paybackM = model.payback.paybackMonths;
    const safetyPct = model.breakEven.safetyMarginRate * 100;
    const bufferMonths =
      model.year1.annualFixedChargesAr > 0
        ? model.investment.cashBufferAr / (model.year1.annualFixedChargesAr / 12)
        : 0;

    const badgeTxt = (ok: boolean, warn: boolean) =>
      ok ? 'Sain (Vert)' : warn ? 'A surveiller (Orange)' : 'Critique (Rouge)';

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[cleanPdfText('Critere'), cleanPdfText('Valeur mesuree'), cleanPdfText('Seuil'), cleanPdfText('Statut')]],
      body: [
        [
          cleanPdfText('Marge nette apres IR'),
          cleanPdfText(`${netMarginPct.toFixed(1)} %`),
          cleanPdfText('>= 10 % sain (< 5 % critique)'),
          badgeTxt(netMarginPct >= 10, netMarginPct >= 5),
        ],
        [
          cleanPdfText('Delai de recuperation (Payback)'),
          cleanPdfText(Number.isFinite(paybackM) ? `${paybackM.toFixed(1)} mois` : 'Non atteint'),
          cleanPdfText('<= 12 mois sain (> 24 m critique)'),
          badgeTxt(Number.isFinite(paybackM) && paybackM <= 12, Number.isFinite(paybackM) && paybackM <= 24),
        ],
        [
          cleanPdfText('Marge de securite & Liquidite'),
          cleanPdfText(`${safetyPct.toFixed(1)} % | Reserve ${bufferMonths.toFixed(1)} m`),
          cleanPdfText('Marge >= 25 % | Reserve >= 1.5 m'),
          badgeTxt(safetyPct >= 25 && bufferMonths >= 1.5, safetyPct >= 12 && bufferMonths >= 0.75),
        ],
        [
          cleanPdfText('Creation de valeur (VAN)'),
          fmtAr(model.npv.npvAr, true),
          cleanPdfText('VAN > 0 Ar'),
          model.npv.npvAr > 0 ? 'Sain (Vert)' : 'Critique (Rouge)',
        ],
      ],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold' },
    });

    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // SECTION: Recharts Charts
  if (cfg.charts && (cashFlowChartImg || profitLossChartImg)) {
    if (cashFlowChartImg) {
      const renderH = Math.min(78, (cashFlowChartImg.height / cashFlowChartImg.width) * usableWidth);
      y = ensureSpace(doc, y, renderH + 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text(
        cleanPdfText(`${nextSectionPrefix()} Graphique Recharts : Flux de Tresorerie Cumules & Payback`),
        marginX,
        y
      );
      y += 3;
      doc.setDrawColor(212, 212, 216);
      doc.rect(marginX, y, usableWidth, renderH, 'S');
      doc.addImage(cashFlowChartImg.dataUrl, 'PNG', marginX + 0.5, y + 0.5, usableWidth - 1, renderH - 1);
      y += renderH + 8;
      chartsIncluded++;
    }

    if (profitLossChartImg) {
      const renderH = Math.min(76, (profitLossChartImg.height / profitLossChartImg.width) * usableWidth);
      y = ensureSpace(doc, y, renderH + 16);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(24, 24, 27);
      doc.text(
        cleanPdfText(`${nextSectionPrefix()} Graphique Recharts : Couts, Marge Brute & Resultat par Saison`),
        marginX,
        y
      );
      y += 3;
      doc.setDrawColor(212, 212, 216);
      doc.rect(marginX, y, usableWidth, renderH, 'S');
      doc.addImage(profitLossChartImg.dataUrl, 'PNG', marginX + 0.5, y + 0.5, usableWidth - 1, renderH - 1);
      y += renderH + 8;
      chartsIncluded++;
    }
  }

  // SECTION: Complete Year 1 Income Statement Table
  if (cfg.incomeStatement) {
    y = ensureSpace(doc, y, 60);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      cleanPdfText(
        `${nextSectionPrefix()} Compte de Resultat Previsionnel Annee 1 (${model.hauteSaison.months + model.basseSaison.months} mois)`
      ),
      marginX,
      y
    );
    y += 3;

    const hs = model.hauteSaison;
    const bs = model.basseSaison;
    const y1 = model.year1;
    const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0);
    const hsFixedShare = hs.seasonFixedChargesAr;
    const bsFixedShare = bs.seasonFixedChargesAr;
    const hsBeforeTax = hs.seasonNetResultBeforeTaxAr;
    const bsBeforeTax = bs.seasonNetResultBeforeTaxAr;
    const taxRate = model.assumptions.corporateTaxRate;
    const hsTax = hsBeforeTax > 0 ? hsBeforeTax * taxRate : 0;
    const bsTax = bsBeforeTax > 0 ? bsBeforeTax * taxRate : 0;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[
        cleanPdfText('Poste comptable'),
        cleanPdfText(`Haute Saison (${hs.months}m)`),
        cleanPdfText(`Basse Saison (${bs.months}m)`),
        cleanPdfText('Annee 1'),
        cleanPdfText('% CA'),
      ]],
      body: [
        [
          cleanPdfText("Chiffre d'affaires total"),
          fmtAr(hs.totalTurnoverAr),
          fmtAr(bs.totalTurnoverAr),
          fmtAr(y1.totalTurnoverAr),
          cleanPdfText(formatPercent(1)),
        ],
        [
          cleanPdfText("- Couts variables d'exploitation"),
          fmtAr(hs.totalPurchaseAndOperatingCostsAr),
          fmtAr(bs.totalPurchaseAndOperatingCostsAr),
          fmtAr(y1.totalPurchaseAndOperatingCostsAr),
          cleanPdfText(formatPercent(safeRatio(y1.totalPurchaseAndOperatingCostsAr, y1.totalTurnoverAr))),
        ],
        [
          cleanPdfText('= Marge brute'),
          fmtAr(hs.seasonGrossProfitAr),
          fmtAr(bs.seasonGrossProfitAr),
          fmtAr(y1.annualGrossProfitAr),
          cleanPdfText(formatPercent(y1.grossMarginRate)),
        ],
        [
          cleanPdfText('- Charges fixes (quote-part)'),
          fmtAr(hsFixedShare),
          fmtAr(bsFixedShare),
          fmtAr(y1.annualFixedChargesAr),
          cleanPdfText(formatPercent(safeRatio(y1.annualFixedChargesAr, y1.totalTurnoverAr))),
        ],
        [
          cleanPdfText('= Resultat avant IR'),
          fmtAr(hsBeforeTax),
          fmtAr(bsBeforeTax),
          fmtAr(y1.netResultBeforeTaxAr),
          cleanPdfText(formatPercent(safeRatio(y1.netResultBeforeTaxAr, y1.totalTurnoverAr))),
        ],
        [
          cleanPdfText(`- Impot sur le Revenu (${formatPercent(taxRate, 0)})`),
          fmtAr(hsTax),
          fmtAr(bsTax),
          fmtAr(y1.corporateTaxAr),
          cleanPdfText(formatPercent(safeRatio(y1.corporateTaxAr, y1.totalTurnoverAr))),
        ],
        [
          cleanPdfText('= Benefice net apres IR'),
          fmtAr(hsBeforeTax - hsTax),
          fmtAr(bsBeforeTax - bsTax),
          fmtAr(y1.netResultAfterTaxAr),
          cleanPdfText(formatPercent(y1.netMarginAfterTaxRate)),
        ],
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [39, 39, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' },
      },
    });

    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // SECTION: Triennial Projections Table (CF A1-A3)
  if (cfg.projections3Y) {
    y = ensureSpace(doc, y, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(24, 24, 27);
    doc.text(cleanPdfText(`${nextSectionPrefix()} Projections de Flux de Tresorerie (CF A1 - A3)`), marginX, y);
    y += 3;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[
        cleanPdfText('Annee'),
        cleanPdfText('Flux Net Standard'),
        cleanPdfText('Flux Actualise (VAN)'),
        cleanPdfText('Flux Net Ambitieux'),
      ]],
      body: [
        [
          cleanPdfText('T0 (Investissement I0)'),
          fmtAr(-model.investment.fundsToRaiseAr),
          fmtAr(-model.investment.fundsToRaiseAr),
          fmtAr(-model.investment.fundsToRaiseAr),
        ],
        [
          cleanPdfText('Annee 1 (CF A1)'),
          fmtAr(model.projections.realistic[0]?.netResultAfterTaxAr ?? 0),
          fmtAr(model.npv.pvYear1Ar),
          fmtAr(model.projections.ambitious[0]?.netResultAfterTaxAr ?? 0),
        ],
        [
          cleanPdfText('Annee 2 (CF A2)'),
          fmtAr(model.projections.realistic[1]?.netResultAfterTaxAr ?? 0),
          fmtAr(model.npv.pvYear2Ar),
          fmtAr(model.projections.ambitious[1]?.netResultAfterTaxAr ?? 0),
        ],
        [
          cleanPdfText('Annee 3 (CF A3)'),
          fmtAr(model.projections.realistic[2]?.netResultAfterTaxAr ?? 0),
          fmtAr(model.npv.pvYear3Ar),
          fmtAr(model.projections.ambitious[2]?.netResultAfterTaxAr ?? 0),
        ],
      ],
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 2.2 },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' },
      },
    });

    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // SECTION: PESTEL Summary Table
  if (cfg.pestel && pestelAnalysis) {
    y = ensureSpace(doc, y, 56);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      cleanPdfText(`${nextSectionPrefix()} Synthese Analyse PESTEL (Marche du Riz Madagascar)`),
      marginX,
      y
    );
    y += 3;

    const pestelRows = PESTEL_CATEGORIES_META.map((meta) => {
      const entry = pestelAnalysis[meta.key as PestelCategoryKey];
      const factorsText = entry.keyFactors.length > 0 ? entry.keyFactors.join(', ') : '-';
      const detail = entry.notes ? `${factorsText} | ${entry.notes}` : factorsText;
      const oppScore = entry.impact === 'opportunite' ? entry.severity : 0;
      const riskScore = entry.impact === 'menace' ? entry.severity : 0;
      return [
        cleanPdfText(`${meta.letter} - ${meta.title}`),
        cleanPdfText(PESTEL_IMPACT_LABELS[entry.impact]),
        cleanPdfText(`R:${riskScore}/5 | O:${oppScore}/5`),
        cleanPdfText(PESTEL_HORIZON_LABELS[entry.horizon]),
        cleanPdfText(detail.slice(0, 170)),
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [[
        cleanPdfText('Pilier'),
        cleanPdfText('Impact'),
        cleanPdfText('Risque / Opp.'),
        cleanPdfText('Horizon'),
        cleanPdfText('Facteurs & Observations'),
      ]],
      body: pestelRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
      headStyles: { fillColor: [24, 24, 27], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 28, fontStyle: 'bold' },
        1: { cellWidth: 22 },
        2: { cellWidth: 22, halign: 'center' },
        3: { cellWidth: 26 },
        4: { cellWidth: 'auto' },
      },
    });
    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // SECTION: 2D Sensitivity Analysis Matrices
  if (cfg.sensitivity) {
    const priceMatrix = computeSensitivityMatrix(model.assumptions, 'prix_vente_vs_prix_paddy');
    const yieldMatrix = computeSensitivityMatrix(model.assumptions, 'rendement_vs_rotations');

    y = ensureSpace(doc, y, 64);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      cleanPdfText(
        `${nextSectionPrefix()} Analyse de Sensibilite 2D (Resultat Net Avant IR Annee 1, en M Ar)`
      ),
      marginX,
      y
    );
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(82, 82, 91);
    doc.text(
      cleanPdfText('Matrice A : Variation prix de vente du riz (lignes) x Variation prix achat paddy (colonnes)'),
      marginX,
      y
    );
    y += 2.5;

    const priceHead = [
      cleanPdfText('Prix vente \\ Prix paddy'),
      ...priceMatrix.variableX.values.map((xv) =>
        cleanPdfText(`${xv > 0 ? '+' : ''}${Math.round(xv * 100)} %`)
      ),
    ];
    const priceBody = priceMatrix.variableY.values.map((yv, rIdx) => [
      cleanPdfText(`${yv > 0 ? '+' : ''}${Math.round(yv * 100)} %`),
      ...priceMatrix.matrix[rIdx].map((val) =>
        cleanPdfText(`${(val / 1e6).toFixed(1)} M`)
      ),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [priceHead],
      body: priceBody,
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fillColor: [244, 244, 245] },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const val = priceMatrix.matrix[data.row.index]?.[data.column.index - 1] ?? 0;
          const isBase =
            Math.abs(priceMatrix.variableY.values[data.row.index]) < 1e-6 &&
            Math.abs(priceMatrix.variableX.values[data.column.index - 1]) < 1e-6;
          if (isBase) {
            data.cell.styles.fillColor = [224, 231, 255];
            data.cell.styles.textColor = [49, 46, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val < 0) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
          } else if (val >= 80_000_000) {
            data.cell.styles.fillColor = [209, 250, 229];
            data.cell.styles.textColor = [6, 95, 70];
          }
        }
      },
    });

    y = (doc.lastAutoTable?.finalY || y) + 6;
    y = ensureSpace(doc, y, 56);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(82, 82, 91);
    doc.text(
      cleanPdfText('Matrice B : Rendement usinage paddy->riz (lignes) x Cadence rotations/mois (colonnes)'),
      marginX,
      y
    );
    y += 2.5;

    const yieldHead = [
      cleanPdfText('Rendement \\ Rotations'),
      ...yieldMatrix.variableX.values.map((xv) => cleanPdfText(`${xv.toFixed(1)} rot/m`)),
    ];
    const yieldBody = yieldMatrix.variableY.values.map((yv, rIdx) => [
      cleanPdfText(`${(yv * 100).toFixed(1)} %`),
      ...yieldMatrix.matrix[rIdx].map((val) =>
        cleanPdfText(`${(val / 1e6).toFixed(1)} M`)
      ),
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [yieldHead],
      body: yieldBody,
      theme: 'grid',
      styles: { fontSize: 7.8, cellPadding: 2, halign: 'right' },
      headStyles: { fillColor: [15, 118, 110], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'right' },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', fillColor: [244, 244, 245] },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index > 0) {
          const val = yieldMatrix.matrix[data.row.index]?.[data.column.index - 1] ?? 0;
          const isBase =
            Math.abs(yieldMatrix.variableY.values[data.row.index] - yieldMatrix.currentYValue) < 0.005 &&
            Math.abs(yieldMatrix.variableX.values[data.column.index - 1] - yieldMatrix.currentXValue) < 0.05;
          if (isBase) {
            data.cell.styles.fillColor = [224, 231, 255];
            data.cell.styles.textColor = [49, 46, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (val < 0) {
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [153, 27, 27];
          } else if (val >= 80_000_000) {
            data.cell.styles.fillColor = [209, 250, 229];
            data.cell.styles.textColor = [6, 95, 70];
          }
        }
      },
    });

    y = (doc.lastAutoTable?.finalY || y) + 8;
  }

  // SECTION: Editable Dashboard Text Notes (if selected & non-empty)
  const trimmedNotes = (dashboardNotes || '').trim();
  if (cfg.notes && trimmedNotes.length > 0) {
    y = ensureSpace(doc, y, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(24, 24, 27);
    doc.text(
      cleanPdfText(`${nextSectionPrefix()} Notes & Commentaires d'Analyse (Tableau de bord)`),
      marginX,
      y
    );
    y += 5;

    const paragraphs = trimmedNotes.split(/\r?\n/);
    const lineHeight = 4.4;
    const textMaxWidth = usableWidth - 8;

    for (const rawParagraph of paragraphs) {
      const cleanedParagraph = cleanPdfText(rawParagraph);
      if (cleanedParagraph.trim().length === 0) {
        y += 2.8;
        continue;
      }

      const wrappedLines = doc.splitTextToSize(cleanedParagraph, textMaxWidth) as string[];
      let chunkStart = 0;

      while (chunkStart < wrappedLines.length) {
        const pageH = doc.internal.pageSize.getHeight();
        const maxBottom = pageH - 18;
        const availableH = maxBottom - y - 5;
        const maxLinesHere = Math.max(1, Math.floor(availableH / lineHeight));

        if (maxLinesHere < 2 && y > 28) {
          doc.addPage();
          y = 18;
          continue;
        }

        const chunk = wrappedLines.slice(chunkStart, chunkStart + maxLinesHere);
        const boxHeight = chunk.length * lineHeight + 6;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(212, 212, 216);
        doc.roundedRect(marginX, y, usableWidth, boxHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(39, 39, 42);
        doc.text(chunk, marginX + 4, y + 4.8, { lineHeightFactor: 1.25 });

        y += boxHeight + 2.5;
        chunkStart += chunk.length;

        if (chunkStart < wrappedLines.length) {
          doc.addPage();
          y = 18;
        }
      }
    }
  }

  // Page numbers & footer across all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    const pageH = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(113, 113, 122);
    doc.text(
      cleanPdfText(`RizMadagascar - ${projectName} (${scenarioName})`),
      marginX,
      pageH - 8
    );
    doc.text(`Page ${i} / ${totalPages}`, pageWidth - marginX, pageH - 8, { align: 'right' });
  }

  const safeSlug = projectName
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);

  doc.save(`Rapport_RizMadagascar_${safeSlug || 'Projet'}_${new Date().toISOString().slice(0, 10)}.pdf`);
  return { chartsIncluded };
}
