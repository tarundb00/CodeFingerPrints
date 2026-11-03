import React, { useState, useEffect } from 'react';
import {
  FaGithub, FaKey, FaBuilding, FaCodeBranch, FaShieldAlt,
  FaEdit, FaTrash, FaPlus, FaTimes, FaCheckCircle,
  FaEye, FaEyeSlash, FaCopy, FaSync, FaExclamationTriangle,
} from 'react-icons/fa';
import AdminLayout from './AdminLayout';
import './GitHubSettings.css';
import useToast from '../components/useToast';
import Toast from '../components/Toast';
import {
  fetchGithubConfigs, createGithubConfig, updateGithubConfig,
  deleteGithubConfig, testGithubConfig,
} from '../services/api';

const FIELD_DEFS = [
  {
    key: 'personalAccessToken',
    label: 'Personal Access Token (PAT)',
    icon: <FaKey />,
    type: 'secret',
    placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    hint: 'Required scopes: repo, admin:org, delete_repo',
    section: 'auth',
  },
  {
    key: 'organizationName',
    label: 'Organization Name',
    icon: <FaBuilding />,
    type: 'text',
    placeholder: 'e.g. codefingerprints-org',
    hint: 'GitHub organization where all repos will be created',
    section: 'org',
  },
  {
    key: 'defaultBranch',
    label: 'Default Branch',
    icon: <FaCodeBranch />,
    type: 'text',
    placeholder: 'main',
    hint: 'Default branch name for new repositories',
    section: 'org',
  },
  {
    key: 'repoVisibility',
    label: 'Repository Visibility',
    icon: <FaShieldAlt />,
    type: 'select',
    options: ['private', 'public', 'internal'],
    hint: 'Visibility for all auto-created repositories',
    section: 'org',
  },
  {
    key: 'webhookSecret',
    label: 'Webhook Secret',
    icon: <FaKey />,
    type: 'secret',
    placeholder: 'whsec_xxxxxxxxxxxxxxxxxxxx',
    hint: 'Used to verify GitHub webhook payloads',
    section: 'webhook',
  },
  {
    key: 'webhookUrl',
    label: 'Webhook Callback URL',
    icon: <FaGithub />,
    type: 'text',
    placeholder: 'https://yourdomain.com/api/github/webhook',
    hint: 'URL GitHub will POST events to',
    section: 'webhook',
  },
  {
    key: 'appClientId',
    label: 'GitHub App Client ID',
    icon: <FaKey />,
    type: 'text',
    placeholder: 'Iv1.xxxxxxxxxxxxxxxx',
    hint: 'OAuth App or GitHub App client ID (optional)',
    section: 'oauth',
  },
  {
    key: 'appClientSecret',
    label: 'GitHub App Client Secret',
    icon: <FaKey />,
    type: 'secret',
    placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    hint: 'OAuth App or GitHub App client secret (optional)',
    section: 'oauth',
  },
];

const SECTIONS = {
  auth:    { label: 'Authentication',      icon: <FaKey />,      color: '#6675ff' },
  org:     { label: 'Organization',        icon: <FaBuilding />, color: '#8c4fff' },
  webhook: { label: 'Webhook',             icon: <FaSync />,     color: '#2ecc71' },
  oauth:   { label: 'OAuth / GitHub App',  icon: <FaShieldAlt />,color: '#f39c12' },
};

const DEMO_CONFIGS = [];


const emptyForm = () => ({
  name: '',
  personalAccessToken: '',
  organizationName: '',
  defaultBranch: 'main',
  repoVisibility: 'private',
  webhookSecret: '',
  webhookUrl: '',
  appClientId: '',
  appClientSecret: '',
});

export default function GitHubSettings() {
  const [configs, setConfigs] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [revealed, setRevealed] = useState({});
  const [copied, setCopied] = useState('');
  const [testStatus, setTestStatus] = useState(null);
  const [editingPatId, setEditingPatId] = useState(null);
  const [patDraft, setPatDraft] = useState('');
  const [patVisible, setPatVisible] = useState(false);
  const { toasts, removeToast, toast } = useToast();

  useEffect(() => {
    fetchGithubConfigs()
      .then(data => setConfigs(data || []))
      .catch(() => toast.error('Failed to load GitHub configurations'));
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setTestStatus(null); setModalOpen(true); };
  const openEdit = (cfg) => {
    setForm({ ...cfg });
    setEditingId(cfg.id);
    setTestStatus(null);
    setModalOpen(true);
  };
  const closeModal = () => { setModalOpen(false); setEditingId(null); setTestStatus(null); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        const updated = await updateGithubConfig(editingId, form);
        setConfigs(prev => prev.map(c => c.id === editingId ? updated : c));
        toast.success('Configuration updated successfully');
      } else {
        const created = await createGithubConfig(form);
        setConfigs(prev => [created, ...prev]);
        toast.success('Configuration added successfully');
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to save configuration');
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGithubConfig(deleteId);
      setConfigs(prev => prev.filter(c => c.id !== deleteId));
      setDeleteId(null);
      toast.success('Configuration deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Failed to delete configuration');
    }
  };

  const handleTest = async () => {
    if (!editingId) {
      toast.error('Save the configuration first, then test it');
      return;
    }
    setTestStatus('testing');
    try {
      const result = await testGithubConfig(editingId);
      if (result.success) {
        setTestStatus('success');
        toast.success(result.message);
      } else {
        setTestStatus('fail');
        toast.error(result.message);
      }
    } catch (err) {
      setTestStatus('fail');
      toast.error('Connection test failed');
    }
  };

  const copyVal = (val, key) => {
    navigator.clipboard.writeText(val).catch(() => {});
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
    toast.info('Copied to clipboard');
  };

  const toggleReveal = (key) => setRevealed(r => ({ ...r, [key]: !r[key] }));

  const startPatEdit = (cfg) => {
    setEditingPatId(cfg.id);
    setPatDraft(cfg.personalAccessToken || '');
    setPatVisible(false);
  };

  const cancelPatEdit = () => {
    setEditingPatId(null);
    setPatDraft('');
    setPatVisible(false);
  };

  const savePatEdit = async (cfg) => {
    try {
      const updated = await updateGithubConfig(cfg.id, { ...cfg, personalAccessToken: patDraft });
      setConfigs(prev => prev.map(c => c.id === cfg.id ? updated : c));
      setEditingPatId(null);
      setPatDraft('');
      setPatVisible(false);
      toast.success('API key updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update API key');
    }
  };

  const maskSecret = (val) => val ? val.slice(0, 6) + '••••••••••••••••' : '—';

  const grouped = Object.entries(SECTIONS).map(([sec, meta]) => ({
    ...meta, sec,
    fields: FIELD_DEFS.filter(f => f.section === sec),
  }));

  return (
    <>
    <AdminLayout title="GitHub Settings" subtitle="Manage GitHub integration keys and organization config">

      {/* HEADER */}
      <div className="at-section-head">
        <div>
          <h2>GitHub Configurations</h2>
          <p>Store and manage GitHub PAT, org settings, webhooks and OAuth keys.</p>
        </div>
        <div className="at-section-actions">
          <span className="at-count-badge">{configs.length} config{configs.length !== 1 ? 's' : ''}</span>
          <button className="at-submit-btn" onClick={openAdd}>
            <FaPlus /> Add Config
          </button>
        </div>
      </div>

      {/* KEYS REFERENCE CARD */}
      <div className="gh-ref-grid">
        {grouped.map(g => (
          <div className="gh-ref-card" key={g.sec} style={{ '--gc': g.color }}>
            <div className="gh-ref-head">
              <span className="gh-ref-icon" style={{ color: g.color }}>{g.icon}</span>
              <span>{g.label}</span>
            </div>
            <ul>
              {g.fields.map(f => (
                <li key={f.key}>
                  <span className="gh-ref-dot" style={{ background: g.color }} />
                  {f.label}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* CONFIG TABLE */}
      {configs.length === 0 ? (
        <div className="at-empty-state">
          <FaGithub />
          <h3>No configurations yet</h3>
          <p>Add your first GitHub config to enable repository automation.</p>
        </div>
      ) : (
        <div className="gh-table-wrap">
          <table className="gh-table">
            <thead>
              <tr>
                <th>Config Name</th>
                <th>Organization</th>
                <th>Branch</th>
                <th>Visibility</th>
                <th>PAT</th>
                <th>Webhook URL</th>
                <th>Status</th>
                <th>Created At</th>
                <th>Updated At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map(cfg => (
                <tr key={cfg.id}>
                  <td>
                    <div className="gh-td-name">
                      <span className="gh-td-icon"><FaGithub /></span>
                      {cfg.name}
                    </div>
                  </td>
                  <td><span className="gh-td-mono">{cfg.organizationName || '—'}</span></td>
                  <td><span className="gh-td-branch"><FaCodeBranch /> {cfg.defaultBranch}</span></td>
                  <td>
                    <span className={`gh-vis-badge ${cfg.repoVisibility}`}>
                      {cfg.repoVisibility}
                    </span>
                  </td>
                  <td>
                    {editingPatId === cfg.id ? (
                      <div className="gh-secret-cell" style={{ gap: 8 }}>
                        <input
                          type={patVisible ? 'text' : 'password'}
                          value={patDraft}
                          onChange={e => setPatDraft(e.target.value)}
                          placeholder="Paste PAT"
                          style={{ minWidth: 180, padding: '6px 8px', borderRadius: 8, border: '1px solid #d7dce7', background: '#f8faff' }}
                        />
                        <button className="gh-copy-btn" type="button" title={patVisible ? 'Hide' : 'Show'} onClick={() => setPatVisible(v => !v)}>
                          {patVisible ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button className="gh-copy-btn" type="button" title="Save" onClick={() => savePatEdit(cfg)}>
                          <FaCheckCircle style={{ color: '#2ecc71' }} />
                        </button>
                        <button className="gh-copy-btn" type="button" title="Cancel" onClick={cancelPatEdit}>
                          <FaTimes />
                        </button>
                      </div>
                    ) : (
                      <div className="gh-secret-cell">
                        <span className="gh-td-mono">{maskSecret(cfg.personalAccessToken)}</span>
                        <button className="gh-copy-btn" title="Copy" onClick={() => copyVal(cfg.personalAccessToken, `pat-${cfg.id}`)}>
                          {copied === `pat-${cfg.id}` ? <FaCheckCircle style={{ color: '#2ecc71' }} /> : <FaCopy />}
                        </button>
                        <button className="gh-copy-btn" title="Edit API key" onClick={() => startPatEdit(cfg)}>
                          <FaEdit />
                        </button>
                      </div>
                    )}
                  </td>
                  <td><span className="gh-td-url">{cfg.webhookUrl || '—'}</span></td>
                  <td>
                    <span className={`gh-status-badge ${cfg.status}`}>
                      {cfg.status === 'active' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                      {cfg.status}
                    </span>
                  </td>
                  <td><span className="gh-td-time">{cfg.createdAt}</span></td>
                  <td><span className="gh-td-time">{cfg.updatedAt}</span></td>
                  <td>
                    <div className="gh-row-actions">
                      <button className="at-icon-btn" title="Edit" onClick={() => openEdit(cfg)}><FaEdit /></button>
                      <button className="at-icon-btn at-danger" title="Delete" onClick={() => setDeleteId(cfg.id)}><FaTrash /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      {modalOpen && (
        <div className="at-modal-overlay">
          <div className="at-modal-card gh-modal">
            <div className="at-modal-head">
              <div>
                <p className="at-modal-badge">{editingId ? 'Edit Config' : 'New Config'}</p>
                <h3>{editingId ? 'Update GitHub Configuration' : 'Add GitHub Configuration'}</h3>
              </div>
              <button className="at-close-btn" onClick={closeModal}><FaTimes /></button>
            </div>

            <form className="at-form" onSubmit={handleSave}>

              {/* CONFIG NAME */}
              <div className="at-field gh-name-field">
                <label><FaGithub className="at-field-icon" /> Configuration Name <span className="gh-req">*</span></label>
                <div className="at-input-wrap">
                  <input
                    placeholder="e.g. Production Config"
                    value={form.name}
                    onChange={e => set('name', e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* GROUPED SECTIONS */}
              {grouped.map(g => (
                <div className="gh-form-section" key={g.sec} style={{ '--gc': g.color }}>
                  <div className="gh-form-section-head">
                    <span style={{ color: g.color }}>{g.icon}</span>
                    {g.label}
                  </div>
                  <div className="at-grid">
                    {g.fields.map(f => (
                      <div className={`at-field ${f.key === 'webhookUrl' ? 'at-full' : ''}`} key={f.key}>
                        <label>
                          <span className="at-field-icon" style={{ color: g.color }}>{f.icon}</span>
                          {f.label}
                        </label>
                        <div className="at-input-wrap gh-secret-wrap">
                          {f.type === 'select' ? (
                            <select value={form[f.key]} onChange={e => set(f.key, e.target.value)}>
                              {f.options.map(o => <option key={o}>{o}</option>)}
                            </select>
                          ) : (
                            <input
                              type={f.type === 'secret' && !revealed[f.key] ? 'password' : 'text'}
                              placeholder={f.placeholder}
                              value={form[f.key]}
                              onChange={e => set(f.key, e.target.value)}
                            />
                          )}
                          {f.type === 'secret' && (
                            <button type="button" className="gh-reveal-btn" onClick={() => toggleReveal(f.key)}>
                              {revealed[f.key] ? <FaEyeSlash /> : <FaEye />}
                            </button>
                          )}
                        </div>
                        <span className="gh-hint">{f.hint}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* TEST CONNECTION */}
              <div className="gh-test-bar">
                <button type="button" className="gh-test-btn" onClick={handleTest} disabled={testStatus === 'testing'}>
                  <FaSync className={testStatus === 'testing' ? 'gh-spin' : ''} />
                  {testStatus === 'testing' ? 'Testing...' : 'Test Connection'}
                </button>
                {testStatus === 'success' && (
                  <span className="gh-test-result success"><FaCheckCircle /> Connected successfully</span>
                )}
                {testStatus === 'fail' && (
                  <span className="gh-test-result fail"><FaExclamationTriangle /> Connection failed — check your PAT</span>
                )}
              </div>

              <div className="at-actions">
                <button type="button" className="at-reset-btn" onClick={closeModal}>Cancel</button>
                <button type="submit" className="at-submit-btn">
                  <FaGithub /> {editingId ? 'Save Changes' : 'Save Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteId && (
        <div className="at-modal-overlay at-confirm-overlay">
          <div className="at-confirm-card">
            <h3>Delete this configuration?</h3>
            <p>All GitHub integration using this config will stop working. This cannot be undone.</p>
            <div className="at-confirm-actions">
              <button className="at-reset-btn" onClick={() => setDeleteId(null)}>Cancel</button>
              <button className="at-submit-btn at-danger-btn" onClick={handleDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}

    </AdminLayout>
    <Toast toasts={toasts} removeToast={removeToast} />
    </>
  );
}
