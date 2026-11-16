import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatPercent, formatKg, formatMonths } from '../../utils/formatters';
import { ViewToggle } from '../ui/ViewToggle';
import { KpiCard } from '../ui/KpiCard';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Tooltip, LabelWithTooltip } from '../ui/Tooltip';
import { ScenarioSideBySideCard } from '../ui/ScenarioSideBySideCard';
import { ProjectHealthDiagnosticCard } from '../ui/ProjectHealthDiagnosticCard';
import { BagMarginSimulatorCard } from '../ui/BagMarginSimulatorCard';
import { ProductLifecycleCard } from '../ui/ProductLifecycleCard';
import { TreasuryManagementView } from '../ui/TreasuryManagementView';
import { KpiContextMenu, KpiContextMenuState, KpiContextTarget } from '../ui/KpiContextMenu';
import { KpiNotesModal } from '../ui/KpiNotesModal';
import { ZoneProfitabilityRadarCard } from '../charts/ZoneProfitabilityRadarCard';
import { SeasonalityAnalysisSection } from '../ui/SeasonalityAnalysisSection';
import { MarketComparisonView } from '../ui/MarketComparisonView';
import { AnnualComparisonView } from '../ui/AnnualComparisonView';
import { ExportMenu } from '../ui/ExportMenu';
import { PaddyStockAlertWidget } from '../ui/PaddyStockAlertWidget';
import { TreasurySmartAlertBanner } from '../ui/TreasurySmartAlertBanner';
import { LiveStatusWidget } from '../ui/LiveStatusWidget';
import { QuickMonteCarloDashboardCard } from '../ui/QuickMonteCarloDashboardCard';
import { StrategicAdviceModal } from '../ui/StrategicAdviceModal';
import { DashboardReportNotesSection } from '../ui/DashboardReportNotesSection';
import { AiFinancialAnalysisCard } from '../ui/AiFinancialAnalysisCard';
import { EmailAlertsModal } from '../ui/EmailAlertsModal';
import { EmailServiceStatusWidget } from '../ui/EmailServiceStatusWidget';
import { OperationalCostDonutCard } from '../charts/OperationalCostDonutCard';
import { ScenarioVsBaselineChartCard } from '../charts/ScenarioVsBaselineChartCard';
import {
  buildAlertEmailDraft,
  buildBreachSignature,
  collectWatchedBreaches,
  parseRecipientEmails,
  PendingEmailAlertDispatch,
} from '../../services/gmailAlerts';
import { buildMonthlyTreasuryPlan } from '../../utils/treasury';
import { getResolvedKpiThresholds } from '../../utils/logistics';
import { buildLastThreeScenariosTrends } from '../../utils/scenarioTrends';
import { SparklineChart, SparklinePoint } from '../charts/SparklineChart';
import {
  DynamicCashFlowHeroChart,
  DynamicProfitLossMatrixChart,
} from '../charts/FinancialCharts';
import {
  DollarSign,
  Percent,
  TrendingUp,
  ArrowUpDown,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  Target,
  Layers,
  AlertTriangle,
  FileSpreadsheet,
  SlidersHorizontal,
  Minus,
  Plus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  FileDown,
  MessageSquareText,
  Wallet,
  LayoutDashboard,
  CalendarRange,
  Scale,
  Compass,
  BarChart3,
  BellRing,
  Mail,
} from 'lucide-react';
import { MAPPING_TARGET_OPTIONS } from '../../utils/excelImport';

export const DashboardTab: React.FC<{
  onNavigate: (tabId: string) => void;
  onExportPdf?: () => void;
  onOpenCustomPdfModal?: () => void;
  isExportingPdf?: boolean;
  onExportDocx?: () => void;
  isExportingDocx?: boolean;
  onSaveScenario?: () => void;
  onOpenGoogleSheetsExport?: () => void;
}> = ({
  onNavigate,
  onExportPdf,
  onOpenCustomPdfModal,
  isExportingPdf = false,
  onExportDocx,
  isExportingDocx = false,
  onSaveScenario,
  onOpenGoogleSheetsExport,
}) => {
  const {
    activeProject,
    model,
    assumptions,
    validation,
    kpiAlerts,
    kpiNotes,
    treasurySettings,
    treasurySmartAlert,
    unitDisplay,
    savedScenarios,
    activeScenarioId,
    updateSeasonField,
    updateKpiThresholds,
    exportToExcel,
    exportProjectionsToCsv,
    exportFiveYearProjectionsToCsv,
    exportSeasonalIncomeStatementToCsv,
    exportToJson,
    resetToDefaults,
    emailAlertConfig,
    emailAlertHistory,
    dashboardReportNotes,
    setDashboardReportNotes,
    notify,
  } = useFinancial();

  const inM = unitDisplay === 'millions';
  const [dashboardView, setDashboardView] = useState<
    'overview' | 'treasury' | 'seasonality' | 'market' | 'annual'
  >('overview');
  const [thresholdEditorOpen, setThresholdEditorOpen] = useState<boolean>(false);
  const [mobileView, setMobileView] = useState<'cards' | 'table'>('cards');
  const [simSeason, setSimSeason] = useState<'hauteSaison' | 'basseSaison'>('hauteSaison');
  const [highlightedSlice, setHighlightedSlice] = useState<string | null>(null);
  const [excelPreviewExpanded, setExcelPreviewExpanded] = useState<boolean>(true);
  const [activeExcelSnapshotSheet, setActiveExcelSnapshotSheet] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<KpiContextMenuState | null>(null);
  const [notesModalState, setNotesModalState] = useState<{
    open: boolean;
    focusKpi: KpiContextTarget | null;
    mode: 'compose' | 'list';
  }>({ open: false, focusKpi: null, mode: 'list' });
  const [adviceModalOpen, setAdviceModalOpen] = useState<boolean>(false);
  const [kpiSparklineMode, setKpiSparklineMode] = useState<'seasonal' | 'scenarios'>('seasonal');
  const [emailAlertsModalOpen, setEmailAlertsModalOpen] = useState<boolean>(false);
  const [pendingAutoEmailDraft, setPendingAutoEmailDraft] =
    useState<PendingEmailAlertDispatch | null>(null);
  const [acknowledgedSignature, setAcknowledgedSignature] = useState<string>('');
  const [modalInitialDraft, setModalInitialDraft] =
    useState<PendingEmailAlertDispatch | null>(null);

  const resolvedKpiThresholds = getResolvedKpiThresholds(assumptions);

  // Visual toast notification when an indicator newly drops below user-defined critical threshold
  const prevBreachedIdsRef = useRef<Set<string> | null>(null);
  useEffect(() => {
    const currentIds = new Set(kpiAlerts.breachedItems.map((b) => b.id));
    if (prevBreachedIdsRef.current === null) {
      prevBreachedIdsRef.current = currentIds;
      return;
    }
    const newlyBreached = kpiAlerts.breachedItems.filter(
      (item) => !prevBreachedIdsRef.current!.has(item.id)
    );
    if (newlyBreached.length > 0) {
      const first = newlyBreached[0];
      notify(
        'error',
        `Alerte seuil critique : ${first.label} (${first.actualFormatted}) sous cible ${first.thresholdFormatted}.`
      );
    }
    prevBreachedIdsRef.current = currentIds;
  }, [kpiAlerts.breachedItems, notify]);

  // Automatic KPI breach detection -> prepares confirmation draft (never sends silently without confirmation)
  useEffect(() => {
    if (!emailAlertConfig.enabled) {
      setPendingAutoEmailDraft(null);
      return;
    }
    const recipients = parseRecipientEmails(emailAlertConfig.recipients);
    if (recipients.length === 0) return;

    const breaches = collectWatchedBreaches(
      kpiAlerts,
      treasurySmartAlert,
      emailAlertConfig.watchedMetrics
    );
    if (breaches.length === 0) {
      setPendingAutoEmailDraft(null);
      return;
    }

    const sig = buildBreachSignature(breaches);
    if (sig === acknowledgedSignature) return;

    // Respect cooldown against most recent successful send
    const lastSent = emailAlertHistory.find((h) => h.status === 'sent');
    if (lastSent) {
      const elapsedMin = (Date.now() - new Date(lastSent.sentAt).getTime()) / 60000;
      if (elapsedMin < emailAlertConfig.cooldownMinutes) {
        return;
      }
    }

    const activeScName =
      savedScenarios.find((s) => s.id === activeScenarioId)?.name || 'Scénario courant';
    const draft = buildAlertEmailDraft({
      config: emailAlertConfig,
      breachedDetails: breaches,
      model,
      projectName: activeProject.name,
      scenarioName: activeScName,
    });
    setPendingAutoEmailDraft(draft);
  }, [
    emailAlertConfig,
    kpiAlerts,
    treasurySmartAlert,
    acknowledgedSignature,
    emailAlertHistory,
    savedScenarios,
    activeScenarioId,
    model,
    activeProject.name,
  ]);

  const treasuryQuickStatus = useMemo(
    () => buildMonthlyTreasuryPlan(model, treasurySettings),
    [model, treasurySettings]
  );

  const scenarioTrends = useMemo(
    () => buildLastThreeScenariosTrends(savedScenarios, assumptions, model),
    [savedScenarios, assumptions, model]
  );

  const getNoteCount = (kpiId: string) =>
    kpiNotes.filter((n) => n.kpiId === kpiId && !n.resolved).length;

  const handleKpiContextMenu = (
    e: React.MouseEvent<HTMLElement>,
    target: KpiContextTarget
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      target,
    });
  };

  const handleOpenKpiNotes = (target: KpiContextTarget | null, mode: 'compose' | 'list' = 'compose') => {
    setNotesModalState({ open: true, focusKpi: target, mode });
  };

  const handleCopyKpiValue = (target: KpiContextTarget) => {
    const text = `${target.kpiLabel} : ${target.kpiValueText}`;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => notify('success', `Copié : ${text}`),
        () => notify('info', text)
      );
    } else {
      notify('info', text);
    }
  };

  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const y1 = model.year1;
  const taxLabel = formatPercent(assumptions.corporateTaxRate, 0);
  const investorPct = formatPercent(assumptions.investorShare, 0);
  const companyPct = formatPercent(1 - assumptions.investorShare, 0);

  const activeScenario = savedScenarios.find((s) => s.id === activeScenarioId);
  const activeSeasonAssumptions = assumptions[simSeason];
  const activeSeasonResult = simSeason === 'hauteSaison' ? hs : bs;

  const safeRatio = (num: number, den: number) => (den > 0 ? num / den : 0);

  // Seasonal monthly series (12 months) for Recharts Sparklines inside KPI cards
  const seasonalSparklines = useMemo(() => {
    const hsMonths = Math.max(1, Math.round(hs.months));
    const bsMonths = Math.max(1, Math.round(bs.months));
    const totalMonths = Math.min(24, hsMonths + bsMonths);

    const hsMonthlyCA = hs.months > 0 ? hs.totalTurnoverAr / hs.months : 0;
    const bsMonthlyCA = bs.months > 0 ? bs.totalTurnoverAr / bs.months : 0;

    const turnoverData: SparklinePoint[] = [];
    const grossMarginData: SparklinePoint[] = [];

    for (let m = 1; m <= totalMonths; m++) {
      const isHS = m <= hsMonths;
      turnoverData.push({
        label: `M${m} (${isHS ? 'HS' : 'BS'})`,
        value: isHS ? hsMonthlyCA : bsMonthlyCA,
      });
      grossMarginData.push({
        label: `M${m} (${isHS ? 'HS' : 'BS'})`,
        value: isHS ? hs.monthlyGrossProfitAr : bs.monthlyGrossProfitAr,
      });
    }

    const netCashFlowData: SparklinePoint[] = model.payback.monthlyCashFlows
      .slice(0, 12)
      .map((cf) => ({
        label: `M${cf.month} (${cf.period})`,
        value: cf.netCashFlowAfterTaxAr,
      }));

    const projection3YData: SparklinePoint[] = [
      { label: 't=0 (-I₀)', value: -model.investment.fundsToRaiseAr },
      ...model.projections.realistic.map((p) => ({
        label: `Année ${p.year}`,
        value: p.netResultAfterTaxAr,
      })),
    ];

    return {
      turnoverData,
      grossMarginData,
      netCashFlowData,
      projection3YData,
    };
  }, [hs, bs, model.payback.monthlyCashFlows, model.projections.realistic, model.investment.fundsToRaiseAr]);

  // Allocation breakdown of Annual Turnover (CA)
  const totalRevenue = Math.max(y1.totalTurnoverAr, 1);
  const operatingCosts = Math.max(0, y1.totalPurchaseAndOperatingCostsAr);
  const fixedCharges = Math.max(0, y1.annualFixedChargesAr);
  const taxCost = Math.max(0, y1.corporateTaxAr);
  const netProfitPos = Math.max(0, y1.netResultAfterTaxAr);
  const allocDenom = Math.max(operatingCosts + fixedCharges + taxCost + netProfitPos, totalRevenue, 1);

  const allocationItems = [
    {
      id: 'ops',
      label: 'Paddy & Exploitation',
      amount: operatingCosts,
      pct: (operatingCosts / allocDenom) * 100,
      barColor: 'bg-indigo-500',
      dotColor: 'bg-indigo-500',
    },
    {
      id: 'net',
      label: 'Bénéfice net IR',
      amount: netProfitPos,
      pct: (netProfitPos / allocDenom) * 100,
      barColor: 'bg-teal-400',
      dotColor: 'bg-teal-400',
    },
    {
      id: 'fixed',
      label: 'Charges fixes',
      amount: fixedCharges,
      pct: (fixedCharges / allocDenom) * 100,
      barColor: 'bg-sky-400',
      dotColor: 'bg-sky-400',
    },
    {
      id: 'tax',
      label: `Impôt IR (${taxLabel})`,
      amount: taxCost,
      pct: (taxCost / allocDenom) * 100,
      barColor: 'bg-amber-400',
      dotColor: 'bg-amber-400',
    },
  ];

  // Key indicator rows ("Assets"-inspired list) with animated numeric values, threshold alerts, and tooltips
  const keyIndicators = [
    {
      id: 'vantri-van',
      tab: 'vantri',
      title: 'Valeur Actuelle Nette (VAN)',
      sub: (
        <>
          Actualisation r ={' '}
          <AnimatedNumber value={model.npv.discountRate} format={(v) => formatPercent(v, 0)} />
          {' · '}Seuil {kpiAlerts.items.van.thresholdFormatted}
        </>
      ),
      numericVal: model.npv.npvAr,
      formatVal: (v: number) => formatAriary(v, { inMillions: true }),
      delta: kpiAlerts.items.van.breached
        ? `Sous seuil (${kpiAlerts.items.van.thresholdFormatted})`
        : model.npv.decision,
      positive: model.npv.npvAr > 0 && !kpiAlerts.items.van.breached,
      isThresholdAlert: kpiAlerts.items.van.breached,
      thresholdLabel: kpiAlerts.items.van.thresholdFormatted,
      icon: CheckCircle2,
      tooltip: 'VAN = −I₀ + Σ CFt / (1 + r)ᵗ sur 3 ans. Comparée au seuil minimal défini dans les hypothèses.',
      scenarioTrendData: scenarioTrends.series.van,
      formatTrendValue: (v: number) => formatAriary(v, { inMillions: true }),
    },
    {
      id: 'vantri-tri',
      tab: 'vantri',
      title: 'Taux de Rentabilité Interne',
      sub: (
        <>
          Seuil exigé {kpiAlerts.items.tri.thresholdFormatted}
        </>
      ),
      numericVal: Number.isFinite(model.irr.irrValue) ? model.irr.irrValue : 0,
      formatVal: (v: number) =>
        Number.isFinite(model.irr.irrValue) ? formatPercent(v, 1) : 'Non calculable',
      delta: kpiAlerts.items.tri.breached
        ? `Sous seuil (${kpiAlerts.items.tri.thresholdFormatted})`
        : model.irr.isAcceptable
        ? 'Supérieur au seuil'
        : 'Sous le seuil',
      positive: model.irr.isAcceptable && !kpiAlerts.items.tri.breached,
      isThresholdAlert: kpiAlerts.items.tri.breached,
      thresholdLabel: kpiAlerts.items.tri.thresholdFormatted,
      icon: ArrowUpRight,
      tooltip: 'Taux d’actualisation exact qui annule la VAN des flux A1–A3. Comparé au TRI minimal défini dans les hypothèses.',
      scenarioTrendData: scenarioTrends.series.tri,
      formatTrendValue: (v: number) => `${v.toFixed(1)} %`,
    },
    {
      id: 'breakeven',
      tab: 'breakeven',
      title: 'Seuil de Rentabilité',
      sub: (
        <>
          <AnimatedNumber
            value={model.breakEven.requiredActiveClients}
            format={(v) => `${Math.round(v)}`}
          />{' '}
          clients actifs / mois
        </>
      ),
      numericVal: model.breakEven.monthlyBreakEvenTurnoverAr,
      formatVal: (v: number) => formatAriary(v, { inMillions: inM }),
      delta: (
        <>
          Sécurité :{' '}
          <AnimatedNumber
            value={model.breakEven.safetyMarginRate}
            format={(v) => formatPercent(v)}
          />
        </>
      ),
      positive: model.breakEven.safetyMarginRate > 0,
      isThresholdAlert: false,
      thresholdLabel: '',
      icon: Target,
      tooltip: 'Point mort mensuel = (Charges fixes annuelles / Taux de marge brute) ÷ 12 mois.',
      scenarioTrendData: scenarioTrends.series.breakEven,
      formatTrendValue: (v: number) => formatAriary(v, { inMillions: true }),
    },
    {
      id: 'payback',
      tab: 'payback',
      title: 'Payback Saisonnier',
      sub: (
        <>
          Simple :{' '}
          <AnimatedNumber
            value={model.payback.simplePaybackMonths}
            format={(v) => formatMonths(v)}
          />
          {' · '}Seuil {kpiAlerts.items.payback.thresholdFormatted}
        </>
      ),
      numericVal: model.payback.paybackMonths,
      formatVal: (v: number) =>
        model.payback.isRecoveredWithin36Months ? formatMonths(v) : '> 36 mois',
      delta: kpiAlerts.items.payback.breached ? (
        `Dépassement (${kpiAlerts.items.payback.thresholdFormatted})`
      ) : (
        <>
          ROI{' '}
          <AnimatedNumber
            value={model.investment.roiRatio}
            format={(v) => `${v.toFixed(2)} x`}
          />
        </>
      ),
      positive: model.payback.isRecoveredWithin36Months && !kpiAlerts.items.payback.breached,
      isThresholdAlert: kpiAlerts.items.payback.breached,
      thresholdLabel: kpiAlerts.items.payback.thresholdFormatted,
      icon: Clock,
      tooltip: 'Délai exact de récupération de I₀ calculé mois par mois avec la saisonnalité HS puis BS. Comparé au plafond toléré.',
      scenarioTrendData: scenarioTrends.series.payback,
      formatTrendValue: (v: number) => formatMonths(v),
    },
  ];

  const hsNetAfterTax =
    hs.seasonNetResultBeforeTaxAr > 0
      ? hs.seasonNetResultBeforeTaxAr * (1 - assumptions.corporateTaxRate)
      : hs.seasonNetResultBeforeTaxAr;
  const bsNetAfterTax =
    bs.seasonNetResultBeforeTaxAr > 0
      ? bs.seasonNetResultBeforeTaxAr * (1 - assumptions.corporateTaxRate)
      : bs.seasonNetResultBeforeTaxAr;

  const incomeRows: Array<{
    label: string;
    hsNum: number | null;
    bsNum: number | null;
    y1Num: number;
    pctNum: number;
    tone: 'highlight-positive' | 'cost' | 'subtotal' | 'default' | 'total';
  }> = [
    {
      label: "Chiffre d'affaires",
      hsNum: hs.totalTurnoverAr,
      bsNum: bs.totalTurnoverAr,
      y1Num: y1.totalTurnoverAr,
      pctNum: y1.totalTurnoverAr > 0 ? 1 : 0,
      tone: 'highlight-positive',
    },
    {
      label: '− Coûts d’achat paddy & exploitation',
      hsNum: hs.totalPurchaseAndOperatingCostsAr,
      bsNum: bs.totalPurchaseAndOperatingCostsAr,
      y1Num: y1.totalPurchaseAndOperatingCostsAr,
      pctNum: safeRatio(y1.totalPurchaseAndOperatingCostsAr, y1.totalTurnoverAr),
      tone: 'cost',
    },
    {
      label: '= Marge brute (avant charges fixes)',
      hsNum: hs.seasonGrossProfitAr,
      bsNum: bs.seasonGrossProfitAr,
      y1Num: y1.annualGrossProfitAr,
      pctNum: y1.grossMarginRate,
      tone: 'subtotal',
    },
    {
      label: '− Charges fixes d’exploitation',
      hsNum: hs.seasonFixedChargesAr,
      bsNum: bs.seasonFixedChargesAr,
      y1Num: y1.annualFixedChargesAr,
      pctNum: safeRatio(y1.annualFixedChargesAr, y1.totalTurnoverAr),
      tone: 'default',
    },
    {
      label: '= Bénéfice net avant Impôt (IR)',
      hsNum: hs.seasonNetResultBeforeTaxAr,
      bsNum: bs.seasonNetResultBeforeTaxAr,
      y1Num: y1.netResultBeforeTaxAr,
      pctNum: y1.netMarginBeforeTaxRate,
      tone: 'subtotal',
    },
    {
      label: `− Impôt sur le Revenu (IR ${taxLabel})`,
      hsNum: null,
      bsNum: null,
      y1Num: y1.corporateTaxAr,
      pctNum: safeRatio(y1.corporateTaxAr, y1.totalTurnoverAr),
      tone: 'cost',
    },
    {
      label: '= Bénéfice net après IR',
      hsNum: hsNetAfterTax,
      bsNum: bsNetAfterTax,
      y1Num: y1.netResultAfterTaxAr,
      pctNum: y1.netMarginAfterTaxRate,
      tone: 'total',
    },
  ];

  const errorCount = Object.keys(validation.errors).length;

  return (
    <div className="space-y-5">
      {/* Top Banner Card (Portfolio-style summary bar) */}
      <section className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-200">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Synthèse Financière &amp; Analytique
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="inline-flex items-center gap-1.5 font-semibold text-zinc-900 dark:text-zinc-100">
              <FolderKanban className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
              <span className="truncate max-w-[200px]">{activeProject.name}</span>
              {activeProject.source === 'excel' && (
                <span className="px-1.5 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-[10px] font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                  Excel
                </span>
              )}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate max-w-[200px]">
              {activeScenario?.name || 'Scénario actif'}
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              HS <AnimatedNumber value={hs.months} format={(v) => `${Math.round(v)}`} />m (
              <AnimatedNumber value={hs.rotationsPerMonth} format={(v) => `${Number(v.toFixed(1))}`} /> rot/m) / BS{' '}
              <AnimatedNumber value={bs.months} format={(v) => `${Math.round(v)}`} />m (
              <AnimatedNumber value={bs.rotationsPerMonth} format={(v) => `${Number(v.toFixed(1))}`} /> rot/m)
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono tabular-nums">
              <AnimatedNumber value={y1.totalRiceKgSold} format={(v) => formatKg(v)} /> riz/an
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 no-print">
          <button
            type="button"
            onClick={() => setAdviceModalOpen(true)}
            title="Générer des conseils stratégiques quantifiés via simulation de réduction des pertes"
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-teal-500/40 bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Compass className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Conseils stratégiques</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenKpiNotes(null, 'list')}
            title="Consulter ou ajouter des notes collaboratives sur les indicateurs"
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <MessageSquareText className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Notes ({kpiNotes.filter((n) => !n.resolved).length})</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('hypotheses')}
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.1] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Hypothèses</span>
          </button>
          <button
            type="button"
            onClick={exportToExcel}
            className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-indigo-600/20 dark:border-indigo-400/25 bg-indigo-600 hover:bg-indigo-500 dark:bg-[#242240] dark:hover:bg-[#2E2B52] text-xs font-semibold text-white transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-teal-300" aria-hidden="true" />
            <span>Exporter Excel</span>
          </button>
          {onExportPdf && (
            <button
              type="button"
              onClick={() => onExportPdf()}
              disabled={isExportingPdf}
              title="Exporter l’intégralité du tableau de bord, graphiques Recharts et tableaux de synthèse en PDF"
              className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-900 dark:text-zinc-100 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60 disabled:cursor-wait"
            >
              <FileDown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" aria-hidden="true" />
              <span>{isExportingPdf ? 'Export PDF…' : 'Exporter PDF'}</span>
            </button>
          )}
          {onOpenCustomPdfModal && (
            <button
              type="button"
              onClick={onOpenCustomPdfModal}
              disabled={isExportingPdf}
              title="Sélectionner les sections du rapport PDF (Tableau de bord, PESTEL, Sensibilité…)"
              className="min-h-11 sm:min-h-10 px-3.5 py-2 rounded-xl border border-indigo-500/35 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold text-indigo-800 dark:text-indigo-200 transition-colors inline-flex items-center gap-1.5 whitespace-nowrap disabled:opacity-60"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
              <span>PDF personnalisé</span>
            </button>
          )}
          <ExportMenu
            onExportExcel={exportToExcel}
            onExportPdf={onExportPdf}
            onOpenCustomPdfModal={onOpenCustomPdfModal}
            isExportingPdf={isExportingPdf}
            onExportDocx={onExportDocx}
            isExportingDocx={isExportingDocx}
            onExportSeasonalCsv={exportSeasonalIncomeStatementToCsv}
            onExportCsv5Y={exportFiveYearProjectionsToCsv}
            onExportCsv3Y={exportProjectionsToCsv}
            onExportJson={() => {
              const jsonStr = exportToJson();
              const blob = new Blob([jsonStr], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `hypotheses_riz_madagascar_${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
              notify('success', 'Fichier JSON exporté.');
            }}
            onExportGoogleSheets={onOpenGoogleSheetsExport}
            variant="dashboard"
          />
        </div>
      </section>

      {/* Dashboard View Switcher: Synthèse Globale vs Gestion de Trésorerie (Soudure) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div
          role="tablist"
          aria-label="Vues du tableau de bord"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] self-start max-w-full"
        >
          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'overview'}
            onClick={() => setDashboardView('overview')}
            className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboardView === 'overview'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Synthèse Financière</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'treasury'}
            onClick={() => setDashboardView('treasury')}
            className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboardView === 'treasury'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Gestion de Trésorerie</span>
            {treasuryQuickStatus.overallRisk !== 'optimal' && (
              <span
                className={`ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                  dashboardView === 'treasury'
                    ? 'bg-white/20 text-white'
                    : treasuryQuickStatus.overallRisk === 'critique'
                    ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                    : 'bg-amber-500/15 text-amber-800 dark:text-amber-300'
                }`}
              >
                Soudure
              </span>
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'seasonality'}
            onClick={() => setDashboardView('seasonality')}
            className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboardView === 'seasonality'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Analyse de Saisonnalité</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'market'}
            onClick={() => setDashboardView('market')}
            className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboardView === 'market'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Scale className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Comparaison Marché</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={dashboardView === 'annual'}
            onClick={() => setDashboardView('annual')}
            className={`min-h-9 px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 ${
              dashboardView === 'annual'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Comparaison Annuelle 5 ans</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setThresholdEditorOpen((prev) => !prev)}
            aria-expanded={thresholdEditorOpen}
            className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              kpiAlerts.hasAnyBreach
                ? 'border-rose-500/45 bg-rose-500/10 text-rose-800 dark:text-rose-200 hover:bg-rose-500/15'
                : thresholdEditorOpen
                ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200'
                : 'border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#11101C] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#1A192B]'
            }`}
          >
            <BellRing className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              Seuils alertes ({kpiAlerts.breachedItems.length > 0 ? `${kpiAlerts.breachedItems.length} alerte(s)` : 'OK'})
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setModalInitialDraft(pendingAutoEmailDraft);
              setEmailAlertsModalOpen(true);
            }}
            className={`min-h-9 px-3 py-1.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
              pendingAutoEmailDraft
                ? 'border-amber-500/50 bg-amber-500/15 text-amber-900 dark:text-amber-200 hover:bg-amber-500/20'
                : emailAlertConfig.enabled
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300'
                : 'border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#11101C] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-[#1A192B]'
            }`}
          >
            <Mail className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            <span>
              {pendingAutoEmailDraft
                ? 'Alerte e-mail prête'
                : emailAlertConfig.enabled
                ? 'Alertes e-mail (Actif)'
                : 'Alertes e-mail'}
            </span>
          </button>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 hidden xl:block">
            Astuce : <span className="font-medium text-zinc-700 dark:text-zinc-300">clic droit</span> sur un KPI pour annoter.
          </p>
        </div>
      </div>

      {/* Pending Automatic Email Alert Confirmation Banner */}
      {pendingAutoEmailDraft && (
        <section
          role="status"
          aria-label="Confirmation d'envoi d'alerte e-mail"
          className="p-3.5 rounded-2xl border border-amber-500/50 bg-amber-500/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print"
        >
          <div className="flex items-start gap-2.5 text-xs text-zinc-900 dark:text-zinc-100">
            <Mail className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold">
                Alerte e-mail prête à envoyer ({pendingAutoEmailDraft.breachedDetails.length} seuil(s) franchi(s))
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                Destinataire : <span className="font-mono">{pendingAutoEmailDraft.recipients.join(', ')}</span> ·{' '}
                {pendingAutoEmailDraft.breachedDetails.map((b) => b.label).join(', ')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                setAcknowledgedSignature(pendingAutoEmailDraft.signature);
                setPendingAutoEmailDraft(null);
              }}
              className="min-h-8 px-2.5 py-1 rounded-lg border border-zinc-300 dark:border-white/[0.15] text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.06]"
            >
              Ignorer
            </button>
            <button
              type="button"
              onClick={() => {
                setModalInitialDraft(pendingAutoEmailDraft);
                setEmailAlertsModalOpen(true);
              }}
              className="min-h-8 px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
            >
              Vérifier et envoyer
            </button>
          </div>
        </section>
      )}

      {/* Inline Dashboard KPI Threshold Configurator */}
      {thresholdEditorOpen && (
        <section
          aria-label="Configuration rapide des seuils critiques de notification"
          className="p-4 rounded-2xl border border-indigo-500/35 bg-white dark:bg-[#11101C] space-y-3 no-print"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-zinc-200 dark:border-white/[0.08]">
            <div>
              <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Seuils critiques de notification automatique (Tableau de bord)
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                Personnalisez les planchers critiques : toute dégradation sous ces seuils déclenche une alerte visuelle immédiate.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setThresholdEditorOpen(false)}
              className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 text-xs">
            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                Marge nette min (%)
              </span>
              <input
                type="number"
                step="1"
                min="-50"
                max="90"
                value={Number(((resolvedKpiThresholds.minNetMarginRate ?? 0.08) * 100).toFixed(1))}
                onChange={(e) =>
                  updateKpiThresholds({
                    minNetMarginRate: (Number(e.target.value) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                Marge opérationnelle min (%)
              </span>
              <input
                type="number"
                step="1"
                min="-50"
                max="90"
                value={Number(((resolvedKpiThresholds.minOperatingMarginRate ?? 0.1) * 100).toFixed(1))}
                onChange={(e) =>
                  updateKpiThresholds({
                    minOperatingMarginRate: (Number(e.target.value) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                Marge brute min (%)
              </span>
              <input
                type="number"
                step="1"
                min="-50"
                max="90"
                value={Number(((resolvedKpiThresholds.minGrossMarginRate ?? 0.2) * 100).toFixed(1))}
                onChange={(e) =>
                  updateKpiThresholds({
                    minGrossMarginRate: (Number(e.target.value) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                VAN minimale (M Ar)
              </span>
              <input
                type="number"
                step="1"
                value={Number((resolvedKpiThresholds.minNpvAr / 1e6).toFixed(1))}
                onChange={(e) =>
                  updateKpiThresholds({
                    minNpvAr: (Number(e.target.value) || 0) * 1e6,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                TRI minimal (%)
              </span>
              <input
                type="number"
                step="1"
                min="0"
                max="500"
                value={Number((resolvedKpiThresholds.minIrrRate * 100).toFixed(1))}
                onChange={(e) =>
                  updateKpiThresholds({
                    minIrrRate: (Number(e.target.value) || 0) / 100,
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>

            <label className="space-y-1">
              <span className="block font-medium text-zinc-700 dark:text-zinc-300">
                Payback max (mois)
              </span>
              <input
                type="number"
                step="1"
                min="1"
                max="120"
                value={resolvedKpiThresholds.maxPaybackMonths}
                onChange={(e) =>
                  updateKpiThresholds({
                    maxPaybackMonths: Math.max(1, Number(e.target.value) || 12),
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#171627] font-mono text-xs text-zinc-900 dark:text-white"
              />
            </label>
          </div>
        </section>
      )}

      {/* Validation Alert Banner */}
      {(errorCount > 0 || validation.warnings.length > 0) && (() => {
        const hasCriticalAlert =
          errorCount > 0 || validation.warnings.some((w) => w.severity === 'error');
        const primaryWarning = validation.warnings[0];
        return (
          <div
            role="alert"
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              hasCriticalAlert
                ? 'border-rose-500/45 bg-rose-500/10'
                : 'border-amber-500/40 bg-amber-500/10'
            }`}
          >
            <div
              className={`flex items-start gap-2.5 text-xs sm:text-sm ${
                hasCriticalAlert
                  ? 'text-rose-900 dark:text-rose-200'
                  : 'text-amber-900 dark:text-amber-200'
              }`}
            >
              <AlertTriangle
                className={`w-5 h-5 shrink-0 mt-0.5 ${
                  hasCriticalAlert
                    ? 'text-rose-700 dark:text-rose-400'
                    : 'text-amber-700 dark:text-amber-400'
                }`}
                aria-hidden="true"
              />
              <div>
                <div className="font-semibold">
                  {errorCount > 0
                    ? `${errorCount} erreur(s) de saisie détectée(s)`
                    : primaryWarning?.title || primaryWarning?.message}
                </div>
                <div className="text-xs mt-0.5">
                  {errorCount > 0
                    ? 'Certaines hypothèses contiennent des valeurs invalides pouvant fausser les indicateurs.'
                    : primaryWarning?.message}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('hypotheses')}
              className={`min-h-11 px-3.5 py-2 rounded-xl text-xs font-semibold text-white shrink-0 ${
                hasCriticalAlert
                  ? 'bg-rose-700 hover:bg-rose-600'
                  : 'bg-amber-700 hover:bg-amber-600'
              }`}
            >
              Corriger les hypothèses
            </button>
          </div>
        );
      })()}

      {/* KPI Threshold Breach Alert Banner (VAN / TRI / Payback) */}
      {kpiAlerts.hasAnyBreach && (
        <section
          role="alert"
          aria-label="Alertes de seuils KPI"
          className="animate-dashboard-card p-4 rounded-2xl border border-rose-500/60 bg-rose-500/[0.08] dark:bg-rose-950/30 space-y-3"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-rose-950 dark:text-rose-100">
              <AlertTriangle
                className="w-5 h-5 text-rose-700 dark:text-rose-400 shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <div>
                <div className="text-xs sm:text-sm font-bold">
                  Alerte seuil de rentabilité : {kpiAlerts.breachedItems.length} indicateur
                  {kpiAlerts.breachedItems.length > 1 ? 's' : ''} sous cible
                </div>
                <p className="text-xs text-rose-900/90 dark:text-rose-200/90 mt-0.5">
                  Les performances actuelles franchissent les seuils préconfigurés (marge nette, TRI, VAN, marges ou payback).
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0 no-print">
              <button
                type="button"
                onClick={() => {
                  const activeScName =
                    savedScenarios.find((s) => s.id === activeScenarioId)?.name ||
                    'Scénario courant';
                  const breaches = collectWatchedBreaches(
                    kpiAlerts,
                    treasurySmartAlert,
                    emailAlertConfig.watchedMetrics
                  );
                  const draft = buildAlertEmailDraft({
                    config: emailAlertConfig,
                    breachedDetails: breaches,
                    model,
                    projectName: activeProject.name,
                    scenarioName: activeScName,
                  });
                  setModalInitialDraft(draft);
                  setEmailAlertsModalOpen(true);
                }}
                className="min-h-10 px-3 py-2 rounded-xl border border-rose-500/40 bg-white dark:bg-[#19121B] hover:bg-rose-50 dark:hover:bg-rose-950/50 text-xs font-semibold text-rose-800 dark:text-rose-200 inline-flex items-center gap-1.5 transition-colors"
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Notifier par e-mail</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('hypotheses')}
                className="min-h-10 px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-xs font-semibold text-white transition-colors"
              >
                Ajuster seuils &amp; coûts
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {kpiAlerts.breachedItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.targetTab)}
                className="text-left p-2.5 rounded-xl border border-rose-500/40 bg-white/80 dark:bg-[#17111A]/80 hover:border-rose-500 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    {item.label}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-600/15 text-[10px] font-bold uppercase tracking-wider text-rose-800 dark:text-rose-300">
                    Hors seuil
                  </span>
                </div>
                <div className="mt-1 flex items-baseline justify-between gap-2 text-xs font-mono tabular-nums">
                  <span className="font-bold text-rose-700 dark:text-rose-300">
                    {item.actualFormatted}
                  </span>
                  <span className="text-[11px] text-zinc-600 dark:text-zinc-400">
                    Cible {item.thresholdFormatted}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Alerte intelligente Trésorerie (solde négatif >= 2 mois consécutifs) */}
      <TreasurySmartAlertBanner onOpenTreasury={() => setDashboardView('treasury')} />

      {dashboardView === 'treasury' ? (
        <TreasuryManagementView
          onKpiContextMenu={handleKpiContextMenu}
          getNoteCount={getNoteCount}
          onOpenKpiNotes={(target) => handleOpenKpiNotes(target, 'compose')}
        />
      ) : dashboardView === 'seasonality' ? (
        <SeasonalityAnalysisSection />
      ) : dashboardView === 'market' ? (
        <MarketComparisonView />
      ) : dashboardView === 'annual' ? (
        <AnnualComparisonView />
      ) : (
        <>
      {/* Widget Live Status — Rentabilité rafraîchie en temps réel sans sauvegarde manuelle */}
      <LiveStatusWidget onNavigate={onNavigate} onSaveScenario={onSaveScenario} />

      {/* 4-Card KPI Strip with Miniature Recharts Sparklines (Seasonal or Last 3 Scenarios) */}
      <section data-tour="kpi-strip" aria-label="Tendances des indicateurs clés" className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2 no-print">
          <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
            Micro-courbes KPI :{' '}
            <strong className="text-zinc-800 dark:text-zinc-200">
              {kpiSparklineMode === 'seasonal'
                ? 'Dynamique saisonnière (M1–M12)'
                : `Évolution sur les 3 derniers scénarios (${scenarioTrends.snapshots
                    .map((s) => s.shortLabel)
                    .join(' → ')})`}
            </strong>
          </span>
          <div
            role="group"
            aria-label="Mode des courbes KPI"
            className="inline-flex items-center p-0.5 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C]"
          >
            <button
              type="button"
              onClick={() => setKpiSparklineMode('seasonal')}
              className={`min-h-7 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                kpiSparklineMode === 'seasonal'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              Saisonnalité M1–M12
            </button>
            <button
              type="button"
              onClick={() => setKpiSparklineMode('scenarios')}
              className={`min-h-7 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors whitespace-nowrap ${
                kpiSparklineMode === 'scenarios'
                  ? 'bg-indigo-600 text-white'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              3 derniers scénarios
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Chiffre d'affaires (A1)"
            value={formatAriary(y1.totalTurnoverAr, { inMillions: inM })}
            animatedValue={y1.totalTurnoverAr}
            formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
            sub={
              <>
                <AnimatedNumber value={y1.totalRiceKgSold} format={(v) => formatKg(v)} /> · Saisonnalité HS/BS
              </>
            }
            icon={DollarSign}
            tone="info"
            tooltipAlign="left"
            tooltip="CA annuel = Σ (Rotations × (Riz usiné × Prix vente riz + Sous-produits × Prix)). La courbe reflète la transition Haute Saison → Basse Saison ou les 3 derniers scénarios."
            sparklineData={
              kpiSparklineMode === 'scenarios'
                ? scenarioTrends.series.ca
                : seasonalSparklines.turnoverData
            }
            sparklineAriaLabel={
              kpiSparklineMode === 'scenarios'
                ? "Évolution du Chiffre d'affaires sur les 3 derniers scénarios"
                : "Tendance saisonnière du Chiffre d'affaires"
            }
            sparklineColor="#818cf8"
            formatSparklineValue={(v) => formatAriary(v, { inMillions: true })}
            onClick={() => onNavigate('hypotheses')}
            noteCount={getNoteCount('ca_a1')}
            onOpenNotes={() =>
              handleOpenKpiNotes({
                kpiId: 'ca_a1',
                kpiLabel: "Chiffre d'affaires (A1)",
                kpiValueText: formatAriary(y1.totalTurnoverAr, { inMillions: inM }),
                targetTab: 'hypotheses',
              })
            }
            onContextMenu={(e) =>
              handleKpiContextMenu(e, {
                kpiId: 'ca_a1',
                kpiLabel: "Chiffre d'affaires (A1)",
                kpiValueText: formatAriary(y1.totalTurnoverAr, { inMillions: inM }),
                targetTab: 'hypotheses',
              })
            }
            className="animate-dashboard-card"
            style={{ animationDelay: '40ms' }}
          />

          <KpiCard
            label="Marge brute annuelle"
            value={formatAriary(y1.annualGrossProfitAr, { inMillions: inM })}
            animatedValue={y1.annualGrossProfitAr}
            formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
            sub={
              <>
                Taux de marge :{' '}
                <AnimatedNumber value={y1.grossMarginRate} format={(v) => formatPercent(v)} />
              </>
            }
            icon={Percent}
            tone={y1.annualGrossProfitAr >= 0 ? 'positive' : 'danger'}
            tooltip="Marge brute = Chiffre d’affaires − Coûts variables (paddy, transport/usinage, sacs et frais par rotation) avant charges fixes."
            sparklineData={
              kpiSparklineMode === 'scenarios'
                ? scenarioTrends.series.grossMargin
                : seasonalSparklines.grossMarginData
            }
            sparklineAriaLabel={
              kpiSparklineMode === 'scenarios'
                ? 'Évolution de la Marge brute sur les 3 derniers scénarios'
                : 'Tendance saisonnière de la Marge brute'
            }
            sparklineColor={y1.annualGrossProfitAr >= 0 ? '#38bdf8' : '#f43f5e'}
            formatSparklineValue={(v) => formatAriary(v, { inMillions: true })}
            onClick={() => onNavigate('breakeven')}
            noteCount={getNoteCount('marge_brute_a1')}
            onOpenNotes={() =>
              handleOpenKpiNotes({
                kpiId: 'marge_brute_a1',
                kpiLabel: 'Marge brute annuelle',
                kpiValueText: formatAriary(y1.annualGrossProfitAr, { inMillions: inM }),
                targetTab: 'breakeven',
              })
            }
            onContextMenu={(e) =>
              handleKpiContextMenu(e, {
                kpiId: 'marge_brute_a1',
                kpiLabel: 'Marge brute annuelle',
                kpiValueText: formatAriary(y1.annualGrossProfitAr, { inMillions: inM }),
                targetTab: 'breakeven',
              })
            }
            className="animate-dashboard-card"
            style={{ animationDelay: '85ms' }}
          />

          <KpiCard
            label="Bénéfice net après IR"
            value={formatAriary(y1.netResultAfterTaxAr, { inMillions: inM })}
            animatedValue={y1.netResultAfterTaxAr}
            formatAnimated={(v) => formatAriary(v, { inMillions: inM })}
            alertLabel={
              kpiAlerts.items.netMargin.breached ? 'Marge nette sous seuil' : undefined
            }
            sub={
              <>
                Marge nette :{' '}
                <AnimatedNumber value={y1.netMarginAfterTaxRate} format={(v) => formatPercent(v)} />{' '}
                · Seuil {kpiAlerts.items.netMargin.thresholdFormatted}
              </>
            }
            icon={kpiAlerts.items.netMargin.breached ? AlertTriangle : TrendingUp}
            tone={
              kpiAlerts.items.netMargin.breached || y1.netResultAfterTaxAr < 0
                ? 'danger'
                : 'positive'
            }
            tooltip={`Résultat net = (Marge brute − Charges fixes annuelles) × (1 − IR ${taxLabel}). Seuil alerte marge nette : ${kpiAlerts.items.netMargin.thresholdFormatted}.`}
            sparklineData={
              kpiSparklineMode === 'scenarios'
                ? scenarioTrends.series.netResult
                : seasonalSparklines.netCashFlowData
            }
            sparklineAriaLabel={
              kpiSparklineMode === 'scenarios'
                ? 'Évolution du Bénéfice net sur les 3 derniers scénarios'
                : 'Tendance mensuelle du Cash-Flow net'
            }
            sparklineColor={y1.netResultAfterTaxAr >= 0 ? '#2dd4bf' : '#f43f5e'}
            formatSparklineValue={(v) => formatAriary(v, { inMillions: true })}
            onClick={() => onNavigate('payback')}
            noteCount={getNoteCount('benefice_net_a1')}
            onOpenNotes={() =>
              handleOpenKpiNotes({
                kpiId: 'benefice_net_a1',
                kpiLabel: 'Bénéfice net après IR',
                kpiValueText: formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }),
                targetTab: 'payback',
              })
            }
            onContextMenu={(e) =>
              handleKpiContextMenu(e, {
                kpiId: 'benefice_net_a1',
                kpiLabel: 'Bénéfice net après IR',
                kpiValueText: formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }),
                targetTab: 'payback',
              })
            }
            className="animate-dashboard-card"
            style={{ animationDelay: '130ms' }}
          />

          <KpiCard
            label={`VAN à 3 ans (r = ${formatPercent(model.npv.discountRate, 0)})`}
            value={formatAriary(model.npv.npvAr, { inMillions: true })}
            animatedValue={model.npv.npvAr}
            formatAnimated={(v) => formatAriary(v, { inMillions: true })}
            alertLabel={
              kpiAlerts.items.van.breached && kpiAlerts.items.tri.breached
                ? 'VAN & TRI sous seuil'
                : kpiAlerts.items.van.breached
                ? 'VAN sous seuil'
                : kpiAlerts.items.tri.breached
                ? 'TRI sous seuil'
                : undefined
            }
            sub={
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={
                    kpiAlerts.items.tri.breached
                      ? 'font-semibold text-rose-700 dark:text-rose-300'
                      : undefined
                  }
                >
                  TRI :{' '}
                  {Number.isFinite(model.irr.irrValue) ? (
                    <AnimatedNumber value={model.irr.irrValue} format={(v) => formatPercent(v, 1)} />
                  ) : (
                    'N/A'
                  )}
                </span>
                <span>· {model.npv.decision}</span>
              </span>
            }
            icon={kpiAlerts.items.van.breached || kpiAlerts.items.tri.breached ? AlertTriangle : CheckCircle2}
            tone={
              kpiAlerts.items.van.breached || kpiAlerts.items.tri.breached || model.npv.npvAr <= 0
                ? 'danger'
                : 'positive'
            }
            tooltipAlign="right"
            tooltip={`VAN = −I₀ + Σ CFt / (1 + r)ᵗ sur A1–A3. Seuil VAN : ${kpiAlerts.items.van.thresholdFormatted} · Seuil TRI : ${kpiAlerts.items.tri.thresholdFormatted}.`}
            sparklineData={
              kpiSparklineMode === 'scenarios'
                ? scenarioTrends.series.van
                : seasonalSparklines.projection3YData
            }
            sparklineAriaLabel={
              kpiSparklineMode === 'scenarios'
                ? 'Évolution de la VAN sur les 3 derniers scénarios'
                : 'Trajectoire VAN 3 ans'
            }
            sparklineColor={
              kpiAlerts.items.van.breached || kpiAlerts.items.tri.breached || model.npv.npvAr <= 0
                ? '#f43f5e'
                : '#2dd4bf'
            }
            formatSparklineValue={(v) => formatAriary(v, { inMillions: true })}
            onClick={() => onNavigate('vantri')}
            noteCount={getNoteCount('van_3ans')}
            onOpenNotes={() =>
              handleOpenKpiNotes({
                kpiId: 'van_3ans',
                kpiLabel: 'VAN à 3 ans',
                kpiValueText: formatAriary(model.npv.npvAr, { inMillions: true }),
                targetTab: 'vantri',
              })
            }
            onContextMenu={(e) =>
              handleKpiContextMenu(e, {
                kpiId: 'van_3ans',
                kpiLabel: 'VAN à 3 ans',
                kpiValueText: formatAriary(model.npv.npvAr, { inMillions: true }),
                targetTab: 'vantri',
              })
            }
            className="animate-dashboard-card"
            style={{ animationDelay: '175ms' }}
          />
        </div>
      </section>

      {/* Alerte Stock Paddy vs Seuil de Sécurité */}
      <PaddyStockAlertWidget onNavigate={onNavigate} />

      {/* Module Diagnostic Sanitaire du projet (Vert / Orange / Rouge) */}
      <ProjectHealthDiagnosticCard onNavigate={onNavigate} />

      {/* Primary Asymmetric Bento Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (8/12): Hero Curve + 2-Card Breakdown + Profit & Loss Bars */}
        <div className="xl:col-span-8 space-y-5 min-w-0">
          {/* 1. Hero Interactive Portfolio-Style Cash Flow Curve */}
          <section
            data-pdf-chart="cashflow"
            style={{ animationDelay: '200ms' }}
            className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 transition-colors duration-200"
          >
            <DynamicCashFlowHeroChart
              cashFlows={model.payback.monthlyCashFlows}
              fundsInvested={model.investment.fundsToRaiseAr}
              paybackMonth={model.payback.paybackMonths}
              roiRatio={model.investment.roiRatio}
              inMillions={inM}
            />
          </section>

          {/* 2. Two-Card Financial Breakdown (Net Result & Capital Structure) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card A: Structure du Résultat */}
            <section
              style={{ animationDelay: '240ms' }}
              onContextMenu={(e) =>
                handleKpiContextMenu(e, {
                  kpiId: 'benefice_net_annuel_detail',
                  kpiLabel: `Bénéfice Net Annuel (Après IR ${taxLabel})`,
                  kpiValueText: formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }),
                  targetTab: 'projections',
                })
              }
              className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col justify-between transition-colors duration-200 hover:border-zinc-300 dark:hover:border-white/[0.14]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span>Bénéfice Net Annuel (Après IR {taxLabel})</span>
                    <Tooltip
                      align="left"
                      label="Bénéfice Net Annuel"
                      content="Résultat net après déduction des coûts d’exploitation, des charges fixes annuelles et de l’impôt sur le revenu (IR)."
                    />
                  </div>
                  {getNoteCount('benefice_net_annuel_detail') > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenKpiNotes({
                          kpiId: 'benefice_net_annuel_detail',
                          kpiLabel: `Bénéfice Net Annuel (Après IR ${taxLabel})`,
                          kpiValueText: formatAriary(y1.netResultAfterTaxAr, { inMillions: inM }),
                          targetTab: 'projections',
                        })
                      }
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono text-[11px] no-print"
                    >
                      <MessageSquareText className="w-3 h-3" aria-hidden="true" />
                      <span>{getNoteCount('benefice_net_annuel_detail')}</span>
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <AnimatedNumber
                    value={y1.netResultAfterTaxAr}
                    format={(v) => formatAriary(v, { inMillions: inM })}
                    className={`text-2xl font-bold font-mono tracking-tight ${
                      y1.netResultAfterTaxAr >= 0
                        ? 'text-zinc-900 dark:text-white'
                        : 'text-rose-700 dark:text-rose-400'
                    }`}
                  />
                  <span className="text-xs font-mono font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                    <AnimatedNumber value={y1.netMarginAfterTaxRate} format={(v) => formatPercent(v)} />{' '}
                    net
                  </span>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-sans text-zinc-600 dark:text-zinc-400">Chiffre d&apos;affaires Année 1</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    <AnimatedNumber
                      value={y1.totalTurnoverAr}
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-sans text-zinc-600 dark:text-zinc-400">
                    Marge brute (<AnimatedNumber value={y1.grossMarginRate} format={(v) => formatPercent(v)} />)
                  </dt>
                  <dd className="font-semibold text-teal-700 dark:text-teal-400 tabular-nums">
                    <AnimatedNumber
                      value={y1.annualGrossProfitAr}
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </dd>
                </div>

                {/* Indented Seasonal Sub-Rows */}
                <div className="ml-1 pl-3 border-l border-zinc-200 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-sans text-zinc-600 dark:text-zinc-400">
                      Résultat avant IR · HS ({hs.months}m)
                    </dt>
                    <dd className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                      <AnimatedNumber
                        value={hs.seasonNetResultBeforeTaxAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-sans text-zinc-600 dark:text-zinc-400">
                      Résultat avant IR · BS ({bs.months}m)
                    </dt>
                    <dd className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                      <AnimatedNumber
                        value={bs.seasonNetResultBeforeTaxAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-100 dark:border-white/[0.06]">
                  <dt className="font-sans text-zinc-600 dark:text-zinc-400">Impôt sur le Revenu (IR)</dt>
                  <dd className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                    −{' '}
                    <AnimatedNumber
                      value={y1.corporateTaxAr}
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </dd>
                </div>
              </dl>
            </section>

            {/* Card B: Capital & Répartition */}
            <section
              style={{ animationDelay: '280ms' }}
              onContextMenu={(e) =>
                handleKpiContextMenu(e, {
                  kpiId: 'fonds_initial_i0',
                  kpiLabel: 'Fonds Initial à Lever (I₀)',
                  kpiValueText: formatAriary(model.investment.fundsToRaiseAr, { inMillions: inM }),
                  targetTab: 'payback',
                })
              }
              className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 flex flex-col justify-between transition-colors duration-200 hover:border-zinc-300 dark:hover:border-white/[0.14]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  <div className="flex items-center gap-1.5">
                    <span>Fonds Initial à Lever (I₀)</span>
                    <Tooltip
                      align="left"
                      label="Fonds initial à lever"
                      content="I₀ = BFR d’une rotation Haute Saison + Matériel + Enregistrement + Cash buffer, arrondi au millier d’Ariary supérieur."
                    />
                  </div>
                  {getNoteCount('fonds_initial_i0') > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenKpiNotes({
                          kpiId: 'fonds_initial_i0',
                          kpiLabel: 'Fonds Initial à Lever (I₀)',
                          kpiValueText: formatAriary(model.investment.fundsToRaiseAr, { inMillions: inM }),
                          targetTab: 'payback',
                        })
                      }
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 font-mono text-[11px] no-print"
                    >
                      <MessageSquareText className="w-3 h-3" aria-hidden="true" />
                      <span>{getNoteCount('fonds_initial_i0')}</span>
                    </button>
                  )}
                </div>
                <div className="mt-1 flex items-baseline gap-2.5">
                  <AnimatedNumber
                    value={model.investment.fundsToRaiseAr}
                    format={(v) => formatAriary(v, { inMillions: inM })}
                    className="text-2xl font-bold font-mono tracking-tight text-zinc-900 dark:text-white"
                  />
                  <span className="text-xs font-mono font-semibold text-indigo-700 dark:text-indigo-400 tabular-nums">
                    ROI <AnimatedNumber value={model.investment.roiRatio} format={(v) => `${v.toFixed(2)}x`} />
                  </span>
                </div>
              </div>

              <dl className="mt-5 space-y-2.5 text-xs font-mono">
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-sans text-zinc-600 dark:text-zinc-400">BFR 1ère rotation HS</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    <AnimatedNumber
                      value={model.investment.rotationWorkingCapitalHSAr}
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-sans text-zinc-600 dark:text-zinc-400">Matériel &amp; Cash buffer</dt>
                  <dd className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    <AnimatedNumber
                      value={
                        model.investment.materielAr +
                        model.investment.enregistrementAr +
                        model.investment.cashBufferAr
                      }
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </dd>
                </div>

                {/* Indented Profit-Share Sub-Rows */}
                <div className="ml-1 pl-3 border-l border-zinc-200 dark:border-white/15 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-sans text-zinc-600 dark:text-zinc-400">
                      Part Investisseur ({investorPct})
                    </dt>
                    <dd className="font-medium text-teal-700 dark:text-teal-400 tabular-nums">
                      <AnimatedNumber
                        value={y1.investorShareAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <dt className="font-sans text-zinc-600 dark:text-zinc-400">
                      Part Société ({companyPct})
                    </dt>
                    <dd className="font-medium text-zinc-800 dark:text-zinc-200 tabular-nums">
                      <AnimatedNumber
                        value={y1.companyShareAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                </div>

                <div
                  className={`flex items-center justify-between gap-2 pt-1.5 border-t ${
                    kpiAlerts.items.payback.breached
                      ? 'border-rose-500/40 bg-rose-500/[0.08] -mx-2 px-2 py-1.5 rounded-lg'
                      : 'border-zinc-100 dark:border-white/[0.06]'
                  }`}
                >
                  <dt className="font-sans flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
                    {kpiAlerts.items.payback.breached && (
                      <AlertTriangle
                        className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span
                      className={
                        kpiAlerts.items.payback.breached
                          ? 'font-semibold text-rose-800 dark:text-rose-200'
                          : ''
                      }
                    >
                      Payback saisonnier
                    </span>
                  </dt>
                  <dd
                    className={`font-semibold tabular-nums ${
                      kpiAlerts.items.payback.breached
                        ? 'text-rose-700 dark:text-rose-300'
                        : 'text-zinc-900 dark:text-zinc-100'
                    }`}
                  >
                    {model.payback.isRecoveredWithin36Months ? (
                      <AnimatedNumber value={model.payback.paybackMonths} format={(v) => formatMonths(v)} />
                    ) : (
                      '> 36 mois'
                    )}
                    {kpiAlerts.items.payback.breached && (
                      <span className="ml-1.5 text-[10px] font-sans font-bold uppercase tracking-wider">
                        ({kpiAlerts.items.payback.thresholdFormatted})
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* 3. Profit & Loss Interactive Matrix Chart */}
          <section
            data-pdf-chart="profitloss"
            style={{ animationDelay: '320ms' }}
            className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-4 sm:p-5 transition-colors duration-200"
          >
            <DynamicProfitLossMatrixChart
              cashFlows={model.payback.monthlyCashFlows}
              projections={model.projections.realistic}
              ambitiousProjections={model.projections.ambitious}
              inMillions={inM}
            />
          </section>
        </div>

        {/* RIGHT COLUMN (4/12): Quick Simulator ("Swap" style) + Revenue Allocation + Key Indicators */}
        <div className="xl:col-span-4 space-y-5 min-w-0">
          {/* 1. Interactive Quick Simulator Card ("Swap"-inspired, masqué à l'impression) */}
          <section
            data-tour="quick-simulator"
            style={{ animationDelay: '220ms' }}
            className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 no-print transition-colors duration-200"
          >
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Simulateur Rapide
                </h2>
                <Tooltip
                  align="left"
                  label="Simulateur Rapide"
                  content="Modifie directement les variables clés de la saison sélectionnée (Prix de vente et Rotations/mois) avec recalcul immédiat de tous les indicateurs."
                />
              </div>
              <button
                type="button"
                onClick={resetToDefaults}
                title="Réinitialiser les leviers aux valeurs de référence"
                className="min-h-8 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-white/[0.06] inline-flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" aria-hidden="true" />
                <span>Réinitialiser</span>
              </button>
            </div>

            <div className="relative space-y-2">
              {/* Top Lever Block: Selling Price */}
              <div className="rounded-xl p-3.5 bg-zinc-50 dark:bg-[#171627] border border-zinc-200 dark:border-white/[0.07]">
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                  <LabelWithTooltip
                    htmlFor="quick-sim-price"
                    label={`${simSeason === 'hauteSaison' ? 'Haute Saison' : 'Basse Saison'} · Prix riz`}
                    unit="Ar / kg"
                    tooltip="Prix unitaire de vente du riz usiné au kg. Multiplié par le volume de riz obtenu (Paddy × Rendement) pour former le CA."
                    className="text-xs text-zinc-600 dark:text-zinc-400"
                  />
                  <span className="font-mono tabular-nums">
                    Rendement :{' '}
                    <AnimatedNumber
                      value={activeSeasonAssumptions.yieldPaddyToRice}
                      format={(v) => formatPercent(v, 0)}
                    />
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Diminuer le prix de vente de 50 Ar/kg"
                      onClick={() =>
                        updateSeasonField(
                          simSeason,
                          'riceSellingPriceArPerKg',
                          Math.max(100, activeSeasonAssumptions.riceSellingPriceArPerKg - 50),
                          'Simulateur'
                        )
                      }
                      className="min-h-10 min-w-10 rounded-lg bg-white dark:bg-[#23213A] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2C2A48] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Augmenter le prix de vente de 50 Ar/kg"
                      onClick={() =>
                        updateSeasonField(
                          simSeason,
                          'riceSellingPriceArPerKg',
                          activeSeasonAssumptions.riceSellingPriceArPerKg + 50,
                          'Simulateur'
                        )
                      }
                      className="min-h-10 min-w-10 rounded-lg bg-white dark:bg-[#23213A] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2C2A48] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <input
                        id="quick-sim-price"
                        type="number"
                        step="50"
                        min="0"
                        aria-label="Prix de vente du riz par kg en Ariary"
                        value={activeSeasonAssumptions.riceSellingPriceArPerKg}
                        onChange={(e) =>
                          updateSeasonField(
                            simSeason,
                            'riceSellingPriceArPerKg',
                            parseFloat(e.target.value),
                            'Simulateur'
                          )
                        }
                        className="w-24 text-right bg-transparent text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
                      />
                      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">Ar/kg</span>
                    </div>
                    <div className="text-[11px] font-mono text-zinc-600 dark:text-zinc-400 tabular-nums mt-0.5">
                      CA/rot :{' '}
                      <AnimatedNumber
                        value={activeSeasonResult.turnoverPerRotationAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Central Circular Season Swap Button */}
              <div className="flex justify-center -my-3 relative z-10">
                <button
                  type="button"
                  onClick={() =>
                    setSimSeason((prev) => (prev === 'hauteSaison' ? 'basseSaison' : 'hauteSaison'))
                  }
                  title="Basculer entre Haute Saison et Basse Saison"
                  aria-label={`Saison simulée : ${simSeason === 'hauteSaison' ? 'Haute Saison' : 'Basse Saison'}. Cliquer pour basculer.`}
                  className="w-10 h-10 rounded-full bg-white dark:bg-[#19182B] border border-zinc-300 dark:border-white/[0.14] shadow-sm flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                >
                  <ArrowUpDown className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              {/* Bottom Lever Block: Rotations & Resulting Impact */}
              <div className="rounded-xl p-3.5 bg-zinc-50 dark:bg-[#171627] border border-zinc-200 dark:border-white/[0.07]">
                <div className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400 mb-2">
                  <LabelWithTooltip
                    htmlFor="quick-sim-rotations"
                    label={`Rotations / mois (${activeSeasonResult.months} mois)`}
                    unit="rotations / mois"
                    tooltip="Nombre de cycles d’achat de paddy, usinage et vente réalisés chaque mois pendant la saison."
                    className="text-xs text-zinc-600 dark:text-zinc-400"
                  />
                  <span className="font-mono tabular-nums">
                    <AnimatedNumber
                      value={activeSeasonResult.totalRotations}
                      format={(v) => `${Math.round(v)} rotations`}
                    />
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Diminuer les rotations de 0,5 par mois"
                      onClick={() =>
                        updateSeasonField(
                          simSeason,
                          'rotationsPerMonth',
                          Math.max(0.5, Number((activeSeasonAssumptions.rotationsPerMonth - 0.5).toFixed(2))),
                          'Simulateur'
                        )
                      }
                      className="min-h-10 min-w-10 rounded-lg bg-white dark:bg-[#23213A] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2C2A48] transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      aria-label="Augmenter les rotations de 0,5 par mois"
                      onClick={() =>
                        updateSeasonField(
                          simSeason,
                          'rotationsPerMonth',
                          Number((activeSeasonAssumptions.rotationsPerMonth + 0.5).toFixed(2)),
                          'Simulateur'
                        )
                      }
                      className="min-h-10 min-w-10 rounded-lg bg-white dark:bg-[#23213A] border border-zinc-200 dark:border-white/[0.08] flex items-center justify-center text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-[#2C2A48] transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <div className="text-right">
                    <div className="flex items-baseline justify-end gap-1">
                      <input
                        id="quick-sim-rotations"
                        type="number"
                        step="0.5"
                        min="0"
                        aria-label="Nombre de rotations par mois"
                        value={activeSeasonAssumptions.rotationsPerMonth}
                        onChange={(e) =>
                          updateSeasonField(
                            simSeason,
                            'rotationsPerMonth',
                            parseFloat(e.target.value),
                            'Simulateur'
                          )
                        }
                        className="w-16 text-right bg-transparent text-lg font-bold font-mono tabular-nums text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-indigo-500"
                      />
                      <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400">rot/m</span>
                    </div>
                    <div className="text-[11px] font-mono tabular-nums mt-0.5 text-teal-700 dark:text-teal-400">
                      Net A1 :{' '}
                      <AnimatedNumber
                        value={y1.netResultAfterTaxAr}
                        format={(v) => formatAriary(v, { inMillions: true })}
                      />{' '}
                      (
                      <AnimatedNumber
                        value={y1.netMarginAfterTaxRate}
                        format={(v) => formatPercent(v)}
                      />
                      )
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('hypotheses')}
              className="mt-4 w-full min-h-11 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-[#222038] dark:hover:bg-[#2C294A] border border-transparent dark:border-white/[0.08] text-white text-xs font-semibold transition-colors"
            >
              Éditer toutes les hypothèses
            </button>
          </section>

          {/* 2. Allocation du Chiffre d'Affaires ("Token Allocation" style) */}
          <section
            style={{ animationDelay: '260ms' }}
            className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 space-y-4 transition-colors duration-200"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Allocation du Chiffre d&apos;Affaires
                </h2>
                <Tooltip
                  align="left"
                  label="Allocation du Chiffre d'Affaires"
                  content="Ventilation proportionnelle du CA annuel entre achats/coûts variables, charges fixes d’exploitation, impôt IR et bénéfice net conservé."
                />
              </div>
              <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 tabular-nums">
                <AnimatedNumber
                  value={y1.totalTurnoverAr}
                  format={(v) => formatAriary(v, { inMillions: true })}
                />
              </span>
            </div>

            {/* Segmented Horizontal Capsule Bar */}
            <div
              className="flex h-7 w-full gap-1 rounded-lg overflow-hidden"
              role="img"
              aria-label="Répartition en pourcentage du chiffre d'affaires annuel"
            >
              {allocationItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onMouseEnter={() => setHighlightedSlice(item.id)}
                  onMouseLeave={() => setHighlightedSlice(null)}
                  onClick={() =>
                    setHighlightedSlice((prev) => (prev === item.id ? null : item.id))
                  }
                  style={{ width: `${Math.max(item.pct, 4)}%` }}
                  aria-label={`${item.label} : ${item.pct.toFixed(1)} pour cent`}
                  className={`h-full rounded-md ${item.barColor} transition-all duration-200 ${
                    highlightedSlice && highlightedSlice !== item.id ? 'opacity-35' : 'opacity-100'
                  }`}
                />
              ))}
            </div>

            {/* Legend Grid */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {allocationItems.map((item) => (
                <div
                  key={item.id}
                  onMouseEnter={() => setHighlightedSlice(item.id)}
                  onMouseLeave={() => setHighlightedSlice(null)}
                  className={`rounded-lg p-2 -m-1 transition-colors cursor-default ${
                    highlightedSlice === item.id
                      ? 'bg-zinc-100 dark:bg-white/[0.06]'
                      : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${item.dotColor}`} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white">
                      <AnimatedNumber value={item.pct} format={(v) => `${v.toFixed(0)}%`} />
                    </span>
                    <span className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      <AnimatedNumber
                        value={item.amount}
                        format={(v) => formatAriary(v, { inMillions: true })}
                      />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. Key Indicators & Thresholds ("Assets"-style list with 3-scenario trend sparklines) */}
          <section
            style={{ animationDelay: '300ms' }}
            className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] p-5 transition-colors duration-200"
          >
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
                  Indicateurs Clés &amp; Seuils
                </h2>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sparklines : évolution sur les 3 derniers scénarios
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('scenarios')}
                className="no-print text-xs font-medium text-indigo-700 dark:text-indigo-400 hover:underline shrink-0"
              >
                Scénarios →
              </button>
            </div>

            <div className="divide-y divide-zinc-100 dark:divide-white/[0.06]">
              {keyIndicators.map((ind) => {
                const Icon = ind.isThresholdAlert ? AlertTriangle : ind.icon;
                const rowNoteCount = getNoteCount(ind.id);
                const rowTarget: KpiContextTarget = {
                  kpiId: ind.id,
                  kpiLabel: ind.title,
                  kpiValueText: ind.formatVal(ind.numericVal),
                  targetTab: ind.tab,
                };
                return (
                  <div
                    key={ind.id}
                    onContextMenu={(e) => handleKpiContextMenu(e, rowTarget)}
                    className={`group py-3 first:pt-2 last:pb-2 flex items-center justify-between gap-2.5 transition-colors ${
                      ind.isThresholdAlert
                        ? 'bg-rose-500/[0.08] dark:bg-rose-950/35 border border-rose-500/45 rounded-xl px-2.5 -mx-2.5 my-1'
                        : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => onNavigate(ind.tab)}
                        aria-label={`Ouvrir l'analyse : ${ind.title}`}
                        className={`w-8 h-8 rounded-full border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          ind.isThresholdAlert
                            ? 'bg-rose-500/15 border-rose-500/50 hover:border-rose-500'
                            : 'bg-zinc-100 dark:bg-[#1C1B2E] border-zinc-200 dark:border-white/[0.08] hover:border-indigo-500/50'
                        }`}
                      >
                        <Icon
                          className={`w-3.5 h-3.5 ${
                            ind.positive
                              ? 'text-teal-700 dark:text-teal-400'
                              : 'text-rose-700 dark:text-rose-400'
                          }`}
                          aria-hidden="true"
                        />
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onNavigate(ind.tab)}
                            className={`text-xs font-semibold truncate text-left cursor-pointer transition-colors ${
                              ind.isThresholdAlert
                                ? 'text-rose-900 dark:text-rose-200 hover:underline'
                                : 'text-zinc-900 dark:text-white hover:text-indigo-700 dark:hover:text-indigo-300'
                            }`}
                          >
                            {ind.title}
                          </button>
                          <Tooltip content={ind.tooltip} label={ind.title} align="right" />
                          <button
                            type="button"
                            onClick={() => handleOpenKpiNotes(rowTarget, 'compose')}
                            title={
                              rowNoteCount > 0
                                ? `${rowNoteCount} note(s) — cliquer pour ouvrir`
                                : 'Ajouter une note (ou clic droit)'
                            }
                            aria-label={`Notes sur ${ind.title}`}
                            className={`ml-0.5 px-1 py-0.5 rounded inline-flex items-center gap-0.5 text-[10px] font-mono tabular-nums no-print transition-opacity ${
                              rowNoteCount > 0
                                ? 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 opacity-100'
                                : 'text-zinc-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
                            }`}
                          >
                            <MessageSquareText className="w-3 h-3" aria-hidden="true" />
                            {rowNoteCount > 0 && <span>{rowNoteCount}</span>}
                          </button>
                        </div>
                        <div className="text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                          {ind.sub}
                        </div>
                      </div>
                    </div>

                    {/* Micro-Sparkline: 3 last saved scenarios */}
                    <div
                      className="w-16 sm:w-20 shrink-0"
                      title={`Évolution 3 derniers scénarios : ${ind.title}`}
                    >
                      <SparklineChart
                        data={ind.scenarioTrendData}
                        color={ind.positive ? '#2dd4bf' : '#f43f5e'}
                        height={28}
                        formatValue={ind.formatTrendValue}
                        ariaLabel={`Tendance 3 derniers scénarios : ${ind.title}`}
                      />
                    </div>

                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div
                        className={`text-xs sm:text-sm font-bold ${
                          ind.isThresholdAlert
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-zinc-900 dark:text-white'
                        }`}
                      >
                        <AnimatedNumber value={ind.numericVal} format={ind.formatVal} />
                      </div>
                      <div
                        className={`text-[11px] font-medium ${
                          ind.positive
                            ? 'text-teal-700 dark:text-teal-400'
                            : 'text-rose-700 dark:text-rose-400'
                        }`}
                      >
                        {ind.isThresholdAlert ? `Alerte · ${ind.delta}` : ind.delta}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Répartition des Coûts Opérationnels (Donut) & Monte Carlo Rapide (100 itérations) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-stretch">
        <div className="xl:col-span-5 min-w-0">
          <OperationalCostDonutCard onNavigate={onNavigate} />
        </div>
        <div className="xl:col-span-7 min-w-0">
          <QuickMonteCarloDashboardCard onNavigate={onNavigate} />
        </div>
      </div>

      {/* Statut du Service E-mail (Gmail API) & Journal des Alertes Envoyées (avec export CSV) */}
      <EmailServiceStatusWidget
        onNavigate={onNavigate}
        onOpenEmailModal={() => {
          setModalInitialDraft(null);
          setEmailAlertsModalOpen(true);
        }}
      />

      {/* Comparaison visuelle CA & Marge Nette (Scénario Actuel vs Référence) */}
      <ScenarioVsBaselineChartCard />

      {/* Comparaison Côte à Côte de Deux Scénarios (Dashboard module) */}
      <ScenarioSideBySideCard onNavigate={onNavigate} />

      {/* Radar comparatif des zones de production rizicole à Madagascar (VAN / TRI) */}
      <ZoneProfitabilityRadarCard
        onKpiContextMenu={handleKpiContextMenu}
        getNoteCount={getNoteCount}
        onOpenKpiNotes={(target) => handleOpenKpiNotes(target, 'compose')}
      />

      {/* Simulateur interactif de marge brute par sac de riz */}
      <BagMarginSimulatorCard />

      {/* Analyse du cycle de vie du produit (Paddy -> Riz usiné) */}
      <ProductLifecycleCard />

      {/* High Season vs Low Season Comparison */}
      <section
        style={{ animationDelay: '340ms' }}
        className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden transition-colors duration-200"
      >
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600 dark:text-indigo-400" aria-hidden="true" />
            <span>Décomposition Opérationnelle Saisonnière</span>
          </h2>
          <span className="text-xs text-zinc-600 dark:text-zinc-400 font-mono tabular-nums">
            <AnimatedNumber value={hs.months + bs.months} format={(v) => `${Math.round(v)}`} /> mois ={' '}
            <AnimatedNumber value={hs.months} format={(v) => `${Math.round(v)}`} />m HS +{' '}
            <AnimatedNumber value={bs.months} format={(v) => `${Math.round(v)}`} />m BS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-white/[0.08]">
          {[
            {
              title: 'Haute Saison (HS)',
              season: hs,
              accentClass: 'text-indigo-700 dark:text-indigo-400',
              tagBgClass: 'bg-indigo-500/10 text-indigo-800 dark:text-indigo-300',
            },
            {
              title: 'Basse Saison (BS)',
              season: bs,
              accentClass: 'text-teal-700 dark:text-teal-400',
              tagBgClass: 'bg-teal-500/10 text-teal-800 dark:text-teal-300',
            },
          ].map(({ title, season, accentClass, tagBgClass }) => {
            const monthlyFixed = season.months > 0 ? season.seasonFixedChargesAr / season.months : 0;
            return (
              <div key={title} className="p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className={`text-xs font-bold uppercase tracking-wider ${accentClass}`}>
                      {title}
                    </span>
                    <span className="text-xs text-zinc-600 dark:text-zinc-400 ml-2">
                      · <AnimatedNumber value={season.months} format={(v) => `${Math.round(v)}`} /> mois
                    </span>
                  </div>
                  <span className={`text-xs font-mono px-2.5 py-1 rounded-md font-semibold tabular-nums ${tagBgClass}`}>
                    <AnimatedNumber value={season.rotationsPerMonth} format={(v) => `${Number(v.toFixed(1))}`} /> rot/mois (
                    <AnimatedNumber value={season.totalRotations} format={(v) => `${Math.round(v)}`} /> total)
                  </span>
                </div>

                <dl className="space-y-2 text-xs font-mono tabular-nums">
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Paddy acheté / rotation :</dt>
                    <dd className="font-semibold text-right">
                      <AnimatedNumber value={season.paddyKgPerRotation} format={(v) => formatKg(v)} />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Rendement paddy → riz :</dt>
                    <dd className="font-semibold text-right">
                      <AnimatedNumber value={season.yieldRatio} format={(v) => formatPercent(v)} /> (
                      <AnimatedNumber value={season.riceKgPerRotation} format={(v) => formatKg(v)} /> riz)
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Prix de vente du riz :</dt>
                    <dd className="font-semibold text-right">
                      <AnimatedNumber value={season.riceSellingPriceAr} format={(v) => formatAriary(v)} /> / kg
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">CA par rotation :</dt>
                    <dd className="font-semibold text-teal-700 dark:text-teal-400 text-right">
                      <AnimatedNumber
                        value={season.turnoverPerRotationAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Coût total par rotation :</dt>
                    <dd className="font-semibold text-rose-700 dark:text-rose-400 text-right">
                      <AnimatedNumber
                        value={season.totalCostPerRotationAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Bénéfice par rotation (brut) :</dt>
                    <dd className="font-semibold text-right">
                      <AnimatedNumber
                        value={season.grossProfitPerRotationAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 py-1.5 border-b border-zinc-100 dark:border-white/[0.05]">
                    <dt className="text-zinc-600 dark:text-zinc-400 font-sans">Charges fixes / mois :</dt>
                    <dd className="font-semibold text-right">
                      <AnimatedNumber
                        value={monthlyFixed}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2 pt-1.5 font-bold text-sm">
                    <dt className="text-zinc-800 dark:text-zinc-200 font-sans">Résultat net mensuel avant IR :</dt>
                    <dd
                      className={`text-right ${
                        season.monthlyNetResultBeforeTaxAr >= 0
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-rose-700 dark:text-rose-400'
                      }`}
                    >
                      <AnimatedNumber
                        value={season.monthlyNetResultBeforeTaxAr}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comprehensive Income Statement */}
      <section
        style={{ animationDelay: '380ms' }}
        className="animate-dashboard-card rounded-2xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden transition-colors duration-200"
      >
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-white">
              Compte de Résultat Simplifié (Année 1)
            </h2>
            <span className="text-xs text-zinc-600 dark:text-zinc-400">
              Montants exprimés en {inM ? 'Millions d’Ariary (M Ar)' : 'Ariary (Ar)'}
            </span>
          </div>
          <div className="no-print">
            <ViewToggle mode={mobileView} onChange={setMobileView} />
          </div>
        </div>

        {/* Mobile Stacked Cards */}
        {mobileView === 'cards' && (
          <div className="sm:hidden divide-y divide-zinc-200 dark:divide-white/[0.08] no-print">
            {incomeRows.map((row, idx) => (
              <div
                key={idx}
                className={`p-4 space-y-2 ${
                  row.tone === 'total'
                    ? 'bg-teal-500/10'
                    : row.tone === 'subtotal'
                    ? 'bg-zinc-50 dark:bg-white/[0.03]'
                    : ''
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                    {row.label}
                  </span>
                  <span className="text-xs font-mono font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                    <AnimatedNumber value={row.pctNum} format={(v) => formatPercent(v)} /> CA
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs font-mono tabular-nums pt-1">
                  <div>
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      HS ({hs.months}m)
                    </div>
                    <div className="font-medium mt-0.5">
                      {row.hsNum === null ? (
                        '—'
                      ) : (
                        <AnimatedNumber
                          value={row.hsNum}
                          format={(v) => formatAriary(v, { inMillions: inM })}
                        />
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      BS ({bs.months}m)
                    </div>
                    <div className="font-medium mt-0.5">
                      {row.bsNum === null ? (
                        '—'
                      ) : (
                        <AnimatedNumber
                          value={row.bsNum}
                          format={(v) => formatAriary(v, { inMillions: inM })}
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[11px] font-sans text-zinc-600 dark:text-zinc-400">
                      Année 1
                    </div>
                    <div
                      className={`font-bold mt-0.5 ${
                        row.tone === 'cost'
                          ? 'text-rose-700 dark:text-rose-400'
                          : row.tone === 'total' || row.tone === 'highlight-positive'
                          ? 'text-teal-700 dark:text-teal-400'
                          : 'text-zinc-900 dark:text-white'
                      }`}
                    >
                      <AnimatedNumber
                        value={row.y1Num}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Full Table (Desktop/Tablet always, or Mobile when toggled, and always visible at print) */}
        <div className={`${mobileView === 'cards' ? 'hidden sm:block print:block' : 'block'} overflow-x-auto`}>
          <table className="w-full text-xs text-left border-collapse font-mono tabular-nums">
            <thead>
              <tr className="bg-zinc-100/80 dark:bg-[#171627] text-zinc-700 dark:text-zinc-300 font-sans border-b border-zinc-200 dark:border-white/[0.08]">
                <th className="py-3 px-4 font-semibold">Poste comptable</th>
                <th className="py-3 px-4 text-right font-semibold">Haute Saison ({hs.months}m)</th>
                <th className="py-3 px-4 text-right font-semibold">Basse Saison ({bs.months}m)</th>
                <th className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-white">
                  Année 1 ({hs.months + bs.months}m)
                </th>
                <th className="py-3 px-4 text-right font-semibold">% CA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05]">
              {incomeRows.map((row, idx) => (
                <tr
                  key={idx}
                  className={
                    row.tone === 'total'
                      ? 'bg-teal-500/10 font-bold border-t border-teal-500/30'
                      : row.tone === 'subtotal'
                      ? 'bg-zinc-50/80 dark:bg-white/[0.02] font-semibold'
                      : ''
                  }
                >
                  <td className="py-2.5 px-4 font-sans text-zinc-800 dark:text-zinc-200">
                    {row.label}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right ${
                      row.tone === 'cost' ? 'text-rose-700 dark:text-rose-400' : ''
                    }`}
                  >
                    {row.hsNum === null ? (
                      '—'
                    ) : (
                      <AnimatedNumber
                        value={row.hsNum}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right ${
                      row.tone === 'cost' ? 'text-rose-700 dark:text-rose-400' : ''
                    }`}
                  >
                    {row.bsNum === null ? (
                      '—'
                    ) : (
                      <AnimatedNumber
                        value={row.bsNum}
                        format={(v) => formatAriary(v, { inMillions: inM })}
                      />
                    )}
                  </td>
                  <td
                    className={`py-2.5 px-4 text-right font-bold ${
                      row.tone === 'cost'
                        ? 'text-rose-700 dark:text-rose-400'
                        : row.tone === 'total' || row.tone === 'highlight-positive'
                        ? 'text-teal-700 dark:text-teal-300 text-sm'
                        : 'text-zinc-900 dark:text-white'
                    }`}
                  >
                    <AnimatedNumber
                      value={row.y1Num}
                      format={(v) => formatAriary(v, { inMillions: inM })}
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right text-zinc-600 dark:text-zinc-400">
                    <AnimatedNumber value={row.pctNum} format={(v) => formatPercent(v)} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Outil d'IA générative : analyse qualitative & points de vigilance (VAN / TRI) */}
      <AiFinancialAnalysisCard
        onInsertIntoNotes={(paragraph) => {
          const trimmed = dashboardReportNotes.trim();
          setDashboardReportNotes(trimmed ? `${trimmed}\n\n${paragraph}` : paragraph);
          notify('success', 'Analyse qualitative insérée dans les Notes du rapport.');
        }}
      />

      {/* Editable Report Notes (Automatically included in PDF export) */}
      <DashboardReportNotesSection
        onExportPdf={onExportPdf}
        isExportingPdf={isExportingPdf}
      />

      {/* Données sources Excel importées (affiché uniquement pour les projets créés via import Excel) */}
      {activeProject.source === 'excel' && activeProject.excelMeta && (() => {
        const meta = activeProject.excelMeta;
        const snapshots = meta.sheetSnapshots || [];
        const currentSnapshot =
          snapshots.find((s) => s.sheetName === activeExcelSnapshotSheet) || snapshots[0] || null;
        const targetLabelMap = new Map(MAPPING_TARGET_OPTIONS.map((o) => [o.value, o.label]));

        return (
          <section className="animate-dashboard-card rounded-2xl border border-teal-500/30 dark:border-teal-400/20 bg-white dark:bg-[#11101C] overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.08] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-500/[0.04] dark:bg-teal-500/[0.05]">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0" aria-hidden="true" />
                  <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    Données sources Excel — {meta.fileName}
                  </h2>
                </div>
                <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                  Importé le {new Date(meta.importedAt).toLocaleDateString('fr-FR')} ·{' '}
                  {meta.selectedSheets.length} feuille(s) analysée(s) ·{' '}
                  {meta.mappedFieldsSummary.length} correspondance(s) appliquée(s) au modèle
                </p>
              </div>
              <button
                type="button"
                onClick={() => setExcelPreviewExpanded((prev) => !prev)}
                aria-expanded={excelPreviewExpanded}
                className="min-h-9 px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#171628] hover:bg-zinc-100 dark:hover:bg-[#222038] text-xs font-semibold text-zinc-800 dark:text-zinc-100 inline-flex items-center gap-1.5 shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              >
                <span>{excelPreviewExpanded ? 'Masquer l’aperçu' : 'Afficher l’aperçu'}</span>
                {excelPreviewExpanded ? (
                  <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </div>

            {excelPreviewExpanded && (
              <div className="p-4 sm:p-5 space-y-4">
                {meta.mappedFieldsSummary.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {meta.mappedFieldsSummary.map((item, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#171628] text-[11px] font-medium text-zinc-700 dark:text-zinc-200"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                )}

                {snapshots.length > 1 && (
                  <div className="flex flex-wrap gap-1.5">
                    {snapshots.map((snap) => {
                      const active = currentSnapshot?.sheetName === snap.sheetName;
                      return (
                        <button
                          key={snap.sheetName}
                          type="button"
                          onClick={() => setActiveExcelSnapshotSheet(snap.sheetName)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                            active
                              ? 'border-teal-500/40 bg-teal-500/15 text-teal-700 dark:text-teal-300'
                              : 'border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.05]'
                          }`}
                        >
                          {snap.sheetName} ({snap.totalRows} lig.)
                        </button>
                      );
                    })}
                  </div>
                )}

                {currentSnapshot && (
                  <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-white/[0.08]">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="bg-zinc-100/80 dark:bg-[#171628] border-b border-zinc-200 dark:border-white/[0.08]">
                          {currentSnapshot.headers.map((header, idx) => {
                            const colMeta = currentSnapshot.mappedColumns[idx];
                            const targetLabel =
                              colMeta && colMeta.targetField !== 'ignore'
                                ? targetLabelMap.get(colMeta.targetField)
                                : null;
                            return (
                              <th
                                key={`${header}-${idx}`}
                                className="py-2.5 px-3 font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap"
                              >
                                <div>{header}</div>
                                {targetLabel && (
                                  <div className="text-[10px] font-normal text-teal-700 dark:text-teal-300 truncate max-w-[180px]">
                                    → {targetLabel}
                                  </div>
                                )}
                              </th>
                            );
                          })}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-white/[0.05] font-mono tabular-nums">
                        {currentSnapshot.sampleRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02]">
                            {currentSnapshot.headers.map((header, cIdx) => {
                              const val = row[header];
                              return (
                                <td
                                  key={cIdx}
                                  className="py-2 px-3 text-zinc-700 dark:text-zinc-300 whitespace-nowrap max-w-[220px] truncate"
                                >
                                  {val === null || val === '' || val === undefined ? (
                                    <span className="text-zinc-400 dark:text-zinc-600">—</span>
                                  ) : (
                                    String(val)
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </section>
        );
      })()}
        </>
      )}

      {/* Custom Right-Click Context Menu on KPI Indicators */}
      <KpiContextMenu
        menu={contextMenu}
        noteCount={contextMenu ? kpiNotes.filter((n) => n.kpiId === contextMenu.target.kpiId).length : 0}
        onClose={() => setContextMenu(null)}
        onAddNote={(target) => handleOpenKpiNotes(target, 'compose')}
        onViewNotes={(target) => handleOpenKpiNotes(target, 'list')}
        onCopyValue={handleCopyKpiValue}
        onNavigateTab={onNavigate}
      />

      {/* Collaborative KPI Analyst Notes Modal */}
      <KpiNotesModal
        open={notesModalState.open}
        onClose={() => setNotesModalState((prev) => ({ ...prev, open: false }))}
        focusKpi={notesModalState.focusKpi}
        initialMode={notesModalState.mode}
      />

      {/* Strategic Cost Optimization & Loss-Reduction Advice Modal */}
      <StrategicAdviceModal
        open={adviceModalOpen}
        onClose={() => setAdviceModalOpen(false)}
      />

      {/* Automatic Gmail KPI Alerts Modal (with explicit confirmation gate) */}
      <EmailAlertsModal
        open={emailAlertsModalOpen}
        onClose={() => {
          setEmailAlertsModalOpen(false);
          setModalInitialDraft(null);
        }}
        initialPendingDraft={modalInitialDraft}
        onDispatchConfirmed={(sig) => {
          setAcknowledgedSignature(sig);
          setPendingAutoEmailDraft(null);
        }}
      />
    </div>
  );
};
