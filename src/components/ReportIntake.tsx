import React, { useState, useEffect, useRef } from 'react';
import { Send, Mic, Activity as PulseIcon, AlertCircle, Radio, ShieldCheck, ShieldAlert, Square, X } from 'lucide-react';
import { normalizeSpokenReport } from '../utils/constructionPhonetics';
import { API_BASE_URL, apiTranscribeAudio, ApiError } from '../utils/api';

interface ReportIntakeProps {
  onSubmitReport: (reportText: string) => void;
  isProcessing: boolean;
}

const SAMPLE_REPORTS = [
  "Raft Foundation concrete pour in Zone A reached 85% completion today with 4 transit mixers deployed.",
  "Excavation in Zone A finished today ahead of schedule.",
  "60% shuttering done in Zone B, delayed due to material shortage at site.",
  "Column rebar bending in Zone B reached 40% completion.",
  "Diaphragm wall excavation completed at North Shaft station box.",
  "Bituminous asphalt paving delayed in Section 1 due to heavy rainfall."
];

// Human speech decibel threshold (% volume)
const HUMAN_SPEECH_DECIBEL_THRESHOLD = 12;
const SILENCE_FINISH_DURATION_MS = 1400;

function sanitizeReportText(text: string): string {
  if (!text) return '';
  let result = normalizeSpokenReport(text.trim());
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }
  return result;
}

export const ReportIntake: React.FC<ReportIntakeProps> = ({
  onSubmitReport,
  isProcessing
}) => {
  const [reportText, setReportText] = useState('');
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [micStatus, setMicStatus] = useState<'idle' | 'recording' | 'denied' | 'unsupported'>('idle');
  const [audioWaveform, setAudioWaveform] = useState<number[]>([15, 30, 60, 40, 80, 50, 90, 30, 20]);
  const [decibelLevel, setDecibelLevel] = useState<number>(0);
  const [isTranscribingWhisper, setIsTranscribingWhisper] = useState(false);
  const [transcriptionError, setTranscriptionError] = useState<string | null>(null);


  // Refs for State Machine & Media Streams
  const isRecordingRef = useRef(false);
  const hasMicPermissionRef = useRef(false);
  const reportTextRef = useRef('');
  const isProcessingRef = useRef(false);

  // MediaRecorder & Whisper Audio Recording Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Decibel Silence VAD Refs
  const hasSpokenVoiceRef = useRef<boolean>(false);
  const silenceStartTimeRef = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => { isRecordingRef.current = isRecording; }, [isRecording]);
  useEffect(() => { hasMicPermissionRef.current = hasMicPermission; }, [hasMicPermission]);
  useEffect(() => { reportTextRef.current = reportText; }, [reportText]);
  useEffect(() => { isProcessingRef.current = isProcessing; }, [isProcessing]);

  // Check initial microphone permissions
  useEffect(() => {
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'microphone' as any }).then((permissionStatus) => {
        if (permissionStatus.state === 'granted') {
          setHasMicPermission(true);
          hasMicPermissionRef.current = true;
        } else if (permissionStatus.state === 'denied') {
          setHasMicPermission(false);
          hasMicPermissionRef.current = false;
          setMicStatus('denied');
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'granted') {
            setHasMicPermission(true);
            hasMicPermissionRef.current = true;
            if (micStatus === 'denied') setMicStatus('idle');
          } else if (permissionStatus.state === 'denied') {
            setHasMicPermission(false);
            hasMicPermissionRef.current = false;
            setMicStatus('denied');
          }
        };
      }).catch(err => {
        console.warn('[SAARTHI VOICE PERMISSION WARN]', err);
      });
    }
  }, []);

  // Start MediaRecorder audio capture
  const startRawAudioRecording = async () => {
    console.log('[SAARTHI VOICE] Starting raw MediaRecorder audio capture...');
    setTranscriptionError(null);

    if (!mediaStreamRef.current) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        startAudioAnalysis(stream);
        setHasMicPermission(true);
        hasMicPermissionRef.current = true;
      } catch (err) {
        console.warn('[SAARTHI VOICE] Could not access microphone for audio recording:', err);
        setMicStatus('denied');
        setHasMicPermission(false);
        hasMicPermissionRef.current = false;
        setTranscriptionError('Microphone permission denied by browser. Please allow microphone access in your browser settings.');
        return;
      }
    } else {
      startAudioAnalysis(mediaStreamRef.current);
    }

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
      
      recorder.start(200);
      mediaRecorderRef.current = recorder;

      hasSpokenVoiceRef.current = false;
      silenceStartTimeRef.current = null;

      isRecordingRef.current = true;
      setIsRecording(true);
      setMicStatus('recording');
      console.log('[SAARTHI MEDIA RECORDER] Recording audio raw chunks via MediaRecorder...');
    } catch (err) {
      console.error('[SAARTHI MEDIA RECORDER] Failed to start MediaRecorder:', err);
      setTranscriptionError('Failed to access MediaRecorder. Microphone might be in use or unsupported.');
    }
  };

  // Stop MediaRecorder and POST audio blob to /reports/transcribe endpoint
  const stopRecordingAndTranscribe = async () => {
    console.log('[SAARTHI VOICE] Stopping recording and submitting to Whisper endpoint...');
    setTranscriptionError(null);

    isRecordingRef.current = false;
    setIsRecording(false);
    setMicStatus('idle');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }

    await new Promise(r => setTimeout(r, 200));

    if (audioChunksRef.current.length > 0) {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      console.log(`[SAARTHI WHISPER CLIENT] Uploading ${audioBlob.size} bytes audio blob to backend...`);

      try {
        setIsTranscribingWhisper(true);
        const data = await apiTranscribeAudio(audioBlob);

        if (data.text && data.text.trim()) {
          console.log('⚡ [WHISPER TRANSCRIPTION RESULT]:', data.text);
          const cleanedText = sanitizeReportText(data.text);
          setReportText(cleanedText);
          reportTextRef.current = cleanedText;
          setIsTranscribingWhisper(false);
          
          if (cleanedText && !isProcessingRef.current) {
            onSubmitReport(cleanedText);
          }
          return;
        } else {
          setTranscriptionError('No speech detected in audio recording. Please speak clearly into the microphone.');
        }
      } catch (err: any) {
        console.error('[SAARTHI WHISPER CLIENT] Error calling transcription endpoint:', err);
        if (err instanceof ApiError) {
          if (err.status === 408) {
            setTranscriptionError('Voice transcription timed out (server processing took >45s).');
          } else if (err.status === 0) {
            setTranscriptionError('Network error — backend transcription service unreachable.');
          } else {
            setTranscriptionError(`Server error processing audio (${err.status}: ${err.message})`);
          }
        } else {
          setTranscriptionError(err.message || 'Failed to process voice recording. Please try again.');
        }
      } finally {
        setIsTranscribingWhisper(false);
      }
    }
  };

  const disableMicrophone = () => {
    isRecordingRef.current = false;
    setIsRecording(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch (e) {}
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];

    stopAudioAnalysis();
    setHasMicPermission(false);
    hasMicPermissionRef.current = false;
    setMicStatus('idle');
  };

  // VAD Decibel Analysis Loop
  const startAudioAnalysis = (stream: MediaStream) => {
    try {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        return;
      }
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

        const avgVol = Math.round(((sum / (dataArray.length || 9)) / 255) * 100);
        setDecibelLevel(avgVol);

        // Silence VAD Teardown
        if (isRecordingRef.current) {
          if (avgVol >= HUMAN_SPEECH_DECIBEL_THRESHOLD) {
            hasSpokenVoiceRef.current = true;
            silenceStartTimeRef.current = null;
          } else if (hasSpokenVoiceRef.current) {
            if (!silenceStartTimeRef.current) {
              silenceStartTimeRef.current = Date.now();
            } else if (Date.now() - silenceStartTimeRef.current >= SILENCE_FINISH_DURATION_MS) {
              console.log('⚡ DECIBEL SILENCE DROP DETECTED — STOPPING RECORDER & TRANSCRIBING...');
              silenceStartTimeRef.current = null;
              hasSpokenVoiceRef.current = false;
              stopRecordingAndTranscribe();
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
      try { audioContextRef.current.close(); } catch (e) {}
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

  // Manual Tap Trigger Handler
  const handleManualMicToggle = async () => {
    if (isRecording) {
      stopRecordingAndTranscribe();
    } else {
      startRawAudioRecording();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const textToSubmit = reportText.trim() || reportTextRef.current.trim();
    if (!textToSubmit || isProcessing || isTranscribingWhisper) return;
    const cleanText = sanitizeReportText(textToSubmit);
    onSubmitReport(cleanText);
  };

  return (
    <div className="w-full flex flex-col items-center">

      {/* Mode Bar / Technical Header */}
      <section className="w-full bg-surface-container-low py-3 px-4 md:px-6 shadow-xs rounded-xl mb-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
            <span className="font-mono text-xs font-bold text-on-surface uppercase tracking-wider">SITE INTAKE // QUICK FIELD REPORT</span>
            <span className="font-mono text-xs text-outline">//</span>
            <span className="font-mono text-xs text-on-surface-variant flex items-center gap-1">
              <Radio className="w-3.5 h-3.5 text-secondary animate-pulse" />
              VOICE ENGINE: {isRecording ? 'RECORDING AUDIO (WHISPER STT)' : 'READY (TAP MIC TO RECORD)'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!hasMicPermission ? (
              <button
                type="button"
                onClick={startRawAudioRecording}
                className="px-4 py-1.5 rounded-full bg-amber-500 text-slate-950 font-mono text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:bg-amber-400"
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
          </div>
        </div>
      </section>

      {/* Main Glove-First Interaction Canvas */}
      <section className="w-full py-6 md:py-10 px-4 md:px-6 flex flex-col items-center justify-center relative overflow-hidden bg-surface-container-lowest border border-surface-container-high rounded-2xl shadow-sm mb-6">
        {/* Ambient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary-container/30 rounded-full blur-3xl pointer-events-none -z-10"></div>

        <div className="w-full max-w-3xl mx-auto flex flex-col items-center text-center">

          {/* Whisper Server Processing Banner */}
          {isTranscribingWhisper && (
            <div className="w-full mb-6 p-4 bg-amber-500 text-slate-950 border border-amber-600 rounded-xl text-xs font-mono font-extrabold flex items-center justify-center gap-3 shadow-lg animate-pulse">
              <PulseIcon className="w-5 h-5 text-slate-950 animate-spin" />
              <span>TRANSCRIBING AUDIO VIA OPENAI WHISPER MODEL... PLEASE WAIT</span>
            </div>
          )}

          {/* Transcription Error Alert Banner */}
          {transcriptionError && (
            <div className="w-full mb-6 p-3.5 bg-red-50 border border-red-300 text-red-800 rounded-xl text-xs font-mono flex items-center justify-between gap-3 shadow-sm">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <span className="font-semibold text-left">{transcriptionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setTranscriptionError(null)}
                className="text-xs text-red-700 hover:text-red-900 font-bold shrink-0 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Permission Warning if Denied */}
          {micStatus === 'denied' && !transcriptionError && (
            <div className="w-full mb-6 p-3 bg-red-100 border border-red-300 text-red-800 rounded-xl text-xs font-mono flex items-center justify-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>Microphone permission denied by browser. Please allow microphone access in your browser settings.</span>
            </div>
          )}


          {/* Tap-to-Record Mic Control */}
          <div className="relative flex items-center justify-center my-4 select-none">
            <div className={`absolute w-52 h-52 rounded-full bg-secondary-container/40 transition-all duration-300 ${isRecording ? 'animate-ping opacity-70 scale-110' : 'opacity-20 scale-100'}`}></div>
            <div className={`absolute w-44 h-44 rounded-full bg-secondary-container/50 transition-all duration-300 ${isRecording ? 'animate-pulse opacity-90 scale-105' : 'opacity-40 scale-100'}`}></div>
            
            <button
              type="button"
              onClick={handleManualMicToggle}
              className={`relative group w-44 h-44 rounded-full flex flex-col items-center justify-center shadow-xl transition-all duration-200 ease-in-out focus:outline-none ring-4 ring-offset-4 ring-offset-surface cursor-pointer ${
                isRecording
                  ? 'bg-amber-500 text-slate-950 ring-amber-400 animate-pulse scale-105'
                  : 'bg-slate-900 text-white ring-secondary hover:scale-105 hover:bg-slate-800'
              }`}
            >
              {isRecording ? (
                <>
                  <Square className="w-12 h-12 text-slate-950 mb-1 fill-slate-950" />
                  <span className="font-mono text-xs font-black tracking-widest uppercase">RECORDING...</span>
                  <span className="font-mono text-[9px] text-slate-900 tracking-wider mt-0.5">TAP TO FINISH</span>
                </>
              ) : (
                <>
                  <Mic className="w-12 h-12 text-white group-hover:scale-110 transition-transform duration-200 mb-1" />
                  <span className="font-mono text-xs font-black text-white tracking-widest uppercase">TAP TO RECORD</span>
                  <span className="font-mono text-[9px] text-slate-300 tracking-wider mt-0.5">START VOICE DICTATION</span>
                </>
              )}
            </button>
          </div>

          {/* State Indicator */}
          <div className="mt-2 flex flex-col items-center gap-1">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-on-surface">
              {isRecording ? (
                <span className="text-amber-700 font-extrabold flex items-center gap-2">
                  <PulseIcon className="w-5 h-5 text-amber-600 animate-spin" />
                  Recording Audio... Speak now. Pause 1.4s or tap button to transcribe.
                </span>
              ) : (
                <>Tap the <span className="text-secondary underline decoration-2 underline-offset-4 font-extrabold">Mic Button</span> to dictate your report</>
              )}
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant max-w-lg">
              Audio is recorded directly via MediaRecorder and transcribed using local Whisper speech-to-text.
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

          {/* Decibel Volume Gauge */}
          {isRecording && (
            <div className="mt-3 flex items-center gap-2 font-mono text-xs">
              <span className="text-on-surface-variant text-[11px]">AUDIO VOLUME LEVEL:</span>
              <span className={`font-bold px-2 py-0.5 rounded border ${
                decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD
                  ? 'text-emerald-800 bg-emerald-100 border-emerald-300'
                  : 'text-amber-800 bg-amber-100 border-amber-300'
              }`}>
                {decibelLevel}% {decibelLevel >= HUMAN_SPEECH_DECIBEL_THRESHOLD ? '(SPEAKING)' : '(SILENCE DETECTED)'}
              </span>
            </div>
          )}

          {/* Glove-Friendly Preset Dictation Chips */}
          <div className="w-full mt-6">
            <div className="font-mono text-[11px] font-bold text-outline uppercase tracking-wider mb-2">
              TAP SAMPLE FIELD PROMPTS TO DEMO:
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
              disabled={(!reportText.trim() && !reportTextRef.current.trim()) || isProcessing || isTranscribingWhisper}
              className="h-14 px-6 bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-sm rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer w-full md:w-auto"
            >
              {isProcessing ? (
                <>
                  <PulseIcon className="w-4 h-4 text-emerald-400 animate-spin" />
                  <span className="text-white font-bold">Evaluating…</span>
                </>
              ) : isTranscribingWhisper ? (
                <>
                  <PulseIcon className="w-4 h-4 text-amber-400 animate-spin" />
                  <span className="text-white font-bold">TRANSCRIBING…</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold">Match & Evaluate</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

    </div>
  );
};
