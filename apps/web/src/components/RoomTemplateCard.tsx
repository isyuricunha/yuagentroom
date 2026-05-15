import type { RoomTemplate } from '@agentroom/shared';
import { Button } from './Button.tsx';

interface RoomTemplateCardProps {
    template: RoomTemplate;
    onSelect: (template: RoomTemplate) => void;
}

export function RoomTemplateCard({ template, onSelect }: RoomTemplateCardProps) {
    return (
        <div className="template-card-enhanced" onClick={() => onSelect(template)}>
            <div className="template-card-header">
                <h3 className="template-card-title">{template.name}</h3>
                {template.isDefault && (
                    <span className="template-badge">Default</span>
                )}
            </div>
            <p className="template-card-description">{template.description}</p>
            <Button variant="primary" onClick={() => onSelect(template)} style={{ width: '100%', marginTop: 'auto' }}>
                Use Template
            </Button>
        </div>
    );
}
