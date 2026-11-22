import React, { useEffect, useState } from 'react';
import { UserCheck, Plus, Trash2, Mail, Shield, CheckCircle } from 'lucide-react';
import { api, getStoredUser } from '../services/api';

export const TeamView: React.FC = () => {
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('agent');
  const [inviteResult, setInviteResult] = useState<any | null>(null);

  const currentUser = getStoredUser();
  const isOwner = currentUser?.role === 'owner' || currentUser?.role === 'superadmin';

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      const data = await api.getTeam();
      setTeam(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.inviteMember(inviteEmail, inviteRole);
      setInviteResult(res);
      setInviteEmail('');
      loadTeam();
    } catch (e: any) {
      alert(e.message || 'Invitation failed');
    }
  };

  const handleRoleChange = async (memberId: string, newRole: string) => {
    try {
      await api.updateRole(memberId, newRole);
      loadTeam();
    } catch (e: any) {
      alert(e.message || 'Role update failed');
    }
  };

  const handleRemove = async (memberId: string) => {
    if (!confirm('Remove this member from your workspace?')) return;
    try {
      await api.removeMember(memberId);
      loadTeam();
    } catch (e: any) {
      alert(e.message || 'Failed to remove member');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Team & Permissions</h2>
          <p className="text-xs text-slate-400">
            Manage agents, administrators, and workspace collaborators.
          </p>
        </div>

        <button
          onClick={() => {
            setInviteResult(null);
            setShowInviteModal(true);
          }}
          className="cta-glow-button px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#050b20]/60 text-slate-400 font-mono text-[11px] uppercase border-b border-white/5">
            <tr>
              <th className="py-3 px-4">Member Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Joined</th>
              {isOwner && <th className="py-3 px-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {team.map((m) => (
              <tr key={m.id} className="hover:bg-white/[0.02]">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#f3dc64] text-slate-900 font-bold flex items-center justify-center text-xs">
                    {m.full_name ? m.full_name[0] : 'U'}
                  </div>
                  <span>{m.full_name}</span>
                </td>
                <td className="py-3.5 px-4 font-mono text-cyan-300">{m.email}</td>
                <td className="py-3.5 px-4">
                  {isOwner && m.role !== 'owner' ? (
                    <select
                      value={m.role}
                      onChange={(e) => handleRoleChange(m.id, e.target.value)}
                      className="bg-[#050b20] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white capitalize"
                    >
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                      <option value="agent">Agent</option>
                    </select>
                  ) : (
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-white/5 text-slate-300 uppercase">
                      {m.role}
                    </span>
                  )}
                </td>
                <td className="py-3.5 px-4">
                  <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Active
                  </span>
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400">
                  {new Date(m.created_at).toLocaleDateString()}
                </td>
                {isOwner && (
                  <td className="py-3.5 px-4 text-right">
                    {m.id !== currentUser?.id && (
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="p-1 rounded-lg text-slate-500 hover:text-rose-400"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#07152b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Invite Team Member</h3>
            <p className="text-xs text-slate-400 mb-4">
              Add agents to answer live chats or administrators to manage bot configurations.
            </p>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Workspace Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="agent">Support Agent (Live inbox & customer replies)</option>
                  <option value="admin">Administrator (Bot & Knowledge configuration)</option>
                  <option value="owner">Workspace Owner (Full access & billing)</option>
                </select>
              </div>

              {inviteResult && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
                  <p className="font-bold">Member account provisioned!</p>
                  <p className="mt-1 font-mono text-[11px] text-slate-300">
                    Temporary password: <span className="text-cyan-300 font-bold">{inviteResult.temporary_password}</span>
                  </p>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Close
                </button>
                <button
                  type="submit"
                  className="cta-glow-button px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
