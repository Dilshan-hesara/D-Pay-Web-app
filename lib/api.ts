import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:7000';

const api = axios.create({
  baseURL: BASE,
  // NOTE: Do NOT set a global Content-Type here.
  // For plain JS objects, Axios defaults to application/json automatically.
  // For FormData objects, Axios auto-sets multipart/form-data WITH the correct
  // boundary string. A global Content-Type override would strip that boundary,
  // causing 415 Unsupported Media Type from the Spring Boot backend.
});

// ─── User API ──────────────────────────────────────────────────────────────
export const userApi = {
  getAll: () => api.get('/api/v1/users').then(r => r.data),
  getById: (id: string) => api.get(`/api/v1/users/${id}`).then(r => r.data),
  create: (data: unknown) => api.post('/api/v1/users', data).then(r => r.data),
  update: (id: string, data: unknown) => api.put(`/api/v1/users/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/v1/users/${id}`),
  toggleActive: (id: string, active: boolean) =>
    api.patch(`/api/v1/users/${id}/active`, null, { params: { active } }),
};

// ─── Inventory API ──────────────────────────────────────────────────────────
export const inventoryApi = {
  getAll: (category?: string) =>
    api.get('/api/v1/inventory', { params: category ? { category } : undefined }).then(r => r.data),
  
  getById: (id: string) => api.get(`/api/v1/inventory/${id}`).then(r => r.data),
  
  // මෙතනින් headers කෑල්ල අයින් කළා!
  create: (formData: FormData) =>
    api.post('/api/v1/inventory', formData).then(r => r.data),
  
  // මෙතනිනුත් headers කෑල්ල අයින් කළා!
  update: (id: string, formData: FormData) =>
    api.put(`/api/v1/inventory/${id}`, formData).then(r => r.data),
  
  delete: (id: string) => api.delete(`/api/v1/inventory/${id}`),
  
  adjustStock: (id: string, delta: number) =>
    api.patch(`/api/v1/inventory/${id}/stock`, null, { params: { delta } }).then(r => r.data),
};

// ─── Customer (POS Walk-in) API ─────────────────────────────────────────────
// Used by the POS terminal to persist named walk-in customers to the User Service.
// Only invoked when both customerName AND customerPhone are provided at checkout.
export const customerApi = {
  /**
   * Saves a named walk-in customer to the User Service database.
   *
   * Because UserRequestDTO requires username, email, role, and password
   * (all @NotBlank), we generate synthetic but valid values from the name
   * and phone provided at the POS counter.
   *
   * TODO: Replace synthetic email/password with a proper customer auth flow
   *       (e.g., OTP-based registration, or a dedicated /api/v1/customers endpoint
   *       without password requirements) before going to production.
   */
  createWalkIn: (name: string, phone: string) => {
    const sanitized = name.trim().toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
    const usernameBase = sanitized || 'walkin';
    const uniqueSuffix = Date.now();
    return api.post('/api/v1/users', {
      username: `${usernameBase}.${uniqueSuffix}`,         // unique per checkout
      email: `${usernameBase}.${uniqueSuffix}@pos.local`, // synthetic — TODO: real email
      phone: phone.trim(),
      role: 'CUSTOMER',
      password: `WalkIn@${uniqueSuffix}`,                  // temp — TODO: secure auth
    }).then(r => r.data);
  },
};

// ─── Order API ──────────────────────────────────────────────────────────────
export const orderApi = {
  getAll: () => api.get('/api/v1/orders').then(r => r.data),
  getById: (id: string) => api.get(`/api/v1/orders/${id}`).then(r => r.data),
  getByUser: (userId: string) => api.get('/api/v1/orders', { params: { userId } }).then(r => r.data),
  create: (data: unknown) => api.post('/api/v1/orders', data).then(r => r.data),
  updateStatus: (id: string, status: string) =>
    api.patch(`/api/v1/orders/${id}/status`, null, { params: { status } }).then(r => r.data),
  cancel: (id: string) => api.delete(`/api/v1/orders/${id}`),
};

// ─── Legacy shims (pre-refactoring pages still import these names) ─────────
// Maps old ECA Student/Program/Enrollment API shapes to the new D-Pay
// User/Inventory/Order endpoints so old components compile without changes.

/** @deprecated use userApi instead */
export const studentApi = {
  getAll: () => userApi.getAll(),
  getById: (id: string) => userApi.getById(id),
  create: (data: unknown) => userApi.create(data),
  update: (id: string, data: unknown) => userApi.update(id, data),
  delete: (id: string) => userApi.delete(id),
  /** No longer applicable — images are now in GCS via Inventory Service */
  getPictureUrl: (_nic: string): string | undefined => undefined,
};

/** @deprecated use inventoryApi instead */
export const programApi = {
  getAll: () => inventoryApi.getAll(),
  getById: (id: string) => inventoryApi.getById(id),
  create: (formData: FormData) => inventoryApi.create(formData),
  update: (id: string, formData: FormData) => inventoryApi.update(id, formData),
  delete: (id: string) => inventoryApi.delete(id),
};

/** @deprecated use orderApi instead */
export const enrollmentApi = {
  getAll: () => orderApi.getAll(),
  getById: (id: string) => orderApi.getById(id),
  create: (data: unknown) => orderApi.create(data),
  delete: (id: string) => orderApi.cancel(id),
};

export default api;
