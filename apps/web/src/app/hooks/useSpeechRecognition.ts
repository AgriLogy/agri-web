'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Map the app locale (next-intl: fr/ar/en) to a BCP-47 recognition tag. */
const LOCALE_TO_LANG: Record<string, string> = {
  fr: 'fr-FR',
  ar: 'ar-MA',
  en: 'en-US',
};

export function localeToRecognitionLang(locale: string): string {
  return LOCALE_TO_LANG[locale] ?? 'en-US';
}

function getRecognitionCtor(): SpeechRecognitionStatic | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition;
}

interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag, e.g. `fr-FR`. */
  lang: string;
  /**
   * Fired on every recognition update with the full session transcript so far.
   * `isFinal` is true once the engine has committed the trailing segment.
   */
  onResult: (transcript: string, isFinal: boolean) => void;
  /** Fired on a recognition error (e.g. `not-allowed`, `no-speech`). */
  onError?: (error: string) => void;
}

export interface SpeechRecognitionState {
  /** Whether this browser exposes the Web Speech API at all. */
  supported: boolean;
  /** Whether a recognition session is currently active. */
  listening: boolean;
  /** Begin listening. No-op if unsupported or already listening. */
  start: () => void;
  /** Stop listening and flush the final result. */
  stop: () => void;
  /** Toggle listening on/off. */
  toggle: () => void;
}

/**
 * Thin React wrapper over the browser SpeechRecognition (speech-to-text) API.
 *
 * Degrades gracefully: on a browser without the API, `supported` is false and
 * every control is a no-op — callers hide/disable the mic instead of crashing.
 * Callbacks are read through refs so the recognition instance never goes stale.
 */
export function useSpeechRecognition({
  lang,
  onResult,
  onError,
}: UseSpeechRecognitionOptions): SpeechRecognitionState {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const langRef = useRef(lang);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  // Keep the latest props/callbacks in refs so the long-lived recognition
  // instance always calls current handlers without being torn down/recreated.
  useEffect(() => {
    langRef.current = lang;
    onResultRef.current = onResult;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
  }, []);

  // Tear down any live session on unmount.
  useEffect(
    () => () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    },
    []
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    if (recognitionRef.current) return; // already listening
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.lang = langRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      const last = event.results[event.results.length - 1];
      onResultRef.current(transcript.trim(), last ? last.isFinal : false);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // `aborted`/`no-speech` are benign lifecycle events, not real failures.
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        onErrorRef.current?.(event.error);
      }
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      setListening(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setListening(true);
    } catch {
      // start() throws if a session is already running; ignore.
      recognitionRef.current = null;
      setListening(false);
    }
  }, []);

  const toggle = useCallback(() => {
    if (recognitionRef.current) stop();
    else start();
  }, [start, stop]);

  return { supported, listening, start, stop, toggle };
}
