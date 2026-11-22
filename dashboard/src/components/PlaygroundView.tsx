import React, { useEffect, useState } from 'react';
import {
  PlayCircle,
  Bot,
  User,
  Send,
  BookOpen,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { api } from '../services/api';

export const PlaygroundView: React.FC = () => {
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBot, setSelectedBot] = useState<any | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputQuery, setInputQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeSources, setActiveSources] = useState<any[]>([]);

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    if (selectedBot) {
      resetSession();
    }
  }, [selectedBot]);

  const loadBots = async () => {
    try {
      const list = await api.getBots();
      setBots(list);
      if (list.length > 0) {
        setSelectedBot(list[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const resetSession = async () => {
    if (!selectedBot) return;
    try {
      const init = await api.initChat({ bot_key: selectedBot.public_key });
      setConversationId(init.conversation_id);
      setMessages([
        {
          sender: 'bot',
          text: init.welcome_message,
          sources: [],
          is_fallback: false,
        },
      ]);
      setActiveSources([]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || !selectedBot || !conversationId || isTyping) return;

    const query = inputQuery.trim();
    setInputQuery('');

    // Append user message
    setMessages((prev) => [
      ...prev,
      { sender: 'customer', text: query, sources: [] },
    ]);

    setIsTyping(true);

    try {
      const res = await api.sendMessage({
        bot_key: selectedBot.public_key,
        conversation_id: conversationId,
        query,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: res.text,
          sources: res.sources,
          is_fallback: res.is_fallback,
        },
      ]);

      if (res.sources && res.sources.length > 0) {
        setActiveSources(res.sources);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'bot',
          text: 'Error processing question: ' + (err.message || 'Server error'),
          sources: [],
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07152b]/90 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white">AI Grounding Playground</h2>
          <p className="text-xs text-slate-400">
            Interactive sandbox to test prompt adherence, citations, Bengali support, and fallback behavior.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedBot?.id || ''}
            onChange={(e) => {
              const b = bots.find((x) => x.id === e.target.value);
              setSelectedBot(b || null);
            }}
            className="bg-[#050b20] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          <button
            onClick={resetSession}
            className="px-3 py-2 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-300 hover:bg-white/[0.08] flex items-center gap-1.5"
            title="Clear and reset chat session"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Context</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Chat vs Source Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[640px]">
        {/* Chat Pane */}
        <div className="lg:col-span-2 bg-[#07152b]/90 border border-white/10 rounded-2xl flex flex-col justify-between overflow-hidden backdrop-blur-xl">
          {/* Chat Messages */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-[#020d0c]/80">
            {messages.map((m, idx) => {
              const isCustomer = m.sender === 'customer';
              return (
                <div key={idx} className={`flex flex-col ${isCustomer ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] font-mono text-slate-500">
                    {isCustomer ? <User className="w-3 h-3 text-teal-400" /> : <Bot className="w-3 h-3 text-cyan-400" />}
                    <span>{isCustomer ? 'You (Test User)' : selectedBot?.name || 'Bot'}</span>
                    {m.is_fallback && (
                      <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        FALLBACK
                      </span>
                    )}
                  </div>
                  <div
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      isCustomer
                        ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white'
                        : 'bg-[#07152b] border border-white/10 text-slate-200'
                    }`}
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="text-xs font-mono text-cyan-300 animate-pulse flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>RAG Engine querying vector database...</span>
              </div>
            )}
          </div>

          {/* Quick Prompts & Input */}
          <div className="p-3 bg-[#050b20] border-t border-white/10 space-y-2">
            <div className="flex gap-2 overflow-x-auto pb-1 text-[11px]">
              <button
                type="button"
                onClick={() => setInputQuery('What are your clinic opening hours?')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 whitespace-nowrap"
              >
                Hours Query (EN)
              </button>
              <button
                type="button"
                onClick={() => setInputQuery('আপনাদের ক্লিনিক শনিবার কখন খোলা থাকে?')}
                className="px-2.5 py-1 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 whitespace-nowrap"
              >
                সময়সূচি (বাংলা)
              </button>
              <button
                type="button"
                onClick={() => setInputQuery('How much does a routine cleaning cost?')}
                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 whitespace-nowrap"
              >
                Pricing Check
              </button>
              <button
                type="button"
                onClick={() => setInputQuery('What is your secret recipe for rocket fuel?')}
                className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 whitespace-nowrap"
              >
                Ungrounded Fallback Test
              </button>
            </div>

            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                placeholder="Ask bot in English or Bengali (বাংলা)..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                className="flex-1 bg-[#07152b] border border-slate-700 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isTyping}
                className="cta-glow-button px-5 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Pane: Source Inspector */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-5 overflow-y-auto backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white">Retrieved Citations</h3>
            </div>

            <div className="space-y-3">
              {activeSources.length === 0 ? (
                <div className="p-6 rounded-xl bg-black/20 text-center text-slate-500 text-xs">
                  Ask a question to inspect the exact knowledge base chunks retrieved by the vector index.
                </div>
              ) : (
                activeSources.map((src, i) => (
                  <div key={i} className="p-3.5 rounded-xl bg-[#050b20] border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-cyan-300 truncate max-w-[170px]">
                        {src.source || src.title}
                      </span>
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        Score: {src.score}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-3">
                      {src.content || 'Retrieved verified knowledge fact.'}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-white/5">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              <span>Grounded RAG active: AI is prohibited from inventing facts.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
