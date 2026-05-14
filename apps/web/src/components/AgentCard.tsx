import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Agent } from '@agentroom/shared';
import { Button } from './Button.tsx';
import { Copy, Edit2, Trash2, Calendar } from 'lucide-react';

interface AgentCardProps {
  agent: Agent;
  onEdit: (agent: Agent) => void;
  onClone: (agent: Agent) => void;
  onDelete: (id: string) => void;
}

export function AgentCard({ agent, onEdit, onClone, onDelete }: AgentCardProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const formatDate = useCallback((dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  const handleDeleteClick = useCallback(() => {
    setIsDeleting(true);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleting(false);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    onDelete(agent.id);
    setIsDeleting(false);
  }, [onDelete, agent.id]);

  const handleEdit = useCallback(() => {
    onEdit(agent);
  }, [onEdit, agent]);

  const handleClone = useCallback(() => {
    onClone(agent);
  }, [onClone, agent]);

  return (
    <div
      className="card agent-card-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        position: 'relative'
      }}
      role="article"
      aria-label={`Agent ${agent.name}`}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div
            className="message-avatar"
            style={{
              width: 48,
              height: 48,
              fontSize: '1.25rem',
              fontWeight: 600,
              background: `linear-gradient(135deg, hsl(${agent.name.length * 20} % 360, 60%, 40%), hsl(${agent.name.length * 40} % 360, 70%, 50%))`,
            }}
            aria-hidden="true"
          >
            {agent.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: '1.05rem',
                color: 'var(--text-heading)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              {agent.name}
              <span className="model-badge" style={{ fontSize: '0.65rem' }}>
                {agent.model}
              </span>
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '0.35rem',
                marginTop: '0.25rem',
                flexWrap: 'wrap'
              }}
            >
              {agent.reasoningEffort && agent.reasoningEffort !== 'none' && (
                <span className="badge badge-running" style={{ fontSize: '0.6rem' }}>
                  🧠 {t('agents.reasoning')}: {agent.reasoningEffort}
                </span>
              )}
              <span
                className="badge badge-idle"
                style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}
              >
                <Calendar size={10} aria-hidden="true" /> {t('agents.createdOn')} {formatDate(agent.createdAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          onClick={handleToggleExpand}
          className="btn btn-ghost btn-sm"
          style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
          aria-label={isExpanded ? t('agents.collapse') : t('agents.expand')}
          aria-expanded={isExpanded}
        >
          {isExpanded ? '▲' : '▼'} {isExpanded ? t('agents.collapse') : t('agents.expand')}
        </button>
        {agent.providerUrl && (
          <span className="badge badge-idle" style={{ fontSize: '0.6rem' }}>
            🔗 {agent.providerUrl.includes('openai') ? 'OpenAI' : agent.providerUrl.includes('anthropic') ? 'Anthropic' : 'Custom'}
          </span>
        )}
      </div>

      <div
        style={{
          flex: 1,
          fontSize: '0.8rem',
          color: 'var(--text-muted)',
          backgroundColor: 'var(--bg-input)',
          padding: isExpanded ? '1rem' : '0.75rem 1rem',
          borderRadius: 'var(--radius)',
          border: '1px solid rgba(255, 255, 255, 0.02)',
          fontFamily: 'var(--mono)',
          whiteSpace: isExpanded ? 'pre-wrap' : 'pre',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: isExpanded ? 'none' : 3,
          WebkitBoxOrient: 'vertical',
          boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.3s ease'
        }}
        title={agent.systemPrompt}
      >
        {agent.systemPrompt}
      </div>

      <div
        className="agent-card-actions"
        style={{
          display: 'flex',
          gap: '0.5rem',
          justifyContent: 'flex-end',
          marginTop: 'auto',
          paddingTop: '0.5rem',
          borderTop: '1px solid rgba(255, 255, 255, 0.05)'
        }}
      >
        {isDeleting ? (
          <>
            <Button size="sm" onClick={handleDeleteCancel}>
              {t('agents.deleteCancel')}
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteConfirm}>
              {t('agents.deleteConfirm')}
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClone}
              title={t('agents.duplicate')}
              aria-label={`${t('agents.duplicate')} ${agent.name}`}
            >
              <Copy size={16} aria-hidden="true" /> {t('agents.duplicate')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEdit}
              title={t('agents.edit')}
              aria-label={`${t('agents.edit')} ${agent.name}`}
            >
              <Edit2 size={16} aria-hidden="true" /> {t('agents.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDeleteClick}
              style={{ color: 'var(--danger)' }}
              title={t('agents.delete')}
              aria-label={`${t('agents.delete')} ${agent.name}`}
            >
              <Trash2 size={16} aria-hidden="true" /> {t('agents.delete')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
