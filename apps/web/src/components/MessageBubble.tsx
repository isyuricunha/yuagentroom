import type { Message, MessageReaction } from '@agentroom/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { MessageReactions } from './MessageReactions';
import { ReactionPicker } from './ReactionPicker';
import { ThoughtChain } from './ThoughtChain';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  agentName?: string;
  onAgentClick?: (agentId: string) => void;
  roomId?: string;
  currentUserId?: string;
  reactions?: MessageReaction[];
  onReactionSelect?: (emoji: string) => void;
  onReactionRemove?: (reactionId: string) => void;
}

export function MessageBubble({
  message,
  agentName,
  onAgentClick,
  currentUserId,
  reactions = [],
  onReactionSelect,
  onReactionRemove,
}: MessageBubbleProps) {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const isHuman = message.role === 'human';
  const isSystem = message.role === 'system';

  const initial = isHuman ? 'H' : (agentName ? agentName.charAt(0).toUpperCase() : 'A');
  const name = isHuman ? 'You' : (agentName || 'Unknown Agent');
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const handleReactionSelect = (emoji: string) => {
    onReactionSelect?.(emoji);
    setShowReactionPicker(false);
  };

  if (isSystem) {
    return (
      <div className="message-bubble system" style={{ alignSelf: 'center', margin: '1rem 0' }}>
        <div className="message-content">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`message-bubble ${isHuman ? 'human' : ''}`}>
      <div
        className="message-avatar"
        title={isHuman ? name : `${name} (Click to edit)`}
        style={{ cursor: isHuman ? 'default' : 'pointer' }}
        onClick={() => !isHuman && message.agentId && onAgentClick?.(message.agentId)}
      >
        {initial}
      </div>
      <div className="message-body">
        <div className="message-meta">
          <span
            style={{ fontWeight: 600, color: 'var(--text-heading)', cursor: isHuman ? 'default' : 'pointer' }}
            onClick={() => !isHuman && message.agentId && onAgentClick?.(message.agentId)}
          >
            {name}
          </span>
          {' '}<span style={{ opacity: 0.5 }}>{time}</span>
        </div>
        {/* Thought chain for agent messages */}
        {message.role === 'agent' && message.thoughts && message.thoughts.length > 0 && (
          <ThoughtChain thoughts={message.thoughts} />
        )}

        <div className="message-content markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>

        {/* Reactions section */}
        <div className="message-reactions-container" style={{ marginTop: '0.5rem' }}>
          {reactions && reactions.length > 0 && (
            <MessageReactions
              reactions={reactions}
              currentUserId={currentUserId}
              onReactionClick={handleReactionSelect}
              onReactionRemove={onReactionRemove!}
            />
          )}

          {/* Add reaction button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            {showReactionPicker ? (
              <ReactionPicker
                onSelect={handleReactionSelect}
                onClose={() => setShowReactionPicker(false)}
              />
            ) : (
              <button
                onClick={() => setShowReactionPicker(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary, #666)',
                  padding: '0.25rem',
                  borderRadius: '0.25rem',
                }}
                title="Add reaction"
              >
                😀 Add reaction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
