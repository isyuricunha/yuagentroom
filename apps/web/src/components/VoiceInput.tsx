import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface VoiceInputProps {
    onTranscript: (transcript: string) => void;
    placeholder?: string;
}

export function VoiceInput({ onTranscript, placeholder = 'Click to speak...' }: VoiceInputProps) {
    const { isListening, isSupported, startListening, stopListening } = useSpeechRecognition({
        onResult: (transcript) => {
            onTranscript(transcript);
        },
    });

    if (!isSupported) {
        return null;
    }

    return (
        <button
            onClick={isListening ? stopListening : startListening}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 1rem',
                borderRadius: '0.5rem',
                border: 'none',
                backgroundColor: isListening ? 'var(--error-color, #dc3545)' : 'var(--primary-color, #007bff)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
            }}
            title={isListening ? 'Stop listening' : 'Start voice input'}
        >
            <span style={{ fontSize: '1rem' }}>{isListening ? '🛑' : '🎤'}</span>
            <span>{isListening ? 'Listening...' : placeholder}</span>
        </button>
    );
}
