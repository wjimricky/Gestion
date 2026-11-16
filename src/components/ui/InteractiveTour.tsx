import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Compass, X } from 'lucide-react';

export interface TourStep {
  id: string;
  tab: string;
  selector: string;
  title: string;
  description: string;
  tabLabel: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'dashboard-kpi',
    tab: 'dashboard',
    tabLabel: 'Tableau de Bord',
    selector: '[data-tour="kpi-strip"]',
    title: 'Indicateurs clés & tendances saisonnières',
    description:
      'Visualisez en un coup d’œil le chiffre d’affaires, la marge brute, le bénéfice net après IR et la VAN à 3 ans, enrichis de courbes saisonnières HS / BS.',
  },
  {
    id: 'dashboard-simulator',
    tab: 'dashboard',
    tabLabel: 'Tableau de Bord',
    selector: '[data-tour="quick-simulator"]',
    title: 'Simulateur rapide en temps réel',
    description:
      'Testez instantanément une variation du prix de vente du riz ou des rotations par mois : tout le modèle financier et les graphiques se recalculent en direct.',
  },
  {
    id: 'dashboard-compare',
    tab: 'dashboard',
    tabLabel: 'Tableau de Bord',
    selector: '[data-tour="scenario-compare"]',
    title: 'Comparaison côte à côte de scénarios',
    description:
      'Sélectionnez deux scénarios (ex. Réaliste vs Optimiste ou vos propres variantes sauvegardées) pour analyser automatiquement les écarts absolus et en pourcentage.',
  },
  {
    id: 'hypotheses-alerts',
    tab: 'hypotheses',
    tabLabel: 'Hypothèses & Coûts',
    selector: '[data-tour="hypotheses-alerts"]',
    title: 'Hypothèses & alertes de rentabilité',
    description:
      'Modifiez les coûts au kg, charges fixes et formats de sacs. Des alertes intelligentes vous préviennent en temps réel si le coût de revient dépasse le prix de vente.',
  },
  {
    id: 'scenarios-overview',
    tab: 'scenarios',
    tabLabel: 'Scénarios',
    selector: '[data-tour="scenarios-overview"]',
    title: 'Analyse Pessimiste, Réaliste & Optimiste',
    description:
      'Comparez la résistance de l’activité face aux chocs de marché (rendement, prix du paddy, rotations) et gérez vos scénarios personnalisés.',
  },
  {
    id: 'sensibilite-overview',
    tab: 'sensibilite',
    tabLabel: 'Sensibilité 2D',
    selector: '[data-tour="sensibilite-overview"]',
    title: 'Matrice de sensibilité à deux variables',
    description:
      'Croisez simultanément deux hypothèses clés (Rendement × Rotations ou Prix vente × Prix paddy) pour repérer les seuils de perte et de profit.',
  },
];

interface InteractiveTourProps {
  open: boolean;
  currentTab: string;
  onSelectTab: (tabId: string) => void;
  onClose: () => void;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export const TOUR_STORAGE_KEY = 'rizi_tour_completed_v1';

export const InteractiveTour: React.FC<InteractiveTourProps> = ({
  open,
  currentTab,
  onSelectTab,
  onClose,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);

  const step = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];

  const markCompletedAndClose = useCallback(() => {
    try {
      localStorage.setItem(TOUR_STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
    onClose();
  }, [onClose]);

  // Reset step to 0 whenever the tour opens
  useEffect(() => {
    if (open) {
      setStepIndex(0);
    }
  }, [open]);

  // Switch tab automatically if the current tour step lives on a different tab
  useEffect(() => {
    if (!open) return;
    if (step.tab !== currentTab) {
      onSelectTab(step.tab);
    }
  }, [open, step.tab, currentTab, onSelectTab]);

  // Measure target element rect cleanly after tab switch / scroll / resize
  const updateTargetMeasurement = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(step.selector) as HTMLElement | null;
    if (!el) {
      setTargetRect(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      setTargetRect(null);
      return;
    }
    const padding = 8;
    setTargetRect({
      top: Math.max(8, rect.top - padding),
      left: Math.max(8, rect.left - padding),
      width: Math.min(window.innerWidth - 16, rect.width + padding * 2),
      height: rect.height + padding * 2,
    });
  }, [open, step.selector]);

  useLayoutEffect(() => {
    if (!open) return;

    let rafId = 0;
    const locateAndScroll = () => {
      const el = document.querySelector(step.selector) as HTMLElement | null;
      if (el) {
        const rect = el.getBoundingClientRect();
        const isOutOfView =
          rect.top < 76 || rect.bottom > window.innerHeight - 90;
        if (isOutOfView) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
      updateTargetMeasurement();
    };

    const timer = window.setTimeout(() => {
      rafId = window.requestAnimationFrame(locateAndScroll);
    }, 110);

    const handleScrollOrResize = () => updateTargetMeasurement();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    return () => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [open, step.selector, stepIndex, currentTab, updateTargetMeasurement]);

  // Keyboard navigation inside Tour (Escape, ArrowRight, ArrowLeft)
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        markCompletedAndClose();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        if (stepIndex < TOUR_STEPS.length - 1) {
          setStepIndex((i) => i + 1);
        } else {
          markCompletedAndClose();
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        if (stepIndex > 0) {
          setStepIndex((i) => i - 1);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [open, stepIndex, markCompletedAndClose]);

  if (!open) return null;

  const isFirst = stepIndex === 0;
  const isLast = stepIndex === TOUR_STEPS.length - 1;

  // Compute safe popover position inside viewport
  const cardWidth = Math.min(380, window.innerWidth - 24);
  const estimatedCardHeight = 235;
  let cardStyle: React.CSSProperties;

  if (targetRect && window.innerWidth >= 640) {
    const spaceBelow = window.innerHeight - (targetRect.top + targetRect.height);
    const placeBelow = spaceBelow >= estimatedCardHeight + 16 || targetRect.top < estimatedCardHeight + 24;
    const rawTop = placeBelow
      ? Math.min(
          window.innerHeight - estimatedCardHeight - 16,
          targetRect.top + targetRect.height + 14
        )
      : Math.max(16, targetRect.top - estimatedCardHeight - 14);
    const rawLeft = Math.max(
      12,
      Math.min(window.innerWidth - cardWidth - 12, targetRect.left)
    );
    cardStyle = {
      top: `${rawTop}px`,
      left: `${rawLeft}px`,
      width: `${cardWidth}px`,
    };
  } else {
    cardStyle = {
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: `${cardWidth}px`,
    };
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Guide interactif de découverte"
      className="fixed inset-0 z-50 no-print"
    >
      {/* Dimmed backdrop or spotlight cutout */}
      {targetRect ? (
        <div
          aria-hidden="true"
          onClick={markCompletedAndClose}
          style={{
            position: 'fixed',
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            borderRadius: '14px',
            boxShadow: '0 0 0 9999px rgba(9, 9, 18, 0.72)',
            border: '2px solid rgba(99, 102, 241, 0.9)',
            transition: 'top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease',
            pointerEvents: 'none',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          onClick={markCompletedAndClose}
          className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs"
        />
      )}

      {/* Click-outside scrim layer behind card */}
      <div
        aria-hidden="true"
        onClick={markCompletedAndClose}
        className="fixed inset-0 bg-transparent"
      />

      {/* Tour Step Card */}
      <div
        style={cardStyle}
        className="fixed z-10 rounded-2xl border border-zinc-200 dark:border-white/[0.14] bg-white dark:bg-[#141326] text-zinc-900 dark:text-zinc-100 shadow-2xl p-5 space-y-4 transition-all duration-200"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-mono text-indigo-700 dark:text-indigo-300 font-semibold">
              <Compass className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              <span>
                Étape {stepIndex + 1} / {TOUR_STEPS.length} · {step.tabLabel}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-white mt-1 leading-snug">
              {step.title}
            </h2>
          </div>

          <button
            type="button"
            onClick={markCompletedAndClose}
            aria-label="Fermer le guide interactif"
            className="min-h-8 min-w-8 rounded-lg inline-flex items-center justify-center text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.08] transition-colors shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          {step.description}
        </p>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {TOUR_STEPS.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              tabIndex={-1}
              onClick={() => setStepIndex(idx)}
              className={`h-1.5 rounded-full transition-all ${
                idx === stepIndex
                  ? 'w-6 bg-indigo-600 dark:bg-indigo-400'
                  : idx < stepIndex
                  ? 'w-2.5 bg-teal-500/70'
                  : 'w-2.5 bg-zinc-300 dark:bg-zinc-700'
              }`}
            />
          ))}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-white/[0.08]">
          <button
            type="button"
            onClick={markCompletedAndClose}
            className="min-h-10 px-2.5 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            Passer le guide
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                className="min-h-10 px-3 rounded-xl border border-zinc-300 dark:border-white/[0.12] text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-white/[0.06] inline-flex items-center gap-1 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Précédent</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) {
                  markCompletedAndClose();
                } else {
                  setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
                }
              }}
              className="min-h-10 px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
            >
              <span>{isLast ? 'Terminer' : 'Suivant'}</span>
              {isLast ? (
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
