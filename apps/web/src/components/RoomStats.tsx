import type { RoomAnalytics } from '../lib/api.ts';
import { MessageSquare, Users, Clock, Bot } from 'lucide-react';

interface RoomStatsProps {
    analytics: RoomAnalytics;
    agentNames?: Record<string, string>;
}

export function RoomStats({ analytics, agentNames }: RoomStatsProps) {
    const { totalMessages, messagesPerAgent, humanMessageCount, avgResponseTimeMs, conversationDurationMs, createdAt, lastMessageAt } = analytics;

    const formatDuration = (ms: number) => {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        }
        if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        }
        return `${seconds}s`;
    };

    const formatNumber = (num: number) => {
        return num.toLocaleString();
    };

    const sortedAgents = Object.entries(messagesPerAgent)
        .sort(([, a], [, b]) => b - a)
        .map(([agentId, count]) => ({
            agentId,
            name: agentNames?.[agentId] || agentId,
            count,
        }));

    return (
        <div className="room-stats">
            <div className="stats-grid">
                {/* Total Messages */}
                <div className="stat-card">
                    <div className="stat-icon">
                        <MessageSquare size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Total Messages</span>
                        <span className="stat-value">{formatNumber(totalMessages)}</span>
                    </div>
                </div>

                {/* Human Messages */}
                <div className="stat-card">
                    <div className="stat-icon">
                        <Users size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Human Messages</span>
                        <span className="stat-value">{formatNumber(humanMessageCount)}</span>
                    </div>
                </div>

                {/* Avg Response Time */}
                <div className="stat-card">
                    <div className="stat-icon">
                        <Clock size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Avg Response Time</span>
                        <span className="stat-value">{formatDuration(avgResponseTimeMs)}</span>
                    </div>
                </div>

                {/* Duration */}
                <div className="stat-card">
                    <div className="stat-icon">
                        <Bot size={20} />
                    </div>
                    <div className="stat-content">
                        <span className="stat-label">Duration</span>
                        <span className="stat-value">{formatDuration(conversationDurationMs)}</span>
                    </div>
                </div>
            </div>

            {/* Messages per Agent */}
            {sortedAgents.length > 0 && (
                <div className="agent-stats">
                    <h4 className="agent-stats-title">Messages by Agent</h4>
                    <div className="agent-stats-list">
                        {sortedAgents.map((agent) => (
                            <div key={agent.agentId} className="agent-stat-item">
                                <span className="agent-stat-name">{agent.name}</span>
                                <span className="agent-stat-count">{formatNumber(agent.count)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Timestamps */}
            <div className="timestamps">
                <div className="timestamp-item">
                    <span className="timestamp-label">Created:</span>
                    <span className="timestamp-value">{new Date(createdAt).toLocaleString()}</span>
                </div>
                <div className="timestamp-item">
                    <span className="timestamp-label">Last message:</span>
                    <span className="timestamp-value">{new Date(lastMessageAt).toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
