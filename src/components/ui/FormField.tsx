import React, { useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { LabelWithTooltip } from './Tooltip';

interface FormFieldProps {
  label: string;
  id?: string;
  error?: string;
  hint?: string;
  tooltip?: string;
  unit?: string;
  tooltipAlign?: 'left' | 'center' | 'right';
  children: (inputProps: {
    id: string;
    'aria-invalid': boolean;
    'aria-describedby'?: string;
    className: string;
  }) => React.ReactNode;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  id: providedId,
  error,
  hint,
  tooltip,
  unit,
  tooltipAlign = 'left',
  children,
}) => {
  const generatedId = useId();
  const id = providedId || generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const describedBy = [error ? errorId : null, hint ? hintId : null]
    .filter(Boolean)
    .join(' ') || undefined;

  const baseInputClass = `w-full min-h-12 sm:min-h-10 px-3 py-2 font-mono text-base sm:text-sm rounded-lg border bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 transition-colors ${
    error
      ? 'border-red-600 dark:border-red-500 focus:ring-2 focus:ring-red-500/30'
      : 'border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600'
  }`;

  return (
    <div className="space-y-1">
      {tooltip ? (
        <LabelWithTooltip
          htmlFor={id}
          label={label}
          tooltip={tooltip}
          unit={unit}
          align={tooltipAlign}
        />
      ) : (
        <label
          htmlFor={id}
          className="block text-xs font-medium text-zinc-700 dark:text-zinc-300"
        >
          {label}
        </label>
      )}
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
        className: baseInputClass,
      })}
      {hint && !error && (
        <p id={hintId} className="text-xs text-zinc-600 dark:text-zinc-400">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1"
        >
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};
