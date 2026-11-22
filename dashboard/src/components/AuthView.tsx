import React, { useState } from 'react';
import { Shield, Lock, Delete, ArrowRight, Sparkles, Building, User, Mail, Key } from 'lucide-react';
import { api, setAuthToken, setStoredUser } from '../services/api';

interface AuthViewProps {
  onSuccess: (user: any) => void;
}

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess }) => {
  const [authMode, setAuthMode] = useState<'passkey' | 'password' | 'register'>('passkey');
  const [passkey, setPasskey] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Handle Passkey Digit Clicks
  const handleDigit = (digit: string) => {
    if (passkey.length < 4) {
      const nextPin = passkey + digit;
      setPasskey(nextPin);
      setError('');
      if (nextPin.length === 4) {
        submitPasskey(nextPin);
      }
    }
  };

  const handleClear = () => {
    setPasskey('');
    setError('');
  };

  const handleBackspace = () => {
    setPasskey((prev) => prev.slice(0, -1));
    setError('');
  };

  const submitPasskey = async (pin: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.passkeyLogin(pin);
      setAuthToken(res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Invalid security passkey PIN');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.login({ email, password });
      setAuthToken(res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await api.register({
        workspace_name: workspaceName,
        full_name: fullName,
        email,
        password,
      });
      setAuthToken(res.access_token);
      setStoredUser(res.user);
      onSuccess(res.user);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] rounded-[30px] bg-[#07152b]/90 border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-2xl p-8 relative overflow-hidden">
        {/* Glow light cone */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Mode Selector */}
        <div className="flex bg-[#050b20]/80 p-1 rounded-xl mb-6 border border-slate-700/60">
          <button
            onClick={() => { setAuthMode('passkey'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              authMode === 'passkey' ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Passkey PIN
          </button>
          <button
            onClick={() => { setAuthMode('password'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              authMode === 'password' ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => { setAuthMode('register'); setError(''); }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              authMode === 'register' ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Register
          </button>
        </div>

        {authMode === 'passkey' ? (
          <div>
            {/* Lock Badge */}
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-2xl border border-emerald-300/20 bg-gradient-to-br from-emerald-400/20 to-cyan-500/5 flex items-center justify-center text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]">
                <Lock className="w-6 h-6" />
              </div>
            </div>

            <div className="text-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300 block mb-1">
                SUPPORTPILOT SOVEREIGN AI
              </span>
              <h2 className="text-2xl font-black text-white tracking-tight">Enter your secure passkey</h2>
              <p className="text-xs text-slate-400 mt-1">
                Default Demo Passkey: <span className="font-mono text-cyan-300 font-bold">3400</span> (Instant PIN)
              </p>
            </div>

            {/* PIN Dots Input Display */}
            <div className="h-16 rounded-2xl bg-[#050b20]/80 border border-slate-600/70 flex items-center justify-center font-mono text-2xl font-black tracking-[.75em] text-white mb-6 shadow-inner">
              {passkey
                ? '•'.repeat(passkey.length) + '·'.repeat(4 - passkey.length)
                : '····'}
            </div>

            {error && (
              <div className="mb-4 text-xs text-rose-400 text-center font-semibold bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            {/* 3x4 Keypad Grid */}
            <div className="grid grid-cols-3 gap-2.5 mb-6">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  onClick={() => handleDigit(digit)}
                  className="h-12 rounded-xl border border-white/10 bg-white/[.045] font-black text-slate-200 text-base active:scale-95 hover:border-emerald-300/40 hover:bg-emerald-400/10 transition-all flex items-center justify-center"
                >
                  {digit}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="h-12 rounded-xl border border-white/10 bg-white/[.045] font-bold text-rose-400 text-xs active:scale-95 hover:bg-rose-500/10 transition-all flex items-center justify-center"
              >
                Clear
              </button>
              <button
                onClick={() => handleDigit('0')}
                className="h-12 rounded-xl border border-white/10 bg-white/[.045] font-black text-slate-200 text-base active:scale-95 hover:border-emerald-300/40 hover:bg-emerald-400/10 transition-all flex items-center justify-center"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-12 rounded-xl border border-white/10 bg-white/[.045] font-black text-slate-200 active:scale-95 hover:bg-white/10 transition-all flex items-center justify-center"
              >
                <Delete className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            <button
              onClick={() => submitPasskey(passkey)}
              disabled={passkey.length !== 4 || loading}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-[#087b6d] to-[#169889] font-black text-sm text-white shadow-[0_14px_35px_rgba(8,123,109,.25)] hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Unlock SupportPilot Workspace →'}
            </button>
          </div>
        ) : authMode === 'password' ? (
          <form onSubmit={handlePasswordLogin}>
            <div className="text-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300 block mb-1">
                SECURE CREDENTIAL LOGIN
              </span>
              <h2 className="text-2xl font-black text-white">Sign In to Workspace</h2>
              <p className="text-xs text-slate-400 mt-1">Demo email: demo@supportpilot.ai / password123</p>
            </div>

            {error && (
              <div className="mb-4 text-xs text-rose-400 text-center font-semibold bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="space-y-4 mb-6">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-2xl bg-gradient-to-r from-[#087b6d] to-[#169889] font-black text-sm text-white shadow-[0_14px_35px_rgba(8,123,109,.25)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="text-center mb-6">
              <span className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300 block mb-1">
                CREATE BUSINESS WORKSPACE
              </span>
              <h2 className="text-2xl font-black text-white">Get Started with SupportPilot</h2>
            </div>

            {error && (
              <div className="mb-4 text-xs text-rose-400 text-center font-semibold bg-rose-500/10 py-2 rounded-xl border border-rose-500/20">
                {error}
              </div>
            )}

            <div className="space-y-3.5 mb-6">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Workspace / Company Name</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={workspaceName}
                    onChange={(e) => setWorkspaceName(e.target.value)}
                    placeholder="e.g. Acme Health Clinic"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Your Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Dr. John Watson"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@acme.com"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Password</label>
                <div className="relative">
                  <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full bg-[#050b20]/80 border border-slate-700/80 rounded-xl py-2 pl-10 pr-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-[50px] rounded-2xl bg-gradient-to-r from-[#087b6d] to-[#169889] font-black text-sm text-white shadow-[0_14px_35px_rgba(8,123,109,.25)] hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? 'Creating Workspace...' : 'Create Account & Workspace →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
