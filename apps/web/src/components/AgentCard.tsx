import { useState } from 'react';
import type { Agent } from '@agentroom/shared';
import { Button } from './Button.tsx';
import { Copy, Edit2, Trash2, Cpu } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onClone: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onEdit, onClone, onDelete }: AgentCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  return (
    <div className="card agent-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div className="message-avatar" style={{ width: 40, height: 40, fontSize: '1rem' }}>
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)' }}>{agent.name}</h3>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.25rem' }}>
              <Cpu size={12} color="var(--accent)" />
              <span className="badge badge-idle" style={{ fontSize: '0.65rem' }}>{agent.model}</span>
              {agent.reasoningEffort && agent.reasoningEffort !== 'none' && (
                <span className="badge badge-running" style={{ fontSize: '0.65rem' }}>Reasoning: {agent.reasoningEffort}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-input)',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          fontFamily: 'var(--mono)',
          whiteSpace: 'pre-wrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
        }}
        title={agent.systemPrompt}
      >
        {agent.systemPrompt}
      </div>

      <div className="agent-card-actions" style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '0.5rem' }}>
        {isDeleting ? (
          <>
            <Button size="sm" onClick={() => setIsDeleting(false)}>Cancel</Button>
            <Button variant="danger" size="sm" onClick={() => onDelete(agent.id)}>Confirm Delete</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" size="sm" onClick={() => onClone(agent)} title="Duplicate Agent">
              <Copy size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onEdit(agent)} title="Edit Agent">
              <Edit2 size={16} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsDeleting(true)} style={{ color: 'var(--danger)' }} title="Delete Agent">
              <Trash2 size={16} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
