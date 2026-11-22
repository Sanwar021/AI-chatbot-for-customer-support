import React, { useEffect, useState } from 'react';
import {
  UploadCloud,
  Globe,
  FileText,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Tag,
} from 'lucide-react';
import { api } from '../services/api';

export const KnowledgeView: React.FC = () => {
  const [bots, setBots] = useState<any[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string>('');
  const [documents, setDocuments] = useState<any[]>([]);
  const [faqs, setFaqs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'docs' | 'faqs'>('docs');
  const [loading, setLoading] = useState(true);

  // Upload & Crawl State
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);
  const [crawlUrl, setCrawlUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isCrawling, setIsCrawling] = useState(false);

  // FAQ Modal
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqQuestion, setFaqQuestion] = useState('');
  const [faqAnswer, setFaqAnswer] = useState('');
  const [faqCategory, setFaqCategory] = useState('General');
  const [faqSearch, setFaqSearch] = useState('');

  useEffect(() => {
    loadBots();
  }, []);

  useEffect(() => {
    if (selectedBotId) {
      loadKnowledge();
    }
  }, [selectedBotId]);

  const loadBots = async () => {
    try {
      const bList = await api.getBots();
      setBots(bList);
      if (bList.length > 0) {
        setSelectedBotId(bList[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadKnowledge = async () => {
    try {
      const [docs, fList] = await Promise.all([
        api.getDocuments(selectedBotId),
        api.getFaqs(selectedBotId),
      ]);
      setDocuments(docs);
      setFaqs(fList);
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileToUpload || !selectedBotId) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('bot_id', selectedBotId);
      formData.append('file', fileToUpload);

      await api.uploadDocument(formData);
      setFileToUpload(null);
      // Reset input element
      const fileInput = document.getElementById('kbFileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      await loadKnowledge();
    } catch (err: any) {
      alert(err.message || 'File upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleCrawlUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crawlUrl || !selectedBotId) return;

    setIsCrawling(true);
    try {
      await api.crawlUrl(selectedBotId, crawlUrl);
      setCrawlUrl('');
      await loadKnowledge();
    } catch (err: any) {
      alert(err.message || 'URL crawl failed');
    } finally {
      setIsCrawling(false);
    }
  };

  const handleReprocess = async (docId: string) => {
    try {
      await api.reprocessDoc(docId);
      loadKnowledge();
    } catch (e: any) {
      alert(e.message || 'Reprocess failed');
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Delete this knowledge document and its embeddings?')) return;
    try {
      await api.deleteDoc(docId);
      loadKnowledge();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const handleCreateFaq = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createFaq({
        bot_id: selectedBotId,
        question: faqQuestion,
        answer: faqAnswer,
        category: faqCategory,
      });
      setShowFaqModal(false);
      setFaqQuestion('');
      setFaqAnswer('');
      loadKnowledge();
    } catch (err: any) {
      alert(err.message || 'Failed to create FAQ');
    }
  };

  const handleDeleteFaq = async (id: string) => {
    if (!confirm('Delete this FAQ entry?')) return;
    try {
      await api.deleteFaq(id);
      loadKnowledge();
    } catch (e: any) {
      alert(e.message || 'Delete failed');
    }
  };

  const filteredFaqs = faqs.filter(
    (f) =>
      f.question.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.answer.toLowerCase().includes(faqSearch.toLowerCase()) ||
      f.category.toLowerCase().includes(faqSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Bot Selector Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07152b]/90 border border-white/10 p-5 rounded-2xl backdrop-blur-xl">
        <div>
          <h2 className="text-xl font-black text-white">Knowledge Base & Training</h2>
          <p className="text-xs text-slate-400">Ground your AI assistant in verified company documentation and FAQs.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-semibold">Active Bot:</span>
          <select
            value={selectedBotId}
            onChange={(e) => setSelectedBotId(e.target.value)}
            className="bg-[#050b20] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-cyan-400"
          >
            {bots.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab('docs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'docs'
              ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          Documents & Web URLs ({documents.length})
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'faqs'
              ? 'bg-gradient-to-r from-[#087b6d] to-[#169889] text-white shadow-md'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          Structured FAQs ({faqs.length})
        </button>
      </div>

      {activeTab === 'docs' ? (
        <div className="space-y-6">
          {/* Upload and Crawl Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload Box */}
            <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center gap-2.5 mb-3">
                <UploadCloud className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Upload Knowledge Document</h3>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Supported: PDF, DOCX, TXT, CSV, Markdown (Max 25MB)
              </p>

              <form onSubmit={handleFileUpload} className="space-y-3">
                <input
                  id="kbFileInput"
                  type="file"
                  accept=".pdf,.docx,.txt,.csv,.md"
                  onChange={(e) => setFileToUpload(e.target.files?.[0] || null)}
                  className="block w-full text-xs text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#087b6d] file:text-white hover:file:brightness-110 cursor-pointer bg-[#050b20] rounded-xl border border-slate-700/80 p-1"
                />
                <button
                  type="submit"
                  disabled={!fileToUpload || isUploading}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-40"
                >
                  {isUploading ? 'Extracting & Generating Vectors...' : 'Upload & Train Model'}
                </button>
              </form>
            </div>

            {/* URL Ingestion Box */}
            <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <Globe className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white">Import Website Content</h3>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> SSRF Protected
                </span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Crawls main page & internal links, extracts clean text, and stores vectors.
              </p>

              <form onSubmit={handleCrawlUrl} className="space-y-3">
                <input
                  type="url"
                  required
                  placeholder="https://example.com/about-us"
                  value={crawlUrl}
                  onChange={(e) => setCrawlUrl(e.target.value)}
                  className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="submit"
                  disabled={!crawlUrl || isCrawling}
                  className="w-full py-2 rounded-xl bg-gradient-to-r from-[#087b6d] to-[#169889] text-xs font-bold text-white shadow-md hover:brightness-110 disabled:opacity-40"
                >
                  {isCrawling ? 'Crawling Same-Domain Pages...' : 'Crawl & Index Website'}
                </button>
              </form>
            </div>
          </div>

          {/* Documents Table */}
          <div className="bg-[#07152b]/90 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
            <div className="p-4 border-b border-white/5">
              <h3 className="text-sm font-black text-white">Indexed Knowledge Documents</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#050b20]/60 text-slate-400 font-mono text-[11px] uppercase border-b border-white/5">
                  <tr>
                    <th className="py-3 px-4">Name / Source</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Size</th>
                    <th className="py-3 px-4">Chunks</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-200">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No documents uploaded yet. Upload a PDF or add a website URL above.
                      </td>
                    </tr>
                  ) : (
                    documents.map((d) => (
                      <tr key={d.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-medium flex items-center gap-2">
                          <FileText className="w-4 h-4 text-slate-400" />
                          <span className="truncate max-w-xs">{d.name}</span>
                        </td>
                        <td className="py-3 px-4 font-mono uppercase text-slate-400">{d.file_type}</td>
                        <td className="py-3 px-4 font-mono text-slate-400">
                          {d.file_size ? `${(d.file_size / 1024).toFixed(1)} KB` : 'Web Crawl'}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-300 font-bold">{d.chunks_count}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              d.status === 'ready'
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : d.status === 'processing'
                                ? 'bg-amber-500/20 text-amber-300 animate-pulse'
                                : d.status === 'failed'
                                ? 'bg-rose-500/20 text-rose-300'
                                : 'bg-slate-500/20 text-slate-300'
                            }`}
                          >
                            {d.status === 'ready' && <CheckCircle2 className="w-3 h-3" />}
                            {d.status === 'processing' && <Clock className="w-3 h-3" />}
                            {d.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                            <span className="capitalize">{d.status}</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleReprocess(d.id)}
                            title="Reprocess document"
                            className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-white/10"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteDoc(d.id)}
                            title="Delete document"
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/10"
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
          </div>
        </div>
      ) : (
        /* FAQ Tab */
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search FAQs by question, answer, or category..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="w-full bg-[#050b20] border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>
            <button
              onClick={() => setShowFaqModal(true)}
              className="cta-glow-button px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New FAQ</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredFaqs.map((f) => (
              <div key={f.id} className="bg-[#07152b]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Tag className="w-3 h-3" /> {f.category}
                    </span>
                    <button
                      onClick={() => handleDeleteFaq(f.id)}
                      className="text-slate-500 hover:text-rose-400"
                      title="Delete FAQ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h4 className="text-xs font-bold text-white mb-2">{f.question}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed bg-[#050b20] p-3 rounded-xl border border-slate-800">
                    {f.answer}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Add FAQ Modal */}
          {showFaqModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
              <div className="w-full max-w-lg bg-[#07152b] border border-white/10 rounded-2xl p-6 shadow-2xl">
                <h3 className="text-lg font-black text-white mb-1">Add Structured FAQ</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Add approved customer questions and answers. High similarity lookups directly return this ground truth.
                </p>

                <form onSubmit={handleCreateFaq} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Category</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Pricing, Hours, Policies"
                      value={faqCategory}
                      onChange={(e) => setFaqCategory(e.target.value)}
                      className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Customer Question</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Do you accept credit card payments?"
                      value={faqQuestion}
                      onChange={(e) => setFaqQuestion(e.target.value)}
                      className="w-full bg-[#050b20] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold block mb-1">Approved Answer</label>
                    <textarea
                      rows={4}
                      required
                      placeholder="e.g. Yes, we accept Visa, Mastercard, and American Express."
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
                      Vectorize & Save FAQ
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
