import React, { useMemo, useRef, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { Modal } from './Modal';
import { SelectMenu } from './SelectMenu';
import {
  analyzeExcelFile,
  buildAssumptionsFromMappings,
  DATA_TYPE_LABELS,
  MAPPING_TARGET_OPTIONS,
  SheetColumnSelection,
  validateExcelFile,
} from '../../utils/excelImport';
import { calculateFullModel } from '../../engine/calculator';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';
import { AnalyzedWorkbook, MappingTargetField } from '../../types/project';
import {
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Check,
  FolderPlus,
} from 'lucide-react';

type ImportStep = 'upload' | 'analyzing' | 'preview' | 'confirm' | 'done';

interface ExcelImportModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated?: () => void;
}

export const ExcelImportModal: React.FC<ExcelImportModalProps> = ({
  open,
  onClose,
  onProjectCreated,
}) => {
  const { isProjectNameTaken, createExcelProject } = useFinancial();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ImportStep>('upload');
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [workbook, setWorkbook] = useState<AnalyzedWorkbook | null>(null);
  const [selectedSheets, setSelectedSheets] = useState<string[]>([]);
  const [activePreviewSheet, setActivePreviewSheet] = useState<string>('');
  const [columnConfigs, setColumnConfigs] = useState<Record<string, SheetColumnSelection[]>>({});
  const [projectName, setProjectName] = useState('');
  const [projectDesc, setProjectDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdProjectName, setCreatedProjectName] = useState('');

  const resetWizard = () => {
    setStep('upload');
    setIsDragging(false);
    setErrorMsg(null);
    setWorkbook(null);
    setSelectedSheets([]);
    setActivePreviewSheet('');
    setColumnConfigs({});
    setProjectName('');
    setProjectDesc('');
    setIsCreating(false);
    setCreatedProjectName('');
  };

  const handleClose = () => {
    resetWizard();
    onClose();
  };

  const suggestUniqueProjectName = (fileName: string) => {
    const base = fileName.replace(/\.(xlsx|xls|csv)$/i, '').replace(/[_-]+/g, ' ').trim() || 'Projet Excel';
    if (!isProjectNameTaken(base)) return base;
    let counter = 2;
    while (isProjectNameTaken(`${base} (${counter})`)) {
      counter++;
    }
    return `${base} (${counter})`;
  };

  const processFile = async (file: File) => {
    const preValidation = validateExcelFile(file);
    if (preValidation) {
      setErrorMsg(preValidation);
      setStep('upload');
      return;
    }

    setErrorMsg(null);
    setStep('analyzing');

    try {
      // Brief frame delay so the analyzing loader renders smoothly even on fast local files
      await new Promise((r) => window.setTimeout(r, 180));
      const analyzed = await analyzeExcelFile(file);

      const validSheets = analyzed.sheets.filter((s) => !s.isEmpty && s.dataRowCount > 0);
      const initialSelected = validSheets.map((s) => s.sheetName);

      const initialConfigs: Record<string, SheetColumnSelection[]> = {};
      analyzed.sheets.forEach((s) => {
        initialConfigs[s.sheetName] = s.columns.map((c) => ({
          index: c.index,
          renamedHeader: c.renamedHeader,
          targetField: c.suggestedTarget,
        }));
      });

      setWorkbook(analyzed);
      setSelectedSheets(initialSelected);
      setActivePreviewSheet(initialSelected[0] || analyzed.sheets[0]?.sheetName || '');
      setColumnConfigs(initialConfigs);
      setProjectName(suggestUniqueProjectName(analyzed.fileName));
      setProjectDesc(`Données importées depuis ${analyzed.fileName}`);
      setStep('preview');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Erreur inattendue lors de l’analyse du fichier Excel.'
      );
      setStep('upload');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processFile(file);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void processFile(file);
    }
  };

  const toggleSheetSelection = (sheetName: string) => {
    setSelectedSheets((prev) => {
      const next = prev.includes(sheetName)
        ? prev.filter((s) => s !== sheetName)
        : [...prev, sheetName];
      if (!next.includes(activePreviewSheet) && next.length > 0) {
        setActivePreviewSheet(next[0]);
      }
      return next;
    });
  };

  const updateColumnConfig = (
    sheetName: string,
    colIndex: number,
    patch: Partial<SheetColumnSelection>
  ) => {
    setColumnConfigs((prev) => ({
      ...prev,
      [sheetName]: (prev[sheetName] || []).map((col) =>
        col.index === colIndex ? { ...col, ...patch } : col
      ),
    }));
  };

  const currentSheetObj = useMemo(
    () => workbook?.sheets.find((s) => s.sheetName === activePreviewSheet) || null,
    [workbook, activePreviewSheet]
  );

  const builtResult = useMemo(() => {
    if (!workbook || selectedSheets.length === 0) return null;
    return buildAssumptionsFromMappings(workbook, selectedSheets, columnConfigs);
  }, [workbook, selectedSheets, columnConfigs]);

  const previewModel = useMemo(() => {
    if (!builtResult) return null;
    return calculateFullModel(builtResult.assumptions);
  }, [builtResult]);

  const duplicateNameError = useMemo(() => {
    const trimmed = projectName.trim();
    if (!trimmed) return 'Veuillez saisir un nom de projet.';
    if (isProjectNameTaken(trimmed)) {
      return `Un projet nommé « ${trimmed} » existe déjà. Choisissez un nom unique.`;
    }
    return null;
  }, [projectName, isProjectNameTaken]);

  const canProceedToConfirm =
    Boolean(workbook) && selectedSheets.length > 0 && !duplicateNameError && Boolean(builtResult);

  const handleConfirmImport = async () => {
    if (!workbook || !builtResult || duplicateNameError || selectedSheets.length === 0) {
      return;
    }
    setIsCreating(true);
    setErrorMsg(null);
    await new Promise((r) => window.setTimeout(r, 150));

    const result = createExcelProject({
      name: projectName,
      description: projectDesc,
      assumptions: builtResult.assumptions,
      excelMeta: {
        fileName: workbook.fileName,
        fileSizeBytes: workbook.fileSizeBytes,
        importedAt: new Date().toISOString(),
        selectedSheets,
        mappedFieldsSummary: builtResult.mappedFieldsSummary,
        sheetSnapshots: builtResult.snapshots,
        warnings: [...workbook.warnings, ...builtResult.warnings],
      },
    });

    setIsCreating(false);
    if (!result.ok) {
      setErrorMsg(result.error || 'Échec de la création du projet.');
      return;
    }

    setCreatedProjectName(result.project?.name || projectName.trim());
    setStep('done');
  };

  const stepLabels: Array<{ id: ImportStep; num: number; label: string }> = [
    { id: 'upload', num: 1, label: 'Fichier' },
    { id: 'analyzing', num: 2, label: 'Analyse' },
    { id: 'preview', num: 3, label: 'Aperçu & Mapping' },
    { id: 'confirm', num: 4, label: 'Confirmation' },
    { id: 'done', num: 5, label: 'Créé' },
  ];
  const currentStepIdx = stepLabels.findIndex((s) => s.id === step);

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Importer un projet Excel"
      description="Chargez un fichier .xlsx, .xls ou .csv, vérifiez le mapping des colonnes et créez un nouveau projet autonome."
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-5">
        {/* Stepper Bar */}
        <nav aria-label="Étapes de l’importation Excel" className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {stepLabels.map((s, idx) => {
            const isCompleted = idx < currentStepIdx || step === 'done';
            const isActive = idx === currentStepIdx;
            return (
              <div
                key={s.id}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium shrink-0 transition-colors ${
                  isActive
                    ? 'border-indigo-500/50 bg-indigo-500/12 text-indigo-800 dark:text-indigo-200 font-semibold'
                    : isCompleted
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                    : 'border-zinc-200 dark:border-white/[0.08] text-zinc-500 dark:text-zinc-400'
                }`}
              >
                <span className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-mono font-bold bg-white/70 dark:bg-black/30">
                  {isCompleted && !isActive ? <Check className="w-3 h-3" /> : s.num}
                </span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </nav>

        {/* Global Error Banner */}
        {errorMsg && (
          <div
            role="alert"
            className="p-3.5 rounded-xl border border-rose-500/45 bg-rose-500/10 text-xs text-rose-900 dark:text-rose-200 flex items-start gap-2.5"
          >
            <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-semibold">Impossible de poursuivre l’importation</div>
              <div className="mt-0.5">{errorMsg}</div>
            </div>
          </div>
        )}

        {/* STEP 1: UPLOAD */}
        {step === 'upload' && (
          <div className="space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`p-8 rounded-2xl border-2 border-dashed text-center transition-colors ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-zinc-300 dark:border-white/[0.15] bg-zinc-50/70 dark:bg-white/[0.02] hover:border-indigo-400/60'
              }`}
            >
              <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-500/12 border border-indigo-500/25 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3">
                <Upload className="w-6 h-6" aria-hidden="true" />
              </div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
                Glissez-déposez votre fichier Excel ou CSV ici
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Formats acceptés : <strong className="font-mono">.xlsx</strong>,{' '}
                <strong className="font-mono">.xls</strong>, <strong className="font-mono">.csv</strong> (max 10 Mo).
                Compatible avec vos classeurs exportés ou vos tableaux personnalisés.
              </p>

              <div className="mt-5 flex justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-11 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
                  <span>Choisir un fichier</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-zinc-600 dark:text-zinc-400">
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02]">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">1. Détection auto</div>
                <p className="mt-1">Repère automatiquement feuilles, en-têtes, types numériques et saisons HS/BS.</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02]">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">2. Mapping modifiable</div>
                <p className="mt-1">Renommez vos champs et ajustez les correspondances avant création.</p>
              </div>
              <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/60 dark:bg-white/[0.02]">
                <div className="font-semibold text-zinc-900 dark:text-zinc-100">3. Projet isolé</div>
                <p className="mt-1">Enregistré séparément du projet par défaut avec ses propres scénarios.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ANALYZING */}
        {step === 'analyzing' && (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" aria-hidden="true" />
            <div className="text-sm font-semibold text-zinc-900 dark:text-white">
              Analyse du classeur en cours...
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm">
              Lecture des feuilles, détection des en-têtes, typage des colonnes et calcul des correspondances financières.
            </p>
          </div>
        )}

        {/* STEP 3: PREVIEW & MAP */}
        {step === 'preview' && workbook && (
          <div className="space-y-5">
            {/* Project Naming + File Metadata */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-800 dark:text-zinc-200">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                  <span>{workbook.fileName}</span>
                  <span className="font-mono text-zinc-500">
                    ({(workbook.fileSizeBytes / 1024).toFixed(1)} Ko · {workbook.sheets.length} feuille(s))
                  </span>
                </span>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline"
                >
                  Changer de fichier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="excel-project-name"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Nom du nouveau projet <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="excel-project-name"
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ex : Coopérative Alaotra 2026"
                    className={`w-full min-h-10 px-3 py-1.5 text-sm rounded-xl border bg-white dark:bg-[#141323] text-zinc-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                      duplicateNameError
                        ? 'border-rose-500/70'
                        : 'border-zinc-300 dark:border-white/[0.12]'
                    }`}
                  />
                  {duplicateNameError && (
                    <p className="text-[11px] text-rose-600 dark:text-rose-400 mt-1">
                      {duplicateNameError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="excel-project-desc"
                    className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1"
                  >
                    Description (optionnel)
                  </label>
                  <input
                    id="excel-project-desc"
                    type="text"
                    value={projectDesc}
                    onChange={(e) => setProjectDesc(e.target.value)}
                    placeholder="Notes sur l’origine du fichier..."
                    className="w-full min-h-10 px-3 py-1.5 text-sm rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] text-zinc-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Workbook Warnings */}
            {workbook.warnings.length > 0 && (
              <div className="p-3 rounded-xl border border-amber-500/40 bg-amber-500/10 text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                <ul className="space-y-0.5">
                  {workbook.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Sheet Selection */}
            <div className="space-y-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                1. Feuilles à importer ({selectedSheets.length} sélectionnée(s))
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {workbook.sheets.map((sheet) => {
                  const isDisabled = sheet.isEmpty || sheet.dataRowCount === 0;
                  const isChecked = selectedSheets.includes(sheet.sheetName);
                  return (
                    <label
                      key={sheet.sheetName}
                      className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition-colors ${
                        isDisabled
                          ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-white/[0.06] bg-zinc-100/50 dark:bg-white/[0.01]'
                          : isChecked
                          ? 'cursor-pointer border-indigo-500/45 bg-indigo-500/[0.07]'
                          : 'cursor-pointer border-zinc-200 dark:border-white/[0.08] hover:bg-zinc-50 dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        disabled={isDisabled}
                        checked={isChecked}
                        onChange={() => toggleSheetSelection(sheet.sheetName)}
                        className="mt-0.5 w-4 h-4 accent-indigo-600 rounded"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-zinc-900 dark:text-white truncate">
                          {sheet.sheetName}
                        </div>
                        <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          {isDisabled
                            ? 'Feuille vide (non importable)'
                            : `${sheet.dataRowCount} ligne(s) · ${sheet.columns.length} col.`}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Active Sheet Mapping Editor */}
            {selectedSheets.length > 0 && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-xs font-semibold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                    2. Mapping &amp; renommage des colonnes
                  </div>
                  {selectedSheets.length > 1 && (
                    <div className="flex flex-wrap gap-1.5">
                      {selectedSheets.map((sName) => (
                        <button
                          key={sName}
                          type="button"
                          onClick={() => setActivePreviewSheet(sName)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors ${
                            activePreviewSheet === sName
                              ? 'border-indigo-500/50 bg-indigo-600 text-white'
                              : 'border-zinc-200 dark:border-white/[0.1] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          {sName}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {currentSheetObj && (
                  <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-visible">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left border-collapse">
                        <thead>
                          <tr className="bg-zinc-100/80 dark:bg-white/[0.04] text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-white/[0.08]">
                            <th className="py-2.5 px-3 font-semibold">En-tête détecté</th>
                            <th className="py-2.5 px-3 font-semibold">Renommer le champ</th>
                            <th className="py-2.5 px-3 font-semibold">Type &amp; Qualité</th>
                            <th className="py-2.5 px-3 font-semibold">Exemples</th>
                            <th className="py-2.5 px-3 font-semibold min-w-[210px]">
                              Champ cible (Modèle)
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
                          {currentSheetObj.columns.map((col) => {
                            const cfg = (columnConfigs[currentSheetObj.sheetName] || []).find(
                              (c) => c.index === col.index
                            );
                            const renamed = cfg?.renamedHeader ?? col.renamedHeader;
                            const target = cfg?.targetField ?? col.suggestedTarget;
                            return (
                              <tr key={col.index} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                                <td className="py-2 px-3 font-mono font-medium text-zinc-800 dark:text-zinc-200">
                                  {col.originalHeader}
                                </td>
                                <td className="py-2 px-3">
                                  <input
                                    type="text"
                                    aria-label={`Renommer ${col.originalHeader}`}
                                    value={renamed}
                                    onChange={(e) =>
                                      updateColumnConfig(currentSheetObj.sheetName, col.index, {
                                        renamedHeader: e.target.value,
                                      })
                                    }
                                    className="w-full min-h-9 px-2.5 py-1 text-xs rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141323] text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
                                  />
                                </td>
                                <td className="py-2 px-3">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <span className="px-2 py-0.5 rounded-md bg-zinc-100 dark:bg-white/[0.07] font-mono text-[11px] text-zinc-700 dark:text-zinc-300">
                                      {DATA_TYPE_LABELS[col.detectedType]}
                                    </span>
                                    {(col.emptyCount > 0 || col.invalidCount > 0) && (
                                      <span className="text-[11px] text-amber-700 dark:text-amber-400 font-mono">
                                        {col.emptyCount > 0 ? `${col.emptyCount} vide(s)` : ''}
                                        {col.invalidCount > 0 ? ` ${col.invalidCount} inv.` : ''}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 dark:text-zinc-400 max-w-[160px] truncate">
                                  {col.sampleValues.length > 0 ? col.sampleValues.join(' · ') : '—'}
                                </td>
                                <td className="py-2 px-3">
                                  <SelectMenu
                                    size="sm"
                                    value={target}
                                    onChange={(val) =>
                                      updateColumnConfig(currentSheetObj.sheetName, col.index, {
                                        targetField: val as MappingTargetField,
                                      })
                                    }
                                    options={MAPPING_TARGET_OPTIONS}
                                    ariaLabel={`Champ cible pour ${col.originalHeader}`}
                                    align="right"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sample Rows Preview */}
                {currentSheetObj && currentSheetObj.previewRows.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Aperçu des données ({currentSheetObj.previewRows.length} premières lignes)
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
                      <table className="w-full text-[11px] text-left border-collapse font-mono">
                        <thead>
                          <tr className="bg-zinc-100/80 dark:bg-white/[0.04] border-b border-zinc-200 dark:border-white/[0.08]">
                            {currentSheetObj.columns.map((col) => {
                              const cfg = (columnConfigs[currentSheetObj.sheetName] || []).find(
                                (c) => c.index === col.index
                              );
                              return (
                                <th key={col.index} className="py-2 px-2.5 font-semibold whitespace-nowrap">
                                  {cfg?.renamedHeader || col.originalHeader}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
                          {currentSheetObj.previewRows.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx}>
                              {currentSheetObj.columns.map((col) => {
                                const val = row[col.originalHeader];
                                const isMissing = val === null || val === '';
                                return (
                                  <td
                                    key={col.index}
                                    className={`py-1.5 px-2.5 whitespace-nowrap ${
                                      isMissing
                                        ? 'text-amber-600/80 dark:text-amber-400/80 italic'
                                        : 'text-zinc-700 dark:text-zinc-300'
                                    }`}
                                  >
                                    {isMissing ? 'vide' : String(val)}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Live Financial Model Preview Strip */}
            {previewModel && builtResult && (
              <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-teal-900 dark:text-teal-200 inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" aria-hidden="true" />
                    <span>Simulation préliminaire avec les données mappées</span>
                  </span>
                  <span className="font-mono text-[11px] text-teal-800 dark:text-teal-300">
                    {builtResult.mappedFieldsSummary.length} paramètre(s) détecté(s)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono tabular-nums">
                  <div>
                    <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">CA Annuel (A1)</div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {formatAriary(previewModel.year1.totalTurnoverAr, { inMillions: true })}
                    </div>
                  </div>
                  <div>
                    <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">Résultat net IR</div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {formatAriary(previewModel.year1.netResultAfterTaxAr, { inMillions: true })} (
                      {formatPercent(previewModel.year1.netMarginAfterTaxRate)})
                    </div>
                  </div>
                  <div>
                    <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">VAN (3 ans)</div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {formatAriary(previewModel.npv.npvAr, { inMillions: true })}
                    </div>
                  </div>
                  <div>
                    <div className="font-sans text-[11px] text-zinc-600 dark:text-zinc-400">Payback</div>
                    <div className="font-bold text-zinc-900 dark:text-white">
                      {formatMonths(previewModel.payback.paybackMonths)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3 Footer Actions */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!canProceedToConfirm}
                onClick={() => setStep('confirm')}
                className="min-h-10 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <span>Continuer vers la confirmation</span>
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: CONFIRM */}
        {step === 'confirm' && workbook && builtResult && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-white/[0.02] space-y-3 text-xs">
              <div className="font-semibold text-sm text-zinc-900 dark:text-white">
                Récapitulatif avant création du projet
              </div>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Nom du projet</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-white mt-0.5">{projectName.trim()}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Fichier source</dt>
                  <dd className="font-mono text-zinc-900 dark:text-white mt-0.5">{workbook.fileName}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Feuilles importées</dt>
                  <dd className="font-medium text-zinc-900 dark:text-white mt-0.5">
                    {selectedSheets.join(', ')}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500 dark:text-zinc-400">Variables adaptées au modèle</dt>
                  <dd className="font-medium text-zinc-900 dark:text-white mt-0.5">
                    {builtResult.mappedFieldsSummary.length > 0
                      ? builtResult.mappedFieldsSummary.join(' · ')
                      : 'Valeurs par défaut complétées'}
                  </dd>
                </div>
              </dl>

              {builtResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-200">
                  {builtResult.warnings.map((w, i) => (
                    <div key={i}>• {w}</div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-200 dark:border-white/[0.08]">
              <button
                type="button"
                disabled={isCreating}
                onClick={() => setStep('preview')}
                className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] inline-flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Modifier le mapping</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={handleClose}
                  className="min-h-10 px-4 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isCreating}
                  onClick={() => void handleConfirmImport()}
                  className="min-h-10 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-2 transition-colors"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      <span>Création en cours...</span>
                    </>
                  ) : (
                    <>
                      <FolderPlus className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Confirmer et créer le projet</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: PROJECT CREATED */}
        {step === 'done' && (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Projet « {createdProjectName} » créé avec succès
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1 max-w-md mx-auto">
                Votre projet Excel est désormais actif et sauvegardé séparément. Tous les onglets d’analyse (Dashboard, Scénarios, Sensibilité, Payback, VAN/TRI) utilisent maintenant ses données.
              </p>
            </div>
            <div className="flex justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  handleClose();
                  onProjectCreated?.();
                }}
                className="min-h-10 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors"
              >
                <span>Ouvrir dans le Dashboard</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
