import React, { useEffect, useState } from 'react';
import { Settings, Key, Copy, Check, Trash2, Shield, Plus, Building } from 'lucide-react';
import { api } from '../services/api';

export const SettingsView: React.FC = () => {
  const [workspace, setWorkspace] = useState<any | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [newKeyName, setNewKeyName] = useState('');
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [ws, keys, logs] = await Promise.all([
        api.getWorkspace(),
        api.getApiKeys(),
        api.getTenantAuditLogs(),
      ]);
      setWorkspace(ws);
      setWorkspaceName(ws.name || '');
      setApiKeys(keys);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateWorkspace(workspaceName);
      alert('Workspace business name updated successfully.');
      loadSettings();
    } catch (e: any) {
      alert(e.message || 'Update failed');
    }
  };

  const handleCreateApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    try {
      const res = await api.createApiKey(newKeyName.trim());
      setNewlyCreatedKey(res);
      setNewKeyName('');
      loadSettings();
    } catch (e: any) {
      alert(e.message || 'Failed to create API key');
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    if (!confirm('Revoke and delete this API key immediately?')) return;
    try {
      await api.deleteApiKey(id);
      loadSettings();
    } catch (e: any) {
      alert(e.message || 'Revocation failed');
    }
  };

  const copyRawKey = () => {
    if (newlyCreatedKey?.raw_key) {
      navigator.clipboard.writeText(newlyCreatedKey.raw_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Workspace Settings & API Credentials</h2>
        <p className="text-xs text-slate-400">
          Manage organization identity, programmatic API keys, and security audit logs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workspace Profile */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2.5 mb-4">
            <Building className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-white">Workspace Profile</h3>
          </div>

          <form onSubmit={handleUpdateWorkspace} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Company / Workspace Name</label>
              <input
                type="text"
                required
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Workspace Slug (Immutable)</label>
              <input
                type="text"
                disabled
                value={workspace?.slug || ''}
                className="w-full bg-[#050b20]/60 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-500 font-mono"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              Update Workspace Profile
            </button>
          </form>
        </div>

        {/* API Keys */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <Key className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Programmatic API Keys</h3>
              </div>
            </div>

            {/* Create API Key Form */}
            <form onSubmit={handleCreateApiKey} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Key label (e.g. Backend Production)"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="flex-1 bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                className="cta-glow-button px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create Key</span>
              </button>
            </form>

            {/* Display Newly Created Key Alert */}
            {newlyCreatedKey && (
              <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs mb-4">
                <p className="text-teal-300 font-bold mb-1">Copy Your Secret API Key Now</p>
                <p className="text-[11px] text-slate-400 mb-2">This secret key will not be shown again.</p>
                <div className="flex items-center gap-2 bg-black/50 p-2 rounded-lg font-mono text-cyan-300 text-[11px]">
                  <span className="truncate flex-1">{newlyCreatedKey.raw_key}</span>
                  <button onClick={copyRawKey} className="text-slate-400 hover:text-white">
                    {copiedKey ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {/* Keys Table */}
            <div className="space-y-2">
              {apiKeys.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/20 text-center text-slate-500 text-xs">
                  No active API keys generated.
                </div>
              ) : (
                apiKeys.map((k) => (
                  <div
                    key={k.id}
                    className="p-3 rounded-xl bg-[#050b20] border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-bold text-white">{k.name}</span>
                      <span className="text-[11px] font-mono text-cyan-300 block">
                        {k.key_prefix}••••••••
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteApiKey(k.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400"
                      title="Revoke key"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <h3 className="text-sm font-black text-white mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Workspace Security Audit Trail</span>
        </h3>
        <div className="space-y-2 max-h-52 overflow-y-auto font-mono text-[11px]">
          {auditLogs.length === 0 ? (
            <div className="p-4 text-center text-slate-500">No security audit events recorded.</div>
          ) : (
            auditLogs.map((log) => (
              <div key={log.id} className="p-2 rounded-xl bg-[#050b20] border border-slate-800 flex justify-between">
                <div>
                  <span className="text-cyan-300 font-bold mr-2">[{log.action}]</span>
                  <span className="text-slate-300">{log.resource}</span>
                  {log.details && <span className="text-slate-500 ml-2">({log.details})</span>}
                </div>
                <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
