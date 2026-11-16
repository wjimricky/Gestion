import {
  PestelAnalysisData,
  PestelCategoryKey,
  PestelHorizon,
  PestelImpact,
} from '../types/project';

export interface PestelCategoryMeta {
  key: PestelCategoryKey;
  letter: string;
  title: string;
  subtitle: string;
  accentColor: string;
  suggestedFactors: string[];
  notesPlaceholder: string;
  mitigationPlaceholder: string;
}

export const PESTEL_CATEGORIES_META: PestelCategoryMeta[] = [
  {
    key: 'politique',
    letter: 'P',
    title: 'Politique',
    subtitle: 'Politiques agricoles, importations & stabilité locale',
    accentColor: 'indigo',
    suggestedFactors: [
      'Subventions engrais & semences',
      'Quotas / droits sur riz importé',
      'Sécurité rurale zones de collecte',
      'Programmes de souveraineté alimentaire',
    ],
    notesPlaceholder:
      'Ex : Incidence des politiques publiques de soutien rizicole (Alaotra, Marovoay) et régulation des importations...',
    mitigationPlaceholder:
      'Ex : Diversifier les bassins d’approvisionnement et sécuriser les relations avec les coopératives locales...',
  },
  {
    key: 'economique',
    letter: 'E',
    title: 'Économique',
    subtitle: 'Prix paddy/riz, fret carburant, inflation & financement',
    accentColor: 'teal',
    suggestedFactors: [
      'Volatilité prix récolte vs soudure',
      'Coût carburant & transport RN2/RN4/RN7',
      'Taux d’intérêt crédit de campagne',
      'Inflation & pouvoir d’achat ménages',
    ],
    notesPlaceholder:
      'Ex : Écart de prix entre période de récolte (mai-juin) et période de soudure (janvier-mars), impact du fret...',
    mitigationPlaceholder:
      'Ex : Ajuster le stock tampon en haute saison et négocier des contrats transporteurs à tarif fixe...',
  },
  {
    key: 'social',
    letter: 'S',
    title: 'Social',
    subtitle: 'Demande culturelle, coopératives & main-d’œuvre',
    accentColor: 'sky',
    suggestedFactors: [
      'Consommation locale élevée (~130 kg/hab/an)',
      'Préférence qualité (Vary Gasy / Makalioka)',
      'Main-d’œuvre saisonnière disponible',
      'Confiance paysans & collecteurs',
    ],
    notesPlaceholder:
      'Ex : Préférences régionales des consommateurs urbains (Antananarivo, Toamasina) et fidélisation des producteurs...',
    mitigationPlaceholder:
      'Ex : Proposer des avances intrants encadrées et garantir un paiement comptant transparent au pesage...',
  },
  {
    key: 'technologique',
    letter: 'T',
    title: 'Technologique',
    subtitle: 'Usinage, rendement, séchage & paiements mobiles',
    accentColor: 'violet',
    suggestedFactors: [
      'Rendement décortiqueuses (65–72 %)',
      'Taux de brisure & calibrage',
      'Pertes post-récolte (séchage / stockage)',
      'Paiements Mobile Money (MVola / Orange)',
    ],
    notesPlaceholder:
      'Ex : Modernisation des unités de décorticage, contrôle d’humidité avant stockage, traçabilité digitale...',
    mitigationPlaceholder:
      'Ex : Planifier une maintenance préventive avant chaque campagne HS et équiper les aires de séchage...',
  },
  {
    key: 'environnemental',
    letter: 'E',
    title: 'Environnemental',
    subtitle: 'Cyclones, sécheresse, irrigation & valorisation déchets',
    accentColor: 'emerald',
    suggestedFactors: [
      'Risque cyclonique (Côte Est / Nord-Ouest)',
      'Stress hydrique & El Niño',
      'Envasement périmètres irrigués',
      'Valorisation balles & sons de riz',
    ],
    notesPlaceholder:
      'Ex : Aléas pluviométriques sur les récoltes de saison principale et opportunités d’économie circulaire (son, balle)...',
    mitigationPlaceholder:
      'Ex : Surélever les entrepôts contre l’humidité/inondations et commercialiser 100 % des sous-produits...',
  },
  {
    key: 'legal',
    letter: 'L',
    title: 'Légal',
    subtitle: 'Fiscalité IR, cartes collecteurs, normes & foncier',
    accentColor: 'amber',
    suggestedFactors: [
      'Fiscalité IR (20 %) & TVA/statut NIF',
      'Carte professionnelle de collecteur',
      'Normes sanitaires & pesage légal',
      'Sécurisation baux entrepôts',
    ],
    notesPlaceholder:
      'Ex : Conformité fiscale, renouvellement des autorisations de collecte communales et étalonnage des balances...',
    mitigationPlaceholder:
      'Ex : Tenir une comptabilité certifiée à jour et formaliser chaque contrat d’entreposage et de livraison...',
  },
];

export const PESTEL_IMPACT_LABELS: Record<PestelImpact, string> = {
  opportunite: 'Opportunité',
  neutre: 'Neutre',
  menace: 'Menace / Risque',
};

export const PESTEL_HORIZON_LABELS: Record<PestelHorizon, string> = {
  court_terme: 'Court terme (0–6 mois)',
  moyen_terme: 'Moyen terme (6–24 mois)',
  long_terme: 'Long terme (+24 mois)',
};

export function createDefaultPestelAnalysis(): PestelAnalysisData {
  const now = new Date().toISOString();
  return {
    politique: {
      category: 'politique',
      impact: 'neutre',
      severity: 3,
      horizon: 'moyen_terme',
      keyFactors: [
        'Quotas / droits sur riz importé',
        'Programmes de souveraineté alimentaire',
      ],
      notes:
        'L’État soutient la production nationale (Alaotra, Marovoay) mais les importations de riz tampon influent sur les prix plafonds en période de soudure.',
      mitigationPlan:
        'Suivre les annonces ministérielles avant chaque campagne et sécuriser les autorisations communales de collecte.',
      updatedAt: now,
    },
    economique: {
      category: 'economique',
      impact: 'opportunite',
      severity: 4,
      horizon: 'court_terme',
      keyFactors: [
        'Volatilité prix récolte vs soudure',
        'Coût carburant & transport RN2/RN4/RN7',
      ],
      notes:
        'Forte amplitude saisonnière entre les prix d’achat du paddy en haute saison et les prix de vente du riz blanc en basse saison, compensant la hausse du fret.',
      mitigationPlan:
        'Verrouiller les achats en début de récolte et répercuter partiellement l’évolution du carburant dans la grille tarifaire.',
      updatedAt: now,
    },
    social: {
      category: 'social',
      impact: 'opportunite',
      severity: 2,
      horizon: 'long_terme',
      keyFactors: [
        'Consommation locale élevée (~130 kg/hab/an)',
        'Préférence qualité (Vary Gasy / Makalioka)',
      ],
      notes:
        'Demande domestique structurellement inélastique : le riz constitue la base alimentaire quotidienne sur l’ensemble du territoire.',
      mitigationPlan:
        'Fidéliser un portefeuille de grossistes urbains réguliers et garantir un tri homogène sans impuretés.',
      updatedAt: now,
    },
    technologique: {
      category: 'technologique',
      impact: 'opportunite',
      severity: 3,
      horizon: 'moyen_terme',
      keyFactors: [
        'Rendement décortiqueuses (65–72 %)',
        'Paiements Mobile Money (MVola / Orange)',
      ],
      notes:
        'Un gain de +2 à +4 points de rendement au décorticage améliore directement la marge nette ; la digitalisation des paiements réduit les risques liés au cash.',
      mitigationPlan:
        'Assurer l’entretien régulier des tamis/rouleaux et utiliser le suivi mobile pour les avances terrain.',
      updatedAt: now,
    },
    environnemental: {
      category: 'environnemental',
      impact: 'menace',
      severity: 4,
      horizon: 'moyen_terme',
      keyFactors: [
        'Risque cyclonique (Côte Est / Nord-Ouest)',
        'Stress hydrique & El Niño',
      ],
      notes:
        'Les cyclones et décalages pluviométriques peuvent retarder la moisson ou endommager les routes rurales en saison des pluies.',
      mitigationPlan:
        'Maintenir des palettes et bâches étanches en entrepôt et diversifier les zones de collecte entre Hauts Plateaux et côtes.',
      updatedAt: now,
    },
    legal: {
      category: 'legal',
      impact: 'neutre',
      severity: 2,
      horizon: 'long_terme',
      keyFactors: [
        'Fiscalité IR (20 %) & TVA/statut NIF',
        'Carte professionnelle de collecteur',
      ],
      notes:
        'Obligation de conformité fiscale (NIF/STAT, IR 20 %) et de respect des normes de pesage lors des achats en zone rurale.',
      mitigationPlan:
        'Conserver les bordereaux d’achat signés et renouveler chaque année les cartes de collecte et certificats d’étalonnage.',
      updatedAt: now,
    },
  };
}
