import React, { useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  CheckCircle2,
  Plus,
  SlidersHorizontal,
  Trash2,
  Wrench,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import {
  MaintenanceEquipmentCategory,
  MaintenanceInterventionType,
} from '../../types/finance';
import {
  computeMaintenanceCalendarMetrics,
  createMaintenanceEvent,
  EQUIPMENT_CATEGORY_META,
  getResolvedMaintenanceSchedule,
  INTERVENTION_TYPE_META,
} from '../../utils/maintenance';
import { CALENDAR_MONTHS_FR } from '../../utils/treasury';
import { formatAriary, formatKg } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

export const MachineMaintenanceCalendar: React.FC = () => {
  const { assumptions, model, updateMachineMaintenance, notify } = useFinancial();
  const schedule = getResolvedMaintenanceSchedule(assumptions);

  const summary = useMemo(
    () => computeMaintenanceCalendarMetrics(assumptions, model, schedule),
    [assumptions, model, schedule]
  );

  const [machineName, setMachineName] = useState('');
  const [category, setCategory] =
    useState<MaintenanceEquipmentCategory>('decortiqueuse');
  const [monthIndex, setMonthIndex] = useState<number>(6);
  const [downtimeDays, setDowntimeDays] = useState<string>('2');
  const [capacityImpactPct, setCapacityImpactPct] = useState<string>('100');
  const [maintenanceCostAr, setMaintenanceCostAr] = useState<string>('500000');
  const [maintenanceType, setMaintenanceType] =
    useState<MaintenanceInterventionType>('preventive');

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    const label =
      machineName.trim() || EQUIPMENT_CATEGORY_META[category].label;
    const days = Math.max(0.5, Math.min(25, Number(downtimeDays) || 1));
    const impact = Math.max(0.1, Math.min(1, (Number(capacityImpactPct) || 100) / 100));
    const cost = Math.max(0, Number(maintenanceCostAr) || 0);

    const newEv = createMaintenanceEvent({
      machineName: label,
      category,
      monthIndex,
      downtimeDays: days,
      capacityImpactRatio: impact,
      maintenanceCostAr: cost,
      maintenanceType,
    });

    updateMachineMaintenance({
      events: [...schedule.events, newEv],
    });
    setMachineName('');
    notify('success', `Arrêt technique « ${label} » planifié en M${monthIndex}.`);
  };

  const handleUpdateEvent = (
    id: string,
    patch: Partial<(typeof schedule.events)[number]>
  ) => {
    updateMachineMaintenance({
      events: schedule.events.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev)),
    });
  };

  const handleRemoveEvent = (id: string) => {
    updateMachineMaintenance({
      events: schedule.events.filter((ev) => ev.id !== id),
    });
    notify('info', 'Intervention de maintenance retirée du calendrier.');
  };

  const chartData = useMemo(
    () =>
      summary.rows.map((r) => ({
        month: `M${r.monthIndex}`,
        fullMonth: r.monthLabel,
        season: r.season,
        actualRiceKg: r.actualRiceKg,
        lostRiceKg: r.lostRiceKg,
        lostTurnoverAr: r.lostTurnoverAr,
      })),
    [summary.rows]
  );

  return (
    <div className="pt-4 mt-2 border-t border-zinc-200 dark:border-zinc-800 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <Wrench
            className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Calendrier de Maintenance des Machines &amp; Manque à Gagner
              </h3>
              <Tooltip
                label="Maintenance & Arrêts Techniques"
                content="Planifiez les révisions de la décortiqueuse, du polisseur, des trieuses et des camions de collecte. Calcule automatiquement le manque à gagner en volume (kg de paddy/riz) et en chiffre d’affaires sur les mois concernés."
              />
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
              Anticipez les arrêts techniques du matériel de transformation et mesurez la perte de volume de production associée.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            updateMachineMaintenance({
              applyProductionLossToModel: !schedule.applyProductionLossToModel,
            })
          }
          aria-pressed={schedule.applyProductionLossToModel}
          className={`min-h-10 px-3.5 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-2 shrink-0 transition-colors whitespace-nowrap ${
            schedule.applyProductionLossToModel
              ? 'border-amber-500/45 bg-amber-500/10 text-amber-900 dark:text-amber-200 hover:bg-amber-500/15'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
        >
          {schedule.applyProductionLossToModel ? (
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" aria-hidden="true" />
          ) : (
            <SlidersHorizontal className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" aria-hidden="true" />
          )}
          <span>
            {schedule.applyProductionLossToModel
              ? 'Pertes & coûts répercutés au modèle'
              : 'Planification seule (sans déduction CA)'}
          </span>
        </button>
      </div>

      {/* 4 Maintenance Summary KPIs */}
      <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-0.5">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            Arrêts cumulés / disponibilité
          </div>
          <div className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
            {summary.totalDowntimeDays.toFixed(1)} j ({summary.annualAvailabilityRatePct.toFixed(1)} %)
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            {summary.totalEffectiveLostDays.toFixed(1)} j équivalent arrêt total
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-0.5">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            Manque à gagner en volume
          </div>
          <div className="font-mono text-sm font-bold tabular-nums text-rose-700 dark:text-rose-400">
            −{formatKg(summary.totalLostRiceKg)} riz
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            soit −{formatKg(summary.totalLostPaddyKg)} paddy non usiné
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-0.5">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            CA &amp; Marge manqués
          </div>
          <div className="font-mono text-sm font-bold tabular-nums text-amber-700 dark:text-amber-300">
            −{formatAriary(summary.totalLostTurnoverAr, { inMillions: true })} CA
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Marge brute : −{formatAriary(summary.totalLostGrossMarginAr, { inMillions: true })}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 space-y-0.5">
          <div className="text-[11px] text-zinc-600 dark:text-zinc-400">
            Budget pièces &amp; interventions
          </div>
          <div className="font-mono text-sm font-bold tabular-nums text-zinc-900 dark:text-white">
            {formatAriary(summary.totalMaintenanceCostAr)}
          </div>
          <div className="text-[11px] font-mono tabular-nums text-zinc-500 dark:text-zinc-400">
            Pic d’arrêt : {summary.worstMonthLabel} (−{formatKg(summary.worstMonthLostRiceKg)})
          </div>
        </div>
      </div>

      {/* 12-Month Timeline Grid + Volume Loss Chart */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">
        <div className="xl:col-span-6 grid grid-cols-3 sm:grid-cols-4 gap-2">
          {summary.rows.map((row) => {
            const hasStop = row.eventsCount > 0;
            return (
              <div
                key={row.monthIndex}
                className={`p-2.5 rounded-xl border text-xs transition-colors ${
                  hasStop
                    ? 'border-amber-500/45 bg-amber-500/[0.08] dark:bg-amber-950/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100">
                    M{row.monthIndex}
                  </span>
                  <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">
                    {row.season}
                  </span>
                </div>
                <div className="mt-1 font-mono text-[11px] tabular-nums">
                  {hasStop ? (
                    <>
                      <div className="font-semibold text-amber-800 dark:text-amber-300">
                        {row.rawDowntimeDays.toFixed(1)} j arrêt
                      </div>
                      <div className="text-rose-700 dark:text-rose-400">
                        −{row.lostRiceKg.toLocaleString('fr-FR')} kg
                      </div>
                    </>
                  ) : (
                    <div className="text-zinc-500 dark:text-zinc-400">100 % disp.</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="xl:col-span-6 p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/30 flex flex-col justify-between space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Volume produit vs Manque à gagner mensuel (kg riz)
            </span>
            <div className="flex items-center gap-3 text-[11px] text-zinc-600 dark:text-zinc-400">
              <span className="text-teal-700 dark:text-teal-400 font-medium">Teal : Produit</span>
              <span aria-hidden="true">·</span>
              <span className="text-rose-700 dark:text-rose-400 font-medium">Rouge : Perdu (arrêt)</span>
            </div>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                  tickFormatter={(v) => `${Math.round(Number(v) / 1000)} t`}
                  width={38}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '10px',
                    fontSize: '12px',
                    color: '#f8fafc',
                  }}
                  formatter={(value, name) => [
                    `${Number(value ?? 0).toLocaleString('fr-FR')} kg`,
                    name === 'actualRiceKg' ? 'Volume usiné net' : 'Manque à gagner',
                  ]}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.fullMonth || ''}
                />
                <Bar dataKey="actualRiceKg" stackId="prod" fill="#14b8a6" maxBarSize={24} />
                <Bar
                  dataKey="lostRiceKg"
                  stackId="prod"
                  fill="#f43f5e"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Scheduled Events Table */}
      <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
          <thead>
            <tr className="bg-zinc-100/80 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2.5 px-3 font-semibold">Équipement / Opération</th>
              <th className="py-2.5 px-3 font-semibold">Mois</th>
              <th className="py-2.5 px-3 text-right font-semibold">Arrêt (j)</th>
              <th className="py-2.5 px-3 text-right font-semibold">Impact (%)</th>
              <th className="py-2.5 px-3 text-right font-semibold">Coût (Ar)</th>
              <th className="py-2.5 px-3 text-right font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {schedule.events.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-4 px-3 text-center font-sans text-zinc-500">
                  Aucun arrêt technique planifié. Ajoutez une intervention ci-dessous.
                </td>
              </tr>
            ) : (
              schedule.events.map((ev) => (
                <tr key={ev.id} className="hover:bg-zinc-50/70 dark:hover:bg-white/[0.02]">
                  <td className="py-2 px-3 font-sans">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {ev.machineName}
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {EQUIPMENT_CATEGORY_META[ev.category]?.shortLabel} ·{' '}
                      {INTERVENTION_TYPE_META[ev.maintenanceType]?.shortLabel}
                    </div>
                  </td>
                  <td className="py-2 px-3">
                    <select
                      aria-label={`Mois ${ev.machineName}`}
                      value={ev.monthIndex}
                      onChange={(e) =>
                        handleUpdateEvent(ev.id, { monthIndex: Number(e.target.value) })
                      }
                      className="px-2 py-1 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          M{m} ({CALENDAR_MONTHS_FR[m - 1].slice(0, 3)})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0.5"
                      max="25"
                      step="0.5"
                      aria-label={`Durée arrêt ${ev.machineName}`}
                      value={ev.downtimeDays}
                      onChange={(e) =>
                        handleUpdateEvent(ev.id, {
                          downtimeDays: Math.max(0.5, Number(e.target.value) || 0.5),
                        })
                      }
                      className="w-16 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="10"
                      max="100"
                      step="10"
                      aria-label={`Impact capacité ${ev.machineName}`}
                      value={Math.round(ev.capacityImpactRatio * 100)}
                      onChange={(e) =>
                        handleUpdateEvent(ev.id, {
                          capacityImpactRatio: Math.max(
                            0.1,
                            Math.min(1, (Number(e.target.value) || 100) / 100)
                          ),
                        })
                      }
                      className="w-16 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="50000"
                      aria-label={`Coût intervention ${ev.machineName}`}
                      value={ev.maintenanceCostAr}
                      onChange={(e) =>
                        handleUpdateEvent(ev.id, {
                          maintenanceCostAr: Math.max(0, Number(e.target.value) || 0),
                        })
                      }
                      className="w-24 px-2 py-1 text-right rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveEvent(ev.id)}
                      title="Supprimer cette intervention"
                      className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Maintenance Intervention Form */}
      <form
        onSubmit={handleAddEvent}
        className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-950/40 grid grid-cols-1 sm:grid-cols-7 gap-2.5 items-end"
      >
        <div className="sm:col-span-2">
          <label htmlFor="maint-machine" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Machine / intervention
          </label>
          <input
            id="maint-machine"
            type="text"
            placeholder="Ex : Groupe électrogène 45 kVA"
            value={machineName}
            onChange={(e) => setMachineName(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          />
        </div>
        <div>
          <label htmlFor="maint-cat" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Équipement
          </label>
          <select
            id="maint-cat"
            value={category}
            onChange={(e) => {
              const cat = e.target.value as MaintenanceEquipmentCategory;
              setCategory(cat);
              setCapacityImpactPct(
                String(Math.round(EQUIPMENT_CATEGORY_META[cat].defaultCapacityImpact * 100))
              );
            }}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          >
            {(Object.keys(EQUIPMENT_CATEGORY_META) as MaintenanceEquipmentCategory[]).map((k) => (
              <option key={k} value={k}>
                {EQUIPMENT_CATEGORY_META[k].shortLabel}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="maint-month" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Mois
          </label>
          <select
            id="maint-month"
            value={monthIndex}
            onChange={(e) => setMonthIndex(Number(e.target.value))}
            className="w-full min-h-9 px-2 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                M{m} · {CALENDAR_MONTHS_FR[m - 1].slice(0, 3)}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="maint-days" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Arrêt (j)
          </label>
          <input
            id="maint-days"
            type="number"
            min="0.5"
            max="25"
            step="0.5"
            value={downtimeDays}
            onChange={(e) => setDowntimeDays(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="maint-cost" className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
            Coût (Ar)
          </label>
          <input
            id="maint-cost"
            type="number"
            min="0"
            step="50000"
            value={maintenanceCostAr}
            onChange={(e) => setMaintenanceCostAr(e.target.value)}
            className="w-full min-h-9 px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-mono tabular-nums"
          />
        </div>
        <div className="flex gap-1.5">
          <select
            aria-label="Type de maintenance"
            value={maintenanceType}
            onChange={(e) =>
              setMaintenanceType(e.target.value as MaintenanceInterventionType)
            }
            className="hidden"
          >
            <option value="preventive">Préventive</option>
          </select>
          <button
            type="submit"
            className="w-full min-h-9 px-3 py-1.5 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 text-xs font-semibold inline-flex items-center justify-center gap-1 hover:opacity-90 whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Planifier</span>
          </button>
        </div>
      </form>
    </div>
  );
};
