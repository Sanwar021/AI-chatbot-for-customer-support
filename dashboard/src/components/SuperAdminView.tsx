import React, { useEffect, useState } from 'react';
import { ShieldAlert, Users, Bot, MessageSquare, Power, Search, Activity } from 'lucide-react';
import { api } from '../services/api';

export const SuperAdminView: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAdminData();
  }, []);

  const loadAdminData = async () => {
    try {
      const [m, tList, logs] = await Promise.all([
        api.getSuperadminMetrics(),
        api.getAllTenants(),
        api.getAuditLogs(),
      ]);
      setMetrics(m);
      setTenants(tList);
      setAuditLogs(logs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      await api.toggleTenantStatus(tenantId, !currentStatus);
      loadAdminData();
    } catch (e: any) {
      alert(e.message || 'Status toggle failed');
    }
  };

  const filteredTenants = tenants.filter((t) => t.name?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Super Admin Command Center</h2>
            <p className="text-xs text-slate-400">
              Platform-wide multi-tenant governance, billing status, and system audit telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Metrics */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#07152b]/90 border border-white/10 backdrop-blur-xl">
            <span className="text-[11px] text-slate-400 font-mono">Total Tenants</span>
            <span className="text-2xl font-black font-mono text-white mt-1 block">
              {metrics.total_tenants}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#07152b]/90 border border-white/10 backdrop-blur-xl">
            <span className="text-[11px] text-slate-400 font-mono">Platform Users</span>
            <span className="text-2xl font-black font-mono text-cyan-300 mt-1 block">
              {metrics.total_users}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#07152b]/90 border border-white/10 backdrop-blur-xl">
            <span className="text-[11px] text-slate-400 font-mono">Active Bot Instances</span>
            <span className="text-2xl font-black font-mono text-emerald-400 mt-1 block">
              {metrics.total_bots}
            </span>
          </div>
          <div className="p-4 rounded-2xl bg-[#07152b]/90 border border-white/10 backdrop-blur-xl">
            <span className="text-[11px] text-slate-400 font-mono">Estimated AI Cost</span>
            <span className="text-2xl font-black font-mono text-amber-400 mt-1 block">
              ${metrics.estimated_platform_cost_usd} USD
            </span>
          </div>
        </div>
      )}

      {/* Tenants Table */}
      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="p-4 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-black text-white">Registered Multi-Tenant Workspaces</h3>
          <input
            type="text"
            placeholder="Search workspaces..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <table className="w-full text-left text-xs">
          <thead className="bg-[#050b20]/60 text-slate-400 font-mono text-[11px] uppercase border-b border-white/5">
            <tr>
              <th className="py-3 px-4">Workspace Name</th>
              <th className="py-3 px-4">Slug</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4">Bots</th>
              <th className="py-3 px-4">Users</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {filteredTenants.map((t) => (
              <tr key={t.id} className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-4 font-bold text-white">{t.name}</td>
                <td className="py-3.5 px-4 font-mono text-cyan-300">{t.slug}</td>
                <td className="py-3.5 px-4 font-mono">{t.plan}</td>
                <td className="py-3.5 px-4 font-mono">{t.bots_count}</td>
                <td className="py-3.5 px-4 font-mono">{t.users_count}</td>
                <td className="py-3.5 px-4">
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      t.is_active ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}
                  >
                    {t.is_active ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(t.id, t.is_active)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      t.is_active
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {t.is_active ? 'Suspend' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Platform Audit Logs */}
      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl">
        <h3 className="text-sm font-black text-white mb-3">Platform Security Audit Stream</h3>
        <div className="space-y-2 max-h-56 overflow-y-auto font-mono text-[11px]">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-2.5 rounded-xl bg-[#050b20] border border-slate-800 flex justify-between">
              <div>
                <span className="text-cyan-300 font-bold mr-2">[{log.action}]</span>
                <span className="text-slate-300">{log.resource}</span>
                {log.details && <span className="text-slate-500 ml-2">({log.details})</span>}
              </div>
              <span className="text-slate-500">{new Date(log.created_at).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
