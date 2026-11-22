import React, { useEffect, useState } from 'react';
import { Bot, Plus, Trash2, Edit3, Copy, Check, ExternalLink, Settings, Sparkles } from 'lucide-react';
import { api } from '../services/api';

export const BotsView: React.FC = () => {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBot, setEditingBot] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('multi');
  const [primaryColor, setPrimaryColor] = useState('#087b6d');
  const [position, setPosition] = useState('bottom-right');
  const [welcomeMessage, setWelcomeMessage] = useState('Hello! How can I help you today? | আসসালামু আলাইকুম! আমি কীভাবে সাহায্য করতে পারি?');
  const [fallbackMessage, setFallbackMessage] = useState('I am sorry, but I do not have that specific information in my official records. Would you like to connect with a human agent?');
  const [systemPrompt, setSystemPrompt] = useState('You are an expert customer concierge. Only provide truthful, grounded facts from the approved knowledge base.');
  const [questionsStr, setQuestionsStr] = useState('What are your opening hours?\nWhat services do you provide?\nHow can I book an appointment?');
  const [preChatEnabled, setPreChatEnabled] = useState(true);

  useEffect(() => {
    loadBots();
  }, []);

  const loadBots = async () => {
    try {
      const data = await api.getBots();
      setBots(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingBot(null);
    setName('');
    setLanguage('multi');
    setPrimaryColor('#087b6d');
    setPosition('bottom-right');
    setWelcomeMessage('Hello! How can I help you today? | আসসালামু আলাইকুম! আমি কীভাবে সাহায্য করতে পারি?');
    setFallbackMessage('I am sorry, but I do not have that specific information in my official records. Would you like to connect with a human agent?');
    setSystemPrompt('You are an expert customer concierge. Only provide truthful, grounded facts from the approved knowledge base.');
    setQuestionsStr('What are your opening hours?\nWhat services do you provide?\nHow can I book an appointment?');
    setPreChatEnabled(true);
    setShowModal(true);
  };

  const handleOpenEdit = (b: any) => {
    setEditingBot(b);
    setName(b.name);
    setLanguage(b.language);
    setPrimaryColor(b.settings?.primary_color || '#087b6d');
    setPosition(b.settings?.position || 'bottom-right');
    setWelcomeMessage(b.settings?.welcome_message || '');
    setFallbackMessage(b.settings?.fallback_message || '');
    setSystemPrompt(b.settings?.system_prompt || '');
    setQuestionsStr((b.settings?.suggested_questions || []).join('\n'));
    setPreChatEnabled(b.settings?.pre_chat_form_enabled ?? true);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const suggestedList = questionsStr.split('\n').map((s) => s.trim()).filter(Boolean);

    const payload = {
      name,
      language,
      settings: {
        primary_color: primaryColor,
        position,
        welcome_message: welcomeMessage,
        fallback_message: fallbackMessage,
        system_prompt: systemPrompt,
        suggested_questions: suggestedList,
        pre_chat_form_enabled: preChatEnabled,
      },
    };

    try {
      if (editingBot) {
        await api.updateBot(editingBot.id, payload);
      } else {
        await api.createBot(payload);
      }
      setShowModal(false);
      loadBots();
    } catch (err: any) {
      alert(err.message || 'Operation failed');
    }
  };

  const handleDelete = async (botId: string) => {
    if (!confirm('Are you sure you want to delete this bot and all its vector knowledge?')) return;
    try {
      await api.deleteBot(botId);
      loadBots();
    } catch (err: any) {
      alert(err.message || 'Failed to delete bot');
    }
  };

  const copyEmbedSnippet = (publicKey: string) => {
    const code = `<script\n  src="http://localhost:8000/uploads/widget.js"\n  data-bot-key="${publicKey}"\n  data-api-base="http://localhost:8000">\n</script>`;
    navigator.clipboard.writeText(code);
    setCopiedKey(publicKey);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">AI Chatbot Fleet</h2>
          <p className="text-xs text-slate-400">Configure persona, grounded instructions, colors, and embed keys</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="cta-glow-button px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Deploy New Bot</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bots.map((b) => (
          <div key={b.id} className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between transition-all hover:border-cyan-500/30">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-md"
                    style={{ backgroundColor: b.settings?.primary_color || '#087b6d' }}
                  >
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">{b.name}</h3>
                    <span className="text-[10px] font-mono text-cyan-300">
                      Lang: {b.language.toUpperCase()} • {b.is_active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(b)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
                    title="Edit bot settings"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                    title="Delete bot"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs text-slate-400 bg-[#050b20] p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between">
                  <span>Welcome:</span>
                  <span className="text-slate-200 truncate max-w-[170px]" title={b.settings?.welcome_message}>
                    {b.settings?.welcome_message}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span className="text-cyan-300 capitalize">{b.settings?.position}</span>
                </div>
                <div className="flex justify-between">
                  <span>Pre-Chat Lead Form:</span>
                  <span className={b.settings?.pre_chat_form_enabled ? 'text-emerald-400' : 'text-slate-500'}>
                    {b.settings?.pre_chat_form_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </div>
              </div>

              {/* Public Bot Key */}
              <div className="mt-4">
                <span className="text-[10px] font-mono text-slate-500 block mb-1">PUBLIC EMBED KEY</span>
                <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-lg px-2.5 py-1.5 font-mono text-[11px] text-cyan-300">
                  <span className="truncate flex-1">{b.public_key}</span>
                  <button
                    onClick={() => copyEmbedSnippet(b.public_key)}
                    className="text-slate-400 hover:text-white"
                    title="Copy 1-line script tag snippet"
                  >
                    {copiedKey === b.public_key ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-white/5 flex gap-2">
              <button
                onClick={() => copyEmbedSnippet(b.public_key)}
                className="flex-1 py-1.5 rounded-xl border border-white/10 bg-white/[0.04] text-xs font-bold text-slate-200 hover:bg-white/[0.08] flex items-center justify-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedKey === b.public_key ? 'Copied Tag!' : 'Copy Script Tag'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-[#07152b] border border-white/10 rounded-2xl p-6 shadow-2xl relative my-8">
            <h3 className="text-lg font-black text-white mb-1">
              {editingBot ? 'Edit Chatbot Configuration' : 'Create New AI Chatbot'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Customize tone, instructions, colors, and suggested conversation starters.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Bot Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. DentalCare Assistant"
                    className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Primary Language</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="multi">Multilingual (English & Bengali)</option>
                    <option value="en">English Only</option>
                    <option value="bn">Bengali (বাংলা) Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Primary Theme Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-9 h-8 bg-transparent rounded cursor-pointer border-0"
                    />
                    <input
                      type="text"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 font-bold block mb-1">Widget Screen Position</label>
                  <select
                    value={position}
                    onChange={(e) => setPosition(e.target.value)}
                    className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Welcome Message</label>
                <textarea
                  rows={2}
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Strict Fallback Message (When knowledge is missing)</label>
                <textarea
                  rows={2}
                  value={fallbackMessage}
                  onChange={(e) => setFallbackMessage(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">System Instructions / Tone Guidance</label>
                <textarea
                  rows={2}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Suggested Questions (One per line)</label>
                <textarea
                  rows={3}
                  value={questionsStr}
                  onChange={(e) => setQuestionsStr(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="preChatToggle"
                  checked={preChatEnabled}
                  onChange={(e) => setPreChatEnabled(e.target.checked)}
                  className="rounded bg-[#050b20] border-slate-700 text-teal-600 focus:ring-0"
                />
                <label htmlFor="preChatToggle" className="text-xs text-slate-300 font-medium cursor-pointer">
                  Enable Pre-Chat Lead Capture Form (Collect Name, Email & Phone)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-glow-button px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md"
                >
                  {editingBot ? 'Save Changes' : 'Create Chatbot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
