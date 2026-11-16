import { FullFinancialModel } from '../types/finance';
import { buildFiveYearProjectionData } from '../utils/exportCsv';
import { buildMonthlyTreasuryPlan, DEFAULT_TREASURY_SETTINGS } from '../utils/treasury';
import { clearInMemoryGoogleAccessToken } from './googleSheetsAuth';

export type GoogleSheetsShareMode = 'private' | 'link_reader' | 'collaborator';

export interface GoogleSheetsExportOptions {
  spreadsheetTitle: string;
  shareMode: GoogleSheetsShareMode;
  collaboratorEmail?: string;
  collaboratorRole?: 'reader' | 'writer';
  projectName: string;
  scenarioName: string;
}

export interface GoogleSheetsExportResult {
  spreadsheetId: string;
  spreadsheetUrl: string;
  title: string;
  shareSummary: string;
  sheetsCreated: string[];
}

export class GoogleSheetsAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleSheetsAuthError';
  }
}

interface CreatedSpreadsheetResponse {
  spreadsheetId: string;
  spreadsheetUrl: string;
  properties?: { title?: string };
  sheets?: Array<{ properties?: { sheetId?: number; title?: string } }>;
}

function buildSpreadsheetValuesPayload(
  model: FullFinancialModel,
  projectName: string,
  scenarioName: string
): Array<{ range: string; values: Array<Array<string | number>> }> {
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const y1 = model.year1;
  const a = model.assumptions;
  const taxRate = a.corporateTaxRate;
  const hsTax = hs.seasonNetResultBeforeTaxAr > 0 ? hs.seasonNetResultBeforeTaxAr * taxRate : 0;
  const bsTax = bs.seasonNetResultBeforeTaxAr > 0 ? bs.seasonNetResultBeforeTaxAr * taxRate : 0;

  const fiveYear = buildFiveYearProjectionData(model);
  const treasury = buildMonthlyTreasuryPlan(model, DEFAULT_TREASURY_SETTINGS);

  const summaryRows: Array<Array<string | number>> = [
    ['RizMadagascar v6.0 — Synthèse Financière & KPI', '', '', ''],
    ['Projet actif', projectName, 'Scénario', scenarioName],
    ['Date d’export', new Date().toLocaleDateString('fr-FR'), 'Taux d’actualisation r', a.discountRate],
    [],
    ['Indicateur clé', 'Valeur (Ar / ratio)', 'Détail / Repère', 'Statut'],
    ['Chiffre d’affaires Année 1 (Ar)', Math.round(y1.totalTurnoverAr), `Riz vendu : ${Math.round(y1.totalRiceKgSold)} kg`, 'Calcul réel'],
    ['Coûts variables annuels (Ar)', Math.round(y1.totalPurchaseAndOperatingCostsAr), 'Paddy + exploitation + sacs', ''],
    ['Marge brute annuelle (Ar)', Math.round(y1.annualGrossProfitAr), `Taux : ${(y1.grossMarginRate * 100).toFixed(2)} %`, ''],
    ['Charges fixes annuelles (Ar)', Math.round(y1.annualFixedChargesAr), `Mensuel : ${Math.round(y1.monthlyFixedChargesAr)} Ar`, ''],
    ['Résultat net avant IR (Ar)', Math.round(y1.netResultBeforeTaxAr), `Marge avant IR : ${(y1.netMarginBeforeTaxRate * 100).toFixed(2)} %`, ''],
    [`Impôt sur le Revenu (${Math.round(taxRate * 100)} %)`, Math.round(y1.corporateTaxAr), 'MAX(0, Résultat) × IR', ''],
    ['Bénéfice net après IR (Ar)', Math.round(y1.netResultAfterTaxAr), `Marge nette : ${(y1.netMarginAfterTaxRate * 100).toFixed(2)} %`, y1.netResultAfterTaxAr > 0 ? 'Bénéficiaire' : 'Déficitaire'],
    ['Part Investisseur (Ar)', Math.round(y1.investorShareAr), `${Math.round(a.investorShare * 100)} %`, ''],
    ['Part Société (Ar)', Math.round(y1.companyShareAr), `${Math.round((1 - a.investorShare) * 100)} %`, ''],
    [],
    ['Investissement & Rentabilité', '', '', ''],
    ['Capital initial à lever I₀ (Ar)', Math.round(model.investment.fundsToRaiseAr), `BFR 1ère rot. HS : ${Math.round(model.investment.rotationWorkingCapitalHSAr)} Ar`, ''],
    ['ROI Année 1 (ratio)', Number(model.investment.roiRatio.toFixed(3)), 'Résultat net A1 / I₀', ''],
    ['Seuil de rentabilité annuel (Ar)', Math.round(model.breakEven.annualBreakEvenTurnoverAr), `Marge sécurité : ${(model.breakEven.safetyMarginRate * 100).toFixed(1)} %`, ''],
    ['Payback saisonnier (mois)', model.payback.paybackMonths > 0 ? Number(model.payback.paybackMonths.toFixed(2)) : '> 36', `Simple : ${model.payback.simplePaybackMonths > 0 ? model.payback.simplePaybackMonths.toFixed(2) : 'N/A'} mois`, model.payback.isRecoveredWithin36Months ? 'Récupéré' : 'Non récupéré'],
    ['VAN 3 ans (Ar)', Math.round(model.npv.npvAr), `Actualisation ${(model.npv.discountRate * 100).toFixed(1)} %`, model.npv.decision],
    ['VAN 5 ans Réaliste (Ar)', Math.round(fiveYear.npv5YearsRealisticAr), 'Projections A1–A5', fiveYear.npv5YearsRealisticAr > 0 ? 'Positif' : 'Négatif'],
    ['TRI 3 ans (ratio)', Number.isFinite(model.irr.irrValue) ? Number(model.irr.irrValue.toFixed(4)) : 0, `${Number.isFinite(model.irr.irrValue) ? (model.irr.irrValue * 100).toFixed(1) : 'N/A'} %`, model.irr.isAcceptable ? 'Acceptable' : 'Sous seuil'],
  ];

  const incomeStatementRows: Array<Array<string | number>> = [
    ['Compte de Résultat Saisonnier & Trésorerie Mensuelle (Année 1)', '', '', '', ''],
    ['Rubrique (Ar)', `Haute Saison (${hs.months}m)`, `Basse Saison (${bs.months}m)`, 'Année 1 (12m)', '% CA'],
    ['Chiffre d’affaires total', Math.round(hs.totalTurnoverAr), Math.round(bs.totalTurnoverAr), Math.round(y1.totalTurnoverAr), 1],
    ['Coûts d’achat paddy & exploitation', Math.round(hs.totalPurchaseAndOperatingCostsAr), Math.round(bs.totalPurchaseAndOperatingCostsAr), Math.round(y1.totalPurchaseAndOperatingCostsAr), y1.totalTurnoverAr > 0 ? Number((y1.totalPurchaseAndOperatingCostsAr / y1.totalTurnoverAr).toFixed(4)) : 0],
    ['Marge brute', Math.round(hs.seasonGrossProfitAr), Math.round(bs.seasonGrossProfitAr), Math.round(y1.annualGrossProfitAr), Number(y1.grossMarginRate.toFixed(4))],
    ['Charges fixes d’exploitation', Math.round(hs.seasonFixedChargesAr), Math.round(bs.seasonFixedChargesAr), Math.round(y1.annualFixedChargesAr), y1.totalTurnoverAr > 0 ? Number((y1.annualFixedChargesAr / y1.totalTurnoverAr).toFixed(4)) : 0],
    ['Résultat net avant IR', Math.round(hs.seasonNetResultBeforeTaxAr), Math.round(bs.seasonNetResultBeforeTaxAr), Math.round(y1.netResultBeforeTaxAr), Number(y1.netMarginBeforeTaxRate.toFixed(4))],
    ['Impôt sur le Revenu (IR)', Math.round(hsTax), Math.round(bsTax), Math.round(y1.corporateTaxAr), y1.totalTurnoverAr > 0 ? Number((y1.corporateTaxAr / y1.totalTurnoverAr).toFixed(4)) : 0],
    ['Bénéfice net après IR', Math.round(hs.seasonNetResultBeforeTaxAr - hsTax), Math.round(bs.seasonNetResultBeforeTaxAr - bsTax), Math.round(y1.netResultAfterTaxAr), Number(y1.netMarginAfterTaxRate.toFixed(4))],
    [],
    ['Détail Trésorerie Mensuelle Année 1 (M1–M12)', '', '', '', ''],
    ['Mois', 'Phase', 'Encaissements (Ar)', 'Décaissements totaux (Ar)', 'Trésorerie fin de mois (Ar)'],
    ...treasury.rows.map((r) => [
      `${r.monthIndex} (${r.calendarMonthShort})`,
      r.phaseLabel,
      Math.round(r.inflowsAr),
      Math.round(r.totalOutflowsAr),
      Math.round(r.endingCashAr),
    ]),
  ];

  const projectionRows: Array<Array<string | number>> = [
    ['Projections Financières sur 5 ans (Années 1 à 5)', '', '', '', '', '', '', ''],
    [
      'Scénario',
      'Année',
      'CA estimé (Ar)',
      'Coûts variables (Ar)',
      'Charges fixes (Ar)',
      'Résultat net après IR (Ar)',
      'Flux actualisé VAN (Ar)',
      'Cumul net (Ar)',
    ],
    ...fiveYear.annualRows.map((row) => [
      row.scenario,
      row.label,
      row.estimatedTurnoverAr,
      row.estimatedVariableCostsAr,
      row.estimatedFixedChargesAr,
      row.netAfterTaxAr,
      row.discountedCfAr,
      row.cumulativeCfAr,
    ]),
    [],
    ['Synthèse VAN 5 ans', '', '', '', '', '', '', ''],
    ['VAN 5 ans — Scénario Réaliste (Ar)', Math.round(fiveYear.npv5YearsRealisticAr)],
    ['VAN 5 ans — Scénario Ambitieux (Ar)', Math.round(fiveYear.npv5YearsAmbitiousAr)],
  ];

  const assumptionsRows: Array<Array<string | number>> = [
    ['Paramètres & Hypothèses du Modèle', '', ''],
    ['Paramètre', 'Haute Saison (HS)', 'Basse Saison (BS)'],
    ['Durée (mois)', a.hauteSaison.months, a.basseSaison.months],
    ['Rotations / mois', a.hauteSaison.rotationsPerMonth, a.basseSaison.rotationsPerMonth],
    ['Paddy acheté / rotation (kg)', a.hauteSaison.paddyBoughtKgPerRotation, a.basseSaison.paddyBoughtKgPerRotation],
    ['Rendement paddy -> riz', a.hauteSaison.yieldPaddyToRice, a.basseSaison.yieldPaddyToRice],
    ['Prix de vente riz (Ar/kg)', a.hauteSaison.riceSellingPriceArPerKg, a.basseSaison.riceSellingPriceArPerKg],
    ['Prix sous-produits (Ar/kg)', a.hauteSaison.byproductSellingPriceArPerKg, a.basseSaison.byproductSellingPriceArPerKg],
    [],
    ['Coûts par kg de paddy (Ar/kg)', 'Haute Saison (HS)', 'Basse Saison (BS)'],
    ...a.costsPerKgPaddy.map((c) => [c.label, c.costHS, c.costBS]),
    [],
    ['Coûts par rotation (Ar)', 'Haute Saison (HS)', 'Basse Saison (BS)'],
    ...a.costsPerRotation.map((c) => [c.label, c.costHS, c.costBS]),
    [],
    ['Charges fixes mensuelles (Ar/mois)', 'Montant (Ar)', ''],
    ...a.fixedMonthlyCharges.map((f) => [f.label, f.amount, '']),
    [],
    ['Investissement & Fiscalité', 'Valeur', ''],
    ['Matériel initial (Ar)', a.investment.materielAr, ''],
    ['Enregistrement légal (Ar)', a.investment.enregistrementAr, ''],
    ['Cash buffer (Ar)', a.investment.cashBufferAr, ''],
    ['Taux IR', a.corporateTaxRate, ''],
    ['Taux actualisation r', a.discountRate, ''],
    ['Part Investisseur', a.investorShare, ''],
  ];

  return [
    { range: "'Synthèse KPI'!A1", values: summaryRows },
    { range: "'Compte de Résultat'!A1", values: incomeStatementRows },
    { range: "'Projections 5 ans'!A1", values: projectionRows },
    { range: "'Hypothèses'!A1", values: assumptionsRows },
  ];
}

async function parseGoogleApiError(res: Response): Promise<string> {
  try {
    const data = await res.json();
    const msg = data?.error?.message || res.statusText;
    return `${msg} (HTTP ${res.status})`;
  } catch {
    return `${res.statusText || 'Erreur réseau'} (HTTP ${res.status})`;
  }
}

export async function exportModelToGoogleSheets(
  accessToken: string,
  model: FullFinancialModel,
  options: GoogleSheetsExportOptions
): Promise<GoogleSheetsExportResult> {
  const sheetNames = [
    'Synthèse KPI',
    'Compte de Résultat',
    'Projections 5 ans',
    'Hypothèses',
  ];

  // 1. Create Spreadsheet
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: options.spreadsheetTitle.trim() || `RizMadagascar — ${options.projectName}`,
        locale: 'fr_FR',
      },
      sheets: sheetNames.map((title) => ({
        properties: { title },
      })),
    }),
  });

  if (createRes.status === 401 || createRes.status === 403) {
    clearInMemoryGoogleAccessToken();
    throw new GoogleSheetsAuthError(
      'Votre session Google Sheets a expiré ou les autorisations sont insuffisantes. Veuillez vous reconnecter.'
    );
  }

  if (!createRes.ok) {
    throw new Error(await parseGoogleApiError(createRes));
  }

  const created = (await createRes.json()) as CreatedSpreadsheetResponse;
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl =
    created.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate all 4 sheets with batchUpdate
  const dataRanges = buildSpreadsheetValuesPayload(
    model,
    options.projectName,
    options.scenarioName
  );

  const valuesRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: dataRanges,
      }),
    }
  );

  if (valuesRes.status === 401 || valuesRes.status === 403) {
    clearInMemoryGoogleAccessToken();
    throw new GoogleSheetsAuthError(
      'Session expirée lors de l’écriture des données. Veuillez vous reconnecter.'
    );
  }

  if (!valuesRes.ok) {
    throw new Error(await parseGoogleApiError(valuesRes));
  }

  // 3. Apply clean header styling (best-effort; do not fail export if formatting call returns non-fatal error)
  const formatRequests = (created.sheets || [])
    .map((s) => s.properties?.sheetId)
    .filter((id): id is number => typeof id === 'number')
    .flatMap((sheetId) => [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.11, green: 0.1, blue: 0.18 },
              textFormat: {
                bold: true,
                foregroundColor: { red: 1, green: 1, blue: 1 },
                fontSize: 11,
              },
            },
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)',
        },
      },
      {
        autoResizeDimensions: {
          dimensions: {
            sheetId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 8,
          },
        },
      },
    ]);

  if (formatRequests.length > 0) {
    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: formatRequests }),
    }).catch(() => {
      // Non-critical styling failure
    });
  }

  // 4. Configure Google Drive sharing permissions (drive.file scope covers files created by this app)
  let shareSummary = 'Privé (uniquement votre compte Google)';

  if (options.shareMode === 'link_reader') {
    const permRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role: 'reader',
          type: 'anyone',
        }),
      }
    );

    if (permRes.ok) {
      shareSummary = 'Partagé par lien (toute personne avec le lien peut consulter)';
    } else {
      shareSummary =
        'Feuille créée (le partage public par lien a été restreint par la politique du domaine)';
    }
  } else if (options.shareMode === 'collaborator' && options.collaboratorEmail?.trim()) {
    const email = options.collaboratorEmail.trim();
    const role = options.collaboratorRole === 'writer' ? 'writer' : 'reader';
    const permRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions?sendNotificationEmail=true`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          role,
          type: 'user',
          emailAddress: email,
        }),
      }
    );

    if (permRes.ok) {
      shareSummary = `Partagé avec ${email} (${role === 'writer' ? 'Éditeur' : 'Lecteur'})`;
    } else {
      const errMsg = await parseGoogleApiError(permRes);
      shareSummary = `Feuille créée (partage avec ${email} non appliqué : ${errMsg})`;
    }
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title: created.properties?.title || options.spreadsheetTitle,
    shareSummary,
    sheetsCreated: sheetNames,
  };
}
