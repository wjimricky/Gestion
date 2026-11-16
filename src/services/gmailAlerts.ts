import { FullFinancialModel } from '../types/finance';
import { KpiAlertItem, KpiAlertsEvaluation } from '../utils/logistics';
import { ConsecutiveNegativeTreasuryAlert } from '../utils/treasuryAlerts';
import { formatAriary, formatMonths, formatPercent } from '../utils/formatters';

export type EmailAlertMetricId =
  | 'operatingMargin'
  | 'grossMargin'
  | 'van'
  | 'tri'
  | 'payback'
  | 'negativeTreasury';

export interface EmailAlertMetricMeta {
  id: EmailAlertMetricId;
  label: string;
  description: string;
}

export const EMAIL_ALERT_METRICS: EmailAlertMetricMeta[] = [
  {
    id: 'operatingMargin',
    label: 'Marge opérationnelle',
    description: 'Déclenche lorsque EBIT / CA passe sous le seuil critique.',
  },
  {
    id: 'grossMargin',
    label: 'Marge brute',
    description: 'Déclenche lorsque le taux de marge brute passe sous le plancher.',
  },
  {
    id: 'van',
    label: 'VAN à 3 ans',
    description: 'Déclenche lorsque la Valeur Actuelle Nette tombe sous le minimum.',
  },
  {
    id: 'tri',
    label: 'TRI (Rentabilité interne)',
    description: 'Déclenche lorsque le TRI devient inférieur au taux exigé.',
  },
  {
    id: 'payback',
    label: 'Payback saisonnier',
    description: 'Déclenche lorsque le délai de récupération dépasse le plafond.',
  },
  {
    id: 'negativeTreasury',
    label: 'Trésorerie négative prolongée',
    description: 'Déclenche si ≥ 2 mois consécutifs présentent un solde de trésorerie négatif.',
  },
];

export interface EmailAlertRuleConfig {
  enabled: boolean;
  recipients: string;
  watchedMetrics: EmailAlertMetricId[];
  cooldownMinutes: number;
  subjectPrefix: string;
}

export interface BreachedAlertDetail {
  id: EmailAlertMetricId;
  label: string;
  actualFormatted: string;
  thresholdFormatted: string;
  reason: string;
}

export type EmailDispatchKind = 'alert' | 'report' | 'test';

export interface EmailAlertHistoryEntry {
  id: string;
  sentAt: string;
  recipients: string[];
  subject: string;
  triggeredMetrics: string[];
  projectName: string;
  scenarioName: string;
  status: 'sent' | 'failed';
  kind?: EmailDispatchKind;
  messageId?: string;
  error?: string;
}

export interface PendingEmailAlertDispatch {
  signature: string;
  triggeredAt: string;
  recipients: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  breachedDetails: BreachedAlertDetail[];
  projectName: string;
  scenarioName: string;
  kind?: EmailDispatchKind;
}

const STORAGE_KEY_CONFIG = 'rizmadagascar_email_alert_config_v1';
const STORAGE_KEY_HISTORY = 'rizmadagascar_email_alert_history_v1';

export const DEFAULT_EMAIL_ALERT_CONFIG: EmailAlertRuleConfig = {
  enabled: false,
  recipients: 'T.JimRicky@gmail.com',
  watchedMetrics: ['operatingMargin', 'grossMargin', 'van', 'tri', 'payback', 'negativeTreasury'],
  cooldownMinutes: 60,
  subjectPrefix: '[RizMadagascar · Alerte KPI]',
};

export function loadEmailAlertConfig(): EmailAlertRuleConfig {
  if (typeof window === 'undefined') return DEFAULT_EMAIL_ALERT_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (!raw) return DEFAULT_EMAIL_ALERT_CONFIG;
    const parsed = JSON.parse(raw) as Partial<EmailAlertRuleConfig>;
    return {
      ...DEFAULT_EMAIL_ALERT_CONFIG,
      ...parsed,
      watchedMetrics: Array.isArray(parsed.watchedMetrics)
        ? parsed.watchedMetrics
        : DEFAULT_EMAIL_ALERT_CONFIG.watchedMetrics,
    };
  } catch {
    return DEFAULT_EMAIL_ALERT_CONFIG;
  }
}

export function saveEmailAlertConfig(config: EmailAlertRuleConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch {
    // ignore storage quota errors
  }
}

export function loadEmailAlertHistory(): EmailAlertHistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveEmailAlertHistory(entries: EmailAlertHistoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(entries.slice(0, 25)));
  } catch {
    // ignore
  }
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipientEmails(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter((s, idx, arr) => EMAIL_REGEX.test(s) && arr.indexOf(s) === idx);
}

export function collectWatchedBreaches(
  kpiAlerts: KpiAlertsEvaluation,
  treasurySmartAlert: ConsecutiveNegativeTreasuryAlert | null | undefined,
  watchedMetrics: EmailAlertMetricId[]
): BreachedAlertDetail[] {
  const details: BreachedAlertDetail[] = [];

  const watchedSet = new Set<EmailAlertMetricId>(watchedMetrics);

  kpiAlerts.breachedItems.forEach((item: KpiAlertItem) => {
    if (watchedSet.has(item.id)) {
      details.push({
        id: item.id,
        label: item.label,
        actualFormatted: item.actualFormatted,
        thresholdFormatted: item.thresholdFormatted,
        reason: item.reason,
      });
    }
  });

  if (
    watchedSet.has('negativeTreasury') &&
    treasurySmartAlert?.hasConsecutiveNegativeStreak
  ) {
    details.push({
      id: 'negativeTreasury',
      label: 'Trésorerie négative prolongée',
      actualFormatted: `${treasurySmartAlert.maxConsecutiveMonths} mois (${treasurySmartAlert.streakStartLabel}–${treasurySmartAlert.streakEndLabel})`,
      thresholdFormatted: '< 2 mois consécutifs négatifs',
      reason: `Solde de trésorerie négatif sur ${treasurySmartAlert.maxConsecutiveMonths} mois consécutifs (creux : ${formatAriary(treasurySmartAlert.worstEndingBalanceAr, { inMillions: true })}).`,
    });
  }

  return details;
}

export function buildBreachSignature(details: BreachedAlertDetail[]): string {
  return details
    .map((d) => `${d.id}:${d.actualFormatted}`)
    .sort()
    .join('|');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildAlertEmailDraft(params: {
  config: EmailAlertRuleConfig;
  breachedDetails: BreachedAlertDetail[];
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
}): PendingEmailAlertDispatch {
  const { config, breachedDetails, model, projectName, scenarioName } = params;
  const recipients = parseRecipientEmails(config.recipients);
  const nowStr = new Date().toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const metricSummary =
    breachedDetails.length > 0
      ? breachedDetails.map((b) => b.label).slice(0, 3).join(', ')
      : 'Test de surveillance KPI';

  const prefix = config.subjectPrefix.trim() || '[RizMadagascar · Alerte KPI]';
  const subject = `${prefix} ${projectName} — ${metricSummary}`;

  const y1 = model.year1;
  const irrStr = Number.isFinite(model.irr.irrValue)
    ? formatPercent(model.irr.irrValue, 1)
    : 'N/A';
  const paybackStr = model.payback.isRecoveredWithin36Months
    ? formatMonths(model.payback.paybackMonths)
    : '> 36 mois';

  const rowsHtml = breachedDetails
    .map(
      (b) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-weight:600;color:#18181b;">${escapeHtml(b.label)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-family:monospace;color:#be123c;font-weight:700;">${escapeHtml(b.actualFormatted)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-family:monospace;color:#52525b;">${escapeHtml(b.thresholdFormatted)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#3f3f46;font-size:12px;">${escapeHtml(b.reason)}</td>
      </tr>`
    )
    .join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
    <div style="padding:18px 22px;background:#18181b;color:#ffffff;">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Alerte Seuils Critiques · RizMadagascar</div>
      <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;">${escapeHtml(projectName)} (${escapeHtml(scenarioName)})</h1>
      <div style="margin-top:4px;font-size:12px;color:#d4d4d8;">Généré le ${escapeHtml(nowStr)}</div>
    </div>
    <div style="padding:20px 22px;">
      <p style="margin:0 0 14px;font-size:13px;line-height:1.5;color:#27272a;">
        ${
          breachedDetails.length > 0
            ? `<strong>${breachedDetails.length} indicateur(s)</strong> de votre modèle financier ont franchi les seuils critiques configurés sur le tableau de bord :`
            : `Message de vérification du système d'alertes e-mail (aucun seuil en dépassement critique au moment de ce test).`
        }
      </p>
      ${
        breachedDetails.length > 0
          ? `<table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:18px;border:1px solid #e4e4e7;border-radius:8px;">
              <thead>
                <tr style="background:#fafafa;text-align:left;font-size:11px;text-transform:uppercase;color:#52525b;">
                  <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Indicateur</th>
                  <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Valeur actuelle</th>
                  <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Seuil critique</th>
                  <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Diagnostic</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>`
          : ''
      }
      <div style="padding:14px;background:#fafafa;border:1px solid #e4e4e7;border-radius:8px;font-size:12px;">
        <div style="font-weight:700;margin-bottom:8px;color:#18181b;">Instantané financier actuel (Année 1 &amp; 3 ans)</div>
        <div>Chiffre d'affaires A1 : <strong>${escapeHtml(formatAriary(y1.totalTurnoverAr, { inMillions: true }))}</strong></div>
        <div>Résultat net après IR A1 : <strong>${escapeHtml(formatAriary(y1.netResultAfterTaxAr, { inMillions: true }))}</strong> (Marge brute : ${escapeHtml(formatPercent(y1.grossMarginRate, 1))})</div>
        <div>VAN à 3 ans : <strong>${escapeHtml(formatAriary(model.npv.npvAr, { inMillions: true }))}</strong> · TRI : <strong>${escapeHtml(irrStr)}</strong> · Payback : <strong>${escapeHtml(paybackStr)}</strong></div>
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = [
    `ALERTE SEUILS CRITIQUES — ${projectName} (${scenarioName})`,
    `Date : ${nowStr}`,
    '',
    ...(breachedDetails.length > 0
      ? breachedDetails.map(
          (b) => `- ${b.label} : ${b.actualFormatted} (Seuil ${b.thresholdFormatted}) — ${b.reason}`
        )
      : ['Test manuel du module d’alerte e-mail (aucun dépassement critique en cours).']),
    '',
    `Synthèse modèle : CA A1 = ${formatAriary(y1.totalTurnoverAr, { inMillions: true })} | Net A1 = ${formatAriary(y1.netResultAfterTaxAr, { inMillions: true })} | VAN = ${formatAriary(model.npv.npvAr, { inMillions: true })} | TRI = ${irrStr} | Payback = ${paybackStr}`,
  ].join('\n');

  return {
    signature: buildBreachSignature(breachedDetails) || `manual-${Date.now()}`,
    triggeredAt: new Date().toISOString(),
    recipients,
    subject,
    htmlBody,
    textBody,
    breachedDetails,
    projectName,
    scenarioName,
    kind: 'alert',
  };
}

export function buildFinancialReportEmailDraft(params: {
  config: EmailAlertRuleConfig;
  model: FullFinancialModel;
  projectName: string;
  scenarioName: string;
  kpiAlerts: KpiAlertsEvaluation;
  treasurySmartAlert?: ConsecutiveNegativeTreasuryAlert | null;
  recipientOverride?: string;
}): PendingEmailAlertDispatch {
  const {
    config,
    model,
    projectName,
    scenarioName,
    kpiAlerts,
    treasurySmartAlert,
    recipientOverride,
  } = params;

  const recipients = parseRecipientEmails(
    recipientOverride && recipientOverride.trim() ? recipientOverride : config.recipients
  );
  const breachedDetails = collectWatchedBreaches(
    kpiAlerts,
    treasurySmartAlert,
    config.watchedMetrics
  );

  const nowStr = new Date().toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const y1 = model.year1;
  const hs = model.hauteSaison;
  const bs = model.basseSaison;
  const irrStr = Number.isFinite(model.irr.irrValue)
    ? formatPercent(model.irr.irrValue, 1)
    : 'N/A';
  const paybackStr = model.payback.isRecoveredWithin36Months
    ? formatMonths(model.payback.paybackMonths)
    : '> 36 mois';

  const subject = `[RizMadagascar · Rapport Financier] ${projectName} (${scenarioName})`;

  const alertsRowsHtml = breachedDetails
    .map(
      (b) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #fecdd3;font-weight:600;color:#881337;">${escapeHtml(b.label)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fecdd3;font-family:monospace;color:#be123c;font-weight:700;">${escapeHtml(b.actualFormatted)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #fecdd3;font-family:monospace;color:#52525b;">${escapeHtml(b.thresholdFormatted)}</td>
      </tr>`
    )
    .join('');

  const projectionsRowsHtml = model.projections.realistic
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;font-weight:600;">Année ${p.year} (${escapeHtml(p.label)})</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;font-family:monospace;text-align:right;">${escapeHtml(formatAriary(p.netResultBeforeTaxAr, { inMillions: true }))}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #e4e4e7;font-family:monospace;text-align:right;font-weight:700;color:#0f766e;">${escapeHtml(formatAriary(p.netResultAfterTaxAr, { inMillions: true }))}</td>
      </tr>`
    )
    .join('');

  const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:700px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
    <div style="padding:18px 22px;background:#18181b;color:#ffffff;">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Rapport de Synthèse Financière · RizMadagascar v6.0</div>
      <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;">${escapeHtml(projectName)} — ${escapeHtml(scenarioName)}</h1>
      <div style="margin-top:4px;font-size:12px;color:#d4d4d8;">Généré le ${escapeHtml(nowStr)}</div>
    </div>
    <div style="padding:20px 22px;font-size:13px;line-height:1.5;">
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #e4e4e7;">
        <thead>
          <tr style="background:#fafafa;text-align:left;font-size:11px;text-transform:uppercase;color:#52525b;">
            <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Indicateur Clé (Année 1 &amp; 3 ans)</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">Valeur</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Chiffre d'affaires Année 1</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;font-weight:700;">${escapeHtml(formatAriary(y1.totalTurnoverAr, { inMillions: true }))}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Marge brute (Taux)</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;">${escapeHtml(formatAriary(y1.annualGrossProfitAr, { inMillions: true }))} (${escapeHtml(formatPercent(y1.grossMarginRate, 1))})</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Résultat net après IR</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;font-weight:700;color:#0f766e;">${escapeHtml(formatAriary(y1.netResultAfterTaxAr, { inMillions: true }))} (${escapeHtml(formatPercent(y1.netMarginAfterTaxRate, 1))})</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Fonds initiaux à lever (I₀)</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;">${escapeHtml(formatAriary(model.investment.fundsToRaiseAr, { inMillions: true }))}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">VAN à 3 ans (r = ${escapeHtml(formatPercent(model.npv.discountRate, 0))})</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;font-weight:700;">${escapeHtml(formatAriary(model.npv.npvAr, { inMillions: true }))}</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">TRI / Payback Saisonnier</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;">${escapeHtml(irrStr)} · ${escapeHtml(paybackStr)}</td></tr>
          <tr><td style="padding:8px 12px;">Haute Saison (${hs.months}m) / Basse Saison (${bs.months}m)</td><td style="padding:8px 12px;text-align:right;font-family:monospace;">${escapeHtml(formatAriary(hs.totalTurnoverAr, { inMillions: true }))} / ${escapeHtml(formatAriary(bs.totalTurnoverAr, { inMillions: true }))}</td></tr>
        </tbody>
      </table>

      <div style="font-weight:700;font-size:12px;text-transform:uppercase;color:#3f3f46;margin-bottom:8px;">Projections Réalistes A1–A3</div>
      <table style="width:100%;border-collapse:collapse;margin-bottom:18px;border:1px solid #e4e4e7;font-size:12px;">
        <thead>
          <tr style="background:#fafafa;text-align:left;color:#52525b;">
            <th style="padding:7px 10px;border-bottom:1px solid #e4e4e7;">Exercice</th>
            <th style="padding:7px 10px;border-bottom:1px solid #e4e4e7;text-align:right;">Résultat avant IR</th>
            <th style="padding:7px 10px;border-bottom:1px solid #e4e4e7;text-align:right;">Résultat net après IR</th>
          </tr>
        </thead>
        <tbody>${projectionsRowsHtml}</tbody>
      </table>

      ${
        breachedDetails.length > 0
          ? `<div style="padding:12px;background:#fff1f2;border:1px solid #fecdd3;border-radius:8px;">
              <div style="font-weight:700;color:#881337;margin-bottom:6px;">Alertes de seuils actifs (${breachedDetails.length})</div>
              <table style="width:100%;border-collapse:collapse;font-size:12px;"><tbody>${alertsRowsHtml}</tbody></table>
            </div>`
          : `<div style="padding:10px 12px;background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;color:#065f46;font-size:12px;">
              Aucun dépassement de seuil critique détecté sur les indicateurs surveillés.
            </div>`
      }
    </div>
  </div>
</body>
</html>`;

  const textBody = [
    `RAPPORT FINANCIER — ${projectName} (${scenarioName})`,
    `Date : ${nowStr}`,
    '',
    `CA A1 : ${formatAriary(y1.totalTurnoverAr, { inMillions: true })}`,
    `Marge brute : ${formatAriary(y1.annualGrossProfitAr, { inMillions: true })} (${formatPercent(y1.grossMarginRate, 1)})`,
    `Résultat net après IR : ${formatAriary(y1.netResultAfterTaxAr, { inMillions: true })} (${formatPercent(y1.netMarginAfterTaxRate, 1)})`,
    `Fonds initiaux I0 : ${formatAriary(model.investment.fundsToRaiseAr, { inMillions: true })}`,
    `VAN 3 ans : ${formatAriary(model.npv.npvAr, { inMillions: true })} | TRI : ${irrStr} | Payback : ${paybackStr}`,
    '',
    'Projections A1–A3 :',
    ...model.projections.realistic.map(
      (p) =>
        `- Année ${p.year} (${p.label}) : Net après IR ${formatAriary(p.netResultAfterTaxAr, { inMillions: true })}`
    ),
    '',
    ...(breachedDetails.length > 0
      ? [
          `Alertes seuils actives (${breachedDetails.length}) :`,
          ...breachedDetails.map(
            (b) => `- ${b.label} : ${b.actualFormatted} (Seuil ${b.thresholdFormatted})`
          ),
        ]
      : ['Tous les seuils surveillés sont conformes.']),
  ].join('\n');

  return {
    signature: `report-${Date.now()}`,
    triggeredAt: new Date().toISOString(),
    recipients,
    subject,
    htmlBody,
    textBody,
    breachedDetails,
    projectName,
    scenarioName,
    kind: 'report',
  };
}

export function buildSampleFinancialReportDraft(params: {
  config: EmailAlertRuleConfig;
  recipientOverride?: string;
  projectName?: string;
}): PendingEmailAlertDispatch {
  const recipients = parseRecipientEmails(
    params.recipientOverride && params.recipientOverride.trim()
      ? params.recipientOverride
      : params.config.recipients
  );
  const projectLabel = params.projectName?.trim() || 'RizMadagascar — Modèle v6.0';
  const nowStr = new Date().toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const subject = `[TEST · Rapport Financier Factice] ${projectLabel} — Vérification Gmail`;

  const sampleBreaches: BreachedAlertDetail[] = [
    {
      id: 'operatingMargin',
      label: 'Marge opérationnelle (Exemple factice)',
      actualFormatted: '8,4 %',
      thresholdFormatted: '≥ 10,0 %',
      reason: 'Simulation de démonstration : hausse fictive du gasoil de collecte (+15 %).',
    },
  ];

  const htmlBody = `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:24px;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#18181b;">
  <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;">
    <div style="padding:14px 22px;background:#f59e0b;color:#18181b;font-weight:700;font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">
      TEST DE CONFIGURATION GMAIL · RAPPORT FINANCIER FACTICE (DONNÉES SIMULÉES)
    </div>
    <div style="padding:18px 22px;background:#18181b;color:#ffffff;">
      <div style="font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#a1a1aa;">Vérification d'intégration e-mail · RizMadagascar</div>
      <h1 style="margin:6px 0 0;font-size:18px;font-weight:700;">${escapeHtml(projectLabel)} (Jeu d'essai factice)</h1>
      <div style="margin-top:4px;font-size:12px;color:#d4d4d8;">Test déclenché le ${escapeHtml(nowStr)}</div>
    </div>
    <div style="padding:20px 22px;font-size:13px;line-height:1.5;">
      <p style="margin:0 0 14px;color:#27272a;">
        Ceci est un <strong>rapport financier factice de test</strong> envoyé pour confirmer que l’intégration Gmail API (scope <code>gmail.send</code>) et la mise en forme des rapports fonctionnent correctement.
      </p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;border:1px solid #e4e4e7;">
        <thead>
          <tr style="background:#fafafa;text-align:left;font-size:11px;text-transform:uppercase;color:#52525b;">
            <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Indicateur Factice</th>
            <th style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;">Valeur d'essai</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Chiffre d'affaires Année 1 (Factice)</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;font-weight:700;">240,0 M Ar</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Marge brute estimée (Factice)</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;">68,4 M Ar (28,5 %)</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">Bénéfice net après IR (Factice)</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;font-weight:700;color:#0f766e;">31,2 M Ar</td></tr>
          <tr><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;">VAN à 3 ans (r = 15 %) · TRI · Payback</td><td style="padding:8px 12px;border-bottom:1px solid #e4e4e7;text-align:right;font-family:monospace;">62,4 M Ar · 34,2 % · 14,5 mois</td></tr>
        </tbody>
      </table>
      <div style="padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:12px;color:#78350f;">
        <strong>Exemple d'alerte seuil incluse :</strong> Marge opérationnelle factice <strong>8,4 %</strong> sous cible fictive <strong>10,0 %</strong>. Aucun chiffre réel de votre projet n'a été utilisé dans ce message d'essai.
      </div>
    </div>
  </div>
</body>
</html>`;

  const textBody = [
    'TEST DE CONFIGURATION GMAIL — RAPPORT FINANCIER FACTICE (DONNÉES SIMULÉES)',
    `Projet : ${projectLabel}`,
    `Date du test : ${nowStr}`,
    '',
    'Indicateurs factices d’essai :',
    '- Chiffre d’affaires A1 (factice) : 240,0 M Ar',
    '- Marge brute (factice) : 68,4 M Ar (28,5 %)',
    '- Bénéfice net après IR (factice) : 31,2 M Ar',
    '- VAN 3 ans (factice) : 62,4 M Ar | TRI : 34,2 % | Payback : 14,5 mois',
    '- Exemple d’alerte seuil : Marge opérationnelle factice 8,4 % (Seuil ≥ 10,0 %)',
    '',
    'Ce message confirme le bon fonctionnement de l’API Gmail dans RizMadagascar.',
  ].join('\n');

  return {
    signature: `sample-test-${Date.now()}`,
    triggeredAt: new Date().toISOString(),
    recipients,
    subject,
    htmlBody,
    textBody,
    breachedDetails: sampleBreaches,
    projectName: projectLabel,
    scenarioName: 'Test Factice',
    kind: 'test',
  };
}

/**
 * Encodes UTF-8 string to URL-safe base64 (RFC 4648 §5) required by Gmail API `raw` field.
 */
export function encodeBase64UrlUtf8(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function encodeRfc2047Utf8Header(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

export function buildRawMimeEmail(params: {
  to: string[];
  subject: string;
  htmlBody: string;
  textBody: string;
  fromEmail?: string | null;
}): string {
  const boundary = `rizmada_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const headers: string[] = [
    ...(params.fromEmail ? [`From: ${params.fromEmail}`] : []),
    `To: ${params.to.join(', ')}`,
    `Subject: ${encodeRfc2047Utf8Header(params.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const mimeMessage = [
    ...headers,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.textBody,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    params.htmlBody,
    '',
    `--${boundary}--`,
  ].join('\r\n');

  return encodeBase64UrlUtf8(mimeMessage);
}

export class GmailAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GmailAuthError';
  }
}

export async function sendKpiAlertEmail(
  accessToken: string,
  draft: PendingEmailAlertDispatch,
  senderEmail?: string | null
): Promise<{ messageId: string; threadId?: string }> {
  if (draft.recipients.length === 0) {
    throw new Error('Aucun destinataire e-mail valide configuré.');
  }

  const raw = buildRawMimeEmail({
    to: draft.recipients,
    subject: draft.subject,
    htmlBody: draft.htmlBody,
    textBody: draft.textBody,
    fromEmail: senderEmail,
  });

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (res.status === 401 || res.status === 403) {
    let reason = '';
    try {
      const errData = (await res.json()) as { error?: { message?: string } };
      reason = errData?.error?.message || '';
    } catch {
      // ignore
    }
    throw new GmailAuthError(
      reason
        ? `Autorisation Gmail insuffisante ou expirée (${reason}). Veuillez vous reconnecter avec Google.`
        : 'Autorisation Gmail insuffisante ou expirée. Veuillez vous reconnecter avec Google.'
    );
  }

  if (!res.ok) {
    let message = `Erreur API Gmail (${res.status})`;
    try {
      const errData = (await res.json()) as { error?: { message?: string } };
      if (errData?.error?.message) {
        message = errData.error.message;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const data = (await res.json()) as { id?: string; threadId?: string };
  return {
    messageId: data.id || `sent-${Date.now()}`,
    threadId: data.threadId,
  };
}

function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function getDispatchKindLabel(kind?: EmailDispatchKind): string {
  switch (kind) {
    case 'test':
      return 'Test (Rapport factice)';
    case 'report':
      return 'Rapport financier';
    default:
      return 'Alerte KPI';
  }
}

export function buildEmailAlertHistoryCsvContent(entries: EmailAlertHistoryEntry[]): string {
  const headers = [
    'Date / Heure',
    'Type',
    'Statut',
    'Projet',
    'Scénario',
    'Destinataires',
    'Objet',
    'Indicateurs / Contenu',
    'ID Message Gmail',
    'Erreur',
  ];

  const rows = entries.map((entry) => [
    new Date(entry.sentAt).toLocaleString('fr-FR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }),
    getDispatchKindLabel(entry.kind),
    entry.status === 'sent' ? 'Envoyé' : 'Échec',
    entry.projectName || '',
    entry.scenarioName || '',
    (entry.recipients || []).join(' ; '),
    entry.subject || '',
    (entry.triggeredMetrics || []).join(' ; '),
    entry.messageId || '',
    entry.error || '',
  ]);

  const allRows = [headers, ...rows];
  return '\uFEFF' + allRows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n');
}

export function exportEmailAlertHistoryToCsv(entries: EmailAlertHistoryEntry[]): void {
  const csvContent = buildEmailAlertHistoryCsvContent(entries);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `journal_alertes_email_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
