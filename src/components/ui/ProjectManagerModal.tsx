import React, { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { ProjectRecord } from '../../types/project';
import { Modal } from './Modal';
import { ConfirmDialog } from './ConfirmDialog';
import {
  Check,
  Copy,
  Edit3,
  FileSpreadsheet,
  FolderOpen,
  GitCompareArrows,
  Layers,
  Trash2,
  Upload,
} from 'lucide-react';

interface ProjectManagerModalProps {
  open: boolean;
  onClose: () => void;
  onOpenExcelImport: () => void;
  onOpenProjectComparator: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  open,
  onClose,
  onOpenExcelImport,
  onOpenProjectComparator,
}) => {
  const {
    projects,
    activeProjectId,
    switchProject,
    duplicateProject,
    renameProject,
    deleteProject,
  } = useFinancial();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);

  const startRename = (proj: ProjectRecord) => {
    setEditingId(proj.id);
    setEditName(proj.name);
    setEditDesc(proj.description);
    setRenameError(null);
  };

  const handleSaveRename = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    const res = renameProject(id, editName, editDesc);
    if (!res.ok) {
      setRenameError(res.error || 'Nom invalide');
      return;
    }
    setEditingId(null);
    setRenameError(null);
  };

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title="Gestion des Projets"
        description="Basculez entre le projet de référence et vos classeurs Excel importés, renommez ou supprimez vos projets."
        maxWidthClass="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenExcelImport();
              }}
              className="w-full min-h-11 px-4 py-2.5 rounded-xl border border-dashed border-indigo-500/50 bg-indigo-500/[0.06] hover:bg-indigo-500/[0.12] text-indigo-800 dark:text-indigo-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Importer un projet Excel (.xlsx, .csv)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProjectComparator();
              }}
              className="w-full min-h-11 px-4 py-2.5 rounded-xl border border-teal-500/45 bg-teal-500/[0.08] hover:bg-teal-500/[0.15] text-teal-900 dark:text-teal-200 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-colors"
            >
              <GitCompareArrows className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Comparateur de Projets (VAN / TRI / CA)</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Projets disponibles ({projects.length})
            </div>

            {projects.map((proj) => {
              const isActive = proj.id === activeProjectId;
              const isEditing = editingId === proj.id;
              const isDefault = proj.source === 'default';

              return (
                <div
                  key={proj.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    isActive
                      ? 'border-indigo-500/55 bg-indigo-500/[0.08]'
                      : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02]'
                  }`}
                >
                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveRename(e, proj.id)} className="space-y-2.5">
                      <div>
                        <label
                          htmlFor={`rename-proj-${proj.id}`}
                          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                        >
                          Nouveau nom du projet
                        </label>
                        <input
                          id={`rename-proj-${proj.id}`}
                          type="text"
                          required
                          value={editName}
                          onChange={(e) => {
                            setEditName(e.target.value);
                            setRenameError(null);
                          }}
                          className="w-full min-h-10 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                        {renameError && (
                          <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                            {renameError}
                          </p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor={`rename-proj-desc-${proj.id}`}
                          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1"
                        >
                          Description
                        </label>
                        <input
                          id={`rename-proj-desc-${proj.id}`}
                          type="text"
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full min-h-10 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(null);
                            setRenameError(null);
                          }}
                          className="min-h-9 px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-300"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          className="min-h-9 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white"
                        >
                          Enregistrer
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {isDefault ? (
                            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
                          ) : (
                            <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
                          )}
                          <span className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                            {proj.name}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold border ${
                              isDefault
                                ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/25'
                                : proj.source === 'copy'
                                ? 'bg-amber-500/12 text-amber-800 dark:text-amber-300 border-amber-500/25'
                                : 'bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-500/25'
                            }`}
                          >
                            {isDefault ? 'Défaut' : proj.source === 'copy' ? 'Copie' : 'Excel'}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-600 text-white dark:bg-emerald-500/20 dark:text-emerald-300">
                              <Check className="w-3 h-3" aria-hidden="true" />
                              Actif
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
                          {proj.description}
                        </p>
                        {proj.excelMeta && (
                          <div className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1">
                            Fichier : {proj.excelMeta.fileName} · Feuilles :{' '}
                            {proj.excelMeta.selectedSheets.join(', ')}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              switchProject(proj.id);
                              onClose();
                            }}
                            className="min-h-10 px-3 py-1.5 rounded-xl text-xs font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 hover:opacity-90 inline-flex items-center gap-1.5 transition-opacity"
                          >
                            <FolderOpen className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Ouvrir</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => duplicateProject(proj.id)}
                          title="Dupliquer ce projet pour comparer une variante"
                          aria-label={`Dupliquer ${proj.name}`}
                          className="min-h-10 min-w-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-white/[0.06] inline-flex items-center justify-center transition-colors"
                        >
                          <Copy className="w-4 h-4" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => startRename(proj)}
                          title="Renommer ce projet"
                          aria-label={`Renommer ${proj.name}`}
                          className="min-h-10 min-w-10 px-2.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-white/[0.06] inline-flex items-center justify-center transition-colors"
                        >
                          <Edit3 className="w-4 h-4" aria-hidden="true" />
                        </button>
                        {!isDefault && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(proj)}
                            title="Supprimer ce projet importé"
                            aria-label={`Supprimer ${proj.name}`}
                            className="min-h-10 min-w-10 px-2.5 rounded-xl border border-rose-300 dark:border-rose-500/40 text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
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
          if (deleteTarget) deleteProject(deleteTarget.id);
        }}
        title="Supprimer ce projet importé ?"
        message={`Le projet « ${deleteTarget?.name || ''} » et ses données Excel importées seront définitivement supprimés.`}
        confirmLabel="Supprimer"
      />
    </>
  );
};
