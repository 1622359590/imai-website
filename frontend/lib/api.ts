const BASE_URL = '/api';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('imai-token');
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

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || data.message || '请求失败');
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

// ========== 管理后台 ==========
export const adminApi = {
  // 教程管理
  createTutorial: (data: {
    title: string;
    category: string;
    content: string;
    summary?: string;
    cover?: string;
    tags?: string;
    status?: string;
  }) =>
    fetchAPI('/admin/tutorials', {
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
    fetchAPI(`/admin/tutorials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteTutorial: (id: number | string) =>
    fetchAPI(`/admin/tutorials/${id}`, { method: 'DELETE' }),

  // FAQ 管理
  createFaq: (data: {
    question: string;
    answer: string;
    category?: string;
    sort_order?: number;
    pinned?: number;
    status?: string;
  }) =>
    fetchAPI('/admin/faqs', {
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
    fetchAPI(`/admin/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteFaq: (id: number | string) =>
    fetchAPI(`/admin/faqs/${id}`, { method: 'DELETE' }),

  // 设置
  getSettings: () => fetchAPI('/admin/settings'),
  saveSettings: (data: Record<string, string>) =>
    fetchAPI('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  // 统计
  getStats: () => fetchAPI('/admin/stats'),
};
