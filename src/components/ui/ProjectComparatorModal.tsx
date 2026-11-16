import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Copy,
  FileUp,
  GitCompareArrows,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useFinancial } from '../../context/FinancialContext';
import { compareTwoProjects } from '../../utils/projectComparison';
import { Modal } from './Modal';
import { SelectMenu, SelectMenuOption } from './SelectMenu';

interface ProjectComparatorModalProps {
  open: boolean;
  onClose: () => void;
  onOpenExcelImport: () => void;
}

export const ProjectComparatorModal: React.FC<ProjectComparatorModalProps> = ({
  open,
  onClose,
  onOpenExcelImport,
}) => {
  const {
    projects,
    activeProjectId,
    assumptions,
    unitDisplay,
    duplicateProject,
  } = useFinancial();

  const inM = unitDisplay === 'millions';

  const [projectAId, setProjectAId] = useState<string>(activeProjectId);
  const [projectBId, setProjectBId] = useState<string>(() => {
    const other = projects.find((p) => p.id !== activeProjectId);
    return other ? other.id : activeProjectId;
  });

  useEffect(() => {
    if (!open) return;
    const validA = projects.some((p) => p.id === projectAId)
      ? projectAId
      : activeProjectId;
    const validB = projects.some((p) => p.id === projectBId)
      ? projectBId
      : projects.find((p) => p.id !== validA)?.id || validA;
    setProjectAId(validA);
    setProjectBId(validB);
  }, [open, projects, activeProjectId, projectAId, projectBId]);

  const projectOptions = useMemo<SelectMenuOption[]>(
    () =>
      projects.map((p) => ({
        value: p.id,
        label: p.name,
        description: p.excelMeta
          ? `Excel · ${p.excelMeta.fileName}`
          : p.description,
        badge: p.id === activeProjectId ? 'Actif' : p.source === 'copy' ? 'Copie' : p.source === 'default' ? 'Défaut' : 'Excel',
      })),
    [projects, activeProjectId]
  );

  const projectA = useMemo(
    () => projects.find((p) => p.id === projectAId) || projects[0],
    [projects, projectAId]
  );
  const projectB = useMemo(
    () => projects.find((p) => p.id === projectBId) || projects[1] || projects[0],
    [projects, projectBId]
  );

  const comparison = useMemo(() => {
    if (!projectA || !projectB) return null;
    return compareTwoProjects(projectA, projectB, {
      activeProjectId,
      liveAssumptions: assumptions,
      inMillions: inM,
    });
  }, [projectA, projectB, activeProjectId, assumptions, inM]);

  const handleDuplicateAndCompare = () => {
    const sourceId = projectA?.id || activeProjectId;
    const res = duplicateProject(sourceId);
    if (res.ok && res.project) {
      setProjectBId(res.project.id);
    }
  };

  const handleSwap = () => {
    setProjectAId(projectBId);
    setProjectBId(projectAId);
  };

  const isSameProject = projectA?.id === projectB?.id;

  const highlightRows = comparison?.metrics.filter((m) => m.highlight) ?? [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Comparateur de Projets Sauvegardés"
      description="Sélectionnez deux projets pour comparer côte à côte la VAN, le TRI, le chiffre d’affaires et les écarts."
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-5">
        {/* Callout if only 1 project exists */}
        {projects.length < 2 && (
          <div className="p-3.5 rounded-xl border border-amber-500/35 bg-amber-500/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="text-xs text-amber-950 dark:text-amber-100">
              <span className="font-bold">Un seul projet est actuellement enregistré. </span>
              Dupliquez le projet actif pour créer une variante comparative ou importez un autre classeur Excel.
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDuplicateAndCompare}
                className="min-h-9 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Créer une variante</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenExcelImport();
                }}
                className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] text-zinc-800 dark:text-zinc-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <FileUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Importer Excel</span>
              </button>
            </div>
          </div>
        )}

        {/* Project Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-end">
          <div className="space-y-1">
            <label
              htmlFor="comparator-project-a"
              className="block text-xs font-semibold text-indigo-700 dark:text-indigo-300"
            >
              Projet A (Base de référence)
            </label>
            <SelectMenu
              id="comparator-project-a"
              ariaLabel="Sélectionner le projet A"
              value={projectAId}
              onChange={setProjectAId}
              options={projectOptions}
              tone="indigo"
              className="w-full"
            />
          </div>

          <button
            type="button"
            onClick={handleSwap}
            title="Inverser Projet A et Projet B"
            aria-label="Inverser Projet A et Projet B"
            className="min-h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#141323] hover:bg-zinc-100 dark:hover:bg-[#1D1B31] text-zinc-700 dark:text-zinc-200 inline-flex items-center justify-center gap-1.5 text-xs font-semibold transition-colors self-end"
          >
            <ArrowLeftRight className="w-4 h-4" aria-hidden="true" />
            <span className="md:hidden">Permuter A ↔ B</span>
          </button>

          <div className="space-y-1">
            <label
              htmlFor="comparator-project-b"
              className="block text-xs font-semibold text-teal-700 dark:text-teal-300"
            >
              Projet B (Projet comparé)
            </label>
            <SelectMenu
              id="comparator-project-b"
              ariaLabel="Sélectionner le projet B"
              value={projectBId}
              onChange={setProjectBId}
              options={projectOptions}
              tone="emerald"
              className="w-full"
            />
          </div>
        </div>

        {isSameProject && projects.length >= 2 && (
          <div className="px-3 py-2 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-white/[0.02] text-xs text-zinc-600 dark:text-zinc-400">
            Les deux sélecteurs pointent actuellement sur le même projet : les écarts affichés sont nuls. Choisissez un second projet distinct dans « Projet B ».
          </div>
        )}

        {comparison && (
          <>
            {/* Top 3 Highlight KPI Cards: VAN, TRI, CA */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {highlightRows.map((row) => {
                const isBetter = row.winner === 'B';
                const isWorse = row.winner === 'A';
                return (
                  <div
                    key={row.id}
                    className={`p-3.5 rounded-xl border ${
                      isBetter
                        ? 'border-emerald-500/40 bg-emerald-500/[0.06]'
                        : isWorse
                        ? 'border-rose-500/40 bg-rose-500/[0.06]'
                        : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#141322]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                        {row.label}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                          isBetter
                            ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                            : isWorse
                            ? 'bg-rose-500/15 text-rose-800 dark:text-rose-300'
                            : 'bg-zinc-200/70 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {isBetter ? (
                          <TrendingUp className="w-3 h-3" aria-hidden="true" />
                        ) : isWorse ? (
                          <TrendingDown className="w-3 h-3" aria-hidden="true" />
                        ) : null}
                        <span>{row.formattedDelta}</span>
                      </span>
                    </div>

                    <div className="mt-2.5 grid grid-cols-2 gap-2 text-xs font-mono tabular-nums">
                      <div>
                        <div className="text-[10px] font-sans text-indigo-700 dark:text-indigo-300 truncate">
                          A · {comparison.projectA.name}
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                          {row.formattedA}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-sans text-teal-700 dark:text-teal-300 truncate">
                          B · {comparison.projectB.name}
                        </div>
                        <div className="text-sm font-bold text-zinc-900 dark:text-white mt-0.5">
                          {row.formattedB}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Visual Grouped BarChart */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-[#0D0C18] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <GitCompareArrows className="w-4 h-4 text-indigo-500" aria-hidden="true" />
                  <span>Profil comparé des grands agrégats (Millions d’Ariary)</span>
                </span>
                <div className="flex items-center gap-4 text-[11px]">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-700 dark:text-indigo-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500" />
                    <span className="truncate max-w-[160px]">{comparison.projectA.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-teal-700 dark:text-teal-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-teal-400" />
                    <span className="truncate max-w-[160px]">{comparison.projectB.name}</span>
                  </span>
                </div>
              </div>

              <div className="h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={comparison.chartData}
                    margin={{ top: 10, right: 12, left: 0, bottom: 4 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(148,163,184,0.16)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="indicator"
                      tick={{ fill: '#94A3B8', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#94A3B8', fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                      width={48}
                      tickFormatter={(v) => `${v}M`}
                    />
                    <RechartsTooltip
                      formatter={(value, name) => [
                        `${Number(value ?? 0).toFixed(1)} M Ar`,
                        name === 'projetA'
                          ? comparison.projectA.name
                          : comparison.projectB.name,
                      ]}
                      contentStyle={{
                        backgroundColor: 'rgba(15, 14, 28, 0.94)',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '10px',
                        fontSize: '12px',
                        color: '#F4F4F5',
                      }}
                    />
                    <Bar
                      dataKey="projetA"
                      name="projetA"
                      fill="#6366F1"
                      radius={[5, 5, 0, 0]}
                      barSize={24}
                    />
                    <Bar
                      dataKey="projetB"
                      name="projetB"
                      fill="#2DD4BF"
                      radius={[5, 5, 0, 0]}
                      barSize={24}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Full Side-by-Side Comparison Table with Variance Highlighting */}
            <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
              <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
                <thead>
                  <tr className="bg-zinc-100/90 dark:bg-[#171628] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                    <th className="py-2.5 px-3 font-semibold">Indicateur financier</th>
                    <th className="py-2.5 px-3 text-right font-semibold text-indigo-700 dark:text-indigo-300">
                      Projet A · {comparison.projectA.name}
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold text-teal-700 dark:text-teal-300">
                      Projet B · {comparison.projectB.name}
                    </th>
                    <th className="py-2.5 px-3 text-right font-semibold">Écart (B − A)</th>
                    <th className="py-2.5 px-3 text-right font-semibold">Écart (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                  {comparison.metrics.map((row) => {
                    const deltaCellClass =
                      row.winner === 'B'
                        ? 'bg-emerald-500/12 text-emerald-800 dark:text-emerald-300 font-bold'
                        : row.winner === 'A'
                        ? 'bg-rose-500/12 text-rose-800 dark:text-rose-300 font-bold'
                        : 'text-zinc-600 dark:text-zinc-400';

                    return (
                      <tr
                        key={row.id}
                        className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]"
                      >
                        <td className="py-2.5 px-3 font-sans">
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {row.label}
                          </div>
                          <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                            {row.category}
                          </div>
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right whitespace-nowrap ${
                            row.winner === 'A'
                              ? 'font-bold text-indigo-700 dark:text-indigo-300'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {row.formattedA}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-right whitespace-nowrap ${
                            row.winner === 'B'
                              ? 'font-bold text-teal-700 dark:text-teal-300'
                              : 'text-zinc-800 dark:text-zinc-200'
                          }`}
                        >
                          {row.formattedB}
                        </td>
                        <td className={`py-2.5 px-3 text-right whitespace-nowrap ${deltaCellClass}`}>
                          {row.formattedDelta}
                        </td>
                        <td className={`py-2.5 px-3 text-right whitespace-nowrap ${deltaCellClass}`}>
                          {row.deltaPercent !== null && Math.abs(row.deltaPercent) > 0.05
                            ? `${row.deltaPercent > 0 ? '+' : ''}${row.deltaPercent.toFixed(1)} %`
                            : '0,0 %'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span>
                Code couleur : <strong className="text-emerald-700 dark:text-emerald-300">Vert</strong> = performance favorable au Projet B · <strong className="text-rose-700 dark:text-rose-300">Rouge</strong> = écart défavorable au Projet B.
              </span>
              {projects.length >= 2 && (
                <button
                  type="button"
                  onClick={handleDuplicateAndCompare}
                  className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" aria-hidden="true" />
                  <span>Dupliquer Projet A comme nouvelle variante</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
