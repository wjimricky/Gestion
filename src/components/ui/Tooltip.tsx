import React from 'react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { HelpCircle } from 'lucide-react';

export const TooltipProvider: React.FC<{
  children: React.ReactNode;
  delayDuration?: number;
}> = ({ children, delayDuration = 160 }) => {
  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration} skipDelayDuration={250}>
      {children}
    </TooltipPrimitive.Provider>
  );
};

interface TooltipProps {
  content: React.ReactNode;
  unit?: string;
  label?: string;
  align?: 'left' | 'center' | 'right';
  side?: 'top' | 'bottom' | 'left' | 'right';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

/**
 * Accessible Radix UI Tooltip explaining calculation methodology and units.
 */
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  unit,
  label,
  align = 'center',
  side = 'top',
  open,
  onOpenChange,
  children,
}) => {
  const radixAlign: 'start' | 'center' | 'end' =
    align === 'left' ? 'start' : align === 'right' ? 'end' : 'center';

  return (
    <TooltipPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <TooltipPrimitive.Trigger asChild>
        {children ?? (
          <button
            type="button"
            aria-label={label ? `Méthodologie : ${label}` : 'Afficher la méthodologie de calcul'}
            className="no-print inline-flex items-center justify-center w-5 h-5 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-300 hover:bg-indigo-500/10 transition-colors focus-visible:outline-2 focus-visible:outline-indigo-500 shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </TooltipPrimitive.Trigger>

      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          align={radixAlign}
          sideOffset={6}
          collisionPadding={12}
          className="z-50 max-w-xs w-64 sm:w-72 p-3 rounded-xl bg-zinc-900 dark:bg-[#1C1B33] text-zinc-100 border border-zinc-700/80 dark:border-white/15 shadow-xl text-xs font-sans font-normal leading-relaxed select-none"
        >
          <div>{content}</div>
          {unit && (
            <div className="mt-2 pt-1.5 border-t border-white/10 flex items-center justify-between gap-2 text-[11px] font-mono">
              <span className="text-zinc-400">Unité :</span>
              <span className="text-teal-300 font-semibold">{unit}</span>
            </div>
          )}
          <TooltipPrimitive.Arrow className="fill-zinc-900 dark:fill-[#1C1B33]" />
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
};

interface LabelWithTooltipProps {
  htmlFor: string;
  label: string;
  tooltip: string;
  unit?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

/**
 * Form variable label that displays a Radix UI Tooltip when hovering the label text OR focusing/tapping the help icon,
 * while preserving native click-to-focus on the associated input via htmlFor.
 */
export const LabelWithTooltip: React.FC<LabelWithTooltipProps> = ({
  htmlFor,
  label,
  tooltip,
  unit,
  align = 'left',
  className = 'text-xs font-medium text-zinc-700 dark:text-zinc-300',
}) => {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="inline-flex items-center gap-1.5 min-w-0">
      <label
        htmlFor={htmlFor}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        className={`${className} cursor-help underline decoration-dotted decoration-zinc-400/70 dark:decoration-zinc-500/70 underline-offset-4 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors`}
      >
        {label}
      </label>
      <Tooltip
        open={open}
        onOpenChange={setOpen}
        content={tooltip}
        unit={unit}
        label={label}
        align={align}
      />
    </div>
  );
};
