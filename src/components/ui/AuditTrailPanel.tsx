import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Download,
  History,
  Search,
  Trash2,
} from 'lucide-react';
import { AuditLogEntry, useFinancial } from '../../context/FinancialContext';
import { ConfirmDialog } from './ConfirmDialog';

function escapeCsvCell(value: string | null | undefined): string {
  const str = String(value ?? '');
  if (
    str.includes(',') ||
    str.includes('"') ||
    str.includes('\n') ||
    str.includes(';')
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildAuditLogCsvContent(entries: AuditLogEntry[]): string {
  const headers = [
    'Horodatage',
    'Source',
    'Hypothèse modifiée',
    'Clé technique',
    'Valeur précédente',
    'Nouvelle valeur',
  ];
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }),
    e.source,
    e.fieldLabel,
    e.key,
    e.oldValue,
    e.newValue,
  ]);
  return '\uFEFF' + [headers, ...rows].map((r) => r.map(escapeCsvCell).join(',')).join('\r\n');
}

export const AuditTrailPanel: React.FC = () => {
  const { auditLog, clearAuditLog, activeProject, notify } = useFinancial();
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | AuditLogEntry['source']>('all');
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const filteredEntries = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return auditLog.filter((entry) => {
      if (sourceFilter !== 'all' && entry.source !== sourceFilter) return false;
      if (!q) return true;
      return (
        entry.fieldLabel.toLowerCase().includes(q) ||
        entry.oldValue.toLowerCase().includes(q) ||
        entry.newValue.toLowerCase().includes(q) ||
        entry.key.toLowerCase().includes(q)
      );
    });
  }, [auditLog, searchQuery, sourceFilter]);

  const handleExportAuditCsv = () => {
    try {
      const csv = buildAuditLogCsvContent(filteredEntries);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `journal_audit_hypotheses_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      notify(
        'success',
        `Journal d’audit (${filteredEntries.length} modification(s)) exporté en CSV.`
      );
    } catch {
      notify('error', 'Impossible d’exporter le journal d’audit en CSV.');
    }
  };

  const getSourceBadgeClass = (source: AuditLogEntry['source']) => {
    switch (source) {
      case 'Simulateur':
        return 'border-indigo-500/35 bg-indigo-500/10 text-indigo-800 dark:text-indigo-300';
      case 'Scénario':
        return 'border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300';
      default:
        return 'border-teal-500/35 bg-teal-500/10 text-teal-800 dark:text-teal-300';
    }
  };

  return (
    <>
      <section
        aria-label="Journal d'Audit des modifications financières"
        className="rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
              <History
                className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0"
                aria-hidden="true"
              />
              <span>
                Journal d’Audit des Hypothèses ({auditLog.length})
              </span>
            </h2>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Traçabilité horodatée de toutes les modifications d’hypothèses pour{' '}
              <strong className="text-zinc-800 dark:text-zinc-200">{activeProject.name}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportAuditCsv}
              className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
              <span>Exporter CSV</span>
            </button>
            {auditLog.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="min-h-9 px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:border-rose-500/45 hover:text-rose-600 dark:hover:text-rose-400 text-xs font-semibold text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Effacer le journal</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Source Filters */}
        <div className="px-5 py-3 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/60 dark:bg-[#141322]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search
              className="w-3.5 h-3.5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filtrer par libellé ou valeur..."
              aria-label="Rechercher dans le journal d'audit"
              className="w-full min-h-9 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#0D0C18] text-xs text-zinc-900 dark:text-zinc-100"
            />
          </div>

          <div
            role="group"
            aria-label="Filtrer par source de modification"
            className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#0D0C18]"
          >
            {(
              [
                { id: 'all', label: 'Toutes' },
                { id: 'Formulaire', label: 'Formulaire' },
                { id: 'Simulateur', label: 'Simulateur' },
                { id: 'Scénario', label: 'Scénario' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSourceFilter(f.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                  sourceFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Entries Table / Mobile List */}
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            {auditLog.length === 0
              ? 'Aucune modification d’hypothèse enregistrée pour ce projet. Toute saisie dans Hypothèses ou Simulateur Rapide apparaîtra ici avec son horodatage.'
              : 'Aucune entrée ne correspond aux critères de recherche sélectionnés.'}
          </div>
        ) : (
          <>
            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-zinc-100 dark:divide-white/[0.06]">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="p-4 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${getSourceBadgeClass(
                        entry.source
                      )}`}
                    >
                      {entry.source}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
                      {new Date(entry.timestamp).toLocaleString('fr-FR', {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {entry.fieldLabel}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs font-mono tabular-nums flex-wrap">
                    <span className="text-zinc-500 dark:text-zinc-400 line-through">
                      {entry.oldValue}
                    </span>
                    <ArrowRight className="w-3 h-3 text-zinc-400 shrink-0" aria-hidden="true" />
                    <span className="font-bold text-teal-700 dark:text-teal-300">
                      {entry.newValue}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto max-h-[440px] overflow-y-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="sticky top-0 bg-zinc-100/95 dark:bg-[#171627] backdrop-blur-xs border-b border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Horodatage</th>
                    <th className="py-2.5 px-4 font-semibold">Origine</th>
                    <th className="py-2.5 px-4 font-semibold">Hypothèse modifiée</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Valeur avant</th>
                    <th className="py-2.5 px-4 text-right font-semibold">Valeur après</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-2.5 px-4 font-mono tabular-nums text-zinc-600 dark:text-zinc-400 whitespace-nowrap">
                        {new Date(entry.timestamp).toLocaleString('fr-FR', {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </td>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getSourceBadgeClass(
                            entry.source
                          )}`}
                        >
                          {entry.source}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-medium text-zinc-900 dark:text-zinc-100">
                        <div>{entry.fieldLabel}</div>
                        <div className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                          {entry.key}
                        </div>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {entry.oldValue}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono tabular-nums font-bold text-teal-700 dark:text-teal-300 whitespace-nowrap">
                        {entry.newValue}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        onConfirm={() => {
          clearAuditLog();
          notify('info', 'Journal d’audit réinitialisé.');
        }}
        title="Effacer le journal d’audit ?"
        message="L’historique horodaté des modifications d’hypothèses pour le projet actif sera supprimé localement."
        confirmLabel="Effacer le journal"
        variant="danger"
      />
    </>
  );
};
