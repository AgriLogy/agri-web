'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Record a spoken question with MediaRecorder and hand the clip to
 * `transcribe` (the server sends it to Whisper on Groq). Used instead of the
 * browser's own SpeechRecognition when the server says voice is active,
 * because Whisper understands Darija far better.
 *
 * States: `idle` → `recording` (tap again to stop, or it stops by itself at
 * `maxSeconds`) → `transcribing` → `idle`. Degrades gracefully: without
 * MediaRecorder/getUserMedia, `supported` is false.
 */

export type VoiceRecorderStatus = 'idle' | 'recording' | 'transcribing';

/** First container the browser can record: Chrome/Firefox → WebM/Opus,
 *  Safari → MP4/AAC. Empty string lets the browser choose. */
export function pickMimeType(
  isSupported: (type: string) => boolean = (type) =>
    typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)
): string {
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ];
  return candidates.find((type) => isSupported(type)) ?? '';
}

interface UseVoiceRecorderOptions {
  /** Upload the clip and resolve with the transcript. */
  transcribe: (audio: Blob) => Promise<string>;
  onTranscript: (text: string) => void;
  /** `permission` (mic refused), `empty` (nothing heard) or `failed`. */
  onError: (kind: 'permission' | 'empty' | 'failed') => void;
  maxSeconds?: number;
}

export interface VoiceRecorderState {
  supported: boolean;
  status: VoiceRecorderStatus;
  start: () => Promise<void>;
  stop: () => void;
}

export function useVoiceRecorder({
  transcribe,
  onTranscript,
  onError,
  maxSeconds = 120,
}: UseVoiceRecorderOptions): VoiceRecorderState {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cbRef = useRef({ transcribe, onTranscript, onError });

  useEffect(() => {
    cbRef.current = { transcribe, onTranscript, onError };
  });

  useEffect(() => {
    setSupported(
      typeof window !== 'undefined' &&
        typeof MediaRecorder !== 'undefined' &&
        !!navigator.mediaDevices?.getUserMedia
    );
  }, []);

  const release = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    recorderRef.current = null;
  }, []);

  useEffect(
    () => () => {
      if (recorderRef.current?.state === 'recording') {
        recorderRef.current.onstop = null;
        recorderRef.current.stop();
      }
      release();
    },
    [release]
  );

  const stop = useCallback(() => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      cbRef.current.onError('permission');
      return;
    }
    const mimeType = pickMimeType();
    const recorder = new MediaRecorder(
      stream,
      mimeType ? { mimeType } : undefined
    );
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = async () => {
      const type = recorder.mimeType || mimeType || 'audio/webm';
      release();
      const audio = new Blob(chunks, { type });
      if (audio.size === 0) {
        setStatus('idle');
        cbRef.current.onError('empty');
        return;
      }
      setStatus('transcribing');
      try {
        const text = (await cbRef.current.transcribe(audio)).trim();
        if (text) cbRef.current.onTranscript(text);
        else cbRef.current.onError('empty');
      } catch {
        cbRef.current.onError('failed');
      } finally {
        setStatus('idle');
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setStatus('recording');
    timerRef.current = setTimeout(() => stop(), maxSeconds * 1000);
  }, [maxSeconds, release, stop]);

  return { supported, status, start, stop };
}
