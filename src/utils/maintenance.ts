import {
  FinancialAssumptions,
  FullFinancialModel,
  MachineMaintenanceEvent,
  MachineMaintenanceSchedule,
  MaintenanceEquipmentCategory,
  MaintenanceInterventionType,
} from '../types/finance';
import { DEFAULT_ASSUMPTIONS } from '../engine/defaultAssumptions';
import { CALENDAR_MONTHS_FR } from './treasury';

export const EQUIPMENT_CATEGORY_META: Record<
  MaintenanceEquipmentCategory,
  { label: string; shortLabel: string; defaultCapacityImpact: number }
> = {
  decortiqueuse: {
    label: 'Décortiqueuse principale',
    shortLabel: 'Décortiqueuse',
    defaultCapacityImpact: 1.0,
  },
  polisseur_blanchiment: {
    label: 'Blanchoir / Polisseur',
    shortLabel: 'Polisseur',
    defaultCapacityImpact: 0.85,
  },
  trieuse_ensacheuse: {
    label: 'Trieuse, Balances & Ensacheuse',
    shortLabel: 'Trieuse / Ens.',
    defaultCapacityImpact: 0.75,
  },
  camion_collecte: {
    label: 'Camion de collecte paddy',
    shortLabel: 'Camion collecte',
    defaultCapacityImpact: 0.6,
  },
  groupe_electrogene: {
    label: 'Groupe électrogène / Énergie',
    shortLabel: 'Énergie / GE',
    defaultCapacityImpact: 0.9,
  },
};

export const INTERVENTION_TYPE_META: Record<
  MaintenanceInterventionType,
  { label: string; shortLabel: string }
> = {
  preventive: { label: 'Maintenance préventive', shortLabel: 'Préventive' },
  revision_annuelle: { label: 'Révision majeure annuelle', shortLabel: 'Révision' },
  corrective: { label: 'Arrêt curatif / Dépannage', shortLabel: 'Curative' },
};

const MAINT_FIXED_ID = 'fix-maintenance-machines';

export function getResolvedMaintenanceSchedule(
  assumptions: FinancialAssumptions
): MachineMaintenanceSchedule {
  const existing = assumptions.machineMaintenance;
  const fallback = DEFAULT_ASSUMPTIONS.machineMaintenance!;
  return {
    applyProductionLossToModel: existing?.applyProductionLossToModel ?? false,
    operatingDaysPerMonth: existing?.operatingDaysPerMonth ?? 26,
    baselineRotationsHS:
      existing?.baselineRotationsHS ?? assumptions.hauteSaison.rotationsPerMonth,
    baselineRotationsBS:
      existing?.baselineRotationsBS ?? assumptions.basseSaison.rotationsPerMonth,
    events: existing?.events ?? fallback.events,
  };
}

export interface MonthlyMaintenanceRow {
  monthIndex: number;
  monthLabel: string;
  season: 'HS' | 'BS';
  eventsCount: number;
  rawDowntimeDays: number;
  effectiveLostDays: number;
  availabilityRatePct: number;
  nominalPaddyKg: number;
  nominalRiceKg: number;
  lostPaddyKg: number;
  lostRiceKg: number;
  actualRiceKg: number;
  lostTurnoverAr: number;
  lostGrossMarginAr: number;
  maintenanceCostAr: number;
}

export interface MachineMaintenanceSummary {
  rows: MonthlyMaintenanceRow[];
  totalDowntimeDays: number;
  totalEffectiveLostDays: number;
  annualAvailabilityRatePct: number;
  totalLostPaddyKg: number;
  totalLostRiceKg: number;
  totalLostTurnoverAr: number;
  totalLostGrossMarginAr: number;
  totalMaintenanceCostAr: number;
  hsAvailabilityFactor: number;
  bsAvailabilityFactor: number;
  worstMonthLabel: string;
  worstMonthLostRiceKg: number;
}

export function computeMaintenanceCalendarMetrics(
  assumptions: FinancialAssumptions,
  model: FullFinancialModel,
  schedule: MachineMaintenanceSchedule
): MachineMaintenanceSummary {
  const hsMonthsCount = Math.max(1, Math.round(assumptions.hauteSaison.months));
  const operatingDays = Math.max(15, Math.min(31, schedule.operatingDaysPerMonth || 26));

  // Use baseline rotations so numbers remain consistent whether model impact is toggled on or off
  const hsMonthlyPaddy =
    schedule.baselineRotationsHS * assumptions.hauteSaison.paddyBoughtKgPerRotation;
  const bsMonthlyPaddy =
    schedule.baselineRotationsBS * assumptions.basseSaison.paddyBoughtKgPerRotation;

  const hsYield = assumptions.hauteSaison.yieldPaddyToRice;
  const bsYield = assumptions.basseSaison.yieldPaddyToRice;

  const hsGrossMarginPerRiceKg =
    model.hauteSaison.totalRiceKg > 0
      ? model.hauteSaison.seasonGrossProfitAr / model.hauteSaison.totalRiceKg
      : 0;
  const bsGrossMarginPerRiceKg =
    model.basseSaison.totalRiceKg > 0
      ? model.basseSaison.seasonGrossProfitAr / model.basseSaison.totalRiceKg
      : 0;

  const hsTurnoverPerRiceKg =
    model.hauteSaison.totalRiceKg > 0
      ? model.hauteSaison.totalTurnoverAr / model.hauteSaison.totalRiceKg
      : assumptions.hauteSaison.riceSellingPriceArPerKg;
  const bsTurnoverPerRiceKg =
    model.basseSaison.totalRiceKg > 0
      ? model.basseSaison.totalTurnoverAr / model.basseSaison.totalRiceKg
      : assumptions.basseSaison.riceSellingPriceArPerKg;

  const rows: MonthlyMaintenanceRow[] = [];

  for (let m = 1; m <= 12; m++) {
    const isHS = m <= hsMonthsCount;
    const monthEvents = schedule.events.filter((ev) => ev.monthIndex === m);

    const rawDowntimeDays = monthEvents.reduce(
      (sum, ev) => sum + Math.max(0, ev.downtimeDays),
      0
    );
    const effectiveLostDaysRaw = monthEvents.reduce(
      (sum, ev) =>
        sum +
        Math.max(0, ev.downtimeDays) *
          Math.max(0, Math.min(1, ev.capacityImpactRatio)),
      0
    );
    const effectiveLostDays = Math.min(operatingDays, effectiveLostDaysRaw);
    const lossRatio = operatingDays > 0 ? effectiveLostDays / operatingDays : 0;
    const availabilityRatePct = (1 - lossRatio) * 100;

    const nominalPaddyKg = isHS ? hsMonthlyPaddy : bsMonthlyPaddy;
    const nominalRiceKg = nominalPaddyKg * (isHS ? hsYield : bsYield);
    const lostPaddyKg = Math.round(nominalPaddyKg * lossRatio);
    const lostRiceKg = Math.round(nominalRiceKg * lossRatio);
    const actualRiceKg = Math.max(0, Math.round(nominalRiceKg - lostRiceKg));

    const lostTurnoverAr = Math.round(
      lostRiceKg * (isHS ? hsTurnoverPerRiceKg : bsTurnoverPerRiceKg)
    );
    const lostGrossMarginAr = Math.round(
      lostRiceKg * (isHS ? hsGrossMarginPerRiceKg : bsGrossMarginPerRiceKg)
    );
    const maintenanceCostAr = monthEvents.reduce(
      (sum, ev) => sum + Math.max(0, ev.maintenanceCostAr),
      0
    );

    rows.push({
      monthIndex: m,
      monthLabel: `M${m} · ${CALENDAR_MONTHS_FR[(m - 1) % 12].slice(0, 3)}`,
      season: isHS ? 'HS' : 'BS',
      eventsCount: monthEvents.length,
      rawDowntimeDays,
      effectiveLostDays,
      availabilityRatePct,
      nominalPaddyKg: Math.round(nominalPaddyKg),
      nominalRiceKg: Math.round(nominalRiceKg),
      lostPaddyKg,
      lostRiceKg,
      actualRiceKg,
      lostTurnoverAr,
      lostGrossMarginAr,
      maintenanceCostAr,
    });
  }

  const totalDowntimeDays = rows.reduce((s, r) => s + r.rawDowntimeDays, 0);
  const totalEffectiveLostDays = rows.reduce((s, r) => s + r.effectiveLostDays, 0);
  const totalNominalDays = operatingDays * 12;
  const annualAvailabilityRatePct =
    totalNominalDays > 0
      ? ((totalNominalDays - totalEffectiveLostDays) / totalNominalDays) * 100
      : 100;

  const hsRows = rows.filter((r) => r.season === 'HS');
  const bsRows = rows.filter((r) => r.season === 'BS');

  const hsAvailabilityFactor =
    hsRows.length > 0
      ? hsRows.reduce((s, r) => s + r.availabilityRatePct / 100, 0) / hsRows.length
      : 1;
  const bsAvailabilityFactor =
    bsRows.length > 0
      ? bsRows.reduce((s, r) => s + r.availabilityRatePct / 100, 0) / bsRows.length
      : 1;

  const worstRow = rows.reduce(
    (worst, cur) => (cur.lostRiceKg > worst.lostRiceKg ? cur : worst),
    rows[0]
  );

  return {
    rows,
    totalDowntimeDays,
    totalEffectiveLostDays,
    annualAvailabilityRatePct,
    totalLostPaddyKg: rows.reduce((s, r) => s + r.lostPaddyKg, 0),
    totalLostRiceKg: rows.reduce((s, r) => s + r.lostRiceKg, 0),
    totalLostTurnoverAr: rows.reduce((s, r) => s + r.lostTurnoverAr, 0),
    totalLostGrossMarginAr: rows.reduce((s, r) => s + r.lostGrossMarginAr, 0),
    totalMaintenanceCostAr: rows.reduce((s, r) => s + r.maintenanceCostAr, 0),
    hsAvailabilityFactor,
    bsAvailabilityFactor,
    worstMonthLabel: worstRow?.monthLabel ?? '—',
    worstMonthLostRiceKg: worstRow?.lostRiceKg ?? 0,
  };
}

/**
 * Optionally applies technical downtime volume loss onto rotationsPerMonth and
 * annualized intervention costs onto fixedMonthlyCharges.
 */
export function applyMaintenanceToAssumptions(
  assumptions: FinancialAssumptions,
  schedule: MachineMaintenanceSchedule,
  summary: MachineMaintenanceSummary
): Pick<
  FinancialAssumptions,
  'hauteSaison' | 'basseSaison' | 'fixedMonthlyCharges'
> {
  const cleanFixed = assumptions.fixedMonthlyCharges.filter(
    (f) => f.id !== MAINT_FIXED_ID
  );

  if (!schedule.applyProductionLossToModel) {
    return {
      hauteSaison: {
        ...assumptions.hauteSaison,
        rotationsPerMonth: schedule.baselineRotationsHS,
      },
      basseSaison: {
        ...assumptions.basseSaison,
        rotationsPerMonth: schedule.baselineRotationsBS,
      },
      fixedMonthlyCharges: cleanFixed,
    };
  }

  const nextRotHS = Number(
    Math.max(0.2, schedule.baselineRotationsHS * summary.hsAvailabilityFactor).toFixed(3)
  );
  const nextRotBS = Number(
    Math.max(0.2, schedule.baselineRotationsBS * summary.bsAvailabilityFactor).toFixed(3)
  );

  const monthlyMaintCost = Math.round(summary.totalMaintenanceCostAr / 12);
  const nextFixed =
    monthlyMaintCost > 0
      ? [
          ...cleanFixed,
          {
            id: MAINT_FIXED_ID,
            label: 'Budget maintenance machines (mensualisé)',
            amount: monthlyMaintCost,
          },
        ]
      : cleanFixed;

  return {
    hauteSaison: {
      ...assumptions.hauteSaison,
      rotationsPerMonth: nextRotHS,
    },
    basseSaison: {
      ...assumptions.basseSaison,
      rotationsPerMonth: nextRotBS,
    },
    fixedMonthlyCharges: nextFixed,
  };
}

export function createMaintenanceEvent(
  partial: Omit<MachineMaintenanceEvent, 'id'>
): MachineMaintenanceEvent {
  return {
    ...partial,
    id: `maint-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}
