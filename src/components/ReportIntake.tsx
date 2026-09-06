import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, FileText, Activity as PulseIcon, AlertCircle, Radio, Volume2, ShieldCheck, ShieldAlert, Sliders, CheckCircle2 } from 'lucide-react';
import { normalizeSpokenReport } from '../utils/constructionPhonetics';

interface ReportIntakeProps {
  onSubmitReport: (reportText: string) => void;
  isProcessing: boolean;
}

// Declaration for browser SpeechRecognition API
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const SAMPLE_REPORTS = [
  "Raft Foundation concrete pour in Zone A reached 85% completion today with 4 transit mixers deployed.",
  "Excavation in Zone A finished today ahead of schedule.",
  "60% shuttering done in Zone B, delayed due to material shortage at site.",
  "Column rebar bending in Zone B reached 40% completion.",
  "Diaphragm wall excavation completed at North Shaft station box.",
  "Bituminous asphalt paving delayed in Section 1 due to heavy rainfall."
];

// Phonetic Regex matching "Hey Setu" variations
const DEFAULT_WAKE_WORD_REGEX = /\b(hey|hi|hello|ok|ay|hay|aay)?\s*(setu|cetu|situ|ctu|ctoo|saktu|citu|seetoo|seto|saytoo|shetoo|c2)\b/gi;

// Human speech decibel threshold (% volume)
const HUMAN_SPEECH_DECIBEL_THRESHOLD = 12; // Volumes <12% represent sub-human voice / silence
const SILENCE_FINISH_DURATION_MS = 1400; // 1.4 seconds of continuous silence to auto-finish

function sanitizeReportText(text: string): string {
  if (!text) return '';
  let result = text
    .replace(/\b(hey|hi|hello|ok|ay|hay|aay)?\s*(setu|cetu|situ|ctu|ctoo|saktu|citu|seetoo|seto|saytoo|shetoo|c2)\b/gi, '')
    .replace(/^[\s,.-]+/, '')
    .trim();

  result = normalizeSpokenReport(result);

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}

function isFuzzySetuMatch(text: string): boolean {
  const tokens = text.toLowerCase().split(/\s+/);
  for (const tok of tokens) {
    if (tok === 'setu' || tok === 'ctu' || tok === 'cetu' || tok === 'situ') return true;
    if (tok.length >= 3) {
      let matchCount = 0;
      if (tok.includes('s') || tok.includes('c')) matchCount++;
      if (tok.includes('e') || tok.includes('i')) matchCount++;
      if (tok.includes('t')) matchCount++;
      if (tok.includes('u') || tok.includes('o')) matchCount++;
      if (matchCount >= 3) return true;
    }
  }
  return false;
}

export const ReportIntake: React.FC<ReportIntakeProps> = ({
  onSubmitReport,
  isProcessing
}) => {
  const [reportText, setReportText] = useState('');
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [voiceMode, setVoiceMode] = useState<'off' | 'wake_listen' | 'dictating'>('off');
  const [wakeWordDetected, setWakeWordDetected] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'listening' | 'wake_listening' | 'denied' | 'unsupported'>('idle');
  const [audioWaveform, setAudioWaveform] = useState<number[]>([15, 30, 60, 40, 80, 50, 90, 30, 20]);
  const [decibelLevel, setDecibelLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [sensitivity, setSensitivity] = useState<'high' | 'standard'>('high');

  // Voice Trainer State
  const [isTrainerOpen, setIsTrainerOpen] = useState(false);
  const [trainerStep, setTrainerStep] = useState(1);
  const [trainerTranscripts, setTrainerTranscripts] = useState<string[]>([]);
  const [customPhrases, setCustomPhrases] = useState<string[]>(() => {
    const saved = localStorage.getItem('setutrack_custom_wake_phrases');
    return saved ? JSON.parse(saved) : [];
  });

  // Refs for VAD Decibel Engine & State Machine
  const voiceModeRef = useRef<'off' | 'wake_listen' | 'dictating'>('off');
  const reportTextRef = useRef('');
  const customPhrasesRef = useRef<string[]>([]);
  const sensitivityRef = useRef<'high' | 'standard'>('high');
  const wakeWordResultIndexRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  // Decibel Silence VAD Refs
  const hasSpokenVoiceRef = useRef<boolean>(false);
  const silenceStartTimeRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const trainerRecognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { voiceModeRef.current = voiceMode; }, [voiceMode]);
  useEffect(() => { reportTextRef.current = reportText; }, [reportText]);
  useEffect(() => { customPhrasesRef.current = customPhrases; }, [customPhrases]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Real-time automatic sanitizer watcher on reportText
  useEffect(() => {
    if (DEFAULT_WAKE_WORD_REGEX.test(reportText)) {
      const cleaned = sanitizeReportText(reportText);
      if (cleaned !== reportText) {
        setReportText(cleaned);
      }
    }
  }, [reportText]);

  const matchesWakeWord = (transcript: string): boolean => {
    const lower = transcript.toLowerCase();
    if (customPhrasesRef.current.some(phrase => lower.includes(phrase.toLowerCase()))) return true;
    if (DEFAULT_WAKE_WORD_REGEX.test(lower)) return true;
    if (sensitivityRef.current === 'high' && isFuzzySetuMatch(lower)) return true;
    return false;
  };

  // UNIFIED SINGLE-INSTANCE SPEECH RECOGNITION ENGINE
  const startUnifiedSpeechEngine = async () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setMicStatus('unsupported');
      return;
    }

    if (!mediaStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        startAudioAnalysis(stream);
        setHasMicPermission(true);
      } catch (err) {
        console.warn('Mic permission error:', err);
        setMicStatus('denied');
        setHasMicPermission(false);
        return;
      }
    }

    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const rawTranscript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        // MODE A: WAKE WORD LISTENING
        if (voiceModeRef.current === 'wake_listen') {
          if (matchesWakeWord(rawTranscript)) {
            console.log('⚡ WAKE WORD "HEY SETU" DETECTED AT INDEX:', i);
            
            wakeWordResultIndexRef.current = i + 1;
            voiceModeRef.current = 'dictating';
            setVoiceMode('dictating');
            setWakeWordDetected(true);
            setMicStatus('listening');
            
            // Reset VAD Decibel Tracker
            hasSpokenVoiceRef.current = false;
            silenceStartTimeRef.current = null;

            const cleanedAfterWake = sanitizeReportText(rawTranscript);
            if (cleanedAfterWake) {
              setReportText(cleanedAfterWake);
            }

            setTimeout(() => { setWakeWordDetected(false); }, 1500);
            return;
          }
        } 
        // MODE B: DICTATING REPORT
        else if (voiceModeRef.current === 'dictating') {
          if (i < wakeWordResultIndexRef.current) continue;

          const cleanedText = sanitizeReportText(rawTranscript);

          if (isFinal) {
            if (cleanedText) {
              const updatedText = (reportTextRef.current ? reportTextRef.current + ' ' : '') + cleanedText;
              const finalFormatted = sanitizeReportText(updatedText);
              setReportText(finalFormatted);
            }
          } else {
            if (cleanedText) {
              currentInterim += (currentInterim ? ' ' : '') + cleanedText;
            }
          }
        }
      }

      setInterimTranscript(sanitizeReportText(currentInterim));
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech engine error:', event.error);
      if (event.error === 'not-allowed') {
        setMicStatus('denied');
      }
    };

    recognition.onend = () => {
      if (voiceModeRef.current !== 'off' && hasMicPermission) {
        setTimeout(() => {
          try { recognition.start(); } catch (e) {}
        }, 150);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      voiceModeRef.current = 'wake_listen';
      setVoiceMode('wake_listen');
      setMicStatus('wake_listening');
    } catch (e) {
      console.warn('Error starting speech engine:', e);
    }
  };

  const disableMicrophone = () => {
    voiceModeRef.current = 'off';
    setVoiceMode('off');
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (e) {}
    }
    stopAudioAnalysis();
    setHasMicPermission(false);
    setMicStatus('idle');
    setInterimTranscript('');
  };

  // DECIBEL VOLUME & VOICE ACTIVITY DETECTION (VAD) ENGINE
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateWaveform = () => {
        if (!audioCtx || audioCtx.state === 'closed') return;
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        const newWave: number[] = [];
        for (let i = 0; i < 9; i++) {
          const val = dataArray[i] || 0;
          sum += val;
          newWave.push(Math.max(10, Math.min(100, Math.round((val / 255) * 100))));
        }
        setAudioWaveform(newWave);

        // Calculate average RMS decibel volume % (0 to 100%)
        const avgVol = Math.round(((sum / (dataArray.length || 9)) / 255) * 100);
        setDecibelLevel(avgVol);

        // DECIBEL SILENCE TEARDOWN VAD LOGIC
        if (voiceModeRef.current === 'dictating') {
          if (avgVol >= HUMAN_SPEECH_DECIBEL_THRESHOLD) {
            // Human speech decibels detected!
            hasSpokenVoiceRef.current = true;
            silenceStartTimeRef.current = null;
          } else if (hasSpokenVoiceRef.current) {
            // Decibel volume dropped below human speech level AFTER user started speaking
            if (!silenceStartTimeRef.current) {
              silenceStartTimeRef.current = Date.now();
            } else if (Date.now() - silenceStartTimeRef.current >= SILENCE_FINISH_DURATION_MS) {
              console.log('⚡ DECIBEL SILENCE DROP DETECTED — ENDING DICTATION & SYNCING!');
              
              silenceStartTimeRef.current = null;
              hasSpokenVoiceRef.current = false;

              // 1. Transition mode back to wake_listen
              voiceModeRef.current = 'wake_listen';
              setVoiceMode('wake_listen');
              setMicStatus('wake_listening');

              // 2. Submit report automatically!
              const finalReport = sanitizeReportText(reportTextRef.current);
              if (finalReport && !isProcessingRef.current) {
                onSubmitReport(finalReport);
              }
            }
          }
        }

        requestAnimationFrame(updateWaveform);
      };

      updateWaveform();
    } catch (err) {
      console.warn('Could not initialize audio visualizer:', err);
    }
  };

  const stopAudioAnalysis = () => {
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      stopAudioAnalysis();
    };
  }, []);

  const startTrainerStep = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    if (trainerRecognitionRef.current) {
      try { trainerRecognitionRef.current.stop(); } catch (e) {}
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';

    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.trim().toLowerCase();
      if (event.results[0].isFinal && transcript) {
        setTrainerTranscripts(prev => {
          const updated = [...prev, transcript];
          if (updated.length >= 3) {
            const newPhrases = Array.from(new Set([...customPhrases, ...updated]));
            setCustomPhrases(newPhrases);
            localStorage.setItem('setutrack_custom_wake_phrases', JSON.stringify(newPhrases));
          }
          return updated;
        });

        setTrainerStep(prev => Math.min(3, prev + 1));
      }
    };

    trainerRecognitionRef.current = rec;
    try { rec.start(); } catch (e) {}
  };

  const handleManualMicToggle = async () => {
    if (voiceMode === 'dictating') {
      voiceModeRef.current = 'wake_listen';
      setVoiceMode('wake_listen');
      setMicStatus('wake_listening');

      const textToSubmit = sanitizeReportText(reportTextRef.current);
      if (textToSubmit && !isProcessing) {
        onSubmitReport(textToSubmit);
      }
      return;
    }

    if (!hasMicPermission) {
      await startUnifiedSpeechEngine();
    }

    hasSpokenVoiceRef.current = false;
    silenceStartTimeRef.current = null;
    voiceModeRef.current = 'dictating';
    setVoiceMode('dictating');
    setMicStatus('listening');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportText.trim() || isProcessing) return;
    onSubmitReport(sanitizeReportText(reportText.trim()));
  };

  return (
    <section className="blueprint-card p-5 rounded-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-4 flex-wrap gap-2">
        <div>
          <h2 className="text-lg font-bold text-amber-300 mono-font flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            2. SITE REPORT INTAKE (DECIBEL VAD VOICE & TEXT)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Say <strong className="text-cyan-300 font-extrabold">"Hey Setu"</strong> to dictate. Automatically auto-submits when voice volume drops below decibel speech levels!
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Calibrate / Train Voice Modal Trigger */}
          <button
            type="button"
            onClick={async () => {
              if (!hasMicPermission) await startUnifiedSpeechEngine();
              setTrainerStep(1);
              setTrainerTranscripts([]);
              setIsTrainerOpen(true);
              startTrainerStep();
            }}
            className="flex items-center gap-1.5 px-3 py-1 text-xs mono-font font-bold bg-cyan-950 text-cyan-300 border border-cyan-400/60 hover:bg-cyan-900 rounded-xs transition-all cursor-pointer shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>🎯 TRAIN YOUR VOICE</span>
          </button>

          {/* Grant or Disable Microphone Button */}
          {!hasMicPermission ? (
            <button
              type="button"
              onClick={startUnifiedSpeechEngine}
              className="flex items-center gap-1.5 px-3 py-1 text-xs mono-font font-bold bg-amber-500 text-slate-950 hover:bg-amber-400 rounded-xs transition-all cursor-pointer shadow-[0_0_10px_rgba(255,159,28,0.4)] animate-pulse"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>ENABLE "HEY SETU" MIC ACCESS</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={disableMicrophone}
              className="flex items-center gap-1.5 px-3 py-1 text-xs mono-font font-bold bg-crimson-950/80 border border-crimson-500 text-crimson-300 hover:bg-crimson-900 rounded-xs transition-all cursor-pointer shadow-[0_0_10px_rgba(239,68,68,0.3)]"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-crimson-400" />
              <span>DISABLE MICROPHONE (PRIVACY)</span>
            </button>
          )}

          {/* Mode Indicator Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 text-xs mono-font border border-cyan-400/60 bg-cyan-950 text-cyan-300 rounded-xs">
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>
              MODE: {voiceMode === 'off' ? 'MIC OFF' : (voiceMode === 'wake_listen' ? 'LISTENING FOR "HEY SETU"' : 'DICTATING REPORT')}
            </span>
          </div>
        </div>
      </div>

      {/* Wake Word Detection Alert Banner */}
      {wakeWordDetected && (
        <div className="mb-4 p-3.5 bg-cyan-950 border-2 border-cyan-400 rounded-xs text-xs mono-font text-cyan-200 flex items-center justify-between animate-bounce shadow-[0_0_20px_rgba(0,240,255,0.6)]">
          <div className="flex items-center gap-2.5">
            <Volume2 className="w-5 h-5 text-cyan-400" />
            <span className="font-extrabold text-cyan-300 text-sm">⚡ WAKE WORD "HEY SETU" DETECTED! LISTENING FOR FIELD REPORT NOW...</span>
          </div>
        </div>
      )}

      {/* Permission Warning if Denied */}
      {micStatus === 'denied' && (
        <div className="mb-4 p-3 bg-crimson-950/60 border border-crimson-500/50 rounded-xs text-xs mono-font text-crimson-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Microphone permission was denied by browser. Please click the camera/microphone icon in your browser URL bar to allow access.
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        
        {/* Quick Test Preset Chips */}
        <div>
          <span className="text-[11px] font-bold text-cyan-400 mono-font block mb-2 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> QUICK TEST PRESETS (CLICK TO POPULATE):
          </span>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_REPORTS.map((sample, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setReportText(sample)}
                className="text-[11px] mono-font text-slate-300 bg-slate-900 hover:bg-cyan-950 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400 px-2.5 py-1.5 rounded-xs text-left transition-all cursor-pointer"
              >
                "{sample}"
              </button>
            ))}
          </div>
        </div>

        {/* Free-Form Text Area & Active Dictation Overlay */}
        <div className="relative">
          <textarea
            rows={4}
            required
            placeholder={
              hasMicPermission 
                ? "Say 'Hey Setu' aloud anytime to dictate hands-free. Stops automatically when your voice volume drops below decibel speech levels..." 
                : "Click 'ENABLE HEY SETU MIC ACCESS' above to start voice commands, or type field updates here..."
            }
            value={reportText}
            onChange={(e) => setReportText(e.target.value)}
            className="w-full bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 text-slate-100 p-3 text-xs mono-font rounded-xs focus:outline-none focus:ring-1 focus:ring-cyan-400/50 resize-none shadow-inner"
          />

          {/* Active Dictation & Decibel Meter Overlay */}
          {voiceMode === 'dictating' && (
            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-xs flex flex-col items-center justify-center p-4 border border-amber-400/80 rounded-xs z-20">
              
              {/* Waveform Visualization */}
              <div className="flex items-center gap-1.5 h-12 mb-2">
                {audioWaveform.map((h, i) => (
                  <div
                    key={i}
                    className="w-2 bg-gradient-to-t from-amber-500 to-cyan-400 rounded-full transition-all duration-100 shadow-[0_0_10px_#ff9f1c]"
                    style={{ height: `${h}%` }}
                  ></div>
                ))}
              </div>

              {/* Decibel Volume Level Gauge */}
              <div className="flex items-center gap-2 mb-2 text-xs mono-font">
                <span className="text-slate-400 text-[11px]">VOICE VOLUME DECIBEL:</span>
                <span className={`font-bold px-2 py-0.5 rounded-xs border ${
                  decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD
                    ? 'text-emerald-300 bg-emerald-950 border-emerald-500'
                    : 'text-amber-400 bg-amber-950 border-amber-500/50'
                }`}>
                  {decibelLevel}% {decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD ? '(HUMAN VOICE)' : '(SUB-HUMAN SILENCE)'}
                </span>
              </div>

              <p className="text-xs font-bold text-amber-300 mono-font animate-pulse flex items-center gap-1.5 mb-1">
                <PulseIcon className="w-4 h-4 text-amber-400 animate-spin" />
                DICTATING REPORT... PAUSE FOR 1.4s TO AUTO-SUBMIT & SYNC!
              </p>

              {interimTranscript && (
                <p className="text-xs text-cyan-300 italic mono-font bg-slate-900 px-3 py-1 border border-cyan-500/40 rounded-xs mt-1 max-w-lg text-center truncate">
                  "{interimTranscript}"
                </p>
              )}

              <button
                type="button"
                onClick={handleManualMicToggle}
                className="mt-3 px-3 py-1 bg-amber-400 text-slate-950 font-extrabold text-[11px] mono-font rounded-xs hover:bg-amber-300 cursor-pointer"
              >
                FINISH & SYNC REPORT NOW
              </button>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleManualMicToggle}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs mono-font font-bold border rounded-xs transition-all cursor-pointer ${
                voiceMode === 'dictating' 
                  ? 'bg-amber-950 text-amber-300 border-amber-400 animate-pulse shadow-[0_0_12px_rgba(255,159,28,0.5)]' 
                  : 'bg-slate-900 text-cyan-300 border-cyan-400 hover:bg-cyan-950 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]'
              }`}
            >
              {voiceMode === 'dictating' ? <MicOff className="w-4 h-4 text-amber-400" /> : <Mic className="w-4 h-4 text-cyan-400 animate-bounce" />}
              <span>{voiceMode === 'dictating' ? 'STOP DICTATION' : 'ACTIVATE MIC MANUALLY'}</span>
            </button>

            {hasMicPermission ? (
              <span className="text-[11px] text-cyan-400 mono-font flex items-center gap-1 animate-pulse">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Listening for wake word <strong className="text-amber-300">"Hey Setu"</strong>
              </span>
            ) : (
              <span className="text-[11px] text-amber-400 mono-font">
                ⚠️ Click "ENABLE HEY SETU MIC ACCESS" above to activate hands-free mode
              </span>
            )}
          </div>

          {/* Sensitivity Selector */}
          <div className="flex items-center gap-2 text-xs mono-font">
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-400">Sensitivity:</span>
            <button
              type="button"
              onClick={() => setSensitivity(s => s === 'high' ? 'standard' : 'high')}
              className={`px-2 py-0.5 rounded-xs border text-[11px] cursor-pointer ${
                sensitivity === 'high'
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500'
                  : 'bg-slate-900 text-slate-400 border-slate-700'
              }`}
            >
              {sensitivity === 'high' ? 'High Fuzzy Match' : 'Standard'}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={!reportText.trim() || isProcessing}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-emerald-400 text-slate-950 font-extrabold text-xs mono-font rounded-xs hover:brightness-110 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-[0_0_15px_rgba(0,240,255,0.4)]"
          >
            <Send className="w-4 h-4" />
            <span>{isProcessing ? 'ANALYZING MATCH...' : 'MATCH & EVALUATE REPORT'}</span>
          </button>
        </div>

      </form>

      {/* VOICE TRAINER MODAL */}
      {isTrainerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="blueprint-card max-w-md w-full p-6 rounded-sm border-cyan-400 text-xs mono-font space-y-4">
            <div className="flex justify-between items-center border-b border-cyan-500/30 pb-3">
              <h3 className="font-extrabold text-cyan-300 text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                CALIBRATE YOUR VOICE FOR "HEY SETU"
              </h3>
              <span className="text-[10px] text-amber-400 border border-amber-500/40 px-1.5 py-0.5 rounded-xs">
                STEP {trainerStep} OF 3
              </span>
            </div>

            {trainerStep <= 3 ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-slate-200">
                  Please speak <strong className="text-amber-300 text-base block my-1">"Hey Setu"</strong> into your microphone now ({trainerStep}/3).
                </p>
                <div className="w-16 h-16 rounded-full bg-cyan-950 border-2 border-cyan-400 text-cyan-400 flex items-center justify-center mx-auto animate-pulse shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                  <Mic className="w-8 h-8" />
                </div>
                <p className="text-[11px] text-slate-400 italic">
                  SetuTrack is listening to calibrate your voice and accent pattern...
                </p>
                <button
                  type="button"
                  onClick={startTrainerStep}
                  className="px-3 py-1 bg-slate-900 border border-cyan-500/40 text-cyan-300 rounded-xs cursor-pointer"
                >
                  Click to Speak Step {trainerStep}
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>VOICE CALIBRATION COMPLETE!</span>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Registered your accent audio patterns:
                </p>
                <div className="bg-slate-950 p-2 border border-cyan-500/30 rounded-xs space-y-1 text-cyan-300">
                  {trainerTranscripts.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-amber-400 font-bold">•</span> "{t}"
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTrainerOpen(false);
                    if (hasMicPermission) startUnifiedSpeechEngine();
                  }}
                  className="w-full py-2 bg-emerald-400 text-slate-950 font-bold rounded-xs cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                >
                  SAVE & RETURN TO APP
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-cyan-500/20 flex justify-end">
              <button
                type="button"
                onClick={() => setIsTrainerOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-[11px] underline cursor-pointer"
              >
                Close Trainer
              </button>
            </div>
          </div>
        </div>
      )}

    </section>
  );
};
