import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express, { type Request, type Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);

interface FinancialAnalysisPayload {
  projectName?: string;
  focus?: 'executive' | 'banker' | 'risks';
  customQuestion?: string;
  metrics?: {
    totalInvestmentAr: number;
    year1TurnoverAr: number;
    year1NetResultAr: number;
    year1GrossMarginRate: number;
    year1NetMarginRate: number;
    npvAr: number;
    irrRate: number | null;
    paybackMonths: number | null;
    discountRate: number;
    corporateTaxRate: number;
    hsPaddyPriceAr: number;
    hsRicePriceAr: number;
    bsPaddyPriceAr: number;
    bsRicePriceAr: number;
    hsYield: number;
    bsYield: number;
    minCashAr: number;
    year3CumulativeCashAr: number;
    logisticsSharePct?: number;
    stockBfrAr?: number;
    breachedAlerts?: string[];
  };
}

const analysisResponseSchema = {
  type: Type.OBJECT,
  properties: {
    verdictLabel: {
      type: Type.STRING,
      description: 'Court verdict financier en français (ex: Projet bancable, Rentabilité conditionnelle, Risque élevé)',
    },
    verdictLevel: {
      type: Type.STRING,
      enum: ['favorable', 'conditionnel', 'critique'],
    },
    executiveSummary: {
      type: Type.STRING,
      description: 'Synthèse qualitative structurée de la performance globale (VAN, TRI, marges, payback) en 3 à 4 phrases.',
    },
    vanTriInterpretation: {
      type: Type.STRING,
      description: 'Analyse détaillée de la création de valeur (VAN vs investissement initial) et du TRI face au taux d’actualisation.',
    },
    strengths: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 à 4 points forts chiffrés du modèle financier.',
    },
    vigilancePoints: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          severity: {
            type: Type.STRING,
            enum: ['elevee', 'moderee', 'info'],
          },
          metric: { type: Type.STRING },
          explanation: { type: Type.STRING },
          mitigation: { type: Type.STRING },
        },
        required: ['title', 'severity', 'metric', 'explanation', 'mitigation'],
      },
      description: '3 à 4 points de vigilance prioritaires adaptés à la riziculture à Madagascar.',
    },
    recommendations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3 recommandations opérationnelles et financières concrètes et actionnables.',
    },
    reportReadyParagraph: {
      type: Type.STRING,
      description: 'Paragraphe professionnel rédigé prêt à être collé dans les notes du rapport PDF/DOCX.',
    },
  },
  required: [
    'verdictLabel',
    'verdictLevel',
    'executiveSummary',
    'vanTriInterpretation',
    'strengths',
    'vigilancePoints',
    'recommendations',
    'reportReadyParagraph',
  ],
};

function formatArM(val: number): string {
  if (!Number.isFinite(val)) return 'N/D';
  return `${(val / 1e6).toFixed(2)} M Ar (${Math.round(val).toLocaleString('fr-FR')} Ar)`;
}

function buildUserPrompt(payload: FinancialAnalysisPayload): string {
  const m = payload.metrics;
  if (!m) {
    return 'Analyse financière générale manquante.';
  }

  const focusLabels: Record<string, string> = {
    executive: 'Synthèse dirigeant (création de valeur, résilience opérationnelle et priorités stratégiques)',
    banker: 'Comité crédit / investisseurs (bancabilité, couverture de trésorerie, TRI vs coût du capital, payback)',
    risks: 'Audit des risques & sensibilités (volatilité prix paddy/riz, saisonnalité HS/BS, logistique et BFR)',
  };
  const focusText = focusLabels[payload.focus || 'executive'] || focusLabels.executive;

  const irrText =
    m.irrRate !== null && Number.isFinite(m.irrRate)
      ? `${(m.irrRate * 100).toFixed(1)} %`
      : 'Non calculable';
  const paybackText =
    m.paybackMonths !== null && Number.isFinite(m.paybackMonths)
      ? `${m.paybackMonths.toFixed(1)} mois`
      : '> 36 mois';

  const alertsText =
    m.breachedAlerts && m.breachedAlerts.length > 0
      ? m.breachedAlerts.join(' ; ')
      : 'Aucune alerte KPI critique déclenchée';

  return [
    `Projet analysé : ${payload.projectName || 'Rizerie Madagascar'}`,
    `Angle d'analyse demandé : ${focusText}`,
    payload.customQuestion?.trim()
      ? `Question spécifique de l'analyste : ${payload.customQuestion.trim()}`
      : '',
    '',
    'INDICATEURS FINANCIERS CALCULÉS :',
    `- Investissement initial total : ${formatArM(m.totalInvestmentAr)}`,
    `- Chiffre d'affaires Année 1 : ${formatArM(m.year1TurnoverAr)}`,
    `- Résultat net après IR Année 1 : ${formatArM(m.year1NetResultAr)}`,
    `- Marge brute Année 1 : ${(m.year1GrossMarginRate * 100).toFixed(1)} %`,
    `- Marge nette après IR Année 1 : ${(m.year1NetMarginRate * 100).toFixed(1)} %`,
    `- VAN (3 ans, r = ${(m.discountRate * 100).toFixed(1)} %) : ${formatArM(m.npvAr)}`,
    `- TRI (3 ans) : ${irrText} (vs taux d'actualisation ${(m.discountRate * 100).toFixed(1)} %)`,
    `- Payback saisonnier : ${paybackText}`,
    `- Impôt sur les revenus (IR) : ${(m.corporateTaxRate * 100).toFixed(1)} %`,
    `- Prix paddy HS / BS : ${Math.round(m.hsPaddyPriceAr)} Ar/kg / ${Math.round(m.bsPaddyPriceAr)} Ar/kg`,
    `- Prix riz usiné HS / BS : ${Math.round(m.hsRicePriceAr)} Ar/kg / ${Math.round(m.bsRicePriceAr)} Ar/kg`,
    `- Rendement usinage HS / BS : ${(m.hsYield * 100).toFixed(1)} % / ${(m.bsYield * 100).toFixed(1)} %`,
    `- Point bas de trésorerie (36 mois) : ${formatArM(m.minCashAr)}`,
    `- Trésorerie cumulée fin Année 3 : ${formatArM(m.year3CumulativeCashAr)}`,
    m.logisticsSharePct !== undefined
      ? `- Poids logistique & transport dans coûts ops : ${m.logisticsSharePct.toFixed(1)} %`
      : '',
    m.stockBfrAr !== undefined
      ? `- BFR immobilisé en stocks (paddy + riz usiné) : ${formatArM(m.stockBfrAr)}`
      : '',
    `- Alertes seuils actives : ${alertsText}`,
  ]
    .filter(Boolean)
    .join('\n');
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.post('/api/gemini/financial-analysis', async (req: Request, res: Response) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.status(503).json({
        error:
          'Clé GEMINI_API_KEY non configurée côté serveur. Ajoutez-la dans les variables d’environnement pour activer la synthèse IA.',
      });
      return;
    }

    const body = req.body as FinancialAnalysisPayload | undefined;
    if (!body || !body.metrics || !Number.isFinite(body.metrics.year1TurnoverAr)) {
      res.status(400).json({
        error: 'Indicateurs financiers incomplets pour générer l’analyse qualitative.',
      });
      return;
    }

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
      });

      const response = await ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: buildUserPrompt(body),
        config: {
          systemInstruction:
            'Tu es un directeur financier senior spécialisé dans l’agro-industrie rizicole à Madagascar (collecte paddy, usinage, stockage et distribution en Ariary). Rédige exclusivement en français clair, factuel, rigoureux et nuancé. Appuie chaque constat sur les chiffres exacts fournis (VAN, TRI, payback, marges, prix HS/BS, point bas de trésorerie, logistique/BFR). Ne fabrique aucun chiffre absent des données.',
          responseMimeType: 'application/json',
          responseSchema: analysisResponseSchema,
        },
      });

      const rawText = response.text;
      if (!rawText) {
        res.status(502).json({
          error: 'Le modèle n’a renvoyé aucun contenu exploitable.',
        });
        return;
      }

      const parsed = JSON.parse(rawText);
      res.json({
        analysis: parsed,
        generatedAt: new Date().toISOString(),
        model: 'gemini-4-hydrogen',
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Erreur inattendue lors de l’appel à Gemini.';
      console.error('[Gemini financial-analysis error]:', err);
      res.status(500).json({ error: message });
    }
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndexHtml = path.join(distDir, 'index.html');
  const isProd =
    process.env.NODE_ENV === 'production' ||
    (process.env.npm_lifecycle_event === 'start' && fs.existsSync(distIndexHtml));

  if (isProd) {
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(distIndexHtml);
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
