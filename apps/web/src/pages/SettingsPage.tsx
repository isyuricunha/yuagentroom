import { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { Settings as SettingsIcon, Save, RefreshCw, Key, Globe, Database, Eye, EyeOff } from 'lucide-react';

export function SettingsPage() {
  const [providerUrl, setProviderUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [message, setMessage] = useState('');
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await api.updateSettings({
        global_provider_url: providerUrl,
        global_api_key: apiKey
      });
      setMessage('Settings saved securely.');
    } catch {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  async function handleRefreshModels() {
    setRefreshing(true);
    try {
      if (!providerUrl) {
        alert('Please save a Global Provider URL first.');
        setRefreshing(false);
        return;
      }
      const fetchedModels = await api.getModels(true);
      setModels(fetchedModels);
      setMessage(`Successfully fetched ${fetchedModels.length} models.`);
    } catch {
      setMessage('Failed to fetch models from API.');
    } finally {
      setRefreshing(false);
      setTimeout(() => setMessage(''), 3000);
    }
  }

  if (loading) return <div className="page-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}><RefreshCw className="spin" size={24} style={{ opacity: 0.5 }} /></div>;

  return (
    <div className="page-content fade-in">
      <header className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontSize: '1.5rem' }}>
            <SettingsIcon size={24} className="text-muted" /> Global Preferences
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Manage your AI engine endpoints and interface configurations.
          </p>
        </div>
      </header>
      
      {message && (
        <div style={{ marginBottom: '1.5rem', width: '100%' }}>
          <div className="badge badge-running" style={{ padding: '0.5rem 1rem', display: 'inline-flex', borderRadius: 'var(--radius)' }}>
            {message}
          </div>
        </div>
      )}

      <div className="settings-grid">
        {/* Left Column: API Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3><Globe size={16} /> Inference Provider</h3>
            <p>Your primary fallback AI gateway.</p>
          </div>
          
          <div className="card glass-card">
            <form onSubmit={handleSave} className="form-row">
              <div className="field">
                <label>API Endpoint (e.g., OpenAI, OpenRouter, Local)</label>
                <input 
                  type="text" 
                  className="input glow-input" 
                  placeholder="https://api.openai.com/v1"
                  value={providerUrl}
                  onChange={(e) => setProviderUrl(e.target.value)}
                />
              </div>

              <div className="field">
                <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                  <span><Key size={12} style={{ display: 'inline', marginRight: '3px' }}/> Bearer Token / API Key</span>
                  <button type="button" onClick={() => setShowKey(!showKey)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}>
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />} {showKey ? 'Hide' : 'Reveal'}
                  </button>
                </label>
                <div style={{ position: 'relative' }}>
                  <input 
                    type={showKey ? "text" : "password"} 
                    className="input glow-input"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    style={{ paddingRight: '2.5rem' }}
                  />
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                  Automatically provisioned if an agent lacks explicit credentials.
                </span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  <Save size={14} /> {saving ? 'Saving...' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Right Column: Model Cache */}
        <div className="settings-section">
          <div className="settings-section-header">
            <h3><Database size={16} /> Model Discovery Cache</h3>
            <p>Synchronize available models from your provider.</p>
          </div>

          <div className="card glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Fetch the list of standard models supported by your endpoint to populate the Agent creation dropdown natively.
            </p>

            <button type="button" className="btn btn-secondary" style={{ alignSelf: 'flex-start' }} onClick={handleRefreshModels} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'spin' : ''} /> {refreshing ? 'Syncing with Provider...' : 'Sync Models Hierarchy'}
            </button>
            
            <div className="models-chip-container">
              {models.length > 0 ? (
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                   {models.map(m => (
                     <span key={m} className="model-chip">{m}</span>
                   ))}
                 </div>
              ) : (
                <div className="empty-state" style={{ padding: '2rem 1rem' }}>
                   <div className="icon" style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📡</div>
                   <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Cache is empty. Sync to discover.</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
