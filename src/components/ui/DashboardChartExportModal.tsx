import React, { useEffect, useState } from 'react';
import { Download, FileImage, FileCode2, CheckCircle2, Presentation } from 'lucide-react';
import { Modal } from './Modal';
import { exportChartElementAsPng, exportChartElementAsSvg } from '../../utils/chartExport';

export interface DashboardChartDescriptor {
  id: string;
  title: string;
  subtitle: string;
  selector: string;
  filenameBase: string;
}

export const DASHBOARD_CHART_DESCRIPTORS: DashboardChartDescriptor[] = [
  {
    id: 'cashflow',
    title: 'Trésorerie Cumulée & Seuil de Remboursement (M0–M36)',
    subtitle: 'Courbe principale du Dashboard — Point mort et récupération de I₀',
    selector: '[data-pdf-chart="cashflow"]',
    filenameBase: 'tresorerie_cumulee_m0_m36',
  },
  {
    id: 'profitloss',
    title: 'Matrice Flux Nets & Trajectoire 3 Ans (P&L)',
    subtitle: 'Comparaison Réaliste vs Ambitieuse et flux mensuels A1–A3',
    selector: '[data-pdf-chart="profitloss"]',
    filenameBase: 'flux_nets_profit_loss_3ans',
  },
  {
    id: 'operational-costs-donut',
    title: 'Répartition des Coûts Opérationnels (Année 1)',
    subtitle: 'Paddy, usinage, transport, sacs et charges fixes',
    selector: '[data-pdf-chart="operational-costs-donut"]',
    filenameBase: 'repartition_couts_operationnels',
  },
  {
    id: 'paddy-stock-opt',
    title: 'Gestion des Stocks de Paddy — Durée Optimale',
    subtitle: 'Arbitrage pertes post-récolte vs coût de portage BFR (7 j à 120 j)',
    selector: '[data-pdf-chart="paddy-stock-opt"]',
    filenameBase: 'optimisation_stocks_paddy',
  },
  {
    id: 'pnl-waterfall',
    title: 'Waterfall P&L Année 1 (CA → Résultat Net)',
    subtitle: 'Décomposition en cascade des charges opérationnelles, logistiques et fiscales',
    selector: '[data-pdf-chart="pnl-waterfall"]',
    filenameBase: 'waterfall_resultat_net_a1',
  },
  {
    id: 'scenario-vs-baseline',
    title: 'Comparaison CA & Marge Nette vs Référence',
    subtitle: 'Positionnement du scénario actif face à la base de référence',
    selector: '[data-pdf-chart="scenario-vs-baseline"]',
    filenameBase: 'comparaison_ca_marge_nette',
  },
  {
    id: 'zones-radar',
    title: 'Radar Rentabilité Multi-Zones (Madagascar)',
    subtitle: 'Comparaison Alaotra, Itasy, Marovoay, Vakinankaratra et Sofia',
    selector: '[data-pdf-chart="zones-radar"]',
    filenameBase: 'radar_zones_madagascar',
  },
];

interface DashboardChartExportModalProps {
  open: boolean;
  onClose: () => void;
  ensureDashboardReady: () => Promise<void>;
  notify: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DashboardChartExportModal: React.FC<DashboardChartExportModalProps> = ({
  open,
  onClose,
  ensureDashboardReady,
  notify,
}) => {
  const [pngScale, setPngScale] = useState<2 | 3>(3);
  const [availableMap, setAvailableMap] = useState<Record<string, boolean>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);

  const scanCharts = () => {
    const map: Record<string, boolean> = {};
    for (const chart of DASHBOARD_CHART_DESCRIPTORS) {
      const container = document.querySelector(chart.selector) as HTMLElement | null;
      const svg = container?.querySelector('svg.recharts-surface, svg');
      map[chart.id] = Boolean(container && svg);
    }
    setAvailableMap(map);
  };

  useEffect(() => {
    if (!open) return;
    let active = true;
    setIsPreparing(true);
    void ensureDashboardReady().then(() => {
      if (!active) return;
      scanCharts();
      setIsPreparing(false);
    });
    return () => {
      active = false;
    };
  }, [open, ensureDashboardReady]);

  const handleExportOne = async (
    chart: DashboardChartDescriptor,
    format: 'png' | 'svg'
  ) => {
    setBusyId(`${chart.id}-${format}`);
    try {
      await ensureDashboardReady();
      const container = document.querySelector(chart.selector) as HTMLElement | null;
      if (!container) {
        notify('error', `Graphique « ${chart.title} » non affiché actuellement.`);
        return;
      }

      if (format === 'svg') {
        const ok = exportChartElementAsSvg(container, chart.filenameBase);
        if (ok) {
          notify('success', `Graphique « ${chart.title} » enregistré en SVG.`);
        } else {
          notify('error', `Impossible d’exporter « ${chart.title} » en SVG.`);
        }
      } else {
        const ok = await exportChartElementAsPng(container, chart.filenameBase, pngScale);
        if (ok) {
          notify(
            'success',
            `Graphique « ${chart.title} » enregistré en PNG (${pngScale}x HD).`
          );
        } else {
          notify('error', `Impossible d’exporter « ${chart.title} » en PNG.`);
        }
      }
    } finally {
      setBusyId(null);
    }
  };

  const handleExportAll = async (format: 'png' | 'svg') => {
    setBusyId(`all-${format}`);
    try {
      await ensureDashboardReady();
      let exportedCount = 0;
      for (const chart of DASHBOARD_CHART_DESCRIPTORS) {
        const container = document.querySelector(chart.selector) as HTMLElement | null;
        if (!container) continue;
        const ok =
          format === 'svg'
            ? exportChartElementAsSvg(container, chart.filenameBase)
            : await exportChartElementAsPng(container, chart.filenameBase, pngScale);
        if (ok) {
          exportedCount += 1;
          await new Promise((r) => window.setTimeout(r, 120));
        }
      }
      if (exportedCount > 0) {
        notify(
          'success',
          `${exportedCount} graphique(s) du Dashboard exporté(s) en ${format.toUpperCase()}.`
        );
      } else {
        notify('error', 'Aucun graphique détecté à exporter sur le Dashboard.');
      }
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Exporter les graphiques du Dashboard (PNG / SVG)"
      description="Enregistrez chaque graphique individuellement en PNG haute résolution ou SVG vectoriel pour vos présentations PowerPoint."
    >
      <div className="space-y-4">
        {/* Toolbar: Resolution selector + batch export */}
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Presentation className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">
              Résolution PNG :
            </span>
            <div className="inline-flex rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] p-0.5">
              <button
                type="button"
                onClick={() => setPngScale(2)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  pngScale === 2
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                2x Standard
              </button>
              <button
                type="button"
                onClick={() => setPngScale(3)}
                className={`px-2.5 py-1 rounded-md text-xs font-mono font-semibold transition-colors ${
                  pngScale === 3
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                3x PowerPoint HD
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={Boolean(busyId) || isPreparing}
              onClick={() => void handleExportAll('png')}
              className="min-h-8 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tout en PNG</span>
            </button>
            <button
              type="button"
              disabled={Boolean(busyId) || isPreparing}
              onClick={() => void handleExportAll('svg')}
              className="min-h-8 px-3 py-1 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <FileCode2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Tout en SVG</span>
            </button>
          </div>
        </div>

        {/* Individual Chart List */}
        <div className="divide-y divide-zinc-200 dark:divide-white/[0.08] rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-hidden">
          {DASHBOARD_CHART_DESCRIPTORS.map((chart) => {
            const isReady = availableMap[chart.id] !== false;
            return (
              <div
                key={chart.id}
                className="p-3.5 bg-white dark:bg-[#11101C] flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {chart.title}
                    </span>
                    {isReady && !isPreparing && (
                      <CheckCircle2
                        className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                    {chart.subtitle}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={Boolean(busyId) || isPreparing || !isReady}
                    onClick={() => void handleExportOne(chart, 'png')}
                    className="min-h-8 px-3 py-1 rounded-lg border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-800 dark:text-indigo-200 inline-flex items-center gap-1.5 transition-colors disabled:opacity-45"
                  >
                    <FileImage className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{busyId === `${chart.id}-png` ? 'PNG…' : 'PNG'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busyId) || isPreparing || !isReady}
                    onClick={() => void handleExportOne(chart, 'svg')}
                    className="min-h-8 px-3 py-1 rounded-lg border border-teal-500/35 bg-teal-500/10 hover:bg-teal-500/20 text-xs font-semibold text-teal-800 dark:text-teal-200 inline-flex items-center gap-1.5 transition-colors disabled:opacity-45"
                  >
                    <FileCode2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{busyId === `${chart.id}-svg` ? 'SVG…' : 'SVG'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};
