/**
 * Formats numbers into Ariary (Ar) with thousands separators and optional millions shorthand.
 */
export function formatAriary(
  amount: number,
  options?: {
    inMillions?: boolean;
    decimals?: number;
    showUnit?: boolean;
  }
): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '—';
  }

  const showUnit = options?.showUnit !== false;
  const inMillions = options?.inMillions === true;

  if (inMillions) {
    const valInM = amount / 1000000;
    const dec = options?.decimals !== undefined ? options.decimals : 2;
    const formatted = valInM.toLocaleString('fr-FR', {
      minimumFractionDigits: dec,
      maximumFractionDigits: dec,
    });
    return showUnit ? `${formatted} M Ar` : formatted;
  }

  const dec = options?.decimals !== undefined ? options.decimals : 0;
  const formatted = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });

  return showUnit ? `${formatted} Ar` : formatted;
}

/**
 * Formats percentages with French comma separator.
 */
export function formatPercent(value: number, decimals: number = 1): string {
  if (isNaN(value) || value === null || value === undefined) {
    return '—';
  }
  const pct = value * 100;
  return `${pct.toLocaleString('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} %`;
}

/**
 * Formats quantities in kg or tonnes.
 */
export function formatKg(kg: number, inTonnesThreshold: number = 10000): string {
  if (isNaN(kg) || kg === null || kg === undefined) {
    return '—';
  }

  if (kg >= inTonnesThreshold) {
    const tonnes = kg / 1000;
    return `${tonnes.toLocaleString('fr-FR', {
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    })} t (${Math.round(kg).toLocaleString('fr-FR')} kg)`;
  }

  return `${Math.round(kg).toLocaleString('fr-FR')} kg`;
}

/**
 * Formats month count or duration.
 */
export function formatMonths(months: number): string {
  if (isNaN(months) || months === null || months === undefined || months < 0) {
    return '> 36 mois';
  }
  return `${months.toLocaleString('fr-FR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  })} mois`;
}
