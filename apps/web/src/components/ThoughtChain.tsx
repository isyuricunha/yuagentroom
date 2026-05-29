import { useState } from 'react';

interface ThoughtChainProps {
    thoughts: string[];
}

export function ThoughtChain({ thoughts }: ThoughtChainProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!thoughts || thoughts.length === 0) {
        return null;
    }

    return (
        <div className="thought-chain" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    fontSize: '0.875rem',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0.25rem',
                    transition: 'background-color 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
                <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}>
                    ▶
                </span>
                <span>Show reasoning ({thoughts.length} step{thoughts.length > 1 ? 's' : ''})</span>
            </button>

            {isExpanded && (
                <div className="thought-chain-content" style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid var(--border)' }}>
                    {thoughts.map((thought, index) => (
                        <div
                            key={index}
                            className="thought-step"
                            style={{
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                backgroundColor: 'var(--bg-surface)',
                                borderRadius: '0.25rem',
                                fontSize: '0.875rem',
                                color: 'var(--text-muted)',
                            }}
                        >
                            <div style={{ fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-heading)' }}>
                                Step {index + 1}
                            </div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{thought}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
