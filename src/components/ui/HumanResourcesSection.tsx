import React, { useMemo, useState } from 'react';
import {
  Users,
  CheckCircle2,
  SlidersHorizontal,
  Plus,
  Trash2,
  GraduationCap,
  Sprout,
  Factory,
  RotateCcw,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { HrPoleType, HrRoleItem } from '../../types/finance';
import {
  computeHrPlanningSummary,
  DEFAULT_HR_ASSUMPTIONS,
  getResolvedHrPlanning,
} from '../../utils/hrPlanning';
import { formatAriary } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

export const HumanResourcesSection: React.FC = () => {
  const { assumptions, unitDisplay, updateHumanResources, notify } = useFinancial();
  const inM = unitDisplay === 'millions';

  const hr = getResolvedHrPlanning(assumptions);
  const summary = useMemo(
    () => computeHrPlanningSummary(assumptions, hr),
    [assumptions, hr]
  );

  const [newLabel, setNewLabel] = useState('');
  const [newPole, setNewPole] = useState<HrPoleType>('rizieres');
  const [newHcHS, setNewHcHS] = useState('4');
  const [newHcBS, setNewHcBS] = useState('2');
  const [newSalary, setNewSalary] = useState('280000');
  const [newTraining, setNewTraining] = useState('50000');

  const handleToggleApply = () => {
    const next = !hr.applyToModel;
    updateHumanResources({ enabled: true, applyToModel: next });
    notify(
      'info',
      next
        ? 'Masse salariale saisonnière, CNaPS/OSTIE et formation répercutés dans les charges fixes mensuelles.'
        : 'Planification RH en mode simulation isolée (charges fixes nominales inchangées).'
    );
  };

  const handleUpdateRole = (id: string, patch: Partial<HrRoleItem>) => {
    updateHumanResources({
      roles: hr.roles.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const handleRemoveRole = (id: string) => {
    updateHumanResources({
      roles: hr.roles.filter((r) => r.id !== id),
    });
  };

  const handleAddRole = (e: React.FormEvent) => {
    e.preventDefault();
    const salary = Math.max(0, Number(newSalary) || 0);
    if (!newLabel.trim() || salary <= 0) {
      notify('error', 'Veuillez saisir un intitulé de poste et un salaire brut mensuel positif.');
      return;
    }
    const role: HrRoleItem = {
      id: `hr-role-${Date.now()}`,
      label: newLabel.trim(),
      pole: newPole,
      headcountHS: Math.max(0, Math.round(Number(newHcHS) || 0)),
      headcountBS: Math.max(0, Math.round(Number(newHcBS) || 0)),
      monthlyGrossSalaryAr: Math.round(salary),
      annualTrainingPerPersonAr: Math.max(0, Math.round(Number(newTraining) || 0)),
      active: true,
    };
    updateHumanResources({ roles: [...hr.roles, role] });
    setNewLabel('');
    notify('success', `Poste « ${role.label} » ajouté au plan RH saisonnier.`);
  };

  const handleReset = () => {
    updateHumanResources({ ...DEFAULT_HR_ASSUMPTIONS });
    notify('info', 'Planification RH réinitialisée aux équipes types Madagascar.');
  };

  return (
    <section
      aria-label="Planification des Ressources Humaines saisonnières"
      className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/70 space-y-5"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-100 dark:border-zinc-800/80">
        <div className="flex items-start gap-2.5">
          <Users className="w-4 h-4 text-teal-600 dark:text-teal-400 mt-0.5 shrink-0" aria-hidden="true" />
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                16. Planification des Ressources Humaines &amp; Saisonnalité Main-d’Œuvre
              </h2>
              <Tooltip
                label="Planification RH saisonnière"
                content="Dimensionne les effectifs Haute Saison vs Basse Saison sur les pôles Rizières et Transformation, inclut les cotisations sociales Madagascar (CNaPS 13 % + OSTIE 5 %) et le budget annuel de formation."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Pilotez les effectifs saisonniers (rizières &amp; usinage), les charges sociales CNaPS/OSTIE et les besoins en formation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleReset}
            className="min-h-10 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Réinitialiser</span>
          </button>

          <button
            type="button"
            onClick={handleToggleApply}
            aria-pressed={hr.applyToModel}
            className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 transition-colors ${
              hr.applyToModel
                ? 'border-teal-500/45 bg-teal-500/10 text-teal-900 dark:text-teal-200 hover:bg-teal-500/15'
                : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            {hr.applyToModel ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
            ) : (
              <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
            )}
            <span>
              {hr.applyToModel
                ? 'Répercuté dans charges fixes'
                : 'Simulation isolée (opt-in)'}
            </span>
          </button>
        </div>
      </div>

      {/* Social Charges Parameter + 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1.5">
          <label
            htmlFor="hr-social-charges-rate"
            className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300"
          >
            Charges sociales (CNaPS + OSTIE)
          </label>
          <div className="flex items-center gap-1.5">
            <input
              id="hr-social-charges-rate"
              type="number"
              min="0"
              max="60"
              step="0.5"
              value={hr.socialChargesRatePct}
              onChange={(e) =>
                updateHumanResources({
                  socialChargesRatePct: Math.max(0, Math.min(60, Number(e.target.value) || 0)),
                })
              }
              className="w-full min-h-9 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white"
            />
            <span className="text-xs font-mono font-semibold text-zinc-500">%</span>
          </div>
          <div className="text-[11px] text-zinc-500">Défaut Madagascar : 18 %</div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Effectifs HS / BS
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
            {summary.totalHeadcountHS} <span className="text-xs font-normal text-zinc-500">HS</span> /{' '}
            {summary.totalHeadcountBS} <span className="text-xs font-normal text-zinc-500">BS</span>
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Mensuel HS : {formatAriary(summary.monthlyPayrollHSAr, { inMillions: inM })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Masse salariale brute + sociale
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(
              summary.annualGrossSalariesAr + summary.annualSocialChargesAr,
              { inMillions: inM }
            )}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            Cotisations : {formatAriary(summary.annualSocialChargesAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-zinc-950/40 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            <span>Budget formation annuel</span>
            <GraduationCap className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-indigo-700 dark:text-indigo-300">
            {formatAriary(summary.annualTrainingCostAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500">
            SRI, tri qualité &amp; sécurité
          </div>
        </div>

        <div className="p-3.5 rounded-xl border border-teal-500/35 bg-teal-500/[0.06] space-y-1">
          <div className="text-[11px] font-medium text-teal-800 dark:text-teal-300">
            Coût RH total annuel
          </div>
          <div className="font-mono text-base font-bold tabular-nums text-teal-700 dark:text-teal-300">
            {formatAriary(summary.annualTotalCostAr, { inMillions: inM })}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
            Lissé : {formatAriary(summary.averageMonthlyCostAr, { inMillions: inM })} / mois
          </div>
        </div>
      </div>

      {/* Pole Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[
          {
            data: summary.poles.rizieres,
            Icon: Sprout,
            accent: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            data: summary.poles.transformation,
            Icon: Factory,
            accent: 'text-indigo-600 dark:text-indigo-400',
          },
        ].map(({ data, Icon, accent }) => (
          <div
            key={data.pole}
            className="p-3.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/50 dark:bg-zinc-950/35 flex flex-wrap items-center justify-between gap-3"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon className={`w-4 h-4 shrink-0 ${accent}`} aria-hidden="true" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {data.label}
                </div>
                <div className="text-[11px] font-mono tabular-nums text-zinc-500">
                  {data.avgHeadcountHS} pers. HS · {data.avgHeadcountBS} pers. BS · Form.{' '}
                  {formatAriary(data.annualTrainingCostAr, { inMillions: true })}
                </div>
              </div>
            </div>
            <div className="text-right font-mono tabular-nums">
              <div className="text-sm font-bold text-zinc-900 dark:text-white">
                {formatAriary(data.annualTotalCostAr, { inMillions: inM })}
              </div>
              <div className="text-[11px] text-zinc-500">
                {summary.annualTotalCostAr > 0
                  ? `${((data.annualTotalCostAr / summary.annualTotalCostAr) * 100).toFixed(0)} % du budget RH`
                  : '0 %'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Roles Table */}
      <div className="rounded-xl border border-zinc-200 dark:border-white/[0.08] overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead className="bg-zinc-100/80 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-800">
            <tr>
              <th className="py-2.5 px-3 font-semibold">Actif</th>
              <th className="py-2.5 px-3 font-semibold">Équipe / Poste</th>
              <th className="py-2.5 px-3 font-semibold">Pôle</th>
              <th className="py-2.5 px-3 text-right font-semibold">Eff. HS</th>
              <th className="py-2.5 px-3 text-right font-semibold">Eff. BS</th>
              <th className="py-2.5 px-3 text-right font-semibold">Salaire brut / m</th>
              <th className="py-2.5 px-3 text-right font-semibold">Formation / an / pers.</th>
              <th className="py-2.5 px-3 text-right font-semibold">Coût annuel</th>
              <th className="py-2.5 px-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {hr.roles.map((role) => {
              const hsM = Math.max(1, assumptions.hauteSaison.months);
              const bsM = Math.max(1, assumptions.basseSaison.months);
              const gross =
                role.headcountHS * role.monthlyGrossSalaryAr * hsM +
                role.headcountBS * role.monthlyGrossSalaryAr * bsM;
              const social = gross * (hr.socialChargesRatePct / 100);
              const train =
                Math.max(role.headcountHS, role.headcountBS) *
                role.annualTrainingPerPersonAr;
              const rowTotal = role.active ? Math.round(gross + social + train) : 0;

              return (
                <tr
                  key={role.id}
                  className={
                    role.active
                      ? 'text-zinc-800 dark:text-zinc-200'
                      : 'opacity-55 text-zinc-500 dark:text-zinc-500'
                  }
                >
                  <td className="py-2 px-3">
                    <input
                      type="checkbox"
                      checked={role.active}
                      aria-label={`Activer le poste ${role.label}`}
                      onChange={(e) =>
                        handleUpdateRole(role.id, { active: e.target.checked })
                      }
                      className="rounded border-zinc-300 dark:border-zinc-700 accent-teal-600"
                    />
                  </td>
                  <td className="py-2 px-3 min-w-[190px]">
                    <input
                      type="text"
                      value={role.label}
                      aria-label="Libellé du poste"
                      onChange={(e) => handleUpdateRole(role.id, { label: e.target.value })}
                      className="w-full px-2 py-1 rounded-md border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 focus:border-indigo-500 bg-transparent text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <select
                      value={role.pole}
                      aria-label="Pôle opérationnel"
                      onChange={(e) =>
                        handleUpdateRole(role.id, { pole: e.target.value as HrPoleType })
                      }
                      className="px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-[11px] font-medium"
                    >
                      <option value="rizieres">Rizières</option>
                      <option value="transformation">Transformation</option>
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label={`Effectif Haute Saison ${role.label}`}
                      value={role.headcountHS}
                      onChange={(e) =>
                        handleUpdateRole(role.id, {
                          headcountHS: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        })
                      }
                      className="w-16 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-right font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      aria-label={`Effectif Basse Saison ${role.label}`}
                      value={role.headcountBS}
                      onChange={(e) =>
                        handleUpdateRole(role.id, {
                          headcountBS: Math.max(0, Math.round(Number(e.target.value) || 0)),
                        })
                      }
                      className="w-16 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-right font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="10000"
                      aria-label={`Salaire brut mensuel ${role.label}`}
                      value={role.monthlyGrossSalaryAr}
                      onChange={(e) =>
                        handleUpdateRole(role.id, {
                          monthlyGrossSalaryAr: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-right font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="5000"
                      aria-label={`Budget formation annuel ${role.label}`}
                      value={role.annualTrainingPerPersonAr}
                      onChange={(e) =>
                        handleUpdateRole(role.id, {
                          annualTrainingPerPersonAr: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-2 py-1 rounded-md border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 text-right font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">
                    {formatAriary(rowTotal, { inMillions: inM })}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveRole(role.id)}
                      aria-label={`Supprimer ${role.label}`}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Role Form */}
      <form
        onSubmit={handleAddRole}
        className="p-3.5 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5 items-end"
      >
        <label className="lg:col-span-2 space-y-1 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Nouveau poste saisonnier</span>
          <input
            type="text"
            placeholder="Ex: Technicien séchoir solaire"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          />
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Pôle</span>
          <select
            value={newPole}
            onChange={(e) => setNewPole(e.target.value as HrPoleType)}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          >
            <option value="rizieres">Rizières</option>
            <option value="transformation">Transformation</option>
          </select>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Eff. HS / BS</span>
          <div className="grid grid-cols-2 gap-1">
            <input
              type="number"
              min="0"
              value={newHcHS}
              aria-label="Nouvel effectif HS"
              onChange={(e) => setNewHcHS(e.target.value)}
              className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-right"
            />
            <input
              type="number"
              min="0"
              value={newHcBS}
              aria-label="Nouvel effectif BS"
              onChange={(e) => setNewHcBS(e.target.value)}
              className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-right"
            />
          </div>
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Salaire brut (Ar)</span>
          <input
            type="number"
            min="0"
            step="10000"
            value={newSalary}
            onChange={(e) => setNewSalary(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-right"
          />
        </label>

        <label className="space-y-1 text-xs">
          <span className="font-medium text-zinc-700 dark:text-zinc-300">Formation (Ar/an)</span>
          <input
            type="number"
            min="0"
            step="5000"
            value={newTraining}
            onChange={(e) => setNewTraining(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono text-right"
          />
        </label>

        <button
          type="submit"
          className="min-h-9 px-3 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Ajouter</span>
        </button>
      </form>
    </section>
  );
};
