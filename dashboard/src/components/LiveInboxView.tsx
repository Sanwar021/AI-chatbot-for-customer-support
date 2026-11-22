import React, { useEffect, useRef, useState } from 'react';
import {
  Inbox,
  User,
  Radio,
  Send,
  RotateCcw,
  CheckCircle,
  AlertTriangle,
  Bot,
  UserCheck,
  Sparkles,
} from 'lucide-react';
import { api, getAuthToken } from '../services/api';

export const LiveInboxView: React.FC = () => {
  const [waitingConvs, setWaitingConvs] = useState<any[]>([]);
  const [activeConvs, setActiveConvs] = useState<any[]>([]);
  const [selectedConv, setSelectedConv] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [replyText, setReplyText] = useState('');
  const [wsConnected, setWsConnected] = useState(false);
  const [sending, setSending] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    loadQueues();
    initWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedConv) {
      loadMessages(selectedConv.id);
    }
  }, [selectedConv]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadQueues = async () => {
    try {
      const [waiting, active] = await Promise.all([
        api.getConversations('waiting_agent'),
        api.getConversations('with_agent'),
      ]);
      setWaitingConvs(waiting);
      setActiveConvs(active);

      // If nothing selected, select first waiting or active
      if (!selectedConv) {
        if (waiting.length > 0) setSelectedConv(waiting[0]);
        else if (active.length > 0) setSelectedConv(active[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const loadMessages = async (convId: string) => {
    try {
      const msgList = await api.getMessages(convId);
      setMessages(msgList);
    } catch (e) {
      console.error(e);
    }
  };

  const initWebSocket = () => {
    const token = getAuthToken();
    if (!token) return;

    const wsUrl = `ws://localhost:8000/api/v1/ws/live-inbox?token=${token}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        // Refresh queues and current conversation on real-time event
        loadQueues();
        if (selectedConv && (payload.conversation_id === selectedConv.id || payload.event === 'new_customer_message')) {
          loadMessages(selectedConv.id);
        }
      } catch (e) {}
    };

    ws.onclose = () => {
      setWsConnected(false);
      // Attempt reconnect after 3 seconds
      setTimeout(initWebSocket, 3000);
    };
  };

  const handleClaim = async (convId: string) => {
    try {
      await api.assignConversation(convId);
      await loadQueues();
      const updatedConv = [...waitingConvs, ...activeConvs].find((c) => c.id === convId);
      if (updatedConv) setSelectedConv({ ...updatedConv, status: 'with_agent' });
    } catch (e: any) {
      alert(e.message || 'Claim failed');
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedConv || sending) return;

    const text = replyText.trim();
    setReplyText('');
    setSending(true);

    try {
      await api.sendAgentReply(selectedConv.id, text);
      await loadMessages(selectedConv.id);
      loadQueues();
    } catch (e: any) {
      alert(e.message || 'Failed to send reply');
    } finally {
      setSending(false);
    }
  };

  const handleReturnToBot = async () => {
    if (!selectedConv) return;
    try {
      await api.returnToBot(selectedConv.id);
      setSelectedConv(null);
      await loadQueues();
    } catch (e: any) {
      alert(e.message || 'Failed to return to bot');
    }
  };

  const handleResolve = async () => {
    if (!selectedConv) return;
    try {
      await api.resolveConversation(selectedConv.id);
      setSelectedConv(null);
      await loadQueues();
    } catch (e: any) {
      alert(e.message || 'Failed to resolve conversation');
    }
  };

  return (
    <div className="space-y-4">
      {/* Real-time Header */}
      <div className="flex items-center justify-between bg-[#07152b]/90 border border-white/10 p-4 rounded-2xl backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/20 text-[#ff6819] border border-orange-500/30">
            <Inbox className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">Live Customer Inbox</h2>
            <p className="text-xs text-slate-400">Real-time human-in-the-loop support & customer handoff console</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-400 animate-ping' : 'bg-rose-500'}`} />
          <span className="text-xs font-mono text-slate-300">
            {wsConnected ? 'Live WebSocket Connected' : 'Connecting WebSocket...'}
          </span>
        </div>
      </div>

      {/* Main Inbox Viewport */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[640px]">
        {/* Left Col: Queues */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-4 overflow-y-auto backdrop-blur-xl space-y-6">
          {/* Waiting Queue */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Waiting for Agent ({waitingConvs.length})
              </span>
            </div>

            <div className="space-y-2">
              {waitingConvs.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/20 text-center text-slate-500 text-xs">
                  No urgent handoff requests
                </div>
              ) : (
                waitingConvs.map((c) => {
                  const isSelected = selectedConv?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConv(c)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-rose-500/10 border-rose-500/50'
                          : 'bg-[#050b20] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{c.customer_name || 'Visitor'}</span>
                        <span className="text-[10px] font-mono text-cyan-300">{c.channel}</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mb-2">{c.last_message}</p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClaim(c.id);
                        }}
                        className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-black shadow-sm"
                      >
                        Accept & Take Over
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Active Queue */}
          <div>
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5" />
                In Progress with Agent ({activeConvs.length})
              </span>
            </div>

            <div className="space-y-2">
              {activeConvs.length === 0 ? (
                <div className="p-4 rounded-xl bg-black/20 text-center text-slate-500 text-xs">
                  No active agent chats
                </div>
              ) : (
                activeConvs.map((c) => {
                  const isSelected = selectedConv?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedConv(c)}
                      className={`p-3 rounded-xl cursor-pointer border transition-all ${
                        isSelected
                          ? 'bg-purple-500/10 border-purple-500/50'
                          : 'bg-[#050b20] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-white truncate">{c.customer_name || 'Visitor'}</span>
                        <span className="text-[10px] font-mono text-purple-300">With Agent</span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">{c.last_message}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right 2 Cols: Live Interaction Pane */}
        <div className="lg:col-span-2 bg-[#07152b]/90 border border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-white/10 bg-[#050b20]/80 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span>{selectedConv.customer_name || 'Anonymous Visitor'}</span>
                  </h3>
                  <div className="text-[11px] font-mono text-slate-400 flex items-center gap-3 mt-0.5">
                    <span className="text-cyan-300">Channel: {selectedConv.channel}</span>
                    <span>Status: {selectedConv.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleReturnToBot}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-300 hover:bg-white/[0.08] flex items-center gap-1.5"
                    title="Hand conversation back to automated AI assistant"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Return to Bot</span>
                  </button>
                  <button
                    onClick={handleResolve}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600/80 hover:bg-emerald-600 text-xs font-bold text-white flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Resolve</span>
                  </button>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#020d0c]/80">
                {messages.map((m) => {
                  const isCustomer = m.sender_type === 'customer';
                  const isAgent = m.sender_type === 'agent';
                  const isBot = m.sender_type === 'bot';
                  const isSystem = m.sender_type === 'system';

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${
                        isAgent ? 'items-end' : isSystem ? 'items-center' : 'items-start'
                      }`}
                    >
                      <div className="text-[10px] font-mono text-slate-500 mb-1 px-1">
                        <span className="capitalize">{m.sender_type}</span> •{' '}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      <div
                        className={`p-3.5 rounded-2xl max-w-[80%] text-xs leading-relaxed ${
                          isAgent
                            ? 'bg-purple-600 text-white shadow-md'
                            : isCustomer
                            ? 'bg-teal-700 text-white'
                            : isSystem
                            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300 text-center text-[11px]'
                            : 'bg-[#07152b] border border-white/10 text-slate-200'
                        }`}
                      >
                        {m.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Footer */}
              <form onSubmit={handleSendReply} className="p-3 bg-[#050b20] border-t border-white/10 flex gap-2">
                <input
                  type="text"
                  placeholder="Type human agent reply to customer..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#07152b] border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || sending}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send</span>
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-500 text-xs">
              Select an inquiry from the queue to start real-time messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
