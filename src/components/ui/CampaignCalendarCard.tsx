import React, { useMemo, useState } from 'react';
import { CalendarRange, ArrowUpRight } from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { buildMonthlyTreasuryPlan } from '../../utils/treasury';
import {
  buildCampaignCalendar,
  CAMPAIGN_ACTIVITY_META,
  CampaignActivityCode,
} from '../../utils/liquidityAndCampaign';
import { formatAriary } from '../../utils/formatters';
import { Tooltip } from './Tooltip';

interface CampaignCalendarCardProps {
  onOpenTreasury?: () => void;
}

export const CampaignCalendarCard: React.FC<CampaignCalendarCardProps> = ({
  onOpenTreasury,
}) => {
  const { assumptions, model, treasurySettings, unitDisplay } = useFinancial();
  const inM = unitDisplay === 'millions';

  const treasuryPlan = useMemo(
    () => buildMonthlyTreasuryPlan(model, treasurySettings),
    [model, treasurySettings]
  );

  const schedule = useMemo(
    () => buildCampaignCalendar(assumptions, model, treasuryPlan, treasurySettings),
    [assumptions, model, treasuryPlan, treasurySettings]
  );

  const [activityFilter, setActivityFilter] = useState<'all' | CampaignActivityCode>('all');
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(1);

  const selectedMonth =
    schedule.find((m) => m.monthIndex === selectedMonthIndex) ?? schedule[0];

  return (
    <section
      aria-label="Calendrier interactif de campagne rizicole et flux mensuels"
      className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
              aria-hidden="true"
            />
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Calendrier de Campagne Agricole &amp; Flux Temporels (12 mois)
            </h2>
            <Tooltip
              label="Calendrier de campagne"
              content="Visualise mois par mois les périodes critiques de semis, récolte, transformation et soudure à Madagascar, corrélées aux encaissements et décaissements mensuels."
            />
          </div>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Cliquez sur un mois pour inspecter les flux de trésorerie associés à la phase culturale.
          </p>
        </div>

        {onOpenTreasury && (
          <button
            type="button"
            onClick={onOpenTreasury}
            className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 shrink-0 transition-colors"
          >
            <span>Détail Trésorerie</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Activity Phase Filters */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActivityFilter('all')}
          className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-colors ${
            activityFilter === 'all'
              ? 'border-indigo-500/60 bg-indigo-500/12 text-indigo-800 dark:text-indigo-200'
              : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
          }`}
        >
          Toutes phases
        </button>
        {(Object.keys(CAMPAIGN_ACTIVITY_META) as CampaignActivityCode[]).map((code) => {
          const meta = CAMPAIGN_ACTIVITY_META[code];
          const active = activityFilter === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setActivityFilter(code)}
              className={`px-2.5 py-1 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                active
                  ? meta.colorClass
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: meta.hex }}
              />
              <span>{meta.shortLabel}</span>
            </button>
          );
        })}
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
        {schedule.map((m) => {
          const primaryMeta = CAMPAIGN_ACTIVITY_META[m.primaryActivity];
          const matchesFilter =
            activityFilter === 'all' || m.activities.includes(activityFilter);
          const isSelected = selectedMonth?.monthIndex === m.monthIndex;

          return (
            <button
              key={m.monthIndex}
              type="button"
              onClick={() => setSelectedMonthIndex(m.monthIndex)}
              aria-pressed={isSelected}
              className={`text-left p-2.5 rounded-xl border transition-all ${
                isSelected
                  ? 'border-indigo-500 ring-1 ring-indigo-500/35 bg-indigo-500/[0.07] dark:bg-indigo-500/[0.12]'
                  : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50/70 dark:bg-[#161526] hover:border-zinc-300 dark:hover:border-white/[0.18]'
              } ${matchesFilter ? 'opacity-100' : 'opacity-35'}`}
            >
              <div className="flex items-center justify-between gap-1 text-[11px]">
                <span className="font-bold text-zinc-900 dark:text-zinc-100">
                  M{m.monthIndex} · {m.monthShort}
                </span>
                <span className="font-mono text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">
                  {m.seasonType}
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-xs shrink-0"
                  style={{ backgroundColor: primaryMeta.hex }}
                />
                <span className="text-[11px] font-medium text-zinc-700 dark:text-zinc-300 truncate">
                  {primaryMeta.shortLabel}
                </span>
              </div>
              <div
                className={`mt-1.5 text-xs font-mono font-bold tabular-nums ${
                  m.netCashAr >= 0
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {m.netCashAr >= 0 ? '+' : ''}
                {formatAriary(m.netCashAr, { inMillions: true })}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Month Detail Panel */}
      {selectedMonth && (
        <div className="p-4 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50/80 dark:bg-[#151424] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-zinc-900 dark:text-white">
                Mois {selectedMonth.monthIndex} — {selectedMonth.monthName} ({selectedMonth.seasonType})
              </span>
              <span
                className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                  CAMPAIGN_ACTIVITY_META[selectedMonth.primaryActivity].colorClass
                }`}
              >
                {CAMPAIGN_ACTIVITY_META[selectedMonth.primaryActivity].label}
              </span>
              <span className="text-[11px] font-mono text-zinc-500">
                {selectedMonth.rotationsCount} rot/mois
              </span>
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              {selectedMonth.commentary}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 shrink-0 font-mono tabular-nums text-xs">
            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#11101C]">
              <div className="font-sans text-[10px] text-zinc-500">Encaissements</div>
              <div className="font-bold text-teal-700 dark:text-teal-400 mt-0.5">
                +{formatAriary(selectedMonth.inflowsAr, { inMillions: inM })}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#11101C]">
              <div className="font-sans text-[10px] text-zinc-500">Décaissements</div>
              <div className="font-bold text-rose-700 dark:text-rose-400 mt-0.5">
                −{formatAriary(selectedMonth.outflowsAr, { inMillions: inM })}
              </div>
            </div>
            <div className="p-2.5 rounded-lg border border-zinc-200 dark:border-white/[0.07] bg-white dark:bg-[#11101C]">
              <div className="font-sans text-[10px] text-zinc-500">Solde fin mois</div>
              <div
                className={`font-bold mt-0.5 ${
                  selectedMonth.endingCashAr >= 0
                    ? 'text-zinc-900 dark:text-white'
                    : 'text-rose-700 dark:text-rose-400'
                }`}
              >
                {formatAriary(selectedMonth.endingCashAr, { inMillions: inM })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
