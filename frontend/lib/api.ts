// ===== API 类型定义 =====

export interface User {
  id: number;
  phone: string;
  nickname: string;
  avatar: string;
  role: string;
  vip: number;
  vip_expires_at: string;
  customer_level_id: number;
  customer_level_name: string;
  company: string;
  company_role: string;
  industry: string;
  created_at: string;
}

export interface Tutorial {
  id: number;
  title: string;
  category: string;
  content: string;
  summary: string;
  cover: string;
  tags: string;
  views: number;
  status: 'draft' | 'published';
  vip_only: number;
  created_at: string;
  updated_at: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
  pinned: number;
  status: 'active' | 'hidden';
  created_at: string;
}

export interface Ticket {
  id: number;
  title: string;
  description: string;
  name: string;
  contact: string;
  type: string;
  group_name: string;
  attachments: string;
  status: 'pending' | 'processing' | 'resolved';
  reply: string;
  priority: string;
  processed_by: number | null;
  user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: number;
  name: string;
  icon: string;
  sort_order: number;
}

export interface Knowledge {
  id: number;
  title: string;
  content: string;
  tags: string;
  category: string;
  status: 'active' | 'hidden';
  hit_count: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerLevel {
  id: number;
  name: string;
  description: string;
  sort_order: number;
}

export interface Admin {
  id: number;
  username: string;
  nickname: string;
  role: 'admin' | 'editor';
}

export interface AIConversation {
  id: number;
  user_id: number | null;
  guest_name: string;
  status: 'active' | 'transferred' | 'closed';
  first_message?: string;
  last_message?: string;
  message_count?: number;
  summary?: string;
  nickname?: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface AIMessage {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  image_url: string;
  rating: number;
  created_at: string;
}

export interface Settings {
  [key: string]: string;
}

// ===== 通用请求函数 =====

const BASE_URL = '/api';

// ===== GET 请求内存缓存 =====
const cache = new Map<string, { data: any; expires: number }>();
const CACHE_TTL = 60_000; // 60 秒

function cacheKey(endpoint: string, tokenKey: string): string {
  return `${tokenKey}:${endpoint}`;
}

function getCached<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expires) { cache.delete(key); return undefined; }
  return entry.data as T;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL });
}

/** 使匹配前缀的缓存全部失效（写操作后调用） */
function invalidateCache(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.includes(prefix)) cache.delete(key);
  }
}

function getToken(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  tokenKey = 'imai-token',
  skipCache = false,
): Promise<T> {
  const isGet = !options.method || options.method === 'GET';
  const key = cacheKey(endpoint, tokenKey);

  // GET 请求走缓存（除非跳过）
  if (isGet && !skipCache) {
    const cached = getCached<T>(key);
    if (cached !== undefined) return cached;
  }

  const token = getToken(tokenKey);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('服务器返回异常，请检查后端是否运行');
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || '请求失败');
  }

  // GET 请求存缓存
  if (isGet) setCache(key, data);

  // 写操作后清除相关缓存
  if (!isGet) {
    const basePath = endpoint.replace(/\/\d+.*$/, '').replace(/\?.*$/, '');
    invalidateCache(basePath);
  }

  return data;
}

/** 普通用户 API */
function fetchAPI<T = any>(endpoint: string, options: RequestInit = {}, skipCache = false): Promise<T> {
  return request<T>(endpoint, options, 'imai-token', skipCache);
}

/** 管理员 API */
export function fetchAdminAPI<T = any>(endpoint: string, options: RequestInit = {}, skipCache = false): Promise<T> {
  return request<T>(endpoint, options, 'imai-admin-token', skipCache);
}

// ========== 认证 ==========
export const authApi = {
  register: (phone: string, password: string, nickname?: string, company?: string, company_role?: string, industry?: string) =>
    fetchAPI<{ message: string; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, nickname, company, company_role, industry }),
    }),
  login: (phone: string, password: string) =>
    fetchAPI<{ message: string; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  getMe: () => fetchAPI<{ user: User }>('/auth/me'),
};

// ========== 教程（公开）==========
export const tutorialApi = {
  getList: (params?: { category?: string; search?: string; page?: number }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.search) sp.set('search', params.search);
    if (params?.page) sp.set('page', String(params.page));
    const qs = sp.toString();
    return fetchAPI<{ tutorials: Tutorial[] }>(`/tutorials${qs ? `?${qs}` : ''}`);
  },
  getDetail: (id: number | string) =>
    fetchAPI<{ tutorial: Tutorial & { vip_locked?: boolean; message?: string } }>(`/tutorials/${id}`),
  addView: (id: number | string) =>
    fetchAPI<{ views: number }>(`/tutorials/${id}/view`, { method: 'POST' }),
};

// ========== FAQ（公开）==========
export const faqApi = {
  getList: (params?: { category?: string; search?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.search) sp.set('search', params.search);
    const qs = sp.toString();
    return fetchAPI<{ faqs: FAQ[] }>(`/faqs${qs ? `?${qs}` : ''}`);
  },
};

// ========== 分类 ==========
export const categoryApi = {
  getList: () => fetchAPI<{ categories: Category[] }>('/categories'),
};

// ========== 工单 ==========
export const ticketApi = {
  submit: (data: {
    title: string;
    description?: string;
    name?: string;
    contact?: string;
    type?: string;
    group_name?: string;
    attachments?: { url: string; name: string }[];
  }) => fetchAPI<{ message: string; ticket: Ticket }>('/tickets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getMyTickets: (params?: { status?: string; search?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.search) q.set('search', params.search);
    if (params?.page) q.set('page', String(params.page));
    if (params?.pageSize) q.set('pageSize', String(params.pageSize));
    const qs = q.toString();
    return fetchAPI<{ tickets: Ticket[]; total: number }>(`/user/tickets${qs ? '?' + qs : ''}`);
  },
  getTicket: (id: number | string) => fetchAPI<{ ticket: Ticket }>(`/tickets/${id}`),
  getUnreadCount: () => fetchAPI<{ count: number }>('/user/tickets/unread-count', {}, true),
  markRead: (id: number | string) => fetchAPI(`/user/tickets/${id}/mark-read`, { method: 'POST' }),
};

// ========== AI 客服 ==========
export const aiApi = {
  getConversations: () =>
    fetchAPI<{ conversations: AIConversation[] }>('/ai/conversations'),
  createConversation: (guestName?: string) =>
    fetchAPI<{ conversation: AIConversation }>('/ai/conversations', {
      method: 'POST',
      body: JSON.stringify({ guest_name: guestName || '' }),
    }),
  sendMessage: (conversationId: number, message: string, imageUrl?: string) =>
    fetchAPI<{ reply: string; message_id: number }>('/ai/chat', {
      method: 'POST',
      body: JSON.stringify({ conversation_id: conversationId, message, image_url: imageUrl || '' }),
    }),
  getMessages: (conversationId: number) =>
    fetchAPI<{ messages: AIMessage[] }>(`/ai/conversations/${conversationId}/messages`),
  rateMessage: (messageId: number, rating: number) =>
    fetchAPI(`/ai/messages/${messageId}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating }),
    }),
  transferToHuman: (conversationId: number, data?: { title?: string; type?: string; group_name?: string }) =>
    fetchAPI<{ message: string; ticket: Ticket }>(`/ai/conversations/${conversationId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),
  endConversation: (conversationId: number) =>
    fetchAPI(`/ai/conversations/${conversationId}/end`, { method: 'POST' }),
};

// ========== 管理后台 ==========
export const adminApi = {
  // 教程管理
  getTutorials: (params?: { category?: string; search?: string; status?: string }) => {
    const sp = new URLSearchParams();
    if (params?.category) sp.set('category', params.category);
    if (params?.search) sp.set('search', params.search);
    if (params?.status) sp.set('status', params.status);
    const qs = sp.toString();
    return fetchAdminAPI<{ tutorials: Tutorial[] }>(`/admin/tutorials${qs ? `?${qs}` : ''}`);
  },
  getTutorial: (id: number | string) =>
    fetchAdminAPI<{ tutorial: Tutorial }>(`/admin/tutorials/${id}`),
  createTutorial: (data: Partial<Tutorial>) =>
    fetchAdminAPI<{ message: string; tutorial: Tutorial }>('/admin/tutorials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTutorial: (id: number | string, data: Partial<Tutorial>) =>
    fetchAdminAPI<{ message: string; tutorial: Tutorial }>(`/admin/tutorials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTutorial: (id: number | string) =>
    fetchAdminAPI(`/admin/tutorials/${id}`, { method: 'DELETE' }),

  // FAQ 管理
  getFaqs: () => fetchAdminAPI<{ faqs: FAQ[] }>('/admin/faqs'),
  createFaq: (data: Partial<FAQ>) =>
    fetchAdminAPI<{ message: string; faq: FAQ }>('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFaq: (id: number | string, data: Partial<FAQ>) =>
    fetchAdminAPI<{ message: string; faq: FAQ }>(`/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteFaq: (id: number | string) =>
    fetchAdminAPI(`/admin/faqs/${id}`, { method: 'DELETE' }),

  // 设置
  getSettings: () => fetchAdminAPI<{ settings: Settings }>('/admin/settings'),
  saveSettings: (data: Record<string, string>) =>
    fetchAdminAPI<{ message: string }>('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 统计
  getStats: () => fetchAdminAPI<{ users: number; tutorials: number; tickets: number; faqs: number }>('/admin/stats'),

  // 用户管理
  getUsers: () => fetchAdminAPI<{ users: User[] }>('/admin/users'),
  createUser: (data: { phone: string; password: string; nickname?: string }) =>
    fetchAdminAPI<{ message: string; user: User }>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setVIP: (userId: number, data: { vip: number; vip_expires_at: string }) =>
    fetchAdminAPI(`/admin/users/${userId}/vip`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  updateUser: (userId: number, data: Partial<User>) =>
    fetchAdminAPI(`/admin/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  exportUsers: async () => {
    const token = getToken('imai-admin-token');
    const res = await fetch('/api/admin/users/export', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('导出失败');
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users_' + new Date().toISOString().slice(0, 10) + '.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
  importUsers: async (file: File) => {
    const token = getToken('imai-admin-token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/users/import', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '导入失败');
    return data as { message: string; imported: number; skipped: number };
  },

  // 工单管理
  getTickets: (status?: string) =>
    fetchAdminAPI<{ tickets: Ticket[] }>(`/admin/tickets${status ? `?status=${status}` : ''}`),
  getTicketStats: () =>
    fetchAdminAPI<{ pending: number; processing: number; resolved: number; total: number }>('/admin/tickets/stats'),
  updateTicket: (id: number | string, data: { status?: string; reply?: string }) =>
    fetchAdminAPI(`/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 分类管理
  getAdminCategories: () => fetchAdminAPI<{ categories: Category[] }>('/admin/categories'),
  createCategory: (data: { name: string; icon?: string }) =>
    fetchAdminAPI<{ message: string; category: Category }>('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: number | string, data: Partial<Category>) =>
    fetchAdminAPI(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number | string) =>
    fetchAdminAPI(`/admin/categories/${id}`, { method: 'DELETE' }),

  // 知识库
  getKnowledge: () => fetchAdminAPI<{ knowledge: Knowledge[] }>('/admin/knowledge'),
  createKnowledge: (data: { title: string; content?: string; tags?: string[]; category?: string }) =>
    fetchAdminAPI<{ message: string }>('/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteKnowledge: (id: number | string) =>
    fetchAdminAPI(`/admin/knowledge/${id}`, { method: 'DELETE' }),

  // 管理员管理
  getAdmins: () => fetchAdminAPI<{ admins: Admin[] }>('/admin/admins'),
  createAdmin: (data: { username: string; password: string; nickname?: string; role?: string }) =>
    fetchAdminAPI<{ message: string; admin: Admin }>('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAdmin: (id: number | string) =>
    fetchAdminAPI(`/admin/admins/${id}`, { method: 'DELETE' }),

  // 客户身份分类管理
  getCustomerLevels: () => fetchAdminAPI<{ levels: CustomerLevel[] }>('/admin/customer-levels'),
  createCustomerLevel: (data: { name: string; description?: string; sort_order?: number }) =>
    fetchAdminAPI<{ message: string; level: CustomerLevel }>('/admin/customer-levels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCustomerLevel: (id: number | string, data: Partial<CustomerLevel>) =>
    fetchAdminAPI(`/admin/customer-levels/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCustomerLevel: (id: number | string) =>
    fetchAdminAPI(`/admin/customer-levels/${id}`, { method: 'DELETE' }),
};

// ========== AI 管理 ==========
export const aiAdminApi = {
  getConversations: () =>
    fetchAdminAPI<{ conversations: AIConversation[] }>('/admin/ai/conversations'),
  getKnowledge: (params?: { status?: string; category?: string }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.category) q.set('category', params.category);
    const qs = q.toString();
    return fetchAdminAPI<{ knowledge: Knowledge[] }>(`/admin/ai/knowledge${qs ? '?' + qs : ''}`);
  },
  approveKnowledge: (id: number) =>
    fetchAdminAPI(`/admin/ai/knowledge/${id}/approve`, { method: 'POST' }),
  createKnowledge: (data: { title: string; content: string; category?: string; tags?: string[] }) =>
    fetchAdminAPI<{ message: string }>('/admin/ai/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateKnowledge: (id: number, data: Partial<Knowledge>) =>
    fetchAdminAPI(`/admin/ai/knowledge/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteKnowledge: (id: number) =>
    fetchAdminAPI(`/admin/ai/knowledge/${id}`, { method: 'DELETE' }),
  importKnowledge: async (items: { title: string; content: string; category?: string }[]) => {
    const token = getToken('imai-admin-token');
    const res = await fetch('/api/admin/ai/knowledge/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ items }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '导入失败');
    return data as { message: string; imported: number };
  },
  previewKnowledge: async (file: File) => {
    const token = getToken('imai-admin-token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/ai/knowledge/preview', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '解析失败');
    return data as { items: { title: string; content: string; category: string }[]; count: number };
  },
  uploadImages: async (files: File[]) => {
    const token = getToken('imai-admin-token');
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const res = await fetch('/api/admin/upload/images', {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '上传失败');
    return data as { message: string; files: { url: string; filename: string; size: number }[] };
  },
  getImages: () =>
    fetchAdminAPI<{ images: { url: string; filename: string; size: number; uploaded_at: string }[] }>('/admin/upload/images'),
};
