import { useCallback, useState } from 'react';

interface UseTextToSpeechReturn {
  isSpeaking: boolean;
  isSupported: boolean;
  speak: (text: string) => void;
  cancel: () => void;
}

export function useTextToSpeech(): UseTextToSpeechReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [synth, setSynth] = useState<SpeechSynthesis | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  useState(() => {
    if (isSupported) {
      setSynth(window.speechSynthesis);
    }
  });

  const speak = useCallback((text: string) => {
    if (!synth) return;

    // Cancel any ongoing speech
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onstart = () => {
      setIsSpeaking(true);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synth.speak(utterance);
  }, [synth]);

  const cancel = useCallback(() => {
    if (synth) {
      synth.cancel();
      setIsSpeaking(false);
    }
  }, [synth]);

  return {
    isSpeaking,
    isSupported,
    speak,
    cancel,
  };
}
