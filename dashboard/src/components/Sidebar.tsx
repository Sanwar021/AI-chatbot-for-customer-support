import React from 'react';
import {
  LayoutDashboard,
  Bot,
  BookOpen,
  MessageSquare,
  Inbox,
  HelpCircle,
  Users,
  PlayCircle,
  Radio,
  PackageSearch,
  UserCheck,
  CreditCard,
  ShieldAlert,
  Settings,
  LogOut,
  Activity,
  Cpu,
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'bots'
  | 'knowledge'
  | 'conversations'
  | 'live-inbox'
  | 'unanswered'
  | 'leads'
  | 'playground'
  | 'channels'
  | 'orders'
  | 'team'
  | 'billing'
  | 'superadmin'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  user: any;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange, user, onLogout }) => {
  const isSuperAdmin = user?.role === 'superadmin';

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'bots', label: 'AI Chatbots', icon: Bot },
    { id: 'knowledge', label: 'Knowledge Base', icon: BookOpen },
    { id: 'conversations', label: 'Conversations', icon: MessageSquare },
    { id: 'live-inbox', label: 'Live Inbox', icon: Inbox, badge: 'Live' },
    { id: 'unanswered', label: 'Unanswered Qs', icon: HelpCircle },
    { id: 'leads', label: 'Captured Leads', icon: Users },
    { id: 'playground', label: 'AI Playground', icon: PlayCircle },
    { id: 'channels', label: 'Channels & Meta', icon: Radio },
    { id: 'orders', label: 'Order Lookup', icon: PackageSearch },
    { id: 'team', label: 'Team Members', icon: UserCheck },
    { id: 'billing', label: 'Usage & Billing', icon: CreditCard },
    ...(isSuperAdmin ? [{ id: 'superadmin', label: 'Super Admin', icon: ShieldAlert, badge: 'HQ' }] : []),
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#090b0c]/90 border-r border-white/10 flex flex-col justify-between p-4">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 px-2 py-3 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#087b6d] to-[#169889] flex items-center justify-center text-white font-black text-sm shadow-[0_0_15px_rgba(22,152,137,0.4)]">
            ◆
          </div>
          <div>
            <h1 className="text-sm font-black text-white tracking-tight leading-none">SupportPilot</h1>
            <span className="text-[10px] font-mono text-cyan-300 font-semibold tracking-wider">SOVEREIGN AI</span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id as NavTab)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-white/[0.08] to-transparent text-[#ff6819] border-l-2 border-[#ff6819]'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-[#ff6819]' : 'text-slate-500 group-hover:text-slate-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    item.badge === 'Live' ? 'bg-emerald-500/20 text-emerald-300 animate-pulse' : 'bg-cyan-500/20 text-cyan-300'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 24/7 Security Health Telemetry Card */}
      <div className="mt-4 pt-4 border-t border-white/5 space-y-3">
        <div className="rounded-xl p-3 bg-[#07152b]/80 border border-white/10 relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              AI Telemetry
            </span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">ACTIVE</span>
          </div>
          <div className="space-y-1 text-[11px] font-mono text-slate-300">
            <div className="flex justify-between">
              <span className="text-slate-500">Model:</span>
              <span className="text-cyan-300">Gemini/RAG</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vector Index:</span>
              <span className="text-emerald-300">768-dim</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">SSRF Guard:</span>
              <span className="text-slate-300">Enforced</span>
            </div>
          </div>
        </div>

        {/* User Card */}
        <div className="flex items-center justify-between px-2 py-1">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-lg bg-[#f3dc64] text-slate-900 font-black text-xs flex items-center justify-center flex-shrink-0">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || 'Admin'}</p>
              <p className="text-[10px] font-mono text-slate-400 truncate capitalize">{user?.role || 'Owner'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
