import {
  LayoutDashboard,
  Sliders,
  GitCompare,
  Grid3X3,
  Target,
  Clock,
  TrendingUp,
  Award,
  Dices,
  BookOpen,
  Handshake,
  Globe2,
  Settings,
  Building2,
  Wallet,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  id: string;
  label: string;
  shortLabel: string;
  desc: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Tableau de Bord', shortLabel: 'Synthèse', desc: 'KPI & Synthèse', icon: LayoutDashboard },
  { id: 'hypotheses', label: 'Hypothèses & Coûts', shortLabel: 'Hypothèses', desc: 'Saisie & Paramètres', icon: Sliders },
  { id: 'partenaires', label: 'Écosystème Partenaires', shortLabel: 'Partenaires', desc: 'Coopératives & Transport', icon: Handshake },
  { id: 'concurrence', label: 'Concurrence', shortLabel: 'Concurrence', desc: 'Prix de revient & Parts marché', icon: Building2 },
  { id: 'scenarios', label: 'Scénarios', shortLabel: 'Scénarios', desc: 'Comparaison 3 axes', icon: GitCompare },
  { id: 'sensibilite', label: 'Sensibilité 2D', shortLabel: 'Sensibilité', desc: 'Matrices & Pas à pas', icon: Grid3X3 },
  { id: 'breakeven', label: 'Seuil de Rentabilité', shortLabel: 'Point Mort', desc: 'Break-even & Clients', icon: Target },
  { id: 'payback', label: 'Délai Récupération', shortLabel: 'Payback', desc: 'Suivi 36 mois', icon: Clock },
  { id: 'tresorerie', label: 'Trésorerie', shortLabel: 'Trésorerie', desc: 'Flux M1-M12 & BFR', icon: Wallet },
  { id: 'projections', label: 'Projections 3 Ans', shortLabel: 'Projections', desc: 'Flux A1 - A3', icon: TrendingUp },
  { id: 'vantri', label: 'VAN & TRI', shortLabel: 'VAN & TRI', desc: 'Actualisation', icon: Award },
  { id: 'montecarlo', label: 'Simulation Monte Carlo', shortLabel: 'Monte Carlo', desc: '1 000 tirages VAN / TRI', icon: Dices },
  { id: 'methodologie', label: 'Méthodologie', shortLabel: 'Méthode', desc: 'Formules & Tests', icon: BookOpen },
  { id: 'pestel', label: 'Analyse PESTEL', shortLabel: 'PESTEL', desc: 'Contexte Madagascar', icon: Globe2 },
  { id: 'parametres', label: 'Paramètres', shortLabel: 'Paramètres', desc: 'Gmail, Audit & Préférences', icon: Settings },
];
