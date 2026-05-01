import { useState, useRef, useEffect } from 'react';

const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👏', '💯', '🚀', '✅', '❌'];

interface ReactionPickerProps {
    onSelect: (emoji: string) => void;
    onClose?: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
    const [showAll, setShowAll] = useState(false);
    const pickerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
                onClose?.();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [onClose]);

    const handleSelect = (emoji: string) => {
        onSelect(emoji);
        onClose?.();
    };

    return (
        <div ref={pickerRef} className="reaction-picker" style={{ display: 'inline-block', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                {COMMON_EMOJIS.slice(0, showAll ? COMMON_EMOJIS.length : 6).map((emoji) => (
                    <button
                        key={emoji}
                        className="reaction-emoji-btn"
                        onClick={() => handleSelect(emoji)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '1.25rem',
                            padding: '0.25rem',
                            borderRadius: '0.25rem',
                            transition: 'transform 0.1s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.2)')}
                        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    >
                        {emoji}
                    </button>
                ))}
                {COMMON_EMOJIS.length > 6 && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            padding: '0.25rem',
                            color: 'var(--text-secondary, #666)',
                        }}
                    >
                        {showAll ? 'Less' : 'More'}
                    </button>
                )}
            </div>
        </div>
    );
}
