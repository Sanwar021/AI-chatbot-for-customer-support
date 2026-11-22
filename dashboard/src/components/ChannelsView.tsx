import React, { useEffect, useState } from 'react';
import {
  Radio,
  Globe,
  MessageCircle,
  Copy,
  Check,
  ExternalLink,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';
import { api } from '../services/api';

export const ChannelsView: React.FC = () => {
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState('');
  const [copied, setCopied] = useState(false);

  // WhatsApp Config
  const [phoneId, setPhoneId] = useState('');
  const [wabaId, setWabaId] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [verifyToken, setVerifyToken] = useState('supportpilot_demo_verify_token');
  const [displayPhone, setDisplayPhone] = useState('+1 (555) 321-4321');
  const [isWaActive, setIsWaActive] = useState(true);
  const [waConfig, setWaConfig] = useState<any | null>(null);

  // Mock Test State
  const [mockSender, setMockSender] = useState('8801700000000');
  const [mockName, setMockName] = useState('John Doe');
  const [mockMsg, setMockMsg] = useState('What are your opening hours on Saturday?');
  const [mockResult, setMockResult] = useState<any | null>(null);
  const [testingMock, setTestingMock] = useState(false);

  useEffect(() => {
    loadInitial();
  }, []);

  const loadInitial = async () => {
    try {
      const [bList, wa] = await Promise.all([api.getBots(), api.getWhatsAppConfig()]);
      setBots(bList);
      if (bList.length > 0) setSelectedBotId(bList[0].id);

      if (wa) {
        setWaConfig(wa);
        setPhoneId(wa.phone_number_id || '');
        setWabaId(wa.waba_id || '');
        setVerifyToken(wa.verify_token || 'supportpilot_demo_verify_token');
        setDisplayPhone(wa.display_phone_number || '');
        setIsWaActive(wa.is_active);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const currentBot = bots.find((b) => b.id === selectedBotId) || bots[0];
  const widgetSnippet = `<script\n  src="http://localhost:8000/uploads/widget.js"\n  data-bot-key="${currentBot?.public_key || 'sp_bot_key'}"\n  data-api-base="http://localhost:8000">\n</script>`;

  const copyScript = () => {
    navigator.clipboard.writeText(widgetSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBotId) return;

    try {
      const updated = await api.saveWhatsAppConfig({
        bot_id: selectedBotId,
        phone_number_id: phoneId,
        waba_id: wabaId,
        access_token: accessToken || 'mock_token_dev_environment',
        verify_token: verifyToken,
        display_phone_number: displayPhone,
        is_active: isWaActive,
      });
      setWaConfig(updated);
      alert('WhatsApp Cloud API configuration saved successfully with encryption at rest.');
    } catch (err: any) {
      alert(err.message || 'Failed to save configuration');
    }
  };

  const handleTestMockWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestingMock(true);
    setMockResult(null);

    try {
      const res = await api.testWhatsAppMock({
        sender_phone: mockSender,
        sender_name: mockName,
        message_text: mockMsg,
      });
      setMockResult(res);
    } catch (err: any) {
      alert(err.message || 'Test simulated webhook failed');
    } finally {
      setTestingMock(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Omnichannel Integrations</h2>
        <p className="text-xs text-slate-400">
          Deploy your AI assistant on your web properties and official Meta WhatsApp Cloud API.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel 1: Website Chat Widget */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-300 flex items-center justify-center font-bold">
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Embeddable Website Widget</h3>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">READY TO EMBED</span>
                </div>
              </div>

              <a
                href="http://localhost:8000/uploads/demo.html"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-cyan-300 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Preview Demo Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              Embed SupportPilot onto any HTML, WordPress, Shopify, Next.js, or Webflow site using a single isolated script tag.
            </p>

            <div className="space-y-2 mb-4">
              <label className="text-xs text-slate-400 font-bold block">Assigned Chatbot</label>
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
              >
                {bots.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.public_key})
                  </option>
                ))}
              </select>
            </div>

            <div className="relative bg-[#050b20] border border-slate-800 rounded-xl p-3.5 font-mono text-xs text-slate-300 mb-4">
              <pre className="overflow-x-auto whitespace-pre-wrap">{widgetSnippet}</pre>
            </div>
          </div>

          <button
            onClick={copyScript}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md hover:brightness-110"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Code Snippet Copied!' : 'Copy Embed Code'}</span>
          </button>
        </div>

        {/* Channel 2: Meta WhatsApp Cloud API */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Meta WhatsApp Cloud API</h3>
                <span className="text-[10px] font-mono text-cyan-300">Official Graph API v20.0</span>
              </div>
            </div>

            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> AES Encrypted At Rest
            </span>
          </div>

          <form onSubmit={handleSaveWhatsApp} className="space-y-3 mb-6">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Phone Number ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1009922883377"
                  value={phoneId}
                  onChange={(e) => setPhoneId(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Display Phone Number</label>
                <input
                  type="text"
                  placeholder="+1 (555) 321-4321"
                  value={displayPhone}
                  onChange={(e) => setDisplayPhone(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Permanent Access Token</label>
              <input
                type="password"
                placeholder={waConfig ? '••••••••••••••••••••••••' : 'Meta System User Token'}
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Webhook Verify Token</label>
              <input
                type="text"
                required
                value={verifyToken}
                onChange={(e) => setVerifyToken(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-[#050b20] border border-slate-800 text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 block">META WEBHOOK URL:</span>
              <span className="text-cyan-300 break-all">http://localhost:8000/api/v1/whatsapp/webhook</span>
            </div>

            <button
              type="submit"
              className="w-full py-2 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              Save WhatsApp Configuration
            </button>
          </form>

          {/* Mock Webhook Simulator */}
          <div className="pt-4 border-t border-white/5 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Incoming WhatsApp Message (Testing Harness)</span>
            </h4>

            <form onSubmit={handleTestMockWhatsApp} className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Sender Phone"
                  value={mockSender}
                  onChange={(e) => setMockSender(e.target.value)}
                  className="bg-[#050b20] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Customer Name"
                  value={mockName}
                  onChange={(e) => setMockName(e.target.value)}
                  className="bg-[#050b20] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white"
                />
              </div>
              <input
                type="text"
                placeholder="Inquiry message text"
                value={mockMsg}
                onChange={(e) => setMockMsg(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="submit"
                disabled={testingMock}
                className="w-full py-1.5 rounded-lg border border-teal-500/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-300 text-xs font-bold"
              >
                {testingMock ? 'Processing through RAG Pipeline...' : 'Dispatch Simulated WhatsApp Webhook'}
              </button>
            </form>

            {mockResult && (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                ✅ {mockResult.detail} View in Conversations tab under channel 'whatsapp'.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
