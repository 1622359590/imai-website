const BASE_URL = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('imai-token');
}

function getAdminToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('imai-admin-token');
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 304 Not Modified — 多数是 auth/me 被缓存，需要忽略
  if (res.status === 304) {
    throw new Error('登录状态已过期，请重新登录');
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('服务器返回异常，请检查后端是否运行');
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || '请求失败');
  }

  return data;
}

// ===== 管理员 API（使用 imai-admin-token）=====
async function fetchAdminAPI(endpoint: string, options: RequestInit = {}) {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 304 Not Modified
  if (res.status === 304) {
    throw new Error('登录状态已过期，请重新登录');
  }

  let data;
  try {
    data = await res.json();
  } catch (e) {
    throw new Error('服务器返回异常，请检查后端是否运行');
  }

  if (!res.ok) {
    throw new Error(data?.error || data?.message || '请求失败');
  }

  return data;
}

// ========== 认证 ==========
export const authApi = {
  register: (phone: string, password: string, nickname?: string) =>
    fetchAPI('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ phone, password, nickname }),
    }),
  login: (phone: string, password: string) =>
    fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ phone, password }),
    }),
  getMe: () => fetchAPI('/auth/me'),
};

// ========== 教程（公开）==========
export const tutorialApi = {
  getList: (params?: { category?: string; search?: string; page?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.page) searchParams.set('page', String(params.page));
    const qs = searchParams.toString();
    return fetchAPI(`/tutorials${qs ? `?${qs}` : ''}`);
  },
  getDetail: (id: number | string) => fetchAPI(`/tutorials/${id}`),
};

// ========== FAQ（公开）==========
export const faqApi = {
  getList: (params?: { category?: string; search?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    const qs = searchParams.toString();
    return fetchAPI(`/faqs${qs ? `?${qs}` : ''}`);
  },
};

// ========== 管理后台（使用 imai-admin-token）==========
export const adminApi = {
  // 教程管理
  getTutorials: (params?: { category?: string; search?: string; status?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.search) searchParams.set('search', params.search);
    if (params?.status) searchParams.set('status', params.status);
    const qs = searchParams.toString();
    return fetchAdminAPI(`/admin/tutorials${qs ? `?${qs}` : ''}`);
  },
  getTutorial: (id: number | string) => fetchAdminAPI(`/admin/tutorials/${id}`),
  createTutorial: (data: {
    title: string;
    category: string;
    content: string;
    summary?: string;
    cover?: string;
    tags?: string;
    status?: string;
  }) =>
    fetchAdminAPI('/admin/tutorials', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateTutorial: (id: number | string, data: {
    title?: string;
    category?: string;
    content?: string;
    summary?: string;
    cover?: string;
    tags?: string;
    status?: string;
  }) =>
    fetchAdminAPI(`/admin/tutorials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTutorial: (id: number | string) =>
    fetchAdminAPI(`/admin/tutorials/${id}`, { method: 'DELETE' }),

  // FAQ 管理
  getFaqs: () => fetchAdminAPI('/admin/faqs'),
  createFaq: (data: {
    question: string;
    answer: string;
    category?: string;
    sort_order?: number;
    pinned?: number;
    status?: string;
  }) =>
    fetchAdminAPI('/admin/faqs', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateFaq: (id: number | string, data: {
    question?: string;
    answer?: string;
    category?: string;
    sort_order?: number;
    pinned?: number;
    status?: string;
  }) =>
    fetchAdminAPI(`/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteFaq: (id: number | string) =>
    fetchAdminAPI(`/admin/faqs/${id}`, { method: 'DELETE' }),

  // 设置
  getSettings: () => fetchAdminAPI('/admin/settings'),
  saveSettings: (data: Record<string, string>) =>
    fetchAdminAPI('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 统计
  getStats: () => fetchAdminAPI('/admin/stats'),

  // 用户管理
  getUsers: () => fetchAdminAPI('/admin/users'),
  createUser: (data: { phone: string; password: string; nickname?: string }) =>
    fetchAdminAPI('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  setVIP: (userId: number, data: { vip: number; vip_expires_at: string }) =>
    fetchAdminAPI(`/admin/users/${userId}/vip`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 工单管理
  getTickets: () => fetchAdminAPI('/admin/tickets'),
  updateTicket: (id: number | string, data: { status?: string; reply?: string }) =>
    fetchAdminAPI(`/admin/tickets/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 分类管理
  getAdminCategories: () => fetchAdminAPI('/admin/categories'),
  createCategory: (data: { name: string; icon?: string }) =>
    fetchAdminAPI('/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateCategory: (id: number | string, data: { name?: string; icon?: string; sort_order?: number }) =>
    fetchAdminAPI(`/admin/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteCategory: (id: number | string) =>
    fetchAdminAPI(`/admin/categories/${id}`, { method: 'DELETE' }),

  // 知识库
  getKnowledge: () => fetchAdminAPI('/admin/knowledge'),
  createKnowledge: (data: { title: string; content?: string; tags?: string[]; category?: string }) =>
    fetchAdminAPI('/admin/knowledge', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteKnowledge: (id: number | string) =>
    fetchAdminAPI(`/admin/knowledge/${id}`, { method: 'DELETE' }),

  // 管理员管理
  getAdmins: () => fetchAdminAPI('/admin/admins'),
  createAdmin: (data: { username: string; password: string; nickname?: string; role?: string }) =>
    fetchAdminAPI('/admin/admins', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  deleteAdmin: (id: number | string) =>
    fetchAdminAPI(`/admin/admins/${id}`, { method: 'DELETE' }),
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
    attachments?: any[];
  }) =>
    fetchAPI("/tickets", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  getMyTickets: () => fetchAPI("/user/tickets"),
};

// ========== 分类 ==========
export const categoryApi = {
  getList: () => fetchAPI("/categories"),
};
