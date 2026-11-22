import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Search,
  User,
  Bot,
  UserCheck,
  Radio,
  Clock,
  CheckCircle,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { api } from '../services/api';

export const ConversationsView: React.FC = () => {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadConversations();
  }, [statusFilter, channelFilter]);

  const loadConversations = async () => {
    try {
      const data = await api.getConversations(statusFilter || undefined, channelFilter || undefined);
      setConversations(data);
      if (data.length > 0 && !selectedConv) {
        selectConversation(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv: any) => {
    setSelectedConv(conv);
    try {
      const msgList = await api.getMessages(conv.id);
      setMessages(msgList);
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = conversations.filter(
    (c) =>
      c.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_email?.toLowerCase().includes(search.toLowerCase()) ||
      c.last_message?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07152b]/90 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search by customer name, email, or text..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#050b20] border border-slate-700 rounded-xl pl-10 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="bot_active">Bot Active</option>
            <option value="waiting_agent">Waiting for Agent</option>
            <option value="with_agent">With Agent</option>
            <option value="resolved">Resolved</option>
          </select>

          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-medium focus:outline-none"
          >
            <option value="">All Channels</option>
            <option value="website">Website Widget</option>
            <option value="whatsapp">Meta WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Two-Column Chat History Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[640px]">
        {/* Left: List */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-y-auto backdrop-blur-xl divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No conversations matching criteria
            </div>
          ) : (
            filtered.map((c) => {
              const isSelected = selectedConv?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-teal-500/10 to-transparent border-l-4 border-teal-400'
                      : 'hover:bg-white/[0.03]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate max-w-[150px]">
                      {c.customer_name || 'Anonymous Visitor'}
                    </span>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-full font-bold ${
                        c.status === 'bot_active'
                          ? 'bg-cyan-500/20 text-cyan-300'
                          : c.status === 'waiting_agent'
                          ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                          : c.status === 'with_agent'
                          ? 'bg-purple-500/20 text-purple-300'
                          : 'bg-slate-500/20 text-slate-400'
                      }`}
                    >
                      {c.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 truncate mb-2">
                    {c.last_message || 'No messages yet'}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="capitalize flex items-center gap-1 text-slate-400">
                      <Radio className="w-3 h-3 text-cyan-400" /> {c.channel}
                    </span>
                    <span>{new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Message Stream */}
        <div className="lg:col-span-2 bg-[#07152b]/90 border border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/5 bg-[#050b20]/60 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>{selectedConv.customer_name || 'Anonymous Visitor'}</span>
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3 mt-0.5">
                    {selectedConv.customer_email && <span>{selectedConv.customer_email}</span>}
                    {selectedConv.customer_phone && <span>{selectedConv.customer_phone}</span>}
                    <span className="text-cyan-300">Channel: {selectedConv.channel}</span>
                  </div>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Total msgs: {messages.length}
                </span>
              </div>

              {/* Messages Body */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#020d0c]/80">
                {messages.map((m) => {
                  const isBot = m.sender_type === 'bot';
                  const isCustomer = m.sender_type === 'customer';
                  const isAgent = m.sender_type === 'agent';
                  const isSystem = m.sender_type === 'system';

                  let sources = [];
                  if (m.sources) {
                    try {
                      sources = JSON.parse(m.sources);
                    } catch (e) {}
                  }

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isCustomer ? 'items-end' : isSystem ? 'items-center' : 'items-start'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1 text-[10px] font-mono text-slate-500">
                        {isBot && <Bot className="w-3 h-3 text-cyan-400" />}
                        {isCustomer && <User className="w-3 h-3 text-teal-400" />}
                        {isAgent && <UserCheck className="w-3 h-3 text-purple-400" />}
                        <span className="capitalize">{m.sender_type}</span>
                        <span>•</span>
                        <span>{new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>

                      <div
                        className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                          isCustomer
                            ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white'
                            : isSystem
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 text-center text-[11px]'
                            : isAgent
                            ? 'bg-purple-950/80 border border-purple-500/30 text-purple-100'
                            : 'bg-[#07152b] border border-white/10 text-slate-200'
                        }`}
                      >
                        {m.content}

                        {/* Citation Sources Drawer */}
                        {sources && sources.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                            {sources.map((s: any, i: number) => (
                              <span
                                key={i}
                                className="text-[10px] font-mono bg-cyan-950/60 border border-cyan-800/60 text-cyan-300 px-2 py-0.5 rounded-md flex items-center gap-1"
                              >
                                <BookOpen className="w-3 h-3" />
                                <span>{s.source || s.title}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select a conversation to inspect message history
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
