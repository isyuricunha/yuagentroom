import { useState } from 'react';
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
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    return (
        <div className="card agent-card-container" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div
                        className="message-avatar"
                        style={{
                            width: 40,
                            height: 40,
                            fontSize: '1rem',
                            background: `linear-gradient(135deg, hsl(${agent.name.length * 20} % 360, 60%, 40%), hsl(${agent.name.length * 40} % 360, 70%, 50%))`,
                        }}
                    >
                        {agent.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text-heading)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {agent.name}
                            <span className="model-badge" style={{ fontSize: '0.65rem' }}>{agent.model}</span>
                        </h3>
                        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                            {agent.reasoningEffort && agent.reasoningEffort !== 'none' && (
                                <span className="badge badge-running" style={{ fontSize: '0.6rem' }}>
                                    🧠 Reasoning: {agent.reasoningEffort}
                                </span>
                            )}
                            <span className="badge badge-idle" style={{ fontSize: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                                <Calendar size={10} /> Created on {formatDate(agent.createdAt)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                >
                    {isExpanded ? '▲' : '▼'} {isExpanded ? 'Collapse' : 'Expand'}
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
                    transition: 'all 0.3s ease',
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
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                }}
            >
                {isDeleting ? (
                    <>
                        <Button size="sm" onClick={() => setIsDeleting(false)}>Cancel</Button>
                        <Button variant="danger" size="sm" onClick={() => onDelete(agent.id)}>Confirm Delete</Button>
                    </>
                ) : (
                    <>
                        <Button variant="ghost" size="sm" onClick={() => onClone(agent)} title="Duplicate Agent" aria-label="Duplicate agent">
                            <Copy size={16} /> Duplicate
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => onEdit(agent)} title="Edit Agent" aria-label="Edit agent">
                            <Edit2 size={16} /> Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setIsDeleting(true)} style={{ color: 'var(--danger)' }} title="Delete Agent" aria-label="Delete agent">
                            <Trash2 size={16} /> Delete
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
}