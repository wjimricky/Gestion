import React, { useState } from 'react';
import { runTests } from '../../engine/calculator.test';
import { ViewToggle } from '../ui/ViewToggle';
import { BookOpen, CheckCircle2, Play, Code, FileText, Check, AlertCircle } from 'lucide-react';

const FORMULA_ROWS = [
  {
    sheet: 'Dashboard',
    indicator: 'Sacs par rotation',
    formula: '=ROUNDUP(C20/H4,0)',
    desc: 'Arrondi supérieur du paddy acheté divisé par la contenance du sac (ex : 17 200 kg / 60 kg = 287 sacs).',
  },
  {
    sheet: 'Dashboard',
    indicator: 'Coûts par rotation',
    formula: '=C20*C10+C17',
    desc: 'Paddy acheté × total coûts au kg + carburant + frais admin + sacs.',
  },
  {
    sheet: 'Dashboard',
    indicator: 'Impôt IR',
    formula: '=MAX(0,K18)*I21',
    desc: 'Impôt sur les sociétés appliqué uniquement si le bénéfice avant IR est positif.',
  },
  {
    sheet: 'Dashboard',
    indicator: 'Fonds à lever (I₀)',
    formula: '=ROUND(I32+I33,-3)',
    desc: 'Somme du BFR (1 rotation HS) + matériel + enregistrement + buffer de trésorerie, arrondie aux milliers.',
  },
  {
    sheet: 'Break-Even',
    indicator: 'Seuil de rentabilité CA',
    formula: '=D6/D7',
    desc: 'Charges fixes annuelles divisées par le taux de marge brute.',
  },
  {
    sheet: 'Break-Even',
    indicator: 'Marge de sécurité',
    formula: '=1-D13',
    desc: '1 − (Volume break-even / Volume prévu) : baisse de volume tolérée avant déficit.',
  },
  {
    sheet: 'Payback Period',
    indicator: 'Délai saisonnier',
    formula: '=(B15-1)+(-F14)/E15',
    desc: 'Interpolation intra-mensuelle au mois de croisement où le cumul passe positif.',
  },
  {
    sheet: 'VAN',
    indicator: 'Valeur Actuelle Nette',
    formula: '=NPV(D10,C15:C17)+C14',
    desc: 'Somme des flux nets après IR actualisés moins l’investissement initial I₀.',
  },
  {
    sheet: 'TRI',
    indicator: 'Taux Rentabilité Interne',
    formula: '=IRR(C6:C9,0.5)',
    desc: 'Taux r annulant la VAN. Réplication exacte via algorithme de recherche numérique.',
  },
];

export const MethodologyTab: React.FC = () => {
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');
  const [testResults, setTestResults] = useState<{
    ran: boolean;
    success: boolean;
    results: { name: string; passed: boolean; message: string }[];
  }>({
    ran: false,
    success: false,
    results: [],
  });

  const handleRunTests = () => {
    const outcome = runTests();
    setTestResults({
      ran: true,
      success: outcome.success,
      results: outcome.results,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
            <span>Méthodologie, Formules & Inventaire du Modèle</span>
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 mt-0.5">
            Documentation de la logique métier extraite du fichier Excel « Dashboard_v6.xlsx » et validation unitaire.
          </p>
        </div>
        <button
          type="button"
          onClick={handleRunTests}
          className="min-h-12 sm:min-h-10 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-700 hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-500 rounded-lg transition-colors inline-flex items-center justify-center gap-2 shadow-xs shrink-0"
        >
          <Play className="w-4 h-4" aria-hidden="true" />
          <span>Lancer les Tests Unitaires (34 tests)</span>
        </button>
      </div>

      {/* Live Test Suite Results Banner */}
      {testResults.ran && (
        <div
          role="status"
          aria-live="polite"
          className={`p-4 rounded-xl border text-xs ${
            testResults.success
              ? 'bg-emerald-500/10 border-emerald-600/35 text-emerald-900 dark:text-emerald-200'
              : 'bg-red-500/10 border-red-600/35 text-red-900 dark:text-red-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 font-bold text-sm mb-2">
            <span className="flex items-center gap-2">
              {testResults.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-700 dark:text-red-400" aria-hidden="true" />
              )}
              <span>
                {testResults.success
                  ? `${testResults.results.length} / ${testResults.results.length} Tests Réussis — Conforme aux Résultats Excel`
                  : 'Échec de certains tests'}
              </span>
            </span>
            <span className="font-mono text-xs">Tolérance : &lt; 1 Ar</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 font-mono text-xs max-h-56 overflow-y-auto pt-2 border-t border-emerald-500/20">
            {testResults.results.map((r, i) => (
              <div key={i} className="flex items-center gap-1.5 py-0.5 truncate">
                <span className={r.passed ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400'}>
                  {r.passed ? '✓' : '✗'}
                </span>
                <span className="truncate">{r.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Architecture */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-4">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Code className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <span>1. Architecture Logicielle & Pureté du Moteur de Calcul</span>
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Couche Données (Assumptions)
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
              Structure typée <code className="font-mono">FinancialAssumptions</code> contenant les entrées brutes : cadences, rendements, prix, barèmes de sacs et charges fixes.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Moteur de Calcul (Pure Functions)
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
              Module indépendant <code className="font-mono">calculator.ts</code> sans effet de bord, testable unitairement et réutilisable côté client ou export Excel.
            </p>
          </div>
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/40">
            <div className="font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Composants Présentationnels
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 font-sans leading-relaxed">
              Composants React accessibles sans logique métier embarquée, exploitant les résultats mémoïsés et validés en temps réel.
            </p>
          </div>
        </div>
      </section>

      {/* Inventory of Formulas */}
      <section className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
              <span>2. Inventaire Détaillé des Formules Excel Répliquées</span>
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">8 modules modélisés</span>
          </div>
          <ViewToggle mode={mobileView} onChange={setMobileView} />
        </div>

        {/* Mobile Cards */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-zinc-800">
            {FORMULA_ROWS.map((row, idx) => (
              <div key={idx} className="p-4 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {row.sheet} · {row.indicator}
                  </span>
                </div>
                <div className="font-mono text-xs text-emerald-700 dark:text-emerald-400">
                  {row.formula}
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {row.desc}
                </p>
              </div>
            ))}
          </div>
        )}

        <div className={`${mobileView === 'cards' ? 'hidden sm:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-3 px-4 font-semibold">Feuille Excel</th>
                <th className="py-3 px-4 font-semibold">Indicateur</th>
                <th className="py-3 px-4 font-mono font-semibold">Formule Excel originale</th>
                <th className="py-3 px-4 font-sans font-semibold">Explication & Logique Métier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-mono text-xs">
              {FORMULA_ROWS.map((row, idx) => (
                <tr key={idx}>
                  <td className="py-2.5 px-4 font-sans font-bold text-zinc-900 dark:text-zinc-100">
                    {row.sheet}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                    {row.indicator}
                  </td>
                  <td className="py-2.5 px-4 text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
                    {row.formula}
                  </td>
                  <td className="py-2.5 px-4 font-sans text-zinc-600 dark:text-zinc-400">
                    {row.desc}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Enhancements */}
      <section className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          3. Écarts Éventuels & Améliorations par Rapport au Fichier Excel
        </h2>
        <div className="space-y-2.5 text-xs sm:text-sm font-sans text-zinc-700 dark:text-zinc-300">
          {[
            {
              title: 'Aucun écart numérique :',
              body: 'Tous les calculs de revenus, coûts, marge brute, charges fixes, impôt, seuil de rentabilité, VAN et TRI reproduisent exactement les résultats d’Excel.',
            },
            {
              title: 'Gestion dynamique des lignes :',
              body: 'Ajout, modification et suppression sécurisée des postes de coûts par kg, par rotation, formats de sacs ou charges fixes sans risque de casser les formules.',
            },
            {
              title: 'Persistance & Multi-Scénarios :',
              body: 'Sauvegarde locale de multiples scénarios personnalisés (renommage, duplication, suppression) avec persistance dans localStorage.',
            },
            {
              title: 'Exports Complets :',
              body: 'Génération réelle de classeurs Excel multi-feuilles (.xlsx), export/import JSON et impression PDF structurée.',
            },
          ].map((item, idx) => (
            <div key={idx} className="flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
              <p>
                <strong>{item.title}</strong> {item.body}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
