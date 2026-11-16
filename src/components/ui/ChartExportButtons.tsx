import React, { useState } from 'react';
import { ImageDown, FileCode2, Loader2 } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { exportChartElementAsPng, exportChartElementAsSvg } from '../../utils/chartExport';

interface ChartExportButtonsProps {
  /** Direct ref to the container wrapping the chart */
  targetRef?: React.RefObject<HTMLElement | null>;
  /** CSS selector fallback (e.g. '[data-pdf-chart="cashflow"]') */
  selector?: string;
  /** Base filename without extension or date */
  filenameBase: string;
  /** Human-readable chart title used in toast notifications */
  chartTitle?: string;
  className?: string;
}

export const ChartExportButtons: React.FC<ChartExportButtonsProps> = ({
  targetRef,
  selector,
  filenameBase,
  chartTitle,
  className = '',
}) => {
  const { theme, notify } = useFinancial();
  const [exportingPng, setExportingPng] = useState(false);

  const resolveContainer = (): HTMLElement | null => {
    if (targetRef?.current) return targetRef.current;
    if (selector && typeof document !== 'undefined') {
      return document.querySelector<HTMLElement>(selector);
    }
    return null;
  };

  const handleExportSvg = () => {
    const container = resolveContainer();
    const ok = exportChartElementAsSvg(container, filenameBase, theme);
    if (ok) {
      notify(
        'success',
        `Graphique${chartTitle ? ` « ${chartTitle} »` : ''} exporté en SVG vectoriel.`
      );
    } else {
      notify('error', 'Impossible de capturer le graphique SVG actuellement affiché.');
    }
  };

  const handleExportPng = async () => {
    if (exportingPng) return;
    setExportingPng(true);
    try {
      const container = resolveContainer();
      const ok = await exportChartElementAsPng(container, filenameBase, 2, theme);
      if (ok) {
        notify(
          'success',
          `Graphique${chartTitle ? ` « ${chartTitle} »` : ''} exporté en PNG haute résolution.`
        );
      } else {
        notify('error', 'Impossible de générer l’image PNG pour ce graphique.');
      }
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div
      role="group"
      aria-label={`Exporter le graphique ${chartTitle || ''}`}
      className={`inline-flex items-center rounded-lg border border-zinc-200 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#191828] overflow-hidden shrink-0 no-print ${className}`}
    >
      <button
        type="button"
        onClick={handleExportPng}
        disabled={exportingPng}
        title={`Télécharger ${chartTitle || 'ce graphique'} en image PNG (haute résolution)`}
        aria-label={`Exporter ${chartTitle || 'ce graphique'} en PNG`}
        className="min-h-8 px-2 py-1 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-1 disabled:opacity-60"
      >
        {exportingPng ? (
          <Loader2 className="w-3 h-3 animate-spin text-indigo-500" aria-hidden="true" />
        ) : (
          <ImageDown className="w-3 h-3 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
        )}
        <span>PNG</span>
      </button>
      <span className="h-4 w-px bg-zinc-200 dark:bg-white/[0.1]" aria-hidden="true" />
      <button
        type="button"
        onClick={handleExportSvg}
        title={`Télécharger ${chartTitle || 'ce graphique'} au format vectoriel SVG`}
        aria-label={`Exporter ${chartTitle || 'ce graphique'} en SVG`}
        className="min-h-8 px-2 py-1 text-[11px] font-mono font-semibold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-white/[0.08] transition-colors inline-flex items-center gap-1"
      >
        <FileCode2 className="w-3 h-3 text-teal-600 dark:text-teal-400" aria-hidden="true" />
        <span>SVG</span>
      </button>
    </div>
  );
};
