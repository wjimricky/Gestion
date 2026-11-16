/**
 * Unified menu & interactive navigation tokens aligned with the RizMadagascar
 * light (slate/zinc) and dark (#0B0A16 / #11101C / #141323) design system.
 */

export const MENU_SURFACE_CLASSES =
  'rounded-xl border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#11101C] shadow-xl dark:shadow-black/60';

export const MENU_TRIGGER_BASE_CLASSES =
  'inline-flex items-center justify-between gap-2 border font-semibold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 focus-visible:border-indigo-500 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none';

export const MENU_SECTION_LABEL_CLASSES =
  'px-2.5 pt-1.5 pb-1 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400';

export const MENU_ITEM_BASE_CLASSES =
  'w-full flex items-center justify-between gap-2.5 rounded-xl text-left transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/75 active:scale-[0.99] disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none';

export const MENU_ITEM_STATE_CLASSES = {
  active:
    'bg-indigo-600/12 dark:bg-indigo-500/20 text-indigo-950 dark:text-white border border-indigo-500/35 dark:border-indigo-400/30 font-semibold',
  highlighted:
    'bg-zinc-100 dark:bg-white/[0.07] text-zinc-950 dark:text-white border border-transparent',
  idle:
    'text-zinc-700 dark:text-zinc-300 border border-transparent hover:bg-zinc-100 dark:hover:bg-white/[0.05] hover:text-zinc-950 dark:hover:text-white',
} as const;

export const MENU_SHORTCUT_KBD_CLASSES =
  'shrink-0 px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded-md border border-zinc-300 dark:border-white/[0.12] bg-zinc-100 dark:bg-white/[0.05] text-zinc-600 dark:text-zinc-300';
