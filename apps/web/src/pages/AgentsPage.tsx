import { useEffect, useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { Agent, CreateAgentInput, AgentTemplate } from '@agentroom/shared';
import {
  listAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  api as apiClient,
  getAgentTemplates,
  createAgentFromTemplate
} from '../lib/api.ts';
import { Button } from '../components/Button.tsx';
import { AgentCard } from '../components/AgentCard.tsx';
import { AgentForm } from '../components/AgentForm.tsx';
import { Modal } from '../components/Modal.tsx';
import { AgentTemplateCard } from '../components/AgentTemplateCard.tsx';
import { Search, Plus, Cpu, FileText } from 'lucide-react';

export function AgentsPage() {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'date'>('name');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [globalProvider, setGlobalProvider] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | undefined>(undefined);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templates, setTemplates] = useState<AgentTemplate[]>([]);

  const loadSettings = useCallback(async () => {
    try {
      const settings = await apiClient.getSettings();
      if (settings.cached_models) {
        setAvailableModels(JSON.parse(settings.cached_models || '[]'));
      }
      setGlobalProvider(settings.global_provider_url || '');
    } catch {
      // Silently fail - settings optional
    }
  }, []);

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await listAgents();
      setAgents(data);
      await loadSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents.errorLoading'));
    } finally {
      setLoading(false);
    }
  }, [loadSettings, t]);

  const loadTemplates = useCallback(async () => {
    try {
      setTemplateLoading(true);
      const data = await getAgentTemplates();
      setTemplates(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('agents.errorLoading'));
    } finally {
      setTemplateLoading(false);
    }
  }, [t]);

  const handleOpenTemplateModal = useCallback(() => {
    void loadTemplates();
    setIsTemplateModalOpen(true);
  }, [loadTemplates]);

  const handleCloseTemplateModal = useCallback(() => {
    setIsTemplateModalOpen(false);
  }, []);

  const handleSelectTemplate = useCallback(async (template: AgentTemplate) => {
    try {
      await createAgentFromTemplate(template.id);
      await loadAgents();
      setIsTemplateModalOpen(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : t('agents.errorCreating'));
    }
  }, [loadAgents, t]);

  useEffect(() => {
    const loadInitialData = async () => {
      await loadAgents();
    };
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleOpenCreate = useCallback(() => {
    setEditingAgent(undefined);
    setIsModalOpen(true);
  }, []);

  const handleOpenEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setIsModalOpen(true);
  }, []);

  const handleOpenClone = useCallback((agent: Agent) => {
    setEditingAgent({ ...agent, id: '', name: `${agent.name} (Copy)` });
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingAgent(undefined);
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (data: CreateAgentInput) => {
    if (editingAgent?.id) {
      await updateAgent(editingAgent.id, data);
    } else {
      await createAgent(data);
    }
    await loadAgents();
    handleCloseModal();
  }, [editingAgent, loadAgents, handleCloseModal]);

  const handleDelete = useCallback(async (id: string) => {
    try {
      await deleteAgent(id);
      await loadAgents();
    } catch (err) {
      alert(err instanceof Error ? err.message : t('agents.errorDeleting'));
    }
  }, [loadAgents, t]);

  const filteredAgents = useMemo(() => {
    return agents
      .filter((agent) =>
        agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        agent.systemPrompt.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [agents, searchTerm, sortBy]);

  if (loading) {
    return (
      <div className="agents-loading" role="status" aria-live="polite">
        <div className="agents-spinner" aria-hidden="true"></div>
        <p>{t('agents.loading')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={24} aria-hidden="true" />
            {t('agents.title')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {t('agents.description')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button
            variant="secondary"
            onClick={handleOpenTemplateModal}
            aria-label={t('agents.createFromTemplate')}
          >
            <FileText size={18} aria-hidden="true" /> {t('agents.createFromTemplate')}
          </Button>
          <Button
            variant="primary"
            onClick={handleOpenCreate}
            aria-label={t('agents.create')}
          >
            <Plus size={18} aria-hidden="true" /> {t('agents.create')}
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {agents.length === 0 && !error && !loading ? (
        <div className="empty-state fade-in" role="status">
          <div
            className="icon"
            style={{
              background: 'rgba(59, 130, 246, 0.1)',
              color: 'var(--accent)',
              border: '1px solid rgba(59, 130, 246, 0.2)',
            }}
            aria-hidden="true"
          >
            🤖
          </div>
          <h2>{t('agents.noAgentsConfigured')}</h2>
          <p>{t('agents.noAgentsDescription')}</p>
          <Button variant="primary" onClick={handleOpenCreate}>
            {t('agents.initialize')}
          </Button>
        </div>
      ) : (
        <>
          {/* Search and Sort Bar */}
          <div className="agents-toolbar" role="search">
            <div className="search-wrapper">
              <Search className="search-icon" size={18} aria-hidden="true" />
              <input
                type="text"
                className="search-input"
                placeholder={t('agents.search.placeholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label={t('agents.search.placeholder')}
              />
            </div>
            <div className="sort-wrapper">
              <label htmlFor="sort-select">{t('agents.sort.label')}</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'name' | 'date')}
                className="sort-select"
              >
                <option value="name">{t('agents.sort.name')}</option>
                <option value="date">{t('agents.sort.date')}</option>
              </select>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="agents-stats" role="status" aria-live="polite">
            <span className="stat-item">
              <strong>{filteredAgents.length}</strong> {t('agents.stats.of')}{' '}
              <strong>{agents.length}</strong> {t('agents.stats.agents')}
            </span>
            {globalProvider && (
              <span className="stat-item">
                {' '}
                {t('agents.stats.provider')}: <strong>{globalProvider}</strong>
              </span>
            )}
            {availableModels.length > 0 && (
              <span className="stat-item">
                {' '}
                {t('agents.stats.models')}: <strong>{availableModels.length} {t('agents.stats.available')}</strong>
              </span>
            )}
          </div>

          <div className="card-grid">
            {filteredAgents.length > 0 ? (
              filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  onEdit={handleOpenEdit}
                  onClone={handleOpenClone}
                  onDelete={handleDelete}
                />
              ))
            ) : (
              <div className="empty-search-state" role="status">
                <Search size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} aria-hidden="true" />
                <p>
                  {t('agents.search.noResults', { term: searchTerm })}
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setSearchTerm('')}
                  style={{ marginTop: '0.5rem' }}
                >
                  {t('agents.search.clearSearch')}
                </Button>
              </div>
            )}
          </div>
        </>
      )}

      {isModalOpen && (
        <Modal
          title={editingAgent?.id ? t('agents.editAgent') : t('agents.createAgent')}
          onClose={handleCloseModal}
        >
          <AgentForm
            initialData={editingAgent}
            onSubmit={handleSubmit}
            onCancel={handleCloseModal}
            availableModels={availableModels}
          />
        </Modal>
      )}

      {isTemplateModalOpen && (
        <Modal title={t('agents.chooseTemplate')} onClose={handleCloseTemplateModal}>
          {templateLoading ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              {t('agents.loadingTemplates')}
            </div>
          ) : templates.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
              {t('agents.noTemplates')}
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '1rem',
              }}
            >
              {templates.map((template) => (
                <AgentTemplateCard
                  key={template.id}
                  template={template}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
