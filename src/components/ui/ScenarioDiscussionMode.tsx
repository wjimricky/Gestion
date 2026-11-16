import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFinancial } from '../../context/FinancialContext';
import {
  buildFinancingPlanAnchors,
  EXPERT_ROLE_OPTIONS,
} from '../../utils/financingAnchors';
import { FinancingPlanAnchorId, ScenarioVoiceNote } from '../../types/project';
import { SelectMenu } from './SelectMenu';
import {
  CheckCircle2,
  Circle,
  Mic,
  MicOff,
  Pause,
  Play,
  Plus,
  Trash2,
  Volume2,
} from 'lucide-react';

interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionErrorEventLike {
  error: string;
}

interface SpeechRecognitionInstanceLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
}

type SpeechRecognitionCtor = new () => SpeechRecognitionInstanceLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const win = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(s / 60);
  const secs = s % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const ScenarioDiscussionMode: React.FC = () => {
  const {
    model,
    assumptions,
    unitDisplay,
    analystName,
    setAnalystName,
    scenarioVoiceNotes,
    addScenarioVoiceNote,
    toggleScenarioVoiceNoteResolved,
    deleteScenarioVoiceNote,
    notify,
  } = useFinancial();

  const inM = unitDisplay === 'millions';
  const anchors = useMemo(
    () => buildFinancingPlanAnchors(model, assumptions, inM),
    [model, assumptions, inM]
  );

  const [selectedAnchorId, setSelectedAnchorId] = useState<FinancingPlanAnchorId>('fonds_a_lever');
  const [filterMode, setFilterMode] = useState<'all' | 'selected_anchor' | 'open'>('all');
  const [scenarioContext, setScenarioContext] =
    useState<ScenarioVoiceNote['scenarioContext']>('Plan global');
  const [expertRole, setExpertRole] = useState<string>(EXPERT_ROLE_OPTIONS[0]);
  const [authorInput, setAuthorInput] = useState<string>(analystName);

  // Web Speech API recording states
  const speechSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), []);
  const ttsSupported = useMemo(
    () => typeof window !== 'undefined' && 'speechSynthesis' in window,
    []
  );

  const [isRecording, setIsRecording] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [finalTranscript, setFinalTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | undefined>(undefined);
  const [speechStatusMsg, setSpeechStatusMsg] = useState<string>('');
  const [playingNoteId, setPlayingNoteId] = useState<string | null>(null);

  const recognitionRef = useRef<SpeechRecognitionInstanceLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const selectedAnchor = useMemo(
    () => anchors.find((a) => a.id === selectedAnchorId) || anchors[0],
    [anchors, selectedAnchorId]
  );

  useEffect(() => {
    setAuthorInput(analystName);
  }, [analystName]);

  const cleanupRecordingHandles = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanupRecordingHandles();
      if (ttsSupported) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // ignore
        }
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause();
      }
    };
  }, [ttsSupported]);

  const handleStartVoiceDictation = async () => {
    if (isRecording) {
      handleStopVoiceDictation();
      return;
    }

    const Ctor = getSpeechRecognitionCtor();
    setSpeechStatusMsg('');
    setRecordedAudioUrl(undefined);
    setInterimTranscript('');
    setElapsedSec(0);

    // 1. Optional MediaRecorder audio capture (best effort; non-blocking)
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        if (typeof MediaRecorder !== 'undefined') {
          const recorder = new MediaRecorder(stream);
          audioChunksRef.current = [];
          recorder.ondataavailable = (ev) => {
            if (ev.data && ev.data.size > 0) {
              audioChunksRef.current.push(ev.data);
            }
          };
          recorder.onstop = () => {
            if (audioChunksRef.current.length > 0) {
              const blob = new Blob(audioChunksRef.current, {
                type: recorder.mimeType || 'audio/webm',
              });
              // Store compact audio clips (< 180 KB) so localStorage stays healthy
              if (blob.size <= 180 * 1024) {
                const reader = new FileReader();
                reader.onloadend = () => {
                  if (typeof reader.result === 'string') {
                    setRecordedAudioUrl(reader.result);
                  }
                };
                reader.readAsDataURL(blob);
              }
            }
          };
          recorder.start();
          mediaRecorderRef.current = recorder;
        }
      } catch {
        // Microphone denied or unavailable; SpeechRecognition or manual transcript still handled gracefully
      }
    }

    // 2. Web Speech API SpeechRecognition
    if (Ctor) {
      try {
        const rec = new Ctor();
        rec.lang = 'fr-FR';
        rec.continuous = true;
        rec.interimResults = true;

        rec.onresult = (event) => {
          let appendedFinal = '';
          let currentInterim = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const res = event.results[i];
            const piece = res[0]?.transcript || '';
            if (res.isFinal) {
              appendedFinal += (appendedFinal ? ' ' : '') + piece.trim();
            } else {
              currentInterim += piece;
            }
          }
          if (appendedFinal) {
            setFinalTranscript((prev) =>
              prev ? `${prev.trim()} ${appendedFinal}` : appendedFinal
            );
          }
          setInterimTranscript(currentInterim);
        };

        rec.onerror = (ev) => {
          if (ev.error === 'not-allowed' || ev.error === 'service-not-allowed') {
            setSpeechStatusMsg(
              'Autorisation microphone refusée : vous pouvez saisir ou éditer la note ci-dessous, puis l’écouter via synthèse vocale.'
            );
          } else if (ev.error === 'no-speech') {
            setSpeechStatusMsg('Aucune parole détectée pour le moment. Parlez près du micro.');
          } else {
            setSpeechStatusMsg(
              `Dictée vocale interrompue (${ev.error}). Saisie manuelle disponible.`
            );
          }
          handleStopVoiceDictation();
        };

        rec.onend = () => {
          setIsRecording(false);
          if (timerRef.current !== null) {
            window.clearInterval(timerRef.current);
            timerRef.current = null;
          }
        };

        rec.start();
        recognitionRef.current = rec;
        setIsRecording(true);
        setSpeechStatusMsg('Écoute Web Speech (fr-FR) en cours… Parlez librement.');
        timerRef.current = window.setInterval(() => {
          setElapsedSec((s) => s + 1);
        }, 1000);
        return;
      } catch {
        // Fall through to timer/fallback message
      }
    }

    // Fallback when SpeechRecognition is absent in browser
    cleanupRecordingHandles();
    setIsRecording(false);
    setSpeechStatusMsg(
      'Reconnaissance vocale Web Speech indisponible sur ce navigateur : rédigez votre note d’expert ci-dessous (lecture vocale SpeechSynthesis active).'
    );
  };

  const handleStopVoiceDictation = () => {
    if (interimTranscript.trim()) {
      setFinalTranscript((prev) =>
        prev ? `${prev.trim()} ${interimTranscript.trim()}` : interimTranscript.trim()
      );
      setInterimTranscript('');
    }
    cleanupRecordingHandles();
    setIsRecording(false);
  };

  const handlePublishNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (isRecording) {
      handleStopVoiceDictation();
    }
    const combinedText = `${finalTranscript}${interimTranscript ? ` ${interimTranscript}` : ''}`.trim();
    if (!combinedText) {
      notify('error', 'Veuillez dicter ou saisir le contenu de la note vocale.');
      return;
    }
    if (authorInput.trim()) {
      setAnalystName(authorInput.trim());
    }
    addScenarioVoiceNote({
      anchorId: selectedAnchor.id,
      anchorLabel: selectedAnchor.label,
      anchorMetricSnapshot: selectedAnchor.metricSummary,
      scenarioContext,
      transcript: combinedText,
      durationSeconds: Math.max(elapsedSec, Math.ceil(combinedText.split(/\s+/).length / 2.2)),
      expertRole,
      author: authorInput.trim() || analystName,
      audioDataUrl: recordedAudioUrl,
      speechLang: 'fr-FR',
    });

    setFinalTranscript('');
    setInterimTranscript('');
    setElapsedSec(0);
    setRecordedAudioUrl(undefined);
    setSpeechStatusMsg('');
  };

  const stopPlayback = () => {
    if (ttsSupported) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
    setPlayingNoteId(null);
  };

  const handlePlayNote = (note: ScenarioVoiceNote) => {
    if (playingNoteId === note.id) {
      stopPlayback();
      return;
    }
    stopPlayback();

    if (note.audioDataUrl) {
      try {
        const audio = new Audio(note.audioDataUrl);
        audioElementRef.current = audio;
        audio.onended = () => setPlayingNoteId(null);
        audio.onerror = () => setPlayingNoteId(null);
        setPlayingNoteId(note.id);
        audio.play().catch(() => {
          setPlayingNoteId(null);
        });
        return;
      } catch {
        // fallback to Web Speech Synthesis
      }
    }

    if (ttsSupported) {
      try {
        const utterance = new SpeechSynthesisUtterance(
          `${note.expertRole}, sur ${note.anchorLabel} : ${note.transcript}`
        );
        utterance.lang = note.speechLang || 'fr-FR';
        utterance.rate = 1.0;
        utterance.onend = () => setPlayingNoteId(null);
        utterance.onerror = () => setPlayingNoteId(null);
        setPlayingNoteId(note.id);
        window.speechSynthesis.speak(utterance);
        return;
      } catch {
        setPlayingNoteId(null);
      }
    }

    notify('info', 'Lecture vocale indisponible dans cet environnement.');
  };

  const notesByAnchor = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of scenarioVoiceNotes) {
      if (!n.resolved) {
        counts[n.anchorId] = (counts[n.anchorId] || 0) + 1;
      }
    }
    return counts;
  }, [scenarioVoiceNotes]);

  const filteredNotes = useMemo(() => {
    return scenarioVoiceNotes.filter((n) => {
      if (filterMode === 'selected_anchor') return n.anchorId === selectedAnchorId;
      if (filterMode === 'open') return !n.resolved;
      return true;
    });
  }, [scenarioVoiceNotes, filterMode, selectedAnchorId]);

  const combinedDraft = `${finalTranscript}${interimTranscript ? ` ${interimTranscript}` : ''}`;

  return (
    <section
      aria-label="Mode Discussion — Revue vocale du plan de financement"
      className="rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-[#11101C] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/[0.07] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <Mic className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" aria-hidden="true" />
            <span>Mode Discussion — Notes vocales sur le plan de financement</span>
          </h2>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
            Sélectionnez un poste du plan de financement et dictez une note vocale (Web Speech API fr-FR) pour préparer la revue entre experts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>
            {speechSupported ? 'Dictée Web Speech prête (fr-FR)' : 'Saisie texte + Synthèse vocale'}
          </span>
          <span aria-hidden="true">·</span>
          <span className="font-mono tabular-nums font-semibold text-zinc-900 dark:text-zinc-200">
            {scenarioVoiceNotes.filter((n) => !n.resolved).length} ouverte(s) / {scenarioVoiceNotes.length} total
          </span>
        </div>
      </div>

      {/* Main Split: Financing Plan Points (Left) + Voice Recorder & Thread (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-white/[0.07]">
        {/* Left: 8 Anchors of the Financing Plan */}
        <div className="lg:col-span-5 p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
              Points du plan de financement
            </h3>
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
              Cliquez pour cibler
            </span>
          </div>

          <div className="divide-y divide-zinc-200 dark:divide-white/[0.06] border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden">
            {anchors.map((anchor) => {
              const isSelected = anchor.id === selectedAnchorId;
              const openCount = notesByAnchor[anchor.id] || 0;
              return (
                <button
                  key={anchor.id}
                  type="button"
                  onClick={() => setSelectedAnchorId(anchor.id)}
                  aria-pressed={isSelected}
                  className={`w-full text-left px-3.5 py-2.5 transition-colors flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-indigo-600/10 dark:bg-indigo-500/15 text-zinc-950 dark:text-white'
                      : 'bg-white dark:bg-transparent hover:bg-zinc-50 dark:hover:bg-white/[0.03] text-zinc-800 dark:text-zinc-200'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                        {anchor.code}.
                      </span>
                      <span className="truncate">{anchor.label}</span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-zinc-600 dark:text-zinc-400 truncate">
                      {anchor.contextDetail}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono tabular-nums text-zinc-900 dark:text-zinc-100">
                      {anchor.metricSummary}
                    </div>
                    {openCount > 0 && (
                      <div className="mt-0.5 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 font-mono tabular-nums">
                        {openCount} note{openCount > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Web Speech Voice Composer + Threaded Notes */}
        <div className="lg:col-span-7 p-4 sm:p-5 space-y-5">
          {/* Selected Anchor Target + Voice Recording Composer */}
          <form onSubmit={handlePublishNote} className="space-y-3.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-zinc-200 dark:border-white/[0.07]">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Point ciblé · {selectedAnchor.code}. {selectedAnchor.shortLabel}
                </div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {selectedAnchor.label}
                </div>
              </div>
              <div className="text-left sm:text-right font-mono tabular-nums">
                <div className="text-xs font-bold text-teal-700 dark:text-teal-300">
                  {selectedAnchor.metricSummary}
                </div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Instantané joint à la note
                </div>
              </div>
            </div>

            {/* Author / Expert Role / Scenario Context */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label
                  htmlFor="voice-author-input"
                  className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Intervenant
                </label>
                <input
                  id="voice-author-input"
                  type="text"
                  value={authorInput}
                  onChange={(e) => setAuthorInput(e.target.value)}
                  placeholder="Nom de l'expert"
                  className="w-full h-9 px-3 rounded-lg border border-zinc-300 dark:border-white/[0.12] bg-white dark:bg-[#191828] text-xs text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label
                  htmlFor="voice-role-select"
                  className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Rôle d&apos;expertise
                </label>
                <SelectMenu
                  id="voice-role-select"
                  size="sm"
                  ariaLabel="Rôle d'expertise"
                  value={expertRole}
                  onChange={setExpertRole}
                  options={EXPERT_ROLE_OPTIONS.map((r) => ({ value: r, label: r }))}
                />
              </div>

              <div>
                <label
                  htmlFor="voice-scenario-select"
                  className="block text-[11px] font-semibold text-zinc-600 dark:text-zinc-400 mb-1"
                >
                  Scénario associé
                </label>
                <SelectMenu
                  id="voice-scenario-select"
                  size="sm"
                  ariaLabel="Scénario associé"
                  value={scenarioContext}
                  onChange={(val) =>
                    setScenarioContext(val as ScenarioVoiceNote['scenarioContext'])
                  }
                  options={[
                    { value: 'Plan global', label: 'Plan global' },
                    { value: 'Pessimiste', label: 'Pessimiste' },
                    { value: 'Réaliste', label: 'Réaliste' },
                    { value: 'Optimiste', label: 'Optimiste' },
                  ]}
                />
              </div>
            </div>

            {/* Web Speech Recorder Controls */}
            <div className="p-3 rounded-xl border border-zinc-200 dark:border-white/[0.08] bg-zinc-50 dark:bg-[#0D0C16] space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleStartVoiceDictation}
                  className={`min-h-10 px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 ${
                    isRecording
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  {isRecording ? (
                    <>
                      <MicOff className="w-4 h-4" aria-hidden="true" />
                      <span>Arrêter la dictée ({formatDuration(elapsedSec)})</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-4 h-4" aria-hidden="true" />
                      <span>Démarrer la note vocale (Web Speech)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2 text-[11px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400">
                  {isRecording && (
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      Enregistrement · {formatDuration(elapsedSec)}
                    </span>
                  )}
                  {!isRecording && recordedAudioUrl && (
                    <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                      Audio capturé ({formatDuration(elapsedSec)})
                    </span>
                  )}
                </div>
              </div>

              {speechStatusMsg && (
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                  {speechStatusMsg}
                </p>
              )}

              <textarea
                aria-label="Transcription de la note vocale"
                rows={3}
                value={combinedDraft}
                onChange={(e) => {
                  setFinalTranscript(e.target.value);
                  setInterimTranscript('');
                }}
                placeholder="Votre dictée Web Speech apparaît ici en direct… Vous pouvez également saisir ou ajuster le commentaire d’expert manuellement."
                className="w-full rounded-lg border border-zinc-300 dark:border-white/[0.1] bg-white dark:bg-[#141322] p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-relaxed"
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setFinalTranscript(
                        `Valider le dimensionnement de « ${selectedAnchor.shortLabel} » (${selectedAnchor.metricSummary}) avant comité de financement.`
                      )
                    }
                    className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-[11px] text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
                  >
                    + Modèle validation comité
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFinalTranscript(
                        `Point de vigilance sur ${selectedAnchor.shortLabel} en Basse Saison : prévoir une marge de sécurité supplémentaire sur le BFR.`
                      )
                    }
                    className="px-2.5 py-1 rounded-md border border-zinc-200 dark:border-white/[0.1] bg-white dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-[11px] text-zinc-700 dark:text-zinc-300 transition-colors whitespace-nowrap"
                  >
                    + Modèle alerte soudure
                  </button>
                </div>

                <button
                  type="submit"
                  className="min-h-9 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Attacher la note vocale</span>
                </button>
              </div>
            </div>
          </form>

          {/* Filter & Notes List */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                Fil de revue des experts ({filteredNotes.length})
              </h3>
              <div
                role="group"
                aria-label="Filtrer les notes vocales"
                className="inline-flex items-center gap-1 p-1 rounded-lg bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-white/[0.08]"
              >
                {[
                  { id: 'all', label: 'Toutes' },
                  { id: 'selected_anchor', label: 'Point ciblé' },
                  { id: 'open', label: 'Ouvertes' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      setFilterMode(opt.id as 'all' | 'selected_anchor' | 'open')
                    }
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap ${
                      filterMode === opt.id
                        ? 'bg-white dark:bg-[#191828] text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredNotes.length === 0 ? (
              <div className="p-5 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.12] text-center space-y-1.5">
                <Volume2 className="w-5 h-5 text-zinc-400 mx-auto" aria-hidden="true" />
                <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Aucune note vocale pour ce filtre
                </p>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Sélectionnez un point du plan de financement à gauche et lancez une dictée Web Speech pour démarrer la revue.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-white/[0.07] border border-zinc-200 dark:border-white/[0.08] rounded-xl overflow-hidden max-h-[360px] overflow-y-auto">
                {filteredNotes.map((note) => {
                  const isPlaying = playingNoteId === note.id;
                  return (
                    <article
                      key={note.id}
                      className={`p-3.5 space-y-2 transition-colors ${
                        note.resolved
                          ? 'bg-zinc-50/70 dark:bg-white/[0.015] opacity-75'
                          : 'bg-white dark:bg-transparent'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                            <span className="font-bold text-zinc-900 dark:text-zinc-100">
                              {note.author}
                            </span>
                            <span className="text-zinc-400" aria-hidden="true">·</span>
                            <span className="text-indigo-700 dark:text-indigo-300 font-medium">
                              {note.expertRole}
                            </span>
                            <span className="text-zinc-400" aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums text-[11px] text-zinc-500 dark:text-zinc-400">
                              {new Date(note.createdAt).toLocaleString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-zinc-600 dark:text-zinc-400">
                            <button
                              type="button"
                              onClick={() => setSelectedAnchorId(note.anchorId)}
                              className="font-semibold text-teal-700 dark:text-teal-300 hover:underline text-left"
                            >
                              {note.anchorLabel}
                            </button>
                            <span aria-hidden="true">·</span>
                            <span>{note.scenarioContext}</span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              Instantané : {note.anchorMetricSnapshot}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handlePlayNote(note)}
                            title={
                              isPlaying
                                ? 'Arrêter la lecture vocale'
                                : 'Écouter la note vocale'
                            }
                            className={`h-8 px-2.5 rounded-lg border text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                              isPlaying
                                ? 'border-indigo-500 bg-indigo-600 text-white'
                                : 'border-zinc-200 dark:border-white/[0.12] bg-zinc-50 dark:bg-[#191828] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-800 dark:text-zinc-200'
                            }`}
                          >
                            {isPlaying ? (
                              <>
                                <Pause className="w-3 h-3" aria-hidden="true" />
                                <span>Arrêter</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" aria-hidden="true" />
                                <span className="font-mono tabular-nums">
                                  Écouter ({formatDuration(note.durationSeconds)})
                                </span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => toggleScenarioVoiceNoteResolved(note.id)}
                            title={
                              note.resolved
                                ? 'Rouvrir cette remarque'
                                : 'Marquer comme résolu'
                            }
                            className="h-8 px-2 rounded-lg border border-zinc-200 dark:border-white/[0.12] hover:bg-zinc-100 dark:hover:bg-[#222038] text-zinc-700 dark:text-zinc-300 inline-flex items-center gap-1 text-[11px] font-medium transition-colors"
                          >
                            {note.resolved ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                                <span>Résolue</span>
                              </>
                            ) : (
                              <>
                                <Circle className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                                <span>Valider</span>
                              </>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteScenarioVoiceNote(note.id)}
                            aria-label="Supprimer la note vocale"
                            className="h-8 w-8 rounded-lg border border-zinc-200 dark:border-white/[0.12] hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-300 dark:hover:border-rose-800 text-zinc-500 hover:text-rose-700 dark:hover:text-rose-300 inline-flex items-center justify-center transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-zinc-800 dark:text-zinc-200 leading-relaxed">
                        {note.transcript}
                      </p>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
