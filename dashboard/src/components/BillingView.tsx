import React, { useEffect, useState } from 'react';
import { CreditCard, Check, Zap, Sparkles, Shield, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const BillingView: React.FC = () => {
  const [status, setStatus] = useState<any | null>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBilling();
  }, []);

  const loadBilling = async () => {
    try {
      const [st, pList] = await Promise.all([api.getUsageStatus(), api.getPlans()]);
      setStatus(st);
      setPlans(pList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planName: string) => {
    try {
      await api.upgradePlan(planName);
      alert(`Workspace successfully upgraded to ${planName} plan!`);
      loadBilling();
    } catch (e: any) {
      alert(e.message || 'Upgrade failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Subscription & Usage Limits</h2>
        <p className="text-xs text-slate-400">
          Track message quota consumption, AI token burn, and upgrade subscription tiers.
        </p>
      </div>

      {/* Usage Meter Card */}
      {status && (
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <span className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">
                CURRENT ACTIVE TIER
              </span>
              <h3 className="text-2xl font-black text-white mt-0.5">{status.plan_name} Plan</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-xl">
                Status: {status.billing_status.toUpperCase()}
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2 mb-6">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-400">Monthly Message Quota:</span>
              <span className="text-white font-bold">
                {status.current_month_messages.toLocaleString()} / {status.max_messages_per_month.toLocaleString()} messages ({status.usage_percentage}%)
              </span>
            </div>
            <div className="h-3 w-full bg-[#050b20] rounded-full overflow-hidden border border-slate-700/50">
              <div
                className="h-full bg-gradient-to-r from-[#087b6d] to-[#169889] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, status.usage_percentage)}%` }}
              />
            </div>
          </div>

          {/* Usage Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-white/5 font-mono text-xs">
            <div className="p-3.5 rounded-xl bg-[#050b20] border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Chatbots Deployed</span>
              <span className="text-base font-bold text-white mt-1 block">
                {status.current_bots} / {status.max_bots} Bots
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050b20] border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Tokens Incurred</span>
              <span className="text-base font-bold text-cyan-300 mt-1 block">
                {status.current_month_tokens.toLocaleString()} Tokens
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-[#050b20] border border-slate-800">
              <span className="text-slate-500 block text-[11px]">Estimated AI Cost</span>
              <span className="text-base font-bold text-emerald-400 mt-1 block">
                ${status.estimated_cost_usd.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((p) => {
          const isCurrent = status?.plan_name === p.name;
          return (
            <div
              key={p.id}
              className={`rounded-2xl p-6 flex flex-col justify-between transition-all ${
                isCurrent
                  ? 'bg-[#07152b] border-2 border-teal-500 shadow-[0_10px_35px_rgba(8,123,109,0.3)]'
                  : 'bg-[#07152b]/80 border border-white/10 hover:border-white/20'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-white">{p.name}</h3>
                  {isCurrent && (
                    <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                      CURRENT
                    </span>
                  )}
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-black font-mono text-white">${p.price_cents / 100}</span>
                  <span className="text-xs text-slate-400 font-mono"> / month</span>
                </div>

                <ul className="space-y-3 text-xs text-slate-300 mb-8">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Up to {p.max_bots} Autonomous AI Bots</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>{p.max_messages_per_month.toLocaleString()} Messages / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Embeddable Website Chat Widget</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className={p.whatsapp_allowed ? 'text-emerald-400' : 'text-slate-600'} />
                    <span className={p.whatsapp_allowed ? 'text-slate-200' : 'text-slate-600'}>
                      Meta WhatsApp Cloud API
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Live Inbox & Human Agent Handoff</span>
                  </li>
                </ul>
              </div>

              <button
                disabled={isCurrent}
                onClick={() => handleUpgrade(p.name)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all ${
                  isCurrent
                    ? 'bg-white/5 text-slate-500 cursor-default'
                    : 'cta-glow-button text-white shadow-md'
                }`}
              >
                {isCurrent ? 'Active Plan' : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
