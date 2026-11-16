import { FullFinancialModel } from '../types/finance';
import { formatAriary, formatMonths, formatPercent } from './formatters';

export type GlossaryCategory =
  | 'Rentabilité'
  | 'Trésorerie & Risque'
  | 'Filière Riz'
  | 'Coûts & Fiscalité';

export interface GlossaryTerm {
  id: string;
  term: string;
  acronym: string;
  category: GlossaryCategory;
  definition: string;
  formula: string;
  madagascarContext: string;
  liveMetric?: (model: FullFinancialModel) => { label: string; value: string };
}

export const GLOSSARY_CATEGORIES: GlossaryCategory[] = [
  'Rentabilité',
  'Trésorerie & Risque',
  'Filière Riz',
  'Coûts & Fiscalité',
];

export const FINANCIAL_GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    id: 'van',
    term: 'Valeur Actuelle Nette',
    acronym: 'VAN / NPV',
    category: 'Rentabilité',
    definition:
      'Mesure la création de richesse nette du projet sur son horizon (3 ans) après remboursement de l’investissement initial I₀ et rémunération du capital au taux d’actualisation r. Si VAN > 0, le projet crée de la valeur.',
    formula: 'VAN = −I₀ + Σ [ CF_t / (1 + r)^t ]   (t = 1..3)',
    madagascarContext:
      'À Madagascar, un projet rizicole financé localement doit dégager une VAN largement positive même avec un taux d’actualisation de 12 % à 18 % reflétant le coût du capital bancaire / microfinance en Ariary et le risque climatique.',
    liveMetric: (model) => ({
      label: 'VAN active (3 ans)',
      value: formatAriary(model.npv.npvAr, { inMillions: true }),
    }),
  },
  {
    id: 'tri',
    term: 'Taux de Rentabilité Interne',
    acronym: 'TRI / IRR',
    category: 'Rentabilité',
    definition:
      'Taux d’actualisation annuel qui annule exactement la VAN du projet. Il représente le rendement intrinsèque annuel du capital investi ; le projet est rentable dès que TRI > taux d’actualisation r.',
    formula: '0 = −I₀ + Σ [ CF_t / (1 + TRI)^t ]',
    madagascarContext:
      'Un TRI supérieur à 25–30 % offre une marge de sécurité confortable face aux aléas de collecte (pistes dégradées en Basse Saison, fluctuations des prix du paddy au Lac Alaotra ou à Marovoay).',
    liveMetric: (model) => ({
      label: 'TRI exact du projet',
      value: Number.isFinite(model.irr.irrValue)
        ? formatPercent(model.irr.irrValue, 1)
        : 'N/A',
    }),
  },
  {
    id: 'seuil-rentabilite',
    term: 'Seuil de Rentabilité (Point Mort)',
    acronym: 'Break-Even',
    category: 'Rentabilité',
    definition:
      'Niveau minimum de chiffre d’affaires ou de volume de riz vendu nécessaire pour couvrir l’intégralité des charges variables et des charges fixes annuelles (résultat d’exploitation nul).',
    formula: 'Seuil CA = Charges Fixes Annuelles / Taux de Marge sur Coûts Variables',
    madagascarContext:
      'Permet de vérifier combien de tonnes de riz décortiqué ou de clients actifs (grossistes, épiceries, hôtels à Antananarivo/Tamatave) il faut sécuriser chaque mois pour couvrir salaires, loyer et énergie.',
    liveMetric: (model) => ({
      label: 'Seuil annuel actuel',
      value: formatAriary(model.breakEven.annualBreakEvenTurnoverAr, { inMillions: true }),
    }),
  },
  {
    id: 'payback',
    term: 'Délai de Récupération du Capital',
    acronym: 'Payback',
    category: 'Trésorerie & Risque',
    definition:
      'Durée nécessaire (en mois) pour que les flux de trésorerie nets cumulés après impôt égalent l’investissement initial I₀. Le modèle distingue le payback simple (moyenne annuelle) et le payback saisonnier (flux mensuels HS/BS réels).',
    formula: 'Cumul_t = −I₀ + Σ CF_mois ≥ 0',
    madagascarContext:
      'En riziculture malgache, la récupération est fortement accélérée pendant la Haute Saison (récolte avril–juillet) grâce aux prix d’achat du paddy plus bas et aux rotations fréquentes.',
    liveMetric: (model) => ({
      label: 'Payback saisonnier',
      value: formatMonths(model.payback.paybackMonths),
    }),
  },
  {
    id: 'bfr-soudure',
    term: 'Besoin en Fonds de Roulement & Période de Soudure',
    acronym: 'BFR / Soudure',
    category: 'Trésorerie & Risque',
    definition:
      'Capital circulant immobilisé pour acheter le paddy comptant aux paysans/collecteurs, financer le transport, le décorticage et le stockage avant l’encaissement des ventes de riz blanc.',
    formula: 'BFR = Stocks paddy/riz + Créances clients − Dettes fournisseurs',
    madagascarContext:
      'À Madagascar, la période de soudure (novembre à mars) réduit l’offre de paddy et renchérit le prix bord-champ. Un BFR dédié (financé dans I₀) évite les ruptures d’approvisionnement ou le recours à des crédits d’urgence coûteux.',
    liveMetric: (model) => ({
      label: 'Fonds de roulement initial (HS)',
      value: formatAriary(model.investment.rotationWorkingCapitalHSAr, { inMillions: true }),
    }),
  },
  {
    id: 'fonds-a-lever',
    term: 'Investissement Initial Total (Fonds à lever)',
    acronym: 'I₀',
    category: 'Trésorerie & Risque',
    definition:
      'Enveloppe globale de capitaux nécessaires au démarrage : BFR de la première rotation/saison + matériel de transformation (décortiqueuse, balances, ensacheuse) + enregistrement légal + réserve de trésorerie (cash buffer).',
    formula: 'I₀ = BFR_HS + Matériel + Enregistrement + Cash Buffer − Subventions CAPEX',
    madagascarContext:
      'Les subventions d’équipement agricole (FDA, projets internationaux) viennent en déduction directe de I₀, améliorant mécaniquement le TRI et réduisant le délai de payback.',
    liveMetric: (model) => ({
      label: 'Fonds à lever (I₀)',
      value: formatAriary(model.investment.fundsToRaiseAr, { inMillions: true }),
    }),
  },
  {
    id: 'rendement-usinage',
    term: 'Rendement d’Usinage (Paddy → Riz blanc)',
    acronym: 'Tx Usinage',
    category: 'Filière Riz',
    definition:
      'Ratio massique entre la quantité de riz blanchi commercialisable obtenue après décorticage/blanchiment et la masse de paddy brut achetée.',
    formula: 'Riz produit (kg) = Paddy collecté (kg) × Rendement_usinage',
    madagascarContext:
      'En rizerie semi-industrielle à Madagascar, le rendement standard varie entre 65 % et 70 % selon le taux d’humidité à la récolte (cible ≤ 14 %), la variété (Makalioka, X265, Vary Gasy) et le réglage des rouleaux.',
    liveMetric: (model) => ({
      label: 'Rendement HS / BS',
      value: `${formatPercent(model.assumptions.hauteSaison.yieldPaddyToRice, 0)} / ${formatPercent(model.assumptions.basseSaison.yieldPaddyToRice, 0)}`,
    }),
  },
  {
    id: 'sous-produits',
    term: 'Valorisation des Sous-Produits (Son & Balayures)',
    acronym: 'Son / Brisures',
    category: 'Filière Riz',
    definition:
      'Coproduits issus du décorticage et du polissage (son de riz pour l’alimentation animale, brisures fines) vendus en complément du riz principal.',
    formula: 'CA Sous-produits = Paddy (kg) × Ratio_sous_produits × Prix_vente_son',
    madagascarContext:
      'Très demandés par les filières avicoles, porcines et laitières des Hautes Terres (Vakinankaratra, Itasy), le son et les balayures permettent souvent d’amortir une large part des frais d’électricité et de décorticage.',
    liveMetric: (model) => ({
      label: 'CA Sous-produits (A1)',
      value: formatAriary(
        model.hauteSaison.totalByproductsKg * model.hauteSaison.byproductSellingPriceAr +
          model.basseSaison.totalByproductsKg * model.basseSaison.byproductSellingPriceAr,
        { inMillions: true }
      ),
    }),
  },
  {
    id: 'marge-brute',
    term: 'Marge Brute & Taux de Marge Brute',
    acronym: 'MB / % MB',
    category: 'Coûts & Fiscalité',
    definition:
      'Différence entre le chiffre d’affaires total (riz + sous-produits) et l’ensemble des coûts variables directs (achat du paddy, usinage, sacs, transport par rotation).',
    formula: 'Marge Brute = CA Total − Coûts Variables Totaux ;  Taux MB = MB / CA',
    madagascarContext:
      'C’est l’indicateur clé d’efficacité opérationnelle entre Haute Saison (paddy abondant, forte marge) et Basse Saison (prix du paddy élevé, transport plus cher sur pistes humides).',
    liveMetric: (model) => ({
      label: 'Marge brute annuelle (A1)',
      value: `${formatAriary(model.year1.annualGrossProfitAr, { inMillions: true })} (${formatPercent(model.year1.grossMarginRate, 1)})`,
    }),
  },
  {
    id: 'marge-securite',
    term: 'Marge de Sécurité Opérationnelle',
    acronym: 'MS (%)',
    category: 'Trésorerie & Risque',
    definition:
      'Pourcentage de baisse du chiffre d’affaires que l’entreprise peut absorber avant de devenir déficitaire (tomber sous le seuil de rentabilité).',
    formula: 'MS = (CA Prévisionnel − Seuil de Rentabilité) / CA Prévisionnel',
    madagascarContext:
      'Une marge de sécurité supérieure à 30 % protège l’unité contre une flambée ponctuelle du prix du gasoil ou une baisse de rendement due à un épisode cyclonique.',
    liveMetric: (model) => ({
      label: 'Marge de sécurité active',
      value: formatPercent(model.breakEven.safetyMarginRate, 1),
    }),
  },
  {
    id: 'ir-madagascar',
    term: 'Impôt sur les Revenus (IR)',
    acronym: 'IR (20 %)',
    category: 'Coûts & Fiscalité',
    definition:
      'Impôt direct annuel calculé sur le résultat net imposable avant impôt (bénéfice après déduction des charges variables et fixes).',
    formula: 'IR = max(0, Résultat Avant Impôt) × Taux_IR',
    madagascarContext:
      'Au régime du réel à Madagascar (Code Général des Impôts), le taux de droit commun de l’IR est de 20 %. Les flux actualisés servant au calcul de la VAN et du TRI sont pris après IR.',
    liveMetric: (model) => ({
      label: 'IR Année 1 estimé',
      value: formatAriary(model.year1.corporateTaxAr, { inMillions: true }),
    }),
  },
  {
    id: 'taux-actualisation',
    term: 'Taux d’Actualisation',
    acronym: 'r (WACC)',
    category: 'Coûts & Fiscalité',
    definition:
      'Taux utilisé pour ramener à la valeur d’aujourd’hui les cash-flows futurs. Il reflète le coût d’opportunité du capital, l’inflation et la prime de risque du projet.',
    formula: 'Facteur d’actualisation (t) = 1 / (1 + r)^t',
    madagascarContext:
      'Un taux de 12 % correspond à un financement mixte fonds propres / partenaires techniques, tandis qu’un crédit commercial local se situe souvent entre 16 % et 22 %.',
    liveMetric: (model) => ({
      label: 'Taux r configuré',
      value: formatPercent(model.npv.discountRate, 1),
    }),
  },
];
