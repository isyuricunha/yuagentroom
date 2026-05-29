import type { MessageReaction } from '@agentroom/shared';

interface MessageReactionsProps {
    reactions: MessageReaction[];
    currentUserId?: string;
    onReactionClick: (emoji: string) => void;
    onReactionRemove: (reactionId: string) => void;
}

export function MessageReactions({ reactions, currentUserId, onReactionClick, onReactionRemove }: MessageReactionsProps) {
    if (!reactions || reactions.length === 0) {
        return null;
    }

    // Group reactions by emoji
    const groupedReactions = reactions.reduce((acc, reaction) => {
        if (!acc[reaction.emoji]) {
            acc[reaction.emoji] = [];
        }
        acc[reaction.emoji].push(reaction);
        return acc;
    }, {} as Record<string, MessageReaction[]>);

    return (
        <div className="message-reactions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            {Object.entries(groupedReactions).map(([emoji, reactionList]) => {
                const userHasReaction = currentUserId && reactionList.some(r => r.userId === currentUserId);
                const count = reactionList.length;

                return (
                    <button
                        key={emoji}
                        className={`message-reaction ${userHasReaction ? 'active' : ''}`}
                        onClick={() => userHasReaction && currentUserId
                            ? onReactionRemove(reactionList.find(r => r.userId === currentUserId)?.id || '')
                            : onReactionClick(emoji)
                        }
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.25rem 0.5rem',
                            borderRadius: '1rem',
                            border: '1px solid var(--border)',
                            backgroundColor: userHasReaction ? 'rgba(201, 87, 42, 0.15)' : 'var(--bg-surface)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                        title={reactionList.map(r => r.userId).join(', ')}
                    >
                        <span>{emoji}</span>
                        <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{count}</span>
                    </button>
                );
            })}
        </div>
    );
}
