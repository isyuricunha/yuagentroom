import { useTextToSpeech } from '../hooks/useTextToSpeech';

interface VoicePlayerProps {
    text: string;
    label?: string;
}

export function VoicePlayer({ text, label = 'Listen' }: VoicePlayerProps) {
    const { isSpeaking, isSupported, speak, cancel } = useTextToSpeech();

    if (!isSupported) {
        return null;
    }

    return (
        <button
            onClick={() => (isSpeaking ? cancel() : speak(text))}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.25rem',
                padding: '0.25rem 0.5rem',
                borderRadius: '0.25rem',
                border: 'none',
                backgroundColor: isSpeaking ? 'var(--danger)' : 'transparent',
                color: isSpeaking ? 'var(--text-heading)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontSize: '0.875rem',
                transition: 'all 0.2s ease',
            }}
            title={isSpeaking ? 'Stop playback' : 'Listen to message'}
        >
            <span>{isSpeaking ? '⏹️' : '🔊'}</span>
            <span>{isSpeaking ? 'Stop' : label}</span>
        </button>
    );
}
