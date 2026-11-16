import React from 'react';
import { AlertTriangle, LucideIcon, MessageSquareText } from 'lucide-react';
import { Tooltip } from './Tooltip';
import { AnimatedNumber } from './AnimatedNumber';
import { SparklineChart, SparklinePoint } from '../charts/SparklineChart';

interface KpiCardProps {
  label: string;
  value: string;
  animatedValue?: number;
  formatAnimated?: (val: number) => string;
  sub?: React.ReactNode;
  icon: LucideIcon;
  tone?: 'neutral' | 'positive' | 'warning' | 'danger' | 'info';
  alertLabel?: string;
  tooltip?: string;
  tooltipAlign?: 'left' | 'center' | 'right';
  sparklineData?: SparklinePoint[];
  sparklineColor?: string;
  sparklineAriaLabel?: string;
  formatSparklineValue?: (val: number) => string;
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent<HTMLDivElement>) => void;
  noteCount?: number;
  onOpenNotes?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  animatedValue,
  formatAnimated,
  sub,
  icon: Icon,
  tone = 'neutral',
  alertLabel,
  tooltip,
  tooltipAlign = 'center',
  sparklineData,
  sparklineColor,
  sparklineAriaLabel,
  formatSparklineValue,
  onClick,
  onContextMenu,
  noteCount = 0,
  onOpenNotes,
  className = '',
  style,
}) => {
  const toneIconClass = {
    neutral: 'text-zinc-600 dark:text-zinc-400',
    positive: 'text-teal-700 dark:text-teal-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-rose-700 dark:text-rose-400',
    info: 'text-indigo-700 dark:text-indigo-400',
  }[tone];

  const toneValueClass = {
    neutral: 'text-zinc-900 dark:text-white',
    positive: 'text-teal-700 dark:text-teal-400',
    warning: 'text-amber-700 dark:text-amber-400',
    danger: 'text-rose-700 dark:text-rose-400',
    info: 'text-indigo-700 dark:text-indigo-300',
  }[tone];

  const defaultSparkColor = {
    neutral: '#94a3b8',
    positive: '#2dd4bf',
    warning: '#f59e0b',
    danger: '#f43f5e',
    info: '#818cf8',
  }[tone];

  const hasAlert = Boolean(alertLabel);

  return (
    <div
      style={style}
      onContextMenu={onContextMenu}
      className={`group p-4 rounded-2xl border text-left w-full min-h-[112px] flex flex-col justify-between transition-all duration-200 ease-out ${
        hasAlert
          ? 'border-rose-500/75 dark:border-rose-400/75 ring-1 ring-rose-500/35 bg-rose-50/45 dark:bg-rose-950/20'
          : 'border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C]'
      } ${
        onClick
          ? hasAlert
            ? 'hover:-translate-y-0.5 hover:border-rose-600 dark:hover:border-rose-400 hover:shadow-md dark:hover:shadow-rose-950/30'
            : 'hover:-translate-y-0.5 hover:border-indigo-500/50 dark:hover:border-indigo-400/40 hover:bg-zinc-50 dark:hover:bg-[#171627] hover:shadow-md dark:hover:shadow-indigo-950/30'
          : ''
      } ${className}`}
    >
      {/* Top Row: Label + Tooltip + Notes + Icon */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1 min-w-0">
          {onClick ? (
            <button
              type="button"
              onClick={onClick}
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-700 dark:hover:text-indigo-300 leading-snug text-left cursor-pointer transition-colors"
            >
              {label}
            </button>
          ) : (
            <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 leading-snug">
              {label}
            </span>
          )}
          {tooltip && <Tooltip content={tooltip} label={label} align={tooltipAlign} />}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenNotes && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenNotes();
              }}
              title={
                noteCount > 0
                  ? `${noteCount} note(s) d’analyste — cliquer pour consulter ou ajouter (ou clic droit)`
                  : 'Ajouter une note d’analyste (ou clic droit)'
              }
              aria-label={
                noteCount > 0
                  ? `${noteCount} notes sur ${label}`
                  : `Ajouter une note sur ${label}`
              }
              className={`min-h-7 px-1.5 rounded-lg inline-flex items-center gap-1 text-[11px] font-mono tabular-nums transition-opacity no-print ${
                noteCount > 0
                  ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 opacity-100'
                  : 'text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06] opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
              }`}
            >
              <MessageSquareText className="w-3 h-3 shrink-0" aria-hidden="true" />
              {noteCount > 0 && <span>{noteCount}</span>}
            </button>
          )}
          <span
            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              hasAlert
                ? 'bg-rose-500/15 dark:bg-rose-500/20'
                : 'bg-zinc-100 dark:bg-white/[0.05]'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${toneIconClass}`} aria-hidden="true" />
          </span>
        </div>
      </div>

      {/* Main Metric + Optional Recharts Sparkline */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div
            className={`text-lg lg:text-xl font-bold font-mono tracking-tight tabular-nums ${toneValueClass}`}
          >
            {animatedValue !== undefined && formatAnimated ? (
              <AnimatedNumber value={animatedValue} format={formatAnimated} />
            ) : (
              value
            )}
          </div>

          {alertLabel && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-600/12 dark:bg-rose-500/20 border border-rose-500/40 text-[10px] font-semibold text-rose-800 dark:text-rose-200 shrink-0">
              <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400 shrink-0" aria-hidden="true" />
              <span>{alertLabel}</span>
            </span>
          )}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="pt-0.5">
            <SparklineChart
              data={sparklineData}
              color={sparklineColor || defaultSparkColor}
              height={42}
              formatValue={formatSparklineValue}
              ariaLabel={sparklineAriaLabel || `Tendance : ${label}`}
            />
          </div>
        )}

        {sub && (
          <div className="text-xs text-zinc-600 dark:text-zinc-400 truncate">
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};
