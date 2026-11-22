import React, { useEffect, useState } from 'react';
import { HelpCircle, Plus, CheckCircle, Trash2, BookOpen, AlertCircle } from 'lucide-react';
import { api } from '../services/api';

export const UnansweredView: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');

  useEffect(() => {
    loadUnanswered();
  }, []);

  const loadUnanswered = async () => {
    try {
      const data = await api.getUnanswered();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPromote = (item: any) => {
    setSelectedItem(item);
    setFaqAnswer('');
    setFaqCategory('General');
    setShowFaqModal(true);
  };

  const handlePromoteToFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem || !faqAnswer.trim()) return;

    try {
      await api.addToFaq(selectedItem.id, faqAnswer, faqCategory);
      setShowFaqModal(false);
      loadUnanswered();
    } catch (e: any) {
      alert(e.message || 'Failed to add to FAQ');
    }
  };

  const handleDismiss = async (id: string) => {
    try {
      await api.dismissUnanswered(id);
      loadUnanswered();
    } catch (e: any) {
      alert(e.message || 'Failed to dismiss');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this unanswered question?')) return;
    try {
      await api.deleteUnanswered(id);
      loadUnanswered();
    } catch (e: any) {
      alert(e.message || 'Failed to delete');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-white">Unanswered Customer Questions</h2>
          <p className="text-xs text-slate-400">
            Queries where the AI could not find sufficient approved facts. Promote them directly to your FAQ base.
          </p>
        </div>
        <span className="text-xs font-mono text-cyan-300 bg-cyan-950/60 border border-cyan-800/60 px-3 py-1 rounded-xl">
          {items.length} Questions Flagged
        </span>
      </div>

      <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#050b20]/60 text-slate-400 font-mono text-[11px] uppercase border-b border-white/5">
            <tr>
              <th className="py-3 px-4">Customer Question</th>
              <th className="py-3 px-4">Frequency</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Last Asked</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 text-slate-200">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-500">
                  No unanswered questions recorded. Your knowledge base is answering queries effectively!
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3.5 px-4 font-medium max-w-md">
                    <p className="text-white">{item.question}</p>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-cyan-300 font-bold">
                    {item.frequency}x
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        item.status === 'added_to_faq'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : item.status === 'dismissed'
                          ? 'bg-slate-500/20 text-slate-400'
                          : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {item.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-400">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-2">
                    {item.status !== 'added_to_faq' && (
                      <button
                        onClick={() => handleOpenPromote(item)}
                        className="px-2.5 py-1 rounded-lg bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 text-[11px] font-bold border border-teal-500/30"
                      >
                        + Add to FAQ
                      </button>
                    )}
                    {item.status === 'unreviewed' && (
                      <button
                        onClick={() => handleDismiss(item.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-400 text-[11px] hover:text-white"
                      >
                        Dismiss
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 rounded-lg text-slate-500 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Promote to FAQ Modal */}
      {showFaqModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-[#07152b] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-black text-white mb-1">Promote Question to FAQ</h3>
            <p className="text-xs text-slate-400 mb-4">
              Provide an official approved answer. The question will be embedded and immediately searchable.
            </p>

            <form onSubmit={handlePromoteToFaq} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Question</label>
                <div className="p-2.5 rounded-xl bg-[#050b20] border border-slate-700 text-xs text-white">
                  {selectedItem?.question}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Category</label>
                <input
                  type="text"
                  required
                  value={faqCategory}
                  onChange={(e) => setFaqCategory(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold block mb-1">Approved Official Answer</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter the official answer for this inquiry..."
                  value={faqAnswer}
                  onChange={(e) => setFaqAnswer(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setShowFaqModal(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="cta-glow-button px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md"
                >
                  Vectorize & Add to Knowledge Base
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
