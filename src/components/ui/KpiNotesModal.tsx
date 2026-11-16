import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  MessageSquareText,
  ListChecks,
  Trash2,
  Pencil,
  Check,
  X,
  User,
} from 'lucide-react';
import { Modal } from './Modal';
import { useFinancial } from '../../context/FinancialContext';
import { KpiNoteItem, KpiNoteTag } from '../../types/project';

const NOTE_TAG_META: Record<
  KpiNoteTag,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    textClass: string;
    bgClass: string;
  }
> = {
  observation: {
    label: 'Observation',
    icon: MessageSquareText,
    textClass: 'text-indigo-700 dark:text-indigo-300',
    bgClass: 'bg-indigo-500/10 border-indigo-500/30',
  },
  alerte: {
    label: 'Vigilance',
    icon: AlertTriangle,
    textClass: 'text-amber-800 dark:text-amber-300',
    bgClass: 'bg-amber-500/10 border-amber-500/30',
  },
  validation: {
    label: 'Validé',
    icon: CheckCircle2,
    textClass: 'text-teal-700 dark:text-teal-300',
    bgClass: 'bg-teal-500/10 border-teal-500/30',
  },
  action: {
    label: 'Action requise',
    icon: ListChecks,
    textClass: 'text-rose-700 dark:text-rose-300',
    bgClass: 'bg-rose-500/10 border-rose-500/30',
  },
};

const ANALYST_PRESETS = [
  'Analyste financier',
  'Direction financière',
  'Responsable collecte',
  'Auditeur externe',
];

interface KpiNotesModalProps {
  open: boolean;
  onClose: () => void;
  focusKpi: {
    kpiId: string;
    kpiLabel: string;
    kpiValueText?: string;
  } | null;
  initialMode?: 'compose' | 'list';
}

export const KpiNotesModal: React.FC<KpiNotesModalProps> = ({
  open,
  onClose,
  focusKpi,
  initialMode = 'compose',
}) => {
  const {
    kpiNotes,
    analystName,
    setAnalystName,
    addKpiNote,
    updateKpiNote,
    toggleKpiNoteResolved,
    deleteKpiNote,
  } = useFinancial();

  const [scope, setScope] = useState<'kpi' | 'all'>(focusKpi ? 'kpi' : 'all');
  const [filterTag, setFilterTag] = useState<'all' | KpiNoteTag>('all');
  const [showResolved, setShowResolved] = useState(true);
  const [authorInput, setAuthorInput] = useState(analystName);
  const [tagInput, setTagInput] = useState<KpiNoteTag>('observation');
  const [contentInput, setContentInput] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setScope(focusKpi ? 'kpi' : 'all');
    setAuthorInput(analystName);
    setEditingNoteId(null);
    setContentInput('');
    if (initialMode === 'compose' && focusKpi) {
      window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 45);
    }
  }, [open, focusKpi, initialMode, analystName]);

  const filteredNotes = useMemo(() => {
    return kpiNotes.filter((note) => {
      if (scope === 'kpi' && focusKpi && note.kpiId !== focusKpi.kpiId) {
        return false;
      }
      if (filterTag !== 'all' && note.tag !== filterTag) {
        return false;
      }
      if (!showResolved && note.resolved) {
        return false;
      }
      return true;
    });
  }, [kpiNotes, scope, focusKpi, filterTag, showResolved]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contentInput.trim()) return;
    const targetId = focusKpi?.kpiId || 'general_dashboard';
    const targetLabel = focusKpi?.kpiLabel || 'Synthèse générale du projet';
    addKpiNote({
      kpiId: targetId,
      kpiLabel: targetLabel,
      content: contentInput,
      tag: tagInput,
      author: authorInput,
    });
    setContentInput('');
  };

  const handleSaveEdit = (note: KpiNoteItem) => {
    if (!editingText.trim()) return;
    updateKpiNote(note.id, { content: editingText.trim() });
    setEditingNoteId(null);
    setEditingText('');
  };

  const kpiNoteCount = focusKpi
    ? kpiNotes.filter((n) => n.kpiId === focusKpi.kpiId).length
    : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      maxWidthClass="max-w-2xl"
      title={
        focusKpi && scope === 'kpi'
          ? `Notes d’analyse — ${focusKpi.kpiLabel}`
          : 'Notes collaboratives des analystes'
      }
      description={
        focusKpi && focusKpi.kpiValueText
          ? `Valeur actuelle : ${focusKpi.kpiValueText} · Commentaires enregistrés par projet`
          : 'Annotations contextuelles partagées sur les indicateurs clés du tableau de bord'
      }
    >
      <div className="space-y-5">
        {/* Scope & Filter Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
            {focusKpi && (
              <button
                type="button"
                onClick={() => setScope('kpi')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                  scope === 'kpi'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                Cet indicateur ({kpiNoteCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                scope === 'all'
                  ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Toutes les notes ({kpiNotes.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Filtrer par type de note"
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value as 'all' | KpiNoteTag)}
              className="min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-medium text-zinc-800 dark:text-zinc-200"
            >
              <option value="all">Tous les types</option>
              <option value="observation">Observation</option>
              <option value="alerte">Vigilance</option>
              <option value="validation">Validé</option>
              <option value="action">Action requise</option>
            </select>

            <label className="inline-flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showResolved}
                onChange={(e) => setShowResolved(e.target.checked)}
                className="rounded border-zinc-300 accent-indigo-600"
              />
              <span>Afficher résolues</span>
            </label>
          </div>
        </div>

        {/* New Note Form */}
        <form onSubmit={handleSubmit} className="space-y-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="kpi-note-author"
                className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
              >
                Signature analyste
              </label>
              <div className="relative flex items-center">
                <User className="w-3.5 h-3.5 text-zinc-400 absolute left-2.5 pointer-events-none" aria-hidden="true" />
                <input
                  id="kpi-note-author"
                  type="text"
                  list="analyst-presets-list"
                  value={authorInput}
                  onChange={(e) => {
                    setAuthorInput(e.target.value);
                    setAnalystName(e.target.value);
                  }}
                  placeholder="Nom ou rôle de l’analyste"
                  className="w-full min-h-9 pl-8 pr-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs text-zinc-900 dark:text-zinc-100"
                />
                <datalist id="analyst-presets-list">
                  {ANALYST_PRESETS.map((preset) => (
                    <option key={preset} value={preset} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                Qualification de la note
              </span>
              <div className="grid grid-cols-4 gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80">
                {(Object.keys(NOTE_TAG_META) as KpiNoteTag[]).map((tagKey) => {
                  const meta = NOTE_TAG_META[tagKey];
                  const active = tagInput === tagKey;
                  return (
                    <button
                      key={tagKey}
                      type="button"
                      onClick={() => setTagInput(tagKey)}
                      className={`px-1.5 py-1.5 rounded-md text-[11px] font-semibold transition-colors truncate ${
                        active
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="kpi-note-content"
              className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
            >
              Commentaire contextuel {focusKpi ? `pour « ${focusKpi.kpiLabel} »` : ''}
            </label>
            <textarea
              id="kpi-note-content"
              ref={textareaRef}
              rows={3}
              value={contentInput}
              onChange={(e) => setContentInput(e.target.value)}
              placeholder="Ex. Hypothèse de prix paddy HS vérifiée auprès de la coopérative d'Ambatondrazaka ; à revalider avant comité."
              className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Sauvegardé automatiquement dans le projet actif
            </span>
            <button
              type="submit"
              disabled={!contentInput.trim()}
              className="min-h-10 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed text-xs font-semibold text-white transition-colors"
            >
              Enregistrer la note
            </button>
          </div>
        </form>

        {/* Notes Thread List */}
        {filteredNotes.length === 0 ? (
          <div className="py-8 text-center space-y-1.5">
            <MessageSquareText className="w-6 h-6 text-zinc-400 mx-auto" aria-hidden="true" />
            <div className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
              Aucune note pour cette sélection
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
              Ajoutez une observation, un point de vigilance ou une action à suivre ci-dessus pour documenter l’analyse entre collègues.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
            {filteredNotes.map((note) => {
              const meta = NOTE_TAG_META[note.tag] || NOTE_TAG_META.observation;
              const TagIcon = meta.icon;
              const isEditing = editingNoteId === note.id;
              const dateText = new Date(note.createdAt).toLocaleString('fr-FR', {
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <article
                  key={note.id}
                  className={`p-3.5 rounded-xl border transition-colors ${
                    note.resolved
                      ? 'border-zinc-200/70 dark:border-zinc-800/70 bg-zinc-50/70 dark:bg-zinc-900/40 opacity-75'
                      : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950/60'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${meta.bgClass} ${meta.textClass}`}
                      >
                        <TagIcon className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{meta.label}</span>
                      </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                        {note.author}
                      </span>
                      <span aria-hidden="true" className="text-zinc-400">
                        ·
                      </span>
                      <span className="font-mono tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                        {dateText}
                      </span>
                      {scope === 'all' && (
                        <>
                          <span aria-hidden="true" className="text-zinc-400">
                            ·
                          </span>
                          <span className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 truncate">
                            {note.kpiLabel}
                          </span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => toggleKpiNoteResolved(note.id)}
                        title={note.resolved ? 'Réouvrir cette note' : 'Marquer comme résolue'}
                        className={`min-h-8 px-2 py-1 rounded-md text-[11px] font-medium inline-flex items-center gap-1 transition-colors ${
                          note.resolved
                            ? 'text-teal-700 dark:text-teal-300 bg-teal-500/10 hover:bg-teal-500/15'
                            : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>{note.resolved ? 'Résolue' : 'Résoudre'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(note.id);
                          setEditingText(note.content);
                        }}
                        aria-label="Modifier la note"
                        className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteKpiNote(note.id)}
                        aria-label="Supprimer la note"
                        className="min-h-8 min-w-8 inline-flex items-center justify-center rounded-md text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="mt-2.5 space-y-2">
                      <textarea
                        rows={2}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-indigo-500/50 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100"
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="min-h-8 px-2.5 py-1 rounded-md border border-zinc-300 dark:border-zinc-700 text-xs text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                          <span>Annuler</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(note)}
                          className="min-h-8 px-2.5 py-1 rounded-md bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white inline-flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" aria-hidden="true" />
                          <span>Valider</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p
                      className={`mt-2 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                        note.resolved
                          ? 'line-through text-zinc-500 dark:text-zinc-400'
                          : 'text-zinc-800 dark:text-zinc-200'
                      }`}
                    >
                      {note.content}
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
};
