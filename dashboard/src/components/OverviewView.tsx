import React, { useEffect, useState } from 'react';
import {
  MessageSquare,
  Bot,
  UserCheck,
  Users,
  HelpCircle,
  TrendingUp,
  Cpu,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { api } from '../services/api';

export const OverviewView: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState(0);

  const cardThemes = [
    { name: 'Cyber Cyan', bg: 'from-cyan-900 via-slate-900 to-[#020d0c]', border: 'border-cyan-400/40', accent: '#38bdf8' },
    { name: 'Corporate Emerald', bg: 'from-emerald-950 via-teal-950 to-slate-950', border: 'border-emerald-400/40', accent: '#10b981' },
    { name: 'Private Black', bg: 'from-zinc-900 via-neutral-900 to-black', border: 'border-white/20', accent: '#f3dc64' },
    { name: 'Business Bronze', bg: 'from-amber-950 via-stone-900 to-slate-950', border: 'border-amber-500/40', accent: '#f59e0b' },
    { name: 'Prepaid Navy', bg: 'from-blue-950 via-indigo-950 to-slate-950', border: 'border-blue-400/40', accent: '#3b82f6' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await api.getAnalytics(30);
      setAnalytics(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: 'Total Conversations',
      value: analytics?.total_conversations ?? 0,
      change: '+14% this month',
      color: 'from-emerald-500/20 to-teal-500/5',
      border: 'border-emerald-500/30',
      icon: MessageSquare,
      iconColor: 'text-emerald-400',
    },
    {
      title: 'AI Resolution Rate',
      value: `${analytics?.bot_resolution_rate ?? 0}%`,
      change: 'Grounded without hallucination',
      color: 'from-cyan-500/20 to-blue-500/5',
      border: 'border-cyan-500/30',
      icon: Bot,
      iconColor: 'text-cyan-400',
    },
    {
      title: 'Human Handoffs',
      value: analytics?.human_handoffs ?? 0,
      change: 'Assigned to live agents',
      color: 'from-orange-500/20 to-amber-500/5',
      border: 'border-orange-500/30',
      icon: UserCheck,
      iconColor: 'text-orange-400',
    },
    {
      title: 'Captured Leads',
      value: analytics?.total_leads ?? 0,
      change: 'High-intent prospects',
      color: 'from-purple-500/20 to-indigo-500/5',
      border: 'border-purple-500/30',
      icon: Users,
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#07152b]/90 border border-white/10 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-widest">
            AUTONOMOUS SUPPORT ENGINE
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-0.5">
            Mission Operations & Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Real-time analytics, AI grounded precision, and multi-channel customer engagement.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-[#050b20] border border-slate-700 px-3.5 py-2 rounded-xl text-xs font-mono flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-slate-400">Tokens Consumed:</span>
            <span className="text-cyan-300 font-bold">
              {analytics?.current_month_tokens?.toLocaleString() ?? 0}
            </span>
          </div>
        </div>
      </div>

      {/* 4-Card Quick Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              className={`p-5 rounded-2xl bg-gradient-to-br ${c.color} border ${c.border} backdrop-blur-xl transition-all hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,0,0,0.4)]`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300">{c.title}</span>
                <div className={`p-2 rounded-xl bg-black/30 ${c.iconColor}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black font-mono text-white tracking-tight">
                {c.value}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{c.change}</p>
            </div>
          );
        })}
      </div>

      {/* Main Two-Column View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Activity Chart */}
        <div className="lg:col-span-2 bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-black text-white">Conversation & Ingestion Trajectory</h3>
              <p className="text-xs text-slate-400">Daily message volume and customer inquiries</p>
            </div>
            <span className="text-xs font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-800/50 px-2.5 py-1 rounded-lg">
              Last 7 Days
            </span>
          </div>

          <div className="h-[260px] w-full">
            {analytics?.daily_trends && analytics.daily_trends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.daily_trends}>
                  <defs>
                    <linearGradient id="colorMsgs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#169889" stopOpacity={0.6} />
                      <stop offset="95%" stopColor="#169889" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorConvs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#050b20',
                      borderColor: 'rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="messages"
                    name="Messages"
                    stroke="#169889"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorMsgs)"
                  />
                  <Area
                    type="monotone"
                    dataKey="conversations"
                    name="Conversations"
                    stroke="#38bdf8"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorConvs)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                No activity recorded yet
              </div>
            )}
          </div>
        </div>

        {/* Right Col: 3D Sovereign Security Card & Showcase */}
        <div className="space-y-4">
          <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-widest font-bold">
                SOVEREIGN KEY IDENTITY
              </span>
              <span className="text-[10px] font-mono text-emerald-400">256-BIT AES</span>
            </div>

            {/* 3D Bank Card Showcase */}
            <div
              className={`relative rounded-2xl p-5 border bg-gradient-to-br ${cardThemes[selectedTheme].bg} ${cardThemes[selectedTheme].border} shadow-[0_20px_45px_rgba(0,0,0,0.6)] overflow-hidden transition-all duration-300`}
              style={{ aspectRatio: '1.586 / 1' }}
            >
              {/* Metallic sheen overlay */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background:
                    'linear-gradient(115deg, rgba(255,255,255,.11), transparent 27%, transparent 72%, rgba(0,0,0,.28))',
                }}
              />

              <div className="flex justify-between items-start relative z-10">
                <span className="text-xs font-black text-white tracking-widest font-mono">SUPPORTPILOT</span>
                {/* Contactless waves symbol */}
                <div className="text-white/60 text-sm">
                  <span className="font-mono text-xs">)))</span>
                </div>
              </div>

              {/* Gold EMV Contact Chip */}
              <div
                className="w-9 h-7 rounded-md mt-4 relative z-10 shadow-md"
                style={{
                  background: 'linear-gradient(135deg, #f4e7b2, #ad8f46)',
                  border: '1px solid rgba(0,0,0,0.3)',
                }}
              />

              <div className="mt-4 relative z-10">
                <p className="font-mono text-xs text-slate-300 tracking-[0.18em]">
                  •••• •••• •••• 3400
                </p>
                <div className="flex justify-between items-end mt-2">
                  <div>
                    <span className="text-[8px] text-slate-400 uppercase font-mono">Workspace</span>
                    <p className="text-[11px] font-bold text-white uppercase">Demo Dental Clinic</p>
                  </div>
                  {/* Mastercard Dual Discs */}
                  <div className="flex -space-x-2">
                    <div className="w-5 h-5 rounded-full bg-[#ef342d] opacity-80" />
                    <div className="w-5 h-5 rounded-full bg-[#f6a51c] opacity-80 mix-blend-screen" />
                  </div>
                </div>
              </div>
            </div>

            {/* 5-Thumbnail Theme Switcher Bar */}
            <div className="flex items-center justify-between gap-1.5 mt-4 pt-3 border-t border-white/5">
              {cardThemes.map((t, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedTheme(idx)}
                  className={`h-5 flex-1 rounded-md transition-all ${
                    selectedTheme === idx
                      ? 'ring-2 ring-cyan-400 scale-105'
                      : 'opacity-50 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: t.accent }}
                  title={t.name}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
