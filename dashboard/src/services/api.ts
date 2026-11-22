const API_BASE = "http://localhost:8000/api/v1";

export function getAuthToken(): string | null {
  return localStorage.getItem("sp_token");
}

export function setAuthToken(token: string) {
  localStorage.setItem("sp_token", token);
}

export function removeAuthToken() {
  localStorage.removeItem("sp_token");
  localStorage.removeItem("sp_user");
}

export function getStoredUser() {
  const u = localStorage.getItem("sp_user");
  return u ? JSON.parse(u) : null;
}

export function setStoredUser(user: any) {
  localStorage.setItem("sp_user", JSON.stringify(user));
}

async function request(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (res.status === 401 && !endpoint.includes("/auth/")) {
    removeAuthToken();
    window.location.reload();
  }

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || "Request failed");
  }

  return res.json();
}

export const api = {
  // Auth
  register: (data: any) => request("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  login: (data: any) => request("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  passkeyLogin: (passkey: string) => request("/auth/passkey", { method: "POST", body: JSON.stringify({ passkey }) }),

  // Bots
  getBots: () => request("/bots"),
  createBot: (data: any) => request("/bots", { method: "POST", body: JSON.stringify(data) }),
  getBot: (id: string) => request(`/bots/${id}`),
  updateBot: (id: string, data: any) => request(`/bots/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteBot: (id: string) => request(`/bots/${id}`, { method: "DELETE" }),

  // Knowledge
  uploadDocument: (formData: FormData) => request("/knowledge/upload", { method: "POST", body: formData }),
  crawlUrl: (botId: string, url: string) => request("/knowledge/crawl-url", { method: "POST", body: JSON.stringify({ bot_id: botId, url }) }),
  getDocuments: (botId?: string) => request(`/knowledge/documents${botId ? `?bot_id=${botId}` : ""}`),
  reprocessDoc: (docId: string) => request(`/knowledge/documents/${docId}/reprocess`, { method: "POST" }),
  deleteDoc: (docId: string) => request(`/knowledge/documents/${docId}`, { method: "DELETE" }),

  // FAQs
  getFaqs: (botId?: string) => request(`/knowledge/faqs${botId ? `?bot_id=${botId}` : ""}`),
  createFaq: (data: any) => request("/knowledge/faqs", { method: "POST", body: JSON.stringify(data) }),
  updateFaq: (id: string, data: any) => request(`/knowledge/faqs/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteFaq: (id: string) => request(`/knowledge/faqs/${id}`, { method: "DELETE" }),

  // Chat / Playground
  initChat: (data: any) => request("/chat/init", { method: "POST", body: JSON.stringify(data) }),
  sendMessage: (data: any) => request("/chat/message", { method: "POST", body: JSON.stringify(data) }),
  requestHandoff: (convId: string, reason?: string) => request("/chat/handoff", { method: "POST", body: JSON.stringify({ conversation_id: convId, reason }) }),

  // Conversations & Live Inbox
  getConversations: (status?: string, channel?: string) => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (channel) params.append("channel", channel);
    return request(`/conversations?${params.toString()}`);
  },
  getMessages: (convId: string) => request(`/conversations/${convId}/messages`),
  sendAgentReply: (convId: string, content: string) => request(`/conversations/${convId}/reply`, { method: "POST", body: JSON.stringify({ content }) }),
  assignConversation: (convId: string, agentId?: string) => request(`/conversations/${convId}/assign`, { method: "POST", body: JSON.stringify({ agent_id: agentId }) }),
  returnToBot: (convId: string) => request(`/conversations/${convId}/return-to-bot`, { method: "POST" }),
  resolveConversation: (convId: string) => request(`/conversations/${convId}/resolve`, { method: "POST" }),

  // Leads
  getLeads: (botId?: string) => request(`/leads${botId ? `?bot_id=${botId}` : ""}`),
  exportLeadsCsvUrl: () => `${API_BASE}/leads/export.csv?token=${getAuthToken()}`,

  // Unanswered Questions
  getUnanswered: (botId?: string) => request(`/unanswered${botId ? `?bot_id=${botId}` : ""}`),
  addToFaq: (id: string, answer: string, category: string) => request(`/unanswered/${id}/add-to-faq`, { method: "POST", body: JSON.stringify({ answer, category }) }),
  dismissUnanswered: (id: string) => request(`/unanswered/${id}/dismiss`, { method: "POST" }),
  deleteUnanswered: (id: string) => request(`/unanswered/${id}`, { method: "DELETE" }),

  // Analytics
  getAnalytics: (days: number = 30) => request(`/analytics/summary?days=${days}`),

  // Team
  getTeam: () => request("/team"),
  inviteMember: (email: string, role: string) => request("/team/invite", { method: "POST", body: JSON.stringify({ email, role }) }),
  updateRole: (id: string, role: string) => request(`/team/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  removeMember: (id: string) => request(`/team/${id}`, { method: "DELETE" }),

  // Billing
  getPlans: () => request("/billing/plans"),
  getUsageStatus: () => request("/billing/status"),
  upgradePlan: (planName: string) => request("/billing/upgrade", { method: "POST", body: JSON.stringify({ plan_name: planName }) }),

  // WhatsApp
  getWhatsAppConfig: () => request("/whatsapp/config"),
  saveWhatsAppConfig: (data: any) => request("/whatsapp/config", { method: "POST", body: JSON.stringify(data) }),
  testWhatsAppMock: (data: any) => request("/whatsapp/test-mock", { method: "POST", body: JSON.stringify(data) }),

  // Orders
  getOrderConfig: () => request("/orders/config"),
  saveOrderConfig: (data: any) => request("/orders/config", { method: "POST", body: JSON.stringify(data) }),
  testOrderLookup: (orderId: string, verificationValue: string) => request("/orders/test-lookup", { method: "POST", body: JSON.stringify({ order_id: orderId, verification_value: verificationValue }) }),

  // Super Admin
  getSuperadminMetrics: () => request("/superadmin/metrics"),
  getAllTenants: () => request("/superadmin/tenants"),
  toggleTenantStatus: (tenantId: string, isActive: boolean) => request(`/superadmin/tenants/${tenantId}/status?is_active=${isActive}`, { method: "PUT" }),
  getAuditLogs: () => request("/superadmin/audit-logs"),

  // Settings
  getWorkspace: () => request("/settings/workspace"),
  updateWorkspace: (name: string) => request("/settings/workspace", { method: "PUT", body: JSON.stringify({ name }) }),
  getApiKeys: () => request("/settings/api-keys"),
  createApiKey: (name: string) => request("/settings/api-keys", { method: "POST", body: JSON.stringify({ name }) }),
  deleteApiKey: (id: string) => request(`/settings/api-keys/${id}`, { method: "DELETE" }),
  getTenantAuditLogs: () => request("/settings/audit-logs"),
};
