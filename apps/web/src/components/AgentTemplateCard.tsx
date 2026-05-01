import type { AgentTemplate } from '@agentroom/shared';
import { Button } from './Button.tsx';

interface AgentTemplateCardProps {
    template: AgentTemplate;
    onSelect: (template: AgentTemplate) => void;
}

export function AgentTemplateCard({ template, onSelect }: AgentTemplateCardProps) {
    return (
        <div className="template-card">
            <div className="template-card-header">
                <h3 className="template-card-title">{template.name}</h3>
                {template.isDefault && (
                    <span className="template-badge">Default</span>
                )}
            </div>
            <p className="template-card-description">{template.description}</p>
            <div className="template-card-meta">
                <span className="template-model">{template.model}</span>
            </div>
            <Button variant="primary" onClick={() => onSelect(template)} style={{ width: '100%' }}>
                Use Template
            </Button>
        </div>
    );
}
