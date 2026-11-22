import React, { useEffect, useState } from 'react';
import { Users, Download, Search, Mail, Phone, Calendar, Tag } from 'lucide-react';
import { api } from '../services/api';

export const LeadsView: React.FC = () => {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadLeads();
  }, []);

  const loadLeads = async () => {
    try {
      const data = await api.getLeads();
      setLeads(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filtered = leads.filter(
    (l) =>
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.email?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.source?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">Captured Customer Leads</h2>
          <p className="text-xs text-slate-400">
            Prospects captured via pre-chat forms and conversations with high buying intent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-[#050b20] border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          <a
            href={api.exportLeadsCsvUrl()}
            target="_blank"
            rel="noreferrer"
            className="cta-glow-button px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 shadow-md"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </a>
        </div>
      </div>

      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#050b20]/60 text-slate-400 font-mono text-[11px] uppercase border-b border-white/5">
            <tr>
              <th className="py-3 px-4">Contact Name</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Phone</th>
              <th className="py-3 px-4">Capture Source</th>
              <th className="py-3 px-4">Date Captured</th>
              <th className="py-3 px-4">Notes / Intent</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-500">
                  No customer leads captured yet. Enable the Pre-Chat Form on your bot to begin capturing leads.
                </td>
              </tr>
            ) : (
              filtered.map((lead) => (
                <tr key={lead.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-teal-500/20 text-teal-300 font-mono flex items-center justify-center text-xs">
                      {lead.name ? lead.name[0] : 'L'}
                    </div>
                    <span>{lead.name || 'Anonymous Prospect'}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-300">
                    {lead.email ? (
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lead.email}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-300">
                    {lead.phone ? (
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{lead.phone}</span>
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 uppercase">
                      {lead.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                    {lead.notes || 'Captured via widget'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
