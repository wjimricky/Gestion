import React, { useEffect, useRef, useState } from 'react';

interface AnimatedNumberProps {
  value: number;
  format: (val: number) => string;
  duration?: number;
  className?: string;
}

/**
 * Smooth incremental count-up / count-down display when numeric financial values change.
 * Respects prefers-reduced-motion and renders tabular figures cleanly.
 */
export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  format,
  duration = 420,
  className = '',
}) => {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const [displayValue, setDisplayValue] = useState<number>(safeTarget);
  const currentRef = useRef<number>(safeTarget);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startVal = currentRef.current;
    if (Math.abs(safeTarget - startVal) < 1e-6) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      currentRef.current = safeTarget;
      setDisplayValue(safeTarget);
      return;
    }

    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // Ease-out cubic for snappy settling
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextVal = startVal + (safeTarget - startVal) * eased;
      currentRef.current = nextVal;
      setDisplayValue(nextVal);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = safeTarget;
        setDisplayValue(safeTarget);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [safeTarget, duration]);

  return <span className={`tabular-nums ${className}`}>{format(displayValue)}</span>;
};
