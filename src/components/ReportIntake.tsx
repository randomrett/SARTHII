import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, MicOff, Sparkles, Activity as PulseIcon, AlertCircle, Radio, Volume2, ShieldCheck, ShieldAlert, CheckCircle2 } from 'lucide-react';
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

// Phonetic Regex matching "Hey Saarthi" variations (stateless helper function)
const DEFAULT_WAKE_WORD_PATTERN = '\\b(hey|hi|hello|ok|ay|hay|aay)?\\s*(saarthi|sarthi|saarti|sarti|saathi|sarathi|sarthee|saarthee|saraty|saari|saari3|sari)\\b';

function isRegexWakeMatch(text: string): boolean {
  if (!text) return false;
  const regex = new RegExp(DEFAULT_WAKE_WORD_PATTERN, 'i');
  return regex.test(text);
}

// Human speech decibel threshold (% volume)
const HUMAN_SPEECH_DECIBEL_THRESHOLD = 12; // Volumes <12% represent sub-human voice / silence
const SILENCE_FINISH_DURATION_MS = 1400; // 1.4 seconds of continuous silence to auto-finish

function sanitizeReportText(text: string): string {
  if (!text) return '';
  const regex = new RegExp(DEFAULT_WAKE_WORD_PATTERN, 'gi');
  let result = text
    .replace(regex, '')
    .replace(/^[\s,.-]+/, '')
    .trim();

  result = normalizeSpokenReport(result);

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}

function isFuzzySaarthiMatch(text: string): boolean {
  const tokens = text.toLowerCase().split(/\s+/);
  const exactVariants = [
    'saarthi', 'sarthi', 'saarti', 'sarti', 'saathi', 'sarathi',
    'sarthee', 'saarthee', 'sarati', 'sari', 'sarth'
  ];
  for (const tok of tokens) {
    if (exactVariants.includes(tok)) return true;
    if (tok.length >= 4 && (tok.startsWith('s') || tok.startsWith('c'))) {
      if ((tok.includes('ar') || tok.includes('aa')) && (tok.includes('th') || tok.includes('rt') || tok.includes('t')) && (tok.endsWith('i') || tok.endsWith('y') || tok.endsWith('ee'))) {
        return true;
      }
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
    const saved = localStorage.getItem('saarthi_custom_wake_phrases');
    return saved ? JSON.parse(saved) : [];
  });

  // Refs for VAD Decibel Engine & State Machine
  const voiceModeRef = useRef<'off' | 'wake_listen' | 'dictating'>('off');
  const hasMicPermissionRef = useRef(false);
  const reportTextRef = useRef('');
  const customPhrasesRef = useRef<string[]>([]);
  const sensitivityRef = useRef<'high' | 'standard'>('high');
  const wakeWordResultIndexRef = useRef<number>(0);
  const isProcessingRef = useRef(false);

  // Diagnostic Error Tracker Refs
  const consecutiveErrorsRef = useRef<number>(0);
  const lastErrorRef = useRef<string>('');

  // MediaRecorder & Whisper Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [isTranscribingWhisper, setIsTranscribingWhisper] = useState(false);

  // Decibel Silence VAD Refs
  const hasSpokenVoiceRef = useRef<boolean>(false);
  const silenceStartTimeRef = useRef<number | null>(null);

  const recognitionRef = useRef<any>(null);
  const trainerRecognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const interimTranscriptRef = useRef('');

  useEffect(() => { 
    console.log('[SAARTHI VOICE STATE] Voice mode changed:', voiceModeRef.current, '->', voiceMode);
    voiceModeRef.current = voiceMode; 

    // Start MediaRecorder audio capture when entering dictating mode
    if (voiceMode === 'dictating' && mediaStreamRef.current) {
      try {
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : (MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4');
        
        const recorder = new MediaRecorder(mediaStreamRef.current, { mimeType });
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };
        recorder.start(250);
        mediaRecorderRef.current = recorder;
        console.log('[SAARTHI WHISPER RECORDER] Started recording audio chunks (mimeType:', mimeType, ')');
      } catch (err) {
        console.warn('[SAARTHI WHISPER RECORDER] Could not start MediaRecorder:', err);
      }
    }
  }, [voiceMode]);

  useEffect(() => { hasMicPermissionRef.current = hasMicPermission; }, [hasMicPermission]);
  useEffect(() => { reportTextRef.current = reportText; }, [reportText]);
  useEffect(() => { interimTranscriptRef.current = interimTranscript; }, [interimTranscript]);
  useEffect(() => { customPhrasesRef.current = customPhrases; }, [customPhrases]);
  useEffect(() => { sensitivityRef.current = sensitivity; }, [sensitivity]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Initial Diagnostic Permission Check
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    console.log('[SAARTHI VOICE DIAGNOSTIC] SpeechRecognition available:', !!SpeechRecognition, typeof SpeechRecognition);

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then((permissionStatus) => {
        console.log('[SAARTHI VOICE PERMISSION DIAGNOSTIC] Status:', permissionStatus.state);
        if (permissionStatus.state === 'granted') {
          setHasMicPermission(true);
          hasMicPermissionRef.current = true;
          // Auto-start listening if mic permission was already granted
          if (voiceModeRef.current === 'off') {
            startUnifiedSpeechEngine();
          }
        } else if (permissionStatus.state === 'denied') {
          setHasMicPermission(false);
          hasMicPermissionRef.current = false;
          setMicStatus('denied');
        }

        permissionStatus.onchange = () => {
          console.log('[SAARTHI VOICE PERMISSION CHANGED] Status:', permissionStatus.state);
          if (permissionStatus.state === 'granted') {
            setHasMicPermission(true);
            hasMicPermissionRef.current = true;
            if (micStatus === 'denied') setMicStatus('idle');
            if (voiceModeRef.current === 'off') startUnifiedSpeechEngine();
          } else if (permissionStatus.state === 'denied') {
            setHasMicPermission(false);
            hasMicPermissionRef.current = false;
            setMicStatus('denied');
          }
        };
      }).catch(err => {
        console.warn('[SAARTHI VOICE PERMISSION QUERY WARN]', err);
      });
    }
  }, []);

  // Helper to compute unified text combining reportText and any live interimTranscript
  const getCombinedReportText = (): string => {
    const main = reportText || reportTextRef.current;
    const interim = interimTranscript || interimTranscriptRef.current;
    if (main && interim) {
      if (main.toLowerCase().includes(interim.toLowerCase())) return main.trim();
      return sanitizeReportText(main + ' ' + interim);
    }
    return sanitizeReportText(main || interim);
  };

  // Real-time automatic sanitizer watcher on reportText
  useEffect(() => {
    if (isRegexWakeMatch(reportText)) {
      const cleaned = sanitizeReportText(reportText);
      if (cleaned !== reportText) {
        setReportText(cleaned);
      }
    }
  }, [reportText]);

  const matchesWakeWord = (transcript: string): boolean => {
    const lower = transcript.toLowerCase();
    const customMatch = customPhrasesRef.current.some(phrase => lower.includes(phrase.toLowerCase()));
    const regexMatch = isRegexWakeMatch(lower);
    const fuzzyMatch = sensitivityRef.current === 'high' && isFuzzySaarthiMatch(lower);
    
    console.log('[SAARTHI VOICE EVAL]', {
      transcript: lower,
      customMatch,
      regexMatch,
      fuzzyMatch,
      result: customMatch || regexMatch || fuzzyMatch
    });

    return customMatch || regexMatch || fuzzyMatch;
  };

  // Whisper Audio Transcription Call
  const finishAndTranscribeWhisper = async () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    await new Promise(r => setTimeout(r, 150));

    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log(`[SAARTHI WHISPER CLIENT] Transcribing ${audioBlob.size} bytes audio blob via Whisper API...`);

      const formData = new FormData();
      formData.append('file', audioBlob, 'speech_dictation.webm');

      try {
        setIsTranscribingWhisper(true);
        const res = await fetch('http://localhost:8000/api/v1/transcribe', {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text && data.text.trim()) {
            console.log('⚡ [SAARTHI WHISPER TRANSCRIPTION RESULT]:', data.text);
            const cleanedWhisperText = sanitizeReportText(data.text);
            setReportText(cleanedWhisperText);
            setInterimTranscript('');
            setIsTranscribingWhisper(false);
            if (cleanedWhisperText && !isProcessingRef.current) {
              onSubmitReport(cleanedWhisperText);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('[SAARTHI WHISPER CLIENT] Whisper API unreachable (using WebSpeech fallback):', err);
      } finally {
        setIsTranscribingWhisper(false);
      }
    }

    // Fallback: Submit current combined text if Whisper endpoint unavailable
    const fallbackText = getCombinedReportText();
    if (fallbackText) {
      setReportText(fallbackText);
      setInterimTranscript('');
      if (!isProcessingRef.current) {
        onSubmitReport(fallbackText);
      }
    }
  };

  // UNIFIED SINGLE-INSTANCE SPEECH RECOGNITION ENGINE
  const startUnifiedSpeechEngine = async () => {
    console.log('[SAARTHI VOICE] Initializing speech engine...');
    consecutiveErrorsRef.current = 0;
    lastErrorRef.current = '';

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn('[SAARTHI VOICE] SpeechRecognition API unsupported in this browser');
      setMicStatus('unsupported');
      return;
    }

    if (!mediaStreamRef.current) {
      try {
        console.log('[SAARTHI VOICE] Requesting microphone permission...');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        startAudioAnalysis(stream);
        hasMicPermissionRef.current = true;
        setHasMicPermission(true);
        console.log('[SAARTHI VOICE] Microphone permission GRANTED');
      } catch (err) {
        console.warn('[SAARTHI VOICE] Microphone permission DENIED:', err);
        setMicStatus('denied');
        hasMicPermissionRef.current = false;
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
      consecutiveErrorsRef.current = 0; // Reset error count on successful output
      let currentInterim = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const rawTranscript = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;
        
        console.log(`[SAARTHI VOICE onresult index ${i}]`, { rawTranscript, isFinal, mode: voiceModeRef.current });

        // MODE A: WAKE WORD LISTENING
        if (voiceModeRef.current === 'wake_listen') {
          if (matchesWakeWord(rawTranscript)) {
            console.log('⚡ WAKE WORD "HEY SAARTHI" DETECTED AT INDEX:', i);
            
            // Set wakeWordResultIndexRef to i (not i+1) so segment i is retained when final
            wakeWordResultIndexRef.current = i;
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
              setReportText(prev => {
                const base = prev.trim();
                if (base && base.toLowerCase().includes(cleanedText.toLowerCase())) return base;
                const updated = base ? (base + ' ' + cleanedText) : cleanedText;
                return sanitizeReportText(updated);
              });
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
      console.warn('[SAARTHI VOICE onerror] Engine error:', event.error);
      lastErrorRef.current = event.error;
      
      if (event.error === 'not-allowed') {
        setMicStatus('denied');
        hasMicPermissionRef.current = false;
        setHasMicPermission(false);
      } else if (event.error === 'network' || event.error === 'audio-capture') {
        consecutiveErrorsRef.current += 1;
        console.warn(`[SAARTHI VOICE] ${event.error} error (count: ${consecutiveErrorsRef.current})`);
      } else if (event.error === 'no-speech') {
        console.log('[SAARTHI VOICE] Silence drop ("no-speech"). Recognition will restart in onend.');
      }
    };

    recognition.onend = () => {
      console.log('[SAARTHI VOICE onend] Engine stopped. Mode:', voiceModeRef.current, 'MicPermission:', hasMicPermissionRef.current, 'Errors:', consecutiveErrorsRef.current);
      
      if (consecutiveErrorsRef.current >= 4) {
        console.warn('[SAARTHI VOICE] Consecutive errors limit reached (4). Pausing auto-restart spin loop.');
        setMicStatus('idle');
        return;
      }

      if (voiceModeRef.current !== 'off' && hasMicPermissionRef.current) {
        const delay = consecutiveErrorsRef.current > 0 ? 1500 : 250;
        setTimeout(() => {
          try {
            if (recognitionRef.current && voiceModeRef.current !== 'off') {
              try {
                recognitionRef.current.start();
                console.log('[SAARTHI VOICE] Recognition restarted cleanly');
              } catch (startErr) {
                // If start fails because instance is stale, re-initialize engine
                console.warn('[SAARTHI VOICE] Instance restart failed, re-initializing engine...');
                startUnifiedSpeechEngine();
              }
            }
          } catch (e: any) {
            console.warn('[SAARTHI VOICE] Error restarting recognition:', e?.message || e);
          }
        }, delay);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
      voiceModeRef.current = 'wake_listen';
      setVoiceMode('wake_listen');
      setMicStatus('wake_listening');
      console.log('[SAARTHI VOICE] Engine started in wake_listen mode');
    } catch (e) {
      console.warn('[SAARTHI VOICE] Error starting speech engine:', e);
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
              console.log('⚡ DECIBEL SILENCE DROP DETECTED — TRANSCRIBING VIA WHISPER & AUTO-SUBMITTING!');
              
              silenceStartTimeRef.current = null;
              hasSpokenVoiceRef.current = false;

              // 1. Transition mode back to wake_listen
              voiceModeRef.current = 'wake_listen';
              setVoiceMode('wake_listen');
              setMicStatus('wake_listening');

              // 2. Transcribe via Whisper & submit report automatically!
              finishAndTranscribeWhisper();
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
    consecutiveErrorsRef.current = 0; // Reset error counters on manual user interaction
    lastErrorRef.current = '';

    if (voiceMode === 'dictating') {
      voiceModeRef.current = 'wake_listen';
      setVoiceMode('wake_listen');
      setMicStatus('wake_listening');

      const textToSubmit = getCombinedReportText();
      if (textToSubmit) {
        setReportText(textToSubmit);
        setInterimTranscript('');
        if (!isProcessingRef.current) {
          onSubmitReport(textToSubmit);
        }
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
    const textToSubmit = getCombinedReportText();
    if (!textToSubmit || isProcessing) return;
    setReportText(textToSubmit);
    setInterimTranscript('');
    onSubmitReport(textToSubmit);
  };

  return (
    <div className="w-full flex flex-col items-center">

      {/* Mode Bar / Technical Header */}
      <section className="w-full bg-surface-container-low py-3 px-4 md:px-6 shadow-xs rounded-xl mb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">SITE INTAKE // QUICK FIELD REPORT</span>
            <span className="font-mono text-xs text-outline">//</span>
            <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-secondary animate-pulse" />
              VOICE ENGINE: {voiceMode === 'off' ? 'MIC OFF' : (voiceMode === 'wake_listen' ? 'LISTENING FOR "HEY SAARTHI"' : 'DICTATING REPORT')}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={async () => {
                if (!hasMicPermission) await startUnifiedSpeechEngine();
                setTrainerStep(1);
                setTrainerTranscripts([]);
                setIsTrainerOpen(true);
                startTrainerStep();
              }}
              className="px-3 py-1.5 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>TRAIN VOICE</span>
            </button>

            {!hasMicPermission ? (
              <button
                type="button"
                onClick={startUnifiedSpeechEngine}
                className="px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 hover:bg-amber-400 font-mono text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer animate-pulse shadow-sm"
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>ENABLE MIC ACCESS</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={disableMicrophone}
                className="px-3 py-1.5 rounded-full bg-red-100 text-red-700 hover:bg-red-200 font-mono text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>DISABLE MIC</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setSensitivity(s => s === 'high' ? 'standard' : 'high')}
              className={`px-3 py-1.5 rounded-full font-mono text-xs font-semibold border cursor-pointer transition-all ${
                sensitivity === 'high'
                  ? 'bg-secondary-container text-on-secondary-container border-secondary/30'
                  : 'bg-surface-container text-on-surface-variant border-transparent'
              }`}
            >
              {sensitivity === 'high' ? 'Sensitivity: High' : 'Sensitivity: Standard'}
            </button>
          </div>
        </div>
      </section>

      {/* Main Glove-First Interaction Canvas */}
      <section className="w-full py-6 md:py-10 px-4 md:px-6 flex flex-col items-center justify-center relative overflow-hidden bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-sm mb-6">
        {/* Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center">
          
          {/* Wake Word Detection Alert Banner */}
          {wakeWordDetected && (
            <div className="w-full mb-6 p-3 bg-secondary-container border border-secondary text-on-secondary-container rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 animate-bounce shadow-md">
              <Volume2 className="w-4 h-4 text-secondary" />
              <span>WAKE WORD "HEY SAARTHI" DETECTED! LISTENING FOR FIELD REPORT NOW...</span>
            </div>
          )}

          {/* Whisper Server Processing Banner */}
          {isTranscribingWhisper && (
            <div className="w-full mb-6 p-3 bg-amber-100 border border-amber-400 text-amber-900 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 animate-pulse shadow-md">
              <PulseIcon className="w-4 h-4 text-amber-700 animate-spin" />
              <span>TRANSCRIBING AUDIO VIA OPENAI WHISPER MODEL...</span>
            </div>
          )}

          {/* Permission Warning if Denied */}
          {micStatus === 'denied' && (
            <div className="w-full mb-6 p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs font-mono flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Microphone permission denied by browser. Please allow microphone access in your browser settings.</span>
            </div>
          )}

          {/* Push-To-Talk Voice Hub */}
          <div className="relative flex items-center justify-center my-4 select-none">
            <div className={`absolute w-56 h-56 rounded-full bg-secondary-container/40 ${voiceMode === 'dictating' ? 'animate-ping opacity-70' : 'opacity-20'}`}></div>
            <div className={`absolute w-48 h-48 rounded-full bg-secondary-container/50 ${voiceMode === 'dictating' ? 'animate-pulse opacity-90' : 'opacity-40'}`}></div>
            
            <button
              type="button"
              onClick={handleManualMicToggle}
              className={`relative group w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 focus:outline-none ring-4 ring-offset-4 ring-offset-surface cursor-pointer ${
                voiceMode === 'dictating'
                  ? 'bg-amber-500 text-slate-950 ring-amber-400 animate-pulse'
                  : 'bg-primary-container text-on-primary ring-secondary hover:scale-105'
              }`}
            >
              {voiceMode === 'dictating' ? (
                <>
                  <MicOff className="w-14 h-14 text-slate-950 mb-1" />
                  <span className="font-mono text-xs font-black tracking-widest uppercase">DICTATING...</span>
                  <span className="font-mono text-[9px] text-slate-900 tracking-wider mt-0.5">CLICK TO FINISH & SYNC</span>
                </>
              ) : (
                <>
                  <Mic className="w-14 h-14 text-on-primary group-hover:scale-110 transition-transform duration-200 mb-1" />
                  <span className="font-mono text-xs font-black text-secondary-fixed tracking-widest uppercase">PUSH TO TALK</span>
                  <span className="font-mono text-[9px] text-on-primary-container tracking-wider mt-0.5">OR SAY "HEY SAARTHI"</span>
                </>
              )}
            </button>
          </div>

          {/* State Indicator */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              {voiceMode === 'dictating' ? (
                <span className="text-amber-700 font-extrabold flex items-center gap-2">
                  <PulseIcon className="w-5 h-5 text-amber-600 animate-spin" />
                  Dictating Field Report... Pause 1.4s to Auto-Submit
                </span>
              ) : (
                <>Tap button or Say <span className="text-secondary underline decoration-2 underline-offset-4">“Hey Saarthi”</span> to dictate</>
              )}
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant max-w-lg">
              Calibrated for high acoustic background noise (pumps, rebar cutters, diesel excavators).
            </p>
          </div>

          {/* Live Dynamic Audio Frequency Visualizer */}
          <div className="h-9 flex items-center justify-center gap-1.5 mt-4 px-6 py-1 bg-surface-container rounded-full">
            {audioWaveform.map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-secondary transition-all duration-100"
                style={{ height: `${Math.max(8, (h / 100) * 32)}px` }}
              />
            ))}
          </div>

          {/* Decibel Volume Level Gauge when dictating */}
          {voiceMode === 'dictating' && (
            <div className="mt-3 flex items-center gap-2 font-mono text-xs">
              <span className="text-on-surface-variant text-[11px]">VOICE VOLUME DECIBEL:</span>
              <span className={`font-bold px-2 py-0.5 rounded border ${
                decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  : 'text-amber-800 bg-amber-100 border-amber-300'
              }`}>
                {decibelLevel}% {decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD ? '(HUMAN VOICE)' : '(SILENCE PAUSE)'}
              </span>
            </div>
          )}

          {interimTranscript && (
            <div className="mt-3 p-2 bg-surface-container-high border border-surface-container-highest rounded-lg max-w-lg text-xs font-mono text-secondary italic truncate">
              "{interimTranscript}"
            </div>
          )}

          {/* Glove-Friendly Preset Dictation Chips */}
          <div className="w-full mt-6">
            <div className="font-mono text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              TAP QUICK SAMPLE PROMPTS TO AUTO-FILL:
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {SAMPLE_REPORTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setReportText(sample)}
                  className="px-3 py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs rounded-xl shadow-xs transition-all duration-150 active:scale-95 text-left cursor-pointer border border-surface-container-high"
                >
                  "{sample}"
                </button>
              ))}
            </div>
          </div>

        </div>
      </section>

      {/* Manual Input & Submission Panel */}
      <form onSubmit={handleSubmit} className="w-full bg-surface-container-lowest rounded-2xl p-4 md:p-6 shadow-sm border border-surface-container-high text-left">
        <div className="flex flex-col md:flex-row items-stretch gap-3">
          {/* Text Input Field */}
          <div className="relative flex-1 min-w-0">
            <textarea
              rows={3}
              required
              placeholder="Or type report manually (e.g. Raft Foundation concrete pour in Zone A reached 85% completion today...)"
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="w-full p-3.5 bg-surface-container-low text-on-surface placeholder:text-outline font-sans text-sm rounded-xl focus:outline-none focus:bg-surface focus:ring-2 focus:ring-secondary transition-all border border-surface-container-high resize-none"
            />
          </div>

          {/* Action Button Strip */}
          <div className="flex items-center gap-2 md:flex-col justify-end">
            <button
              type="submit"
              disabled={(!reportText.trim() && !interimTranscript.trim()) || isProcessing}
              className="h-14 px-6 bg-primary-container hover:bg-primary text-on-primary font-bold text-sm rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer w-full md:w-auto"
            >
              <Send className="w-4 h-4 text-secondary-fixed" />
              <span>{isProcessing ? 'ANALYZING...' : 'Process Report'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* VOICE TRAINER MODAL */}
      {isTrainerOpen && (
        <div className="fixed inset-0 z-50 bg-primary/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-md w-full p-6 rounded-2xl border border-surface-container-high text-xs font-mono space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-surface-container-high pb-3">
              <h3 className="font-extrabold text-on-surface text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                CALIBRATE YOUR VOICE FOR "HEY SAARTHI"
              </h3>
              <span className="text-[10px] text-secondary font-bold border border-secondary/30 px-2 py-0.5 rounded-full bg-secondary-container">
                STEP {trainerStep} OF 3
              </span>
            </div>

            {trainerStep <= 3 ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-on-surface">
                  Please speak <strong className="text-secondary text-base block my-1">"Hey Saarthi"</strong> into your microphone now ({trainerStep}/3).
                </p>
                <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mx-auto animate-pulse shadow-md">
                  <Mic className="w-8 h-8" />
                </div>
                <p className="text-[11px] text-on-surface-variant italic">
                  Saarthi engine is listening to calibrate your voice and accent pattern...
                </p>
                <button
                  type="button"
                  onClick={startTrainerStep}
                  className="px-4 py-2 bg-primary-container text-on-primary rounded-xl cursor-pointer font-bold"
                >
                  Click to Speak Step {trainerStep}
                </button>
              </div>
            ) : (
              <div className="space-y-4 py-2">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span>VOICE CALIBRATION COMPLETE!</span>
                </div>
                <p className="text-on-surface-variant text-[11px]">
                  Registered your accent audio patterns:
                </p>
                <div className="bg-surface-container p-3 rounded-xl space-y-1 text-on-surface">
                  {trainerTranscripts.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-secondary font-bold">•</span> "{t}"
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsTrainerOpen(false);
                    if (hasMicPermission) startUnifiedSpeechEngine();
                  }}
                  className="w-full py-2.5 bg-secondary-container text-on-secondary-container font-bold rounded-xl cursor-pointer shadow-sm hover:bg-secondary-fixed transition-colors"
                >
                  SAVE & RETURN TO APP
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-surface-container-high flex justify-end">
              <button
                type="button"
                onClick={() => setIsTrainerOpen(false)}
                className="text-on-surface-variant hover:text-on-surface text-[11px] underline cursor-pointer"
              >
                Close Trainer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
