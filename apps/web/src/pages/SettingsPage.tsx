import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api.ts';
import { Settings as SettingsIcon, Save, RefreshCw, Key, Globe, Database, Eye, EyeOff } from 'lucide-react';

export function SettingsPage() {
  const { t } = useTranslation();
  const [providerUrl, setProviderUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setProviderUrl(data.global_provider_url || '');
      setApiKey(data.global_api_key || '');

      if (data.cached_models) {
        try {
          setModels(JSON.parse(data.cached_models));
        } catch {
          // Invalid JSON in cached_models, ignore
        }
      }
    } catch (err) {
      console.error('Failed to load settings', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useState(() => {
    void loadSettings();
  });

  const handleMessage = useCallback((text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const handleSave = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setSaving(true);
      setMessage(null);
      try {
        await api.updateSettings({
          global_provider_url: providerUrl,
          global_api_key: apiKey,
        });
        handleMessage(t('settings.settingsSaved'), 'success');
      } catch {
        handleMessage(t('settings.saveFailed'), 'error');
      } finally {
        setSaving(false);
      }
    },
    [providerUrl, apiKey, t, handleMessage]
  );

  const handleRefreshModels = useCallback(async () => {
    setRefreshing(true);
    setMessage(null);
    try {
      if (!providerUrl) {
        handleMessage(t('settings.urlRequired'), 'error');
        setRefreshing(false);
        return;
      }
      const fetchedModels = await api.getModels(true);
      setModels(fetchedModels);
      handleMessage(t('settings.fetchSuccess', { count: fetchedModels.length }), 'success');
    } catch {
      handleMessage(t('settings.fetchFailed'), 'error');
    } finally {
      setRefreshing(false);
    }
  }, [providerUrl, t, handleMessage]);

  const toggleShowKey = useCallback(() => {
    setShowKey((prev) => !prev);
  }, []);

  if (loading) {
    return (
      <div
        className="page-content"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        role="status"
        aria-live="polite"
      >
        <RefreshCw className="spin" size={24} style={{ opacity: 0.5 }} aria-hidden="true" />
        <span className="sr-only">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="page-content fade-in">
      <header className="page-header">
        <div>
          <h1
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              margin: 0,
              fontSize: '1.5rem',
            }}
          >
            <SettingsIcon size={24} className="text-muted" aria-hidden="true" />
            {t('settings.globalPreferences')}
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {t('settings.description')}
          </p>
        </div>
      </header>

      {/* Message Banner */}
      {message && (
        <div
          style={{ marginBottom: '1.5rem', width: '100%' }}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            className={`badge ${message.type === 'success' ? 'badge-running' : 'badge-danger'}`}
            style={{
              padding: '0.5rem 1rem',
              display: 'inline-flex',
              borderRadius: 'var(--radius)',
              backgroundColor:
                message.type === 'success'
                  ? 'rgba(34, 197, 94, 0.1)'
                  : 'rgba(239, 68, 68, 0.1)',
              color: message.type === 'success' ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
            }}
          >
            {message.text}
          </div>
        </div>
      )}

      <div className="settings-grid">
        {/* Left Column: API Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>
              <Globe size={16} aria-hidden="true" /> {t('settings.inferenceProvider')}
            </h3>
            <p>{t('settings.providerDescription')}</p>
          </div>

          <div className="card glass-card">
            <form onSubmit={handleSave} className="form-row">
              <div className="field">
                <label htmlFor="provider-url">{t('settings.providerUrl')}</label>
                <input
                  id="provider-url"
                  type="text"
                  className="input glow-input"
                  placeholder={t('settings.providerUrlPlaceholder')}
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                  aria-describedby="provider-url-help"
                />
              </div>

              <div className="field">
                <label htmlFor="api-key" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span>
                    <Key size={12} style={{ display: 'inline', marginRight: '3px' }} aria-hidden="true" />
                    {t('settings.bearerToken')}
                  </span>
                  <button
                    type="button"
                    onClick={toggleShowKey}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem',
                      fontSize: '0.7rem',
                    }}
                    aria-label={showKey ? t('settings.hideKey') : t('settings.showKey')}
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                    {showKey ? t('settings.hideKey') : t('settings.showKey')}
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="api-key"
                    type={showKey ? 'text' : 'password'}
                    className="input glow-input"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                    aria-describedby="api-key-help"
                  />
                </div>
                <span id="api-key-help" style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem', display: 'block' }}>
                  {t('settings.tokenDescription')}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginTop: '1rem',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border)',
                }}
              >
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                  aria-busy={saving}
                >
                  <Save size={14} style={{ marginRight: '0.5rem' }} aria-hidden="true" />
                  {saving ? t('settings.saving') : t('settings.saveConfiguration')}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Model Cache */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3>
              <Database size={16} aria-hidden="true" /> {t('settings.modelCache')}
            </h3>
            <p>{t('settings.cacheDescription')}</p>
          </div>

          <div className="card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {t('settings.cacheHelp')}
            </p>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ alignSelf: 'flex-start' }}
              onClick={handleRefreshModels}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <RefreshCw
                size={14}
                className={refreshing ? 'spin' : ''}
                style={{ marginRight: '0.5rem' }}
                aria-hidden="true"
              />
              {refreshing ? t('settings.syncing') : t('settings.syncModels')}
            </button>

            <div className="models-chip-container">
              {models.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {models.map((m) => (
                    <span key={m} className="model-chip">
                      {m}
                    </span>
                  ))}
                </div>
              ) : (
                <div
                  className="empty-state"
                  style={{ padding: '2rem 1rem' }}
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="icon"
                    style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}
                    aria-hidden="true"
                  >
                    📡
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {t('settings.cacheEmpty')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
