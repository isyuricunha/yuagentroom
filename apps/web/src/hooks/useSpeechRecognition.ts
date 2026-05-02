import { useCallback, useRef, useState } from 'react';

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void;
  onError?: (error: Error) => void;
  onEnd?: () => void;
}

interface UseSpeechRecognitionReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: { results: SpeechRecognitionResultList }) => void) | null;
  onerror: ((event: { error: string; message: string }) => void) | null;
  onend: (() => void) | null;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
  prototype: SpeechRecognitionInstance;
}

interface SpeechRecognitionWindow extends Window {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
}

export function useSpeechRecognition(options: UseSpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const { onResult, onError, onEnd } = options;
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const isSupported = typeof window !== 'undefined' && 
    (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window));

  const initRecognition = useCallback(() => {
    if (!isSupported || recognitionRef.current) return;

    const SpeechRecognitionCtor = (window as SpeechRecognitionWindow).SpeechRecognition || 
      (window as SpeechRecognitionWindow).webkitSpeechRecognition;
    
    if (!SpeechRecognitionCtor) return;

    const instance = new SpeechRecognitionCtor();
    instance.continuous = false;
    instance.interimResults = true;
    instance.lang = 'en-US';

    instance.onresult = (event: { results: SpeechRecognitionResultList }) => {
      let finalTranscript = '';
      const results = event.results;
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.isFinal) {
          finalTranscript += result[0]?.transcript || '';
        }
      }
      
      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResult?.(finalTranscript);
      }
    };

    instance.onerror = (event: { error: string; message: string }) => {
      onError?.(new Error(event.error));
      setIsListening(false);
    };

    instance.onend = () => {
      onEnd?.();
      setIsListening(false);
    };

    recognitionRef.current = instance;
  }, [isSupported, onResult, onError, onEnd]);

  const startListening = useCallback(() => {
    initRecognition();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setTranscript('');
      } catch (error) {
        console.error('Failed to start recognition:', error);
        onError?.(error instanceof Error ? error : new Error('Failed to start recognition'));
      }
    }
  }, [initRecognition, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Failed to stop recognition:', error);
      }
    }
  }, []);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
  };
}
