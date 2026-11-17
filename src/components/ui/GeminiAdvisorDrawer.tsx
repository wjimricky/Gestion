import React, { useMemo, useRef, useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  MapPin,
  ExternalLink,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useFinancial } from '../../context/FinancialContext';
import { formatAriary, formatMonths, formatPercent } from '../../utils/formatters';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  groundingLinks?: Array<{ title: string; uri: string; snippet?: string }>;
}

interface GeminiAdvisorDrawerProps {
  open: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  'Comment améliorer mon TRI et réduire le délai de payback sous 18 mois ?',
  'Quels sont les principaux risques de trésorerie pendant la soudure ?',
  'Identifie les corridors ou coopératives rizicoles stratégiques autour du Lac Alaotra.',
];

export const GeminiAdvisorDrawer: React.FC<GeminiAdvisorDrawerProps> = ({
  open,
  onClose,
}) => {
  const { activeProject, model, assumptions } = useFinancial();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [enableMapsGrounding, setEnableMapsGrounding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const metricsSummary = useMemo(() => {
    const irr = Number.isFinite(model.irr.irrValue)
      ? formatPercent(model.irr.irrValue, 1)
      : 'N/A';
    return [
      `Investissement initial I0: ${formatAriary(model.investment.fundsToRaiseAr, { inMillions: true })}`,
      `CA Année 1: ${formatAriary(model.year1.totalTurnoverAr, { inMillions: true })}`,
      `Bénéfice Net Après IR A1: ${formatAriary(model.year1.netResultAfterTaxAr, { inMillions: true })} (${formatPercent(model.year1.netMarginAfterTaxRate, 1)})`,
      `VAN 3 ans: ${formatAriary(model.npv.npvAr, { inMillions: true })}`,
      `TRI 3 ans: ${irr} (hurdle ${formatPercent(model.npv.discountRate, 0)})`,
      `Payback: ${formatMonths(model.payback.paybackMonths)}`,
      `Région sélectionnée: ${assumptions.selectedRegionId || 'current'}`,
    ].join(' | ');
  }, [assumptions.selectedRegionId, model]);

  if (!open) return null;

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInputText('');
    setErrorMsg('');
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: activeProject.name,
          metricsSummary,
          enableMapsGrounding,
          focusLatLng: { latitude: -18.8792, longitude: 47.5079 },
          messages: nextMessages.map((m) => ({ role: m.role, text: m.text })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erreur de réponse du conseiller financier.');
      }
      const modelMsg: ChatMessage = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.replyMarkdown || 'Aucune réponse générée.',
        groundingLinks: Array.isArray(data.groundingLinks) ? data.groundingLinks : [],
      };
      setMessages((prev) => [...prev, modelMsg]);
      window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Impossible de joindre le service Gemini.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/45 no-print"
      role="dialog"
      aria-modal="true"
      aria-label="Conseiller Financier & Stratégique IA"
    >
      <div className="w-full max-w-lg h-full bg-white dark:bg-[#11101C] border-l border-zinc-200 dark:border-white/[0.1] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-zinc-200 dark:border-white/[0.08] flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                Conseiller Financier Rizicole
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate">
                {activeProject.name} · VAN {formatAriary(model.npv.npvAr, { inMillions: true })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  setErrorMsg('');
                }}
                title="Effacer la conversation"
                className="p-2 rounded-lg text-zinc-500 hover:text-rose-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <Trash2 className="w-4 h-4" aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer le panneau conseiller"
              className="p-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Maps Grounding Toggle */}
        <div className="px-4 py-2 border-b border-zinc-100 dark:border-white/[0.06] bg-zinc-50/70 dark:bg-[#0D0C18] flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-600 dark:text-zinc-400">
            Ancrage géographique Google Maps
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={enableMapsGrounding}
            onClick={() => setEnableMapsGrounding((p) => !p)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors ${
              enableMapsGrounding
                ? 'border-teal-500/45 bg-teal-500/12 text-teal-800 dark:text-teal-300'
                : 'border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400'
            }`}
          >
            <MapPin className="w-3 h-3" aria-hidden="true" />
            <span>{enableMapsGrounding ? 'Maps activé' : 'Désactivé'}</span>
          </button>
        </div>

        {/* Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Posez vos questions sur la rentabilité, la trésorerie de soudure, l’optimisation du stockage ou la logistique à Madagascar.
              </p>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void sendMessage(q)}
                    className="w-full text-left p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] hover:border-indigo-500/50 text-xs text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`p-3 rounded-xl text-xs leading-relaxed space-y-2 ${
                msg.role === 'user'
                  ? 'ml-8 bg-indigo-600 text-white'
                  : 'mr-4 border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] text-zinc-800 dark:text-zinc-100'
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.08] flex flex-wrap gap-1.5">
                  {msg.groundingLinks.map((lnk, idx) =>
                    lnk.uri ? (
                      <a
                        key={idx}
                        href={lnk.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-1 rounded-md border border-indigo-500/35 bg-indigo-500/10 text-indigo-800 dark:text-indigo-200 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <span>{lnk.title}</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    ) : null
                  )}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#161526] text-xs text-zinc-500 inline-flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
              <span>Analyse du modèle financier…</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl border border-rose-500/45 bg-rose-500/10 text-xs text-rose-800 dark:text-rose-200">
              {errorMsg}
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendMessage(inputText);
          }}
          className="p-3 border-t border-zinc-200 dark:border-white/[0.08] flex items-center gap-2 bg-zinc-50/70 dark:bg-[#0D0C18]"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Posez une question sur votre modèle financier…"
            className="flex-1 min-h-10 px-3 py-2 rounded-xl border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#141322] text-xs text-zinc-900 dark:text-zinc-100"
          />
          <button
            type="submit"
            disabled={loading || !inputText.trim()}
            aria-label="Envoyer"
            className="min-h-10 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Envoyer</span>
          </button>
        </form>
      </div>
    </div>
  );
};
