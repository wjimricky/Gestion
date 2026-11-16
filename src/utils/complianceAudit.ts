import { FinancialAssumptions, FullFinancialModel } from '../types/finance';
import { getResolvedLogistics } from './logistics';

export type ComplianceStatus = 'conforme' | 'vigilance' | 'non_conforme';
export type ComplianceDomain = 'couts' | 'marges' | 'rendement' | 'fiscalite_bfr';

export type ComplianceAdjustmentAction =
  | { type: 'season'; season: 'hauteSaison' | 'basseSaison'; field: keyof FinancialAssumptions['hauteSaison']; value: number }
  | { type: 'costKg'; id: string; field: 'costHS' | 'costBS'; value: number }
  | { type: 'general'; field: 'corporateTaxRate' | 'discountRate'; value: number }
  | { type: 'investment'; field: 'cashBufferAr'; value: number }
  | { type: 'balanceSeasons'; hsMonths: number };

export interface ComplianceRuleResult {
  id: string;
  domain: ComplianceDomain;
  domainLabel: string;
  title: string;
  status: ComplianceStatus;
  actualLabel: string;
  standardRangeLabel: string;
  explanation: string;
  suggestion?: string;
  adjustmentLabel?: string;
  adjustmentAction?: ComplianceAdjustmentAction;
}

export interface ComplianceAuditSummary {
  score: number; // 0..100
  conformeCount: number;
  vigilanceCount: number;
  nonConformeCount: number;
  overallStatus: ComplianceStatus;
  rules: ComplianceRuleResult[];
}

const fmtAr = (v: number) => `${Math.round(v).toLocaleString('fr-FR')} Ar`;
const fmtPct = (v: number, dec = 1) =>
  `${(v * 100).toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  })} %`;

/**
 * Evaluates user financial assumptions against established Madagascar rice value-chain
 * operational & fiscal benchmarks (collection, milling, margins, DGI tax, safety buffer).
 */
export function runComplianceAudit(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel
): ComplianceAuditSummary {
  const rules: ComplianceRuleResult[] = [];

  const paddyRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-paddy');
  const decortRow = assumptions.costsPerKgPaddy.find((c) => c.id === 'cost-decorticage');

  const paddyHS = paddyRow?.costHS ?? 0;
  const paddyBS = paddyRow?.costBS ?? 0;
  const decortAvg = decortRow ? (decortRow.costHS + decortRow.costBS) / 2 : 0;

  // 1. Prix d'achat du paddy en Haute Saison (standard Madagascar : 650 – 1 150 Ar/kg)
  {
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Prix bord-champ cohérent avec les campagnes de récolte (Alaotra, Marovoay, Vakinankaratra).';
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (paddyHS < 500 || paddyHS > 1300) {
      status = 'non_conforme';
      explanation =
        paddyHS < 500
          ? 'Prix d’achat inférieur au plancher réaliste bord-champ à Madagascar (< 500 Ar/kg) : risque de rupture d’approvisionnement.'
          : 'Prix d’achat HS supérieur aux plafonds habituels de récolte (> 1 300 Ar/kg) : risque de laminage de marge.';
      const target = paddyHS < 500 ? 750 : 950;
      suggestion = `Recaler le prix du paddy HS vers la fourchette de marché (ex. ${fmtAr(target)}/kg).`;
      adjustmentLabel = `Ajuster à ${fmtAr(target)}/kg`;
      adjustmentAction = { type: 'costKg', id: 'cost-paddy', field: 'costHS', value: target };
    } else if (paddyHS < 650 || paddyHS > 1150) {
      status = 'vigilance';
      explanation =
        'Prix d’achat HS en bordure des références habituelles (650 – 1 150 Ar/kg). Vérifiez vos contrats collecteurs.';
      const target = 800;
      suggestion = `Vérifier le prix bord-champ ou tester le standard sectoriel (${fmtAr(target)}/kg).`;
      adjustmentLabel = `Standard ${fmtAr(target)}/kg`;
      adjustmentAction = { type: 'costKg', id: 'cost-paddy', field: 'costHS', value: target };
    }

    rules.push({
      id: 'paddy-price-hs',
      domain: 'couts',
      domainLabel: 'Coûts matières',
      title: 'Prix d’achat paddy — Haute Saison',
      status,
      actualLabel: `${fmtAr(paddyHS)} / kg`,
      standardRangeLabel: '650 – 1 150 Ar / kg',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  // 2. Prix d'achat du paddy en Basse Saison / Soudure (standard : 1 050 – 1 700 Ar/kg)
  {
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Tarif conforme aux tensions saisonnières observées en période de soudure à Madagascar.';
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (paddyBS < paddyHS) {
      status = 'non_conforme';
      explanation =
        'Inversion saisonnière atypique : le paddy en Basse Saison est saisi moins cher qu’en Haute Saison.';
      const target = Math.max(1200, Math.round(paddyHS * 1.5));
      suggestion = `En soudure à Madagascar, le paddy augmente généralement de +40 % à +75 % par rapport à la récolte.`;
      adjustmentLabel = `Ajuster à ${fmtAr(target)}/kg`;
      adjustmentAction = { type: 'costKg', id: 'cost-paddy', field: 'costBS', value: target };
    } else if (paddyBS < 1000 || paddyBS > 1850) {
      status = 'vigilance';
      explanation =
        'Prix de soudure hors bande type (1 050 – 1 700 Ar/kg). Surveillez le BFR nécessaire par rotation.';
      const target = 1400;
      suggestion = `Comparer avec la médiane sectorielle de ${fmtAr(target)}/kg en Basse Saison.`;
      adjustmentLabel = `Standard ${fmtAr(target)}/kg`;
      adjustmentAction = { type: 'costKg', id: 'cost-paddy', field: 'costBS', value: target };
    }

    rules.push({
      id: 'paddy-price-bs',
      domain: 'couts',
      domainLabel: 'Coûts matières',
      title: 'Prix d’achat paddy — Basse Saison (Soudure)',
      status,
      actualLabel: `${fmtAr(paddyBS)} / kg`,
      standardRangeLabel: '1 050 – 1 700 Ar / kg (≥ HS)',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  // 3. Coût de décorticage / usinage (standard : 70 – 150 Ar/kg paddy)
  {
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Prestation d’usinage alignée avec les tarifs des décortiqueries semi-industrielles malgaches.';
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (decortRow && (decortAvg < 40 || decortAvg > 220)) {
      status = 'non_conforme';
      explanation =
        decortAvg < 40
          ? 'Coût d’usinage sous-évalué (< 40 Ar/kg) : énergie, maintenance et consommables risquent d’être omis.'
          : 'Coût de décorticage excessif (> 220 Ar/kg), réduisant fortement la compétitivité prix.';
      suggestion = 'Retenir un coût standard de 100 Ar/kg paddy (fourchette 70–150 Ar/kg).';
      adjustmentLabel = 'Régler à 100 Ar/kg (HS)';
      adjustmentAction = { type: 'costKg', id: 'cost-decorticage', field: 'costHS', value: 100 };
    } else if (decortRow && (decortAvg < 70 || decortAvg > 150)) {
      status = 'vigilance';
      explanation =
        'Coût de décorticage légèrement décalé par rapport aux standards (70 – 150 Ar/kg).';
      suggestion = 'Vérifier les frais électriques (Jirama/groupe électrogène) ou négocier le tarif à façon.';
    }

    rules.push({
      id: 'milling-cost',
      domain: 'couts',
      domainLabel: 'Usinage',
      title: 'Coût unitaire de décorticage',
      status,
      actualLabel: `${fmtAr(decortAvg)} / kg`,
      standardRangeLabel: '70 – 150 Ar / kg paddy',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  // 4. Rendement de transformation paddy → riz (standard : 64 % – 72 %)
  {
    const avgYield =
      (assumptions.hauteSaison.yieldPaddyToRice + assumptions.basseSaison.yieldPaddyToRice) / 2;
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Taux d’extraction cohérent avec du paddy sec (≤ 14 % humidité) sur unité à rouleaux caoutchouc.';
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (avgYield > 0.76 || avgYield < 0.56) {
      status = 'non_conforme';
      explanation =
        avgYield > 0.76
          ? 'Rendement supérieur au maximum physique usuel du riz blanc (> 76 % avec balles/son).'
          : 'Rendement très faible (< 56 %), signe de forte casse, d’humidité excessive ou d’équipement obsolète.';
      const target = avgYield > 0.76 ? 0.7 : 0.66;
      suggestion = `Calibrer le rendement technique entre 64 % et 72 % (référence ${fmtPct(target, 0)}).`;
      adjustmentLabel = `Régler HS à ${fmtPct(target, 0)}`;
      adjustmentAction = {
        type: 'season',
        season: 'hauteSaison',
        field: 'yieldPaddyToRice',
        value: target,
      };
    } else if (avgYield < 0.64 || avgYield > 0.72) {
      status = 'vigilance';
      explanation =
        'Rendement en marge de la norme technique (64 % – 72 %). Contrôlez le taux de brisures et de séchage.';
      suggestion = 'Sécher le paddy à ≤ 14 % avant usinage pour stabiliser le rendement à ~70 %.';
    }

    rules.push({
      id: 'milling-yield',
      domain: 'rendement',
      domainLabel: 'Productivité technique',
      title: 'Rendement paddy → riz blanc',
      status,
      actualLabel: fmtPct(avgYield, 1),
      standardRangeLabel: '64,0 % – 72,0 %',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  // 5. Taux de Marge Brute annuelle (standard : 18 % – 38 %)
  {
    const gm = model.year1.grossMarginRate;
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Marge brute saine permettant d’absorber les charges fixes de structure, le transport et la fiscalité.';
    let suggestion: string | undefined;

    if (gm < 0.12 || gm > 0.50) {
      status = 'non_conforme';
      explanation =
        gm < 0.12
          ? 'Marge brute critique (< 12 %) : vulnérabilité immédiate à la moindre hausse du paddy ou du gasoil.'
          : 'Marge brute exceptionnellement élevée (> 50 %) pour du négoce/usinage de riz : vérifiez qu’aucun coût variable ne manque.';
      suggestion =
        gm < 0.12
          ? 'Revoir le prix de vente du riz, optimiser le coût logistique ou sécuriser les achats en Haute Saison.'
          : 'Contrôler la complétude des frais de décorticage, sacs, manutention et transport.';
    } else if (gm < 0.18 || gm > 0.40) {
      status = 'vigilance';
      explanation =
        'Marge brute en dehors du corridor type de la filière (18 % – 38 %).';
      suggestion = 'Affiner les différentiels prix d’achat paddy / prix de vente riz par saison.';
    }

    rules.push({
      id: 'gross-margin-rate',
      domain: 'marges',
      domainLabel: 'Marges types',
      title: 'Taux de marge brute consolidée (A1)',
      status,
      actualLabel: fmtPct(gm, 1),
      standardRangeLabel: '18,0 % – 38,0 %',
      explanation,
      suggestion,
    });
  }

  // 6. Taux de Marge Nette après IR (standard viable : 8 % – 25 %)
  {
    const nm = model.year1.netMarginAfterTaxRate;
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Rentabilité nette robuste offrant une capacité d’autofinancement et de distribution attractive.';
    let suggestion: string | undefined;

    if (nm < 0.05) {
      status = 'non_conforme';
      explanation =
        'Marge nette sous le seuil critique de 5 % : les charges fixes ou les coûts de collecte absorbent l’essentiel du résultat.';
      suggestion =
        'Augmenter le nombre de rotations mensuelles ou réduire les frais fixes de structure pour dépasser 8 % de marge nette.';
    } else if (nm < 0.08 || nm > 0.28) {
      status = 'vigilance';
      explanation =
        nm < 0.08
          ? 'Marge nette serrée (5 % – 8 %) : coussin limité en cas d’aléa climatique ou de dérive de change.'
          : 'Marge nette > 28 % très optimiste pour le secteur : validez le réalisme des prix de vente ou des charges de personnel.';
      suggestion =
        nm < 0.08
          ? 'Viser un corridor cible de 10 % à 20 % par augmentation des volumes usinés.'
          : 'Vérifier l’exhaustivité des salaires, loyers et dotations d’entretien véhicule.';
    }

    rules.push({
      id: 'net-margin-rate',
      domain: 'marges',
      domainLabel: 'Marges types',
      title: 'Taux de marge nette après impôt (A1)',
      status,
      actualLabel: fmtPct(nm, 1),
      standardRangeLabel: '8,0 % – 25,0 %',
      explanation,
      suggestion,
    });
  }

  // 7. Conformité fiscale IR Madagascar (20 %) & équilibre saisonnier 12 mois
  {
    const ir = assumptions.corporateTaxRate;
    const totalMonths = assumptions.hauteSaison.months + assumptions.basseSaison.months;
    let status: ComplianceStatus = 'conforme';
    let explanation =
      'Taux d’Impôt sur les Revenus conforme au Code Général des Impôts de Madagascar (20 %) et exercice de 12 mois.';
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (Math.abs(ir - 0.2) > 0.005) {
      status = ir === 0 ? 'non_conforme' : 'vigilance';
      explanation = `Taux d’IR saisi à ${fmtPct(ir, 1)} alors que le taux légal standard à Madagascar est de 20,0 % (régime réel).`;
      suggestion = 'Rétablir le taux légal de 20 % pour sécuriser la conformité fiscale du prévisionnel.';
      adjustmentLabel = 'Appliquer IR 20 %';
      adjustmentAction = { type: 'general', field: 'corporateTaxRate', value: 0.2 };
    } else if (totalMonths !== 12) {
      status = 'vigilance';
      explanation = `La durée cumulée HS + BS totalise ${totalMonths} mois au lieu d’un exercice complet de 12 mois.`;
      suggestion = 'Équilibrer les deux saisons sur 12 mois calendaires.';
      adjustmentLabel = 'Équilibrer 12 mois';
      adjustmentAction = {
        type: 'balanceSeasons',
        hsMonths: Math.max(1, Math.min(11, Math.round(assumptions.hauteSaison.months))),
      };
    }

    rules.push({
      id: 'fiscal-ir-calendar',
      domain: 'fiscalite_bfr',
      domainLabel: 'Fiscalité & Exercice',
      title: 'Conformité fiscale IR (Madagascar) & cycle annuel',
      status,
      actualLabel: `IR ${fmtPct(ir, 0)} · ${totalMonths} mois`,
      standardRangeLabel: 'IR 20 % · 12 mois',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  // 8. Couverture du Cash Buffer vs BFR de rotation et coût logistique
  {
    const peakRotBfr = Math.max(
      model.hauteSaison.totalCostPerRotationAr,
      model.basseSaison.totalCostPerRotationAr
    );
    const bufferRatio = peakRotBfr > 0 ? assumptions.investment.cashBufferAr / peakRotBfr : 0;
    const logistics = getResolvedLogistics(assumptions);

    let status: ComplianceStatus = 'conforme';
    let explanation = `Réserve de trésorerie couvrant ${fmtPct(bufferRatio, 1)} du BFR unitaire de pointe (${fmtAr(peakRotBfr)}) avec paramétrage logistique ${logistics.enabled ? 'synchronisé' : 'manuel'}.`;
    let suggestion: string | undefined;
    let adjustmentLabel: string | undefined;
    let adjustmentAction: ComplianceAdjustmentAction | undefined;

    if (bufferRatio < 0.1) {
      status = 'non_conforme';
      const recommended = Math.max(3000000, Math.ceil((peakRotBfr * 0.2) / 500000) * 500000);
      explanation =
        'Cash buffer inférieur à 10 % du BFR de pointe : forte exposition aux aléas de collecte ou retards d’encaissement en soudure.';
      suggestion = `Porter la réserve de sécurité à au moins 18–20 % du BFR de pointe (ex. ${fmtAr(recommended)}).`;
      adjustmentLabel = `Porter à ${fmtAr(recommended)}`;
      adjustmentAction = { type: 'investment', field: 'cashBufferAr', value: recommended };
    } else if (bufferRatio < 0.15) {
      status = 'vigilance';
      const recommended = Math.ceil((peakRotBfr * 0.2) / 500000) * 500000;
      explanation =
        'Coussin de trésorerie modéré (10–15 % du BFR de pointe). Une hausse du prix du paddy en Basse Saison peut tendre la trésorerie.';
      suggestion = `Option de prudence : renforcer le cash buffer vers ${fmtAr(recommended)}.`;
      adjustmentLabel = `Renforcer à ${fmtAr(recommended)}`;
      adjustmentAction = { type: 'investment', field: 'cashBufferAr', value: recommended };
    }

    rules.push({
      id: 'bfr-buffer-coverage',
      domain: 'fiscalite_bfr',
      domainLabel: 'Sécurité financière',
      title: 'Couverture Cash Buffer / BFR de pointe',
      status,
      actualLabel: `${fmtAr(assumptions.investment.cashBufferAr)} (${fmtPct(bufferRatio, 1)})`,
      standardRangeLabel: '≥ 15 % du BFR pointe',
      explanation,
      suggestion,
      adjustmentLabel,
      adjustmentAction,
    });
  }

  const conformeCount = rules.filter((r) => r.status === 'conforme').length;
  const vigilanceCount = rules.filter((r) => r.status === 'vigilance').length;
  const nonConformeCount = rules.filter((r) => r.status === 'non_conforme').length;

  const rawPoints = rules.reduce(
    (acc, r) => acc + (r.status === 'conforme' ? 100 : r.status === 'vigilance' ? 60 : 15),
    0
  );
  const score = rules.length > 0 ? Math.round(rawPoints / rules.length) : 100;

  const overallStatus: ComplianceStatus =
    nonConformeCount > 0
      ? 'non_conforme'
      : vigilanceCount > 0
      ? 'vigilance'
      : 'conforme';

  return {
    score,
    conformeCount,
    vigilanceCount,
    nonConformeCount,
    overallStatus,
    rules,
  };
}
