import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router';
import type { Agent, Message, RoomWithAgents, ServerEvent, CreateAgentInput } from '@agentroom/shared';
import { getRoom, getRoomMessages, listAgents } from '../lib/api.ts';
import { RoomWebSocket } from '../lib/ws.ts';
import { MessageBubble } from '../components/MessageBubble.tsx';
import { TypingIndicator } from '../components/TypingIndicator.tsx';
import { Button } from '../components/Button.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { AgentForm } from '../components/AgentForm.tsx';
import { updateAgent } from '../lib/api.ts';
import { ChevronLeft, Play, Pause, UserPlus, Users, Trash2, Send, Edit2, X } from 'lucide-react';

export function RoomPage() {
  const { id } = useParams<{ id: string }>();
  
  const [room, setRoom] = useState<RoomWithAgents | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]); // For the side panel to add agents
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [typingAgentId, setTypingAgentId] = useState<string | null>(null);
  const [typingAgentName, setTypingAgentName] = useState<string | null>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  const [ws, setWs] = useState<RoomWebSocket | null>(null);
  const [myInput, setMyInput] = useState('');
  
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll Down
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingAgentId]);

  // Data Loading
  useEffect(() => {
    if (!id) return;
    
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        const [roomData, msgs, agentsData] = await Promise.all([
          getRoom(id!),
          getRoomMessages(id!),
          listAgents(),
        ]);
        if (!active) return;
        
        setRoom(roomData);
        setMessages(msgs);
        setAllAgents(agentsData);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load room data');
      } finally {
        if (active) setLoading(false);
      }
    }
    
    void loadData();

    return () => {
      active = false;
    };
  }, [id]);

  // WebSocket lifecycle
  useEffect(() => {
    if (!id || !room) return;

    const socket = new RoomWebSocket(id);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWs(socket);
    socket.connect();

    const unsubMessage = socket.on('room:message', (ev) => {
      const { payload } = ev as Extract<ServerEvent, { type: 'room:message' }>;
      setMessages((prev) => [...prev, payload]);
      setTypingAgentId(null);
      setTypingAgentName(null);
    });

    const unsubTyping = socket.on('room:typing', (ev) => {
      const { payload } = ev as Extract<ServerEvent, { type: 'room:typing' }>;
      setTypingAgentId(payload.agentId);
      setTypingAgentName(payload.agentName);
      
      // Auto clear typing indicator if no message arrives in 30s
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        setTypingAgentId(null);
        setTypingAgentName(null);
      }, 30000);
    });

    const unsubStatus = socket.on('room:status', (ev) => {
      const { payload } = ev as Extract<ServerEvent, { type: 'room:status' }>;
      setRoom((prev) => prev ? { ...prev, status: payload.status } : null);
    });

    const unsubAgentJoined = socket.on('room:agent_joined', (ev) => {
      const { payload } = ev as Extract<ServerEvent, { type: 'room:agent_joined' }>;
      // Refetch room data to get full agent list/context cleanly
      getRoom(id).then(setRoom).catch(console.error);
      
      const sysMsg: Message = {
        id: crypto.randomUUID(),
        roomId: id,
        agentId: null,
        role: 'system',
        content: `Agent ${payload.agent.name} entered the room`,
        createdAt: new Date().toISOString()
      };
      setMessages((prev) => [...prev, sysMsg]);
    });

    const unsubAgentLeft = socket.on('room:agent_left', (ev) => {
      const { payload } = ev as Extract<ServerEvent, { type: 'room:agent_left' }>;
      
      setRoom((prev) => {
        if (!prev) return null;
        const leftAgent = prev.agents.find(a => a.id === payload.agentId);
        
        const sysMsg: Message = {
          id: crypto.randomUUID(),
          roomId: id,
          agentId: null,
          role: 'system',
          content: `Agent ${leftAgent?.name || 'Unknown'} left the room`,
          createdAt: new Date().toISOString()
        };
        setMessages((msgs) => [...msgs, sysMsg]);
        
        return {
          ...prev,
          agents: prev.agents.filter(a => a.id !== payload.agentId)
        };
      });
    });

    return () => {
      unsubMessage();
      unsubTyping();
      unsubStatus();
      unsubAgentJoined();
      unsubAgentLeft();
      socket.disconnect();
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, room?.id]); // Connects once room is loaded


  if (loading) return <div style={{ padding: '2rem' }}>Loading Room...</div>;
  if (error || !room) return <div style={{ padding: '2rem', color: 'var(--danger)' }}>{error || 'Room not found'}</div>;

  // Actions
  const handleStart = () => ws?.send({ type: 'room:start', payload: { roomId: room.id } });
  const handlePause = () => ws?.send({ type: 'room:pause', payload: { roomId: room.id } });
  
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!myInput.trim()) return;
    ws?.send({ type: 'room:send_message', payload: { roomId: room.id, content: myInput } });
    setMyInput('');
  };

  const activeAgentIds = new Set(room.agents.map(a => a.id));
  const availableAgents = allAgents.filter(a => !activeAgentIds.has(a.id));

  const openEditAgent = (agentId: string) => {
    const agent = allAgents.find(a => a.id === agentId);
    if (agent) {
      setEditingAgent(agent);
      setIsAgentModalOpen(true);
    }
  };

  const handleUpdateAgent = async (input: Partial<CreateAgentInput>) => {
    if (!editingAgent) return;
    const updated = await updateAgent(editingAgent.id, input);
    
    // Update local state
    setAllAgents(prev => prev.map(a => a.id === updated.id ? updated : a));
    setRoom(prev => {
      if (!prev) return null;
      return {
        ...prev,
        agents: prev.agents.map(a => a.id === updated.id ? updated : a)
      };
    });
    
    setIsAgentModalOpen(false);
    setEditingAgent(null);
  };

  return (
    <div className="chat-layout">
      {/* Modifies default max-width for chat view */}
      <style>{`.page-content { padding: 0; max-width: 100%; display: flex; }`}</style>
      
      <div className="chat-main">
        {/* Header */}
        <div className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <Link to="/rooms" className="btn-back">
              <ChevronLeft size={20} />
            </Link>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>{room.name}</h2>
                <StatusBadge status={room.status} />
              </div>
              {room.topic && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                  {room.topic}
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {room.status === 'idle' || room.status === 'paused' ? (
              <Button variant="primary" onClick={handleStart} disabled={room.agents.length === 0} style={{ gap: '0.5rem' }}>
                <Play size={14} fill="currentColor" /> Start Session
              </Button>
            ) : (
              <Button variant="secondary" onClick={handlePause} style={{ gap: '0.5rem' }}>
                <Pause size={14} fill="currentColor" /> Pause
              </Button>
            )}
          </div>
        </div>

        {/* Messages feed */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="empty-state" style={{ padding: '2rem' }}>
              <div className="icon">💬</div>
              <p>No messages yet. Add an agent and start the conversation.</p>
            </div>
          )}
          
          {messages.map(msg => {
             // For rendering the name correctly.
             const agentInfo = msg.role === 'agent' 
               // Check room.agents first, fallback to allAgents (if agent left the room but their messages remain)
               ? room.agents.find(a => a.id === msg.agentId) || allAgents.find(a => a.id === msg.agentId)
               // The Server event might inject an 'agent' prop (though not perfectly typed in base Message interface)
               // eslint-disable-next-line @typescript-eslint/no-explicit-any
               : (msg as any).agent;
               
             return (
               <MessageBubble 
                 key={msg.id} 
                 message={msg} 
                 agentName={agentInfo?.name} 
                 onAgentClick={openEditAgent}
               />
             );
          })}
          
          {typingAgentName && (
            <TypingIndicator agentName={typingAgentName} />
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="chat-input-wrapper">
          <form className="chat-input-bar" onSubmit={handleSend}>
            <input 
              type="text" 
              className="input" 
              placeholder="Message autonomous agents..." 
              value={myInput}
              onChange={(e) => setMyInput(e.target.value)}
            />
            <Button type="submit" variant="primary" disabled={!myInput.trim()} size="sm" style={{ padding: '0.5rem' }}>
              <Send size={16} />
            </Button>
          </form>
        </div>
      </div>

      {/* Sidebar: Active and Available Agents */}
      <aside className="chat-sidebar">
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <Users size={12} /> Active Roster ({room.agents.length})
          </div>
          <div className="agent-list-scroll">
            {room.agents.length === 0 && (
              <div className="empty-mini-state">No agents deployed.</div>
            )}
            {room.agents.map(agent => (
              <div key={agent.id} className="agent-sidebar-item">
                <div 
                  className="avatar-mini clickable" 
                  onClick={() => openEditAgent(agent.id)}
                  title="Click to edit agent"
                >
                  {agent.name.charAt(0)}
                </div>
                <span 
                  className="name clickable" 
                  onClick={() => openEditAgent(agent.id)}
                  title="Click to edit agent"
                >
                  {agent.name}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    className="ghost-btn"
                    title="Edit agent"
                    onClick={() => openEditAgent(agent.id)}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    className="remove-btn"
                    title="Expel from room"
                    onClick={() => ws?.send({ type: 'room:remove_agent', payload: { roomId: room.id, agentId: agent.id }})}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <UserPlus size={12} /> Available Personnel
          </div>
          <div className="agent-list-scroll">
            {availableAgents.length === 0 && (
              <div className="empty-mini-state">All agents assigned.</div>
            )}
            {availableAgents.map(agent => (
              <div key={agent.id} className="agent-sidebar-item">
                <div 
                  className="avatar-mini secondary clickable" 
                  onClick={() => openEditAgent(agent.id)}
                  title="Click to edit agent"
                >
                  {agent.name.charAt(0)}
                </div>
                <span 
                  className="name clickable" 
                  onClick={() => openEditAgent(agent.id)}
                  title="Click to edit agent"
                >
                  {agent.name}
                </span>
                <div style={{ display: 'flex', gap: '0.25rem' }}>
                  <button 
                    className="ghost-btn"
                    title="Edit agent"
                    onClick={() => openEditAgent(agent.id)}
                  >
                    <Edit2 size={12} />
                  </button>
                  <button 
                    className="add-btn"
                    title="Assign to room"
                    onClick={() => ws?.send({ type: 'room:add_agent', payload: { roomId: room.id, agentId: agent.id }})}
                  >
                    <UserPlus size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Agent Edit Modal */}
      {isAgentModalOpen && editingAgent && (
        <div className="modal-backdrop" onClick={() => setIsAgentModalOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Agent — {editingAgent.name}</h2>
              <button className="btn-ghost" onClick={() => setIsAgentModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <AgentForm 
              initialData={editingAgent} 
              onSubmit={handleUpdateAgent}
              onCancel={() => setIsAgentModalOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
