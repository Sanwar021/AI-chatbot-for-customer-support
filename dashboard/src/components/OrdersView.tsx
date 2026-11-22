import React, { useEffect, useState } from 'react';
import { PackageSearch, ShieldCheck, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { api } from '../services/api';

export const OrdersView: React.FC = () => {
  const [endpointUrl, setEndpointUrl] = useState('https://example.com/api/orders');
  const [authHeader, setAuthHeader] = useState('');
  const [verificationField, setVerificationField] = useState('email');
  const [isActive, setIsActive] = useState(true);

  // Test Console
  const [testOrderId, setTestOrderId] = useState('ORD-9921');
  const [testVerifyVal, setTestVerifyVal] = useState('customer@example.com');
  const [testResult, setTestResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await api.getOrderConfig();
      if (cfg) {
        setEndpointUrl(cfg.endpoint_url || 'https://example.com/api/orders');
        setVerificationField(cfg.verification_field || 'email');
        setIsActive(cfg.is_active);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveOrderConfig({
        endpoint_url: endpointUrl,
        auth_header: authHeader,
        verification_field: verificationField,
        is_active: isActive,
      });
      alert('Order status connector configuration saved with SSRF validation.');
    } catch (e: any) {
      alert(e.message || 'Save failed');
    }
  };

  const handleTestLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTestResult(null);
    try {
      const res = await api.testOrderLookup(testOrderId, testVerifyVal);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'Lookup failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">Order Status Lookup Connector</h2>
        <p className="text-xs text-slate-400">
          Connect your business order API. The AI assistant safely queries order status for customers with verification.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint Configuration */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <PackageSearch className="w-4 h-4 text-cyan-400" />
              <span>External API Configuration</span>
            </h3>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> SSRF Shield Active
            </span>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Business API Endpoint URL</label>
              <input
                type="url"
                required
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://yourstore.com/api/orders/lookup"
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">
                Authorization Header (Encrypted at Rest)
              </label>
              <input
                type="password"
                value={authHeader}
                onChange={(e) => setAuthHeader(e.target.value)}
                placeholder="Bearer secret_api_token"
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold block mb-1">Customer Verification Field</label>
              <select
                value={verificationField}
                onChange={(e) => setVerificationField(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="email">Customer Email Address</option>
                <option value="phone">Customer Phone Number</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="orderActive"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded bg-[#050b20] border-slate-700 text-teal-600 focus:ring-0"
              />
              <label htmlFor="orderActive" className="text-xs text-slate-300 cursor-pointer font-medium">
                Enable Live Order Status Calling for AI Assistant
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white shadow-md hover:brightness-110"
            >
              Save Connector Settings
            </button>
          </form>
        </div>

        {/* Test Console */}
        <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-2">Test Order Lookup</h3>
            <p className="text-xs text-slate-400 mb-4">
              Simulate an order lookup query with security verification.
            </p>

            <form onSubmit={handleTestLookup} className="space-y-3 mb-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Order ID</label>
                <input
                  type="text"
                  required
                  value={testOrderId}
                  onChange={(e) => setTestOrderId(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">
                  Verification ({verificationField === 'email' ? 'Email' : 'Phone'})
                </label>
                <input
                  type="text"
                  required
                  value={testVerifyVal}
                  onChange={(e) => setTestVerifyVal(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-bold text-white flex items-center justify-center gap-2"
              >
                <span>{loading ? 'Executing Query...' : 'Execute Test Query'}</span>
                <ArrowRight className="w-3.5 h-3.5 text-cyan-300" />
              </button>
            </form>

            {testResult && (
              <div className="p-3.5 rounded-xl bg-[#050b20] border border-slate-800 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5 mb-2 font-bold">
                  {testResult.success ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Order Found
                    </span>
                  ) : (
                    <span className="text-rose-400 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5" /> Lookup Failed
                    </span>
                  )}
                </div>
                <pre className="overflow-x-auto text-[11px] text-slate-400 whitespace-pre-wrap">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
