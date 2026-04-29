import type { Message } from '@agentroom/shared';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
  agentName?: string;
  onAgentClick?: (agentId: string) => void;
}

export function MessageBubble({ message, agentName, onAgentClick }: MessageBubbleProps) {
  const isHuman = message.role === 'human';
  const isSystem = message.role === 'system';

  const initial = isHuman ? 'H' : (agentName ? agentName.charAt(0).toUpperCase() : 'A');
  const name = isHuman ? 'You' : (agentName || 'Unknown Agent');
  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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
        <div className="message-content markdown-body">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {message.content}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
}
