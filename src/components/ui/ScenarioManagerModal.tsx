import React, { useState } from 'react';
import { useFinancial, SavedScenarioItem } from '../../context/FinancialContext';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import { Check, Copy, Edit3, Plus, Trash2, FolderOpen } from 'lucide-react';

interface ScenarioManagerModalProps {
  open: boolean;
  onClose: () => void;
  initialView?: 'list' | 'create';
}

export const ScenarioManagerModal: React.FC<ScenarioManagerModalProps> = ({
  open,
  onClose,
  initialView = 'list',
}) => {
  const {
    savedScenarios,
    activeScenarioId,
    saveScenario,
    loadScenario,
    duplicateScenario,
    deleteScenario,
    renameScenario,
  } = useFinancial();

  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(initialView === 'create');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<SavedScenarioItem | null>(null);
  const createInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (open) {
      setShowCreateForm(initialView === 'create');
      setEditingId(null);
      if (initialView === 'create') {
        window.setTimeout(() => {
          createInputRef.current?.focus();
        }, 40);
      }
    }
  }, [open, initialView]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    saveScenario(newName, newDesc);
    setNewName('');
    setNewDesc('');
    setShowCreateForm(false);
  };

  const startEdit = (sc: SavedScenarioItem) => {
    setEditingId(sc.id);
    setEditName(sc.name);
    setEditDesc(sc.description);
  };

  const handleSaveEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return;
    renameScenario(id, editName, editDesc);
    setEditingId(null);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Gestion des scénarios sauvegardés"
        description="Chargez, enregistrez, renommez, dupliquez ou supprimez vos jeux d’hypothèses."
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-5">
          {/* Save Current State Section */}
          {showCreateForm ? (
            <form
              onSubmit={handleCreate}
              className="p-4 rounded-xl border border-emerald-600/30 bg-emerald-500/5 space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Enregistrer l’état actuel comme nouveau scénario
                </h3>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:underline px-2 py-1"
                >
                  Fermer
                </button>
              </div>
              <div>
                <label
                  htmlFor="new-scenario-name"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Nom du scénario
                </label>
                <input
                  ref={createInputRef}
                  id="new-scenario-name"
                  type="text"
                  required
                  placeholder="Ex : Récolte record 2026, Prix paddy en hausse..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full min-h-12 sm:min-h-10 px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div>
                <label
                  htmlFor="new-scenario-desc"
                  className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                >
                  Description / Remarque (optionnel)
                </label>
                <textarea
                  id="new-scenario-desc"
                  rows={2}
                  placeholder="Ex : Test avec 3 rotations par mois et prix de vente majoré..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="submit"
                  className="min-h-12 sm:min-h-10 px-4 py-2 text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors"
                >
                  Enregistrer le scénario
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowCreateForm(true)}
              className="w-full min-h-12 px-4 py-3 rounded-xl border border-dashed border-emerald-600/50 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Sauvegarder les hypothèses courantes dans un nouveau scénario</span>
            </button>
          )}

          {/* List of Saved Scenarios */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Scénarios enregistrés ({savedScenarios.length})
            </div>

            {savedScenarios.map((sc) => {
              const isActive = sc.id === activeScenarioId;
              const isEditing = editingId === sc.id;

              return (
                <div
                  key={sc.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'border-emerald-600/60 bg-emerald-500/10'
                      : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/50'
                  }`}
                >
                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveEdit(e, sc.id)} className="space-y-2.5">
                      <div>
                        <label
                          htmlFor={`edit-name-${sc.id}`}
                          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                        >
                          Nouveau nom
                        </label>
                        <input
                          id={`edit-name-${sc.id}`}
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full min-h-11 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor={`edit-desc-${sc.id}`}
                          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                        >
                          Description
                        </label>
                        <input
                          id={`edit-desc-${sc.id}`}
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full min-h-11 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="min-h-11 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="min-h-11 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-700 text-white hover:bg-emerald-600"
                        >
                          Valider
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {sc.name}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-700 text-white dark:bg-emerald-500/20 dark:text-emerald-300">
                              <Check className="w-3 h-3" />
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                          {sc.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              loadScenario(sc.id);
                              onClose();
                            }}
                            className="min-h-11 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
                          >
                            <FolderOpen className="w-3.5 h-3.5" />
                            <span>Charger</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => startEdit(sc)}
                          title="Renommer ce scénario"
                          aria-label={`Renommer ${sc.name}`}
                          className="min-h-11 min-w-11 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 inline-flex items-center justify-center transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => duplicateScenario(sc.id)}
                          title="Dupliquer ce scénario"
                          aria-label={`Dupliquer ${sc.name}`}
                          className="min-h-11 min-w-11 px-2.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 inline-flex items-center justify-center transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        {savedScenarios.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(sc)}
                            title="Supprimer ce scénario"
                            aria-label={`Supprimer ${sc.name}`}
                            className="min-h-11 min-w-11 px-2.5 rounded-lg border border-red-300 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-500/10 inline-flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteScenario(deleteTarget.id);
        }}
        title="Supprimer ce scénario ?"
        message={`Le scénario « ${deleteTarget?.name || ''} » sera définitivement supprimé de votre navigateur.`}
        confirmLabel="Supprimer"
      />
    </>
  );
};
