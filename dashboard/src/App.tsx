import React, { useState, useEffect } from 'react';
import { AuthView } from './components/AuthView';
import { Sidebar, NavTab } from './components/Sidebar';
import { OverviewView } from './components/OverviewView';
import { BotsView } from './components/BotsView';
import { KnowledgeView } from './components/KnowledgeView';
import { ConversationsView } from './components/ConversationsView';
import { LiveInboxView } from './components/LiveInboxView';
import { UnansweredView } from './components/UnansweredView';
import { LeadsView } from './components/LeadsView';
import { PlaygroundView } from './components/PlaygroundView';
import { ChannelsView } from './components/ChannelsView';
import { OrdersView } from './components/OrdersView';
import { TeamView } from './components/TeamView';
import { BillingView } from './components/BillingView';
import { SuperAdminView } from './components/SuperAdminView';
import { SettingsView } from './components/SettingsView';
import { getAuthToken, getStoredUser, removeAuthToken } from './services/api';

export const App: React.FC = () => {
  const [user, setUser] = useState<any | null>(null);
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    const storedUser = getStoredUser();
    if (token && storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    removeAuthToken();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020d0c] text-cyan-300 font-mono text-sm">
        Initializing Sovereign SupportPilot Environment...
      </div>
    );
  }

  if (!user) {
    return <AuthView onSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-3 sm:p-6 lg:p-8">
      {/* macOS-Style Sovereign Workstation Outer Frame */}
      <div
        className="w-full max-w-[1440px] h-[92vh] rounded-[32px] sm:rounded-[40px] bg-[#1d2329]/95 border border-[#343a3e] shadow-[0_30px_100px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden backdrop-blur-2xl relative"
      >
        {/* macOS-Style Window Header */}
        <div className="h-12 bg-[#171c21] border-b border-[#343a3e] px-6 flex items-center justify-between flex-shrink-0 select-none">
          {/* Traffic Light Dots with pulse animation */}
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full window-dot-red animate-window-light-sequence" />
            <div
              className="w-3.5 h-3.5 rounded-full window-dot-amber animate-window-light-sequence"
              style={{ animationDelay: '0.6s' }}
            />
            <div
              className="w-3.5 h-3.5 rounded-full window-dot-green animate-window-light-sequence"
              style={{ animationDelay: '1.2s' }}
            />
          </div>

          {/* Window Center Title */}
          <div className="text-[11px] font-mono font-bold text-slate-400 tracking-wider flex items-center gap-2">
            <span className="text-[#ff6819]">◆</span>
            <span className="text-white">SupportPilot Sovereign Workstation</span>
            <span className="text-slate-600">•</span>
            <span className="text-cyan-300">{user?.tenant_name || 'Demo Dental Clinic'}</span>
          </div>

          <div className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full">
            ● SECURE
          </div>
        </div>

        {/* Dashboard Main Workspace (Sidebar + Dynamic Tab Content) */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Navigation */}
          <Sidebar
            currentTab={currentTab}
            onTabChange={(tab) => setCurrentTab(tab)}
            user={user}
            onLogout={handleLogout}
          />

          {/* Center & Main Content Viewport */}
          <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-[#090b0c]/80">
            {currentTab === 'overview' && <OverviewView />}
            {currentTab === 'bots' && <BotsView />}
            {currentTab === 'knowledge' && <KnowledgeView />}
            {currentTab === 'conversations' && <ConversationsView />}
            {currentTab === 'live-inbox' && <LiveInboxView />}
            {currentTab === 'unanswered' && <UnansweredView />}
            {currentTab === 'leads' && <LeadsView />}
            {currentTab === 'playground' && <PlaygroundView />}
            {currentTab === 'channels' && <ChannelsView />}
            {currentTab === 'orders' && <OrdersView />}
            {currentTab === 'team' && <TeamView />}
            {currentTab === 'billing' && <BillingView />}
            {currentTab === 'superadmin' && <SuperAdminView />}
            {currentTab === 'settings' && <SettingsView />}
          </main>
        </div>
      </div>
    </div>
  );
};
