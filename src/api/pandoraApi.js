import axios from 'axios';

const BACKEND = import.meta.env.VITE_BACKEND_URL ?? '';
const BASE_URL = BACKEND ? `${BACKEND}/api` : '/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token updater (registrado por useAuth para mantener estado React en sync) ─
let _tokenUpdater = null;
export function registerTokenUpdater(fn) { _tokenUpdater = fn; }

// ── Cola de peticiones que esperan mientras se refresca el token ──────────────
let isRefreshing = false;
let pendingQueue = [];

function flushQueue(error, newToken) {
  pendingQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  );
  pendingQueue = [];
}

// ── Interceptor de petición: adjunta JWT ──────────────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('pandora_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── Interceptor de respuesta: maneja 401 con refresco silencioso ──────────────
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;

    // Solo intentar refresco en 401 y si no es ya un retry
    if (err.response?.status !== 401 || original._retry) {
      return Promise.reject(err);
    }

    const refreshToken = localStorage.getItem('pandora_refresh_token');

    // Sin refresh token: logout inmediato
    if (!refreshToken) {
      localStorage.removeItem('pandora_token');
      window.location.href = '/login';
      return Promise.reject(err);
    }

    // Si ya hay un refresco en curso, encolar y esperar
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(newToken => {
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    try {
      // Llamada directa con axios (no pasa por los interceptores de `api`)
      const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });

      const newToken        = data.token;
      const newRefreshToken = data.refreshToken;

      // Persistir nuevos tokens
      localStorage.setItem('pandora_token', newToken);
      if (newRefreshToken) localStorage.setItem('pandora_refresh_token', newRefreshToken);

      // Notificar al contexto React para que re-renderice con el nuevo JWT
      if (_tokenUpdater) _tokenUpdater(newToken);

      // Resolver cola de peticiones pendientes
      flushQueue(null, newToken);

      // Reintentar la petición original con el nuevo token
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);

    } catch (refreshErr) {
      // Refresco fallido → logout total
      flushQueue(refreshErr, null);
      localStorage.removeItem('pandora_token');
      localStorage.removeItem('pandora_refresh_token');
      if (_tokenUpdater) _tokenUpdater(null);
      window.location.href = '/login';
      return Promise.reject(refreshErr);

    } finally {
      isRefreshing = false;
    }
  }
);

export const templateApi = {
  getAll: () => api.get('/templates'),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  remove: (id) => api.delete(`/templates/${id}`),
};

export const reportsApi = {
  getMail:      () => api.get('/reports/mail'),
  getInventory: () => api.get('/reports/inventory'),
  getCalendar:  () => api.get('/reports/calendar'),
};

export const campaignApi = {
  getAll:       ()         => api.get('/campaigns'),
  getDeleted:   ()         => api.get('/campaigns/deleted'),
  getById:      (id)       => api.get(`/campaigns/${id}`),
  create:       (data)     => api.post('/campaigns', data),
  send:         (id)       => api.post(`/campaigns/${id}/send`, {}),
  retryFailed:  (id)       => api.post(`/campaigns/${id}/retry-failed`, {}),
  duplicate:    (id)       => api.post(`/campaigns/${id}/duplicate`, {}),
  remove:       (id)       => api.delete(`/campaigns/${id}`),
  restore:      (id)       => api.post(`/campaigns/${id}/restore`, {}),
  getRecipients:(id)       => api.get(`/campaigns/${id}/recipients`),
  exportUrl:    (id) => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/campaigns/${id}/export?access_token=${token}`;
  },
};

const uploadForm = (url, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(url, form, { headers: { 'Content-Type': 'multipart/form-data' } });
};

export const userApi = {
  getAll: () => api.get('/users'),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  remove: (id) => api.delete(`/users/${id}`),
  me: () => api.get('/users/me'),
  updateSmtp: (data) => api.put('/users/me/smtp', data),
  uploadPhoto: (file) => uploadForm('/users/me/photo', file),
  deletePhoto: () => api.delete('/users/me/photo'),
  uploadBanner: (file) => uploadForm('/users/me/banner', file),
  deleteBanner: () => api.delete('/users/me/banner'),
};

export const catalogApi = {
  getDepartments:    ()         => api.get('/catalogs/departments'),
  createDepartment:  (data)     => api.post('/catalogs/departments', data),
  updateDepartment:  (id, data) => api.put(`/catalogs/departments/${id}`, data),
  deleteDepartment:  (id)       => api.delete(`/catalogs/departments/${id}`),

  getEmployees:   (deptId) => api.get('/catalogs/employees', { params: deptId ? { departmentId: deptId } : undefined }),
  createEmployee: (data)   => api.post('/catalogs/employees', data),
  updateEmployee: (id, data) => api.put(`/catalogs/employees/${id}`, data),
  deleteEmployee: (id)     => api.delete(`/catalogs/employees/${id}`),
};

export const inventoryApi = {
  getTypes:     ()         => api.get('/inventory/types'),
  getTypeById:  (id)       => api.get(`/inventory/types/${id}`),
  createType:   (data)     => api.post('/inventory/types', data),
  updateType:   (id, data) => api.put(`/inventory/types/${id}`, data),
  deleteType:   (id)       => api.delete(`/inventory/types/${id}`),

  getItems:     (typeId)   => api.get('/inventory/items', { params: typeId ? { typeId } : undefined }),
  getDashboard:    ()              => api.get('/inventory/items/dashboard'),
  getNextNumber:   (departmentId) => api.get('/inventory/items/next-number', { params: { departmentId } }),
  getItemById:  (id)       => api.get(`/inventory/items/${id}`),
  createItem:   (data)     => api.post('/inventory/items', data),
  updateItem:   (id, data) => api.put(`/inventory/items/${id}`, data),
  deleteItem:   (id)       => api.delete(`/inventory/items/${id}`),

  getTransfers:   (itemId)       => api.get(`/inventory/items/${itemId}/transfers`),
  createTransfer: (itemId, data) => api.post(`/inventory/items/${itemId}/transfers`, data),

  exportUrl: () => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/inventory/excel/export?access_token=${token}`;
  },
  templateUrl: () => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/inventory/excel/template?access_token=${token}`;
  },
  importPreview: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/inventory/excel/import/preview', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importConfirm: (rows) => api.post('/inventory/excel/import/confirm', rows),
};

export const calendarApi = {
  getRooms:   ()         => api.get('/calendar/rooms'),
  createRoom: (data)     => api.post('/calendar/rooms', data),
  updateRoom: (id, data) => api.put(`/calendar/rooms/${id}`, data),
  deleteRoom: (id)       => api.delete(`/calendar/rooms/${id}`),

  getReports: () => api.get('/calendar/reports'),

  getReservations: (rangeStart, rangeEnd, roomId) =>
    api.get('/calendar/reservations', { params: { rangeStart, rangeEnd, ...(roomId ? { roomId } : {}) } }),
  getReservationById: (id) => api.get(`/calendar/reservations/${id}`),
  checkConflict: (roomId, start, end, excludeId) =>
    api.get('/calendar/reservations/check-conflict', { params: { roomId, start, end, ...(excludeId ? { excludeId } : {}) } }),
  createReservation: (data)     => api.post('/calendar/reservations', data),
  updateReservation: (id, data) => api.put(`/calendar/reservations/${id}`, data),
  deleteReservation: (id, deleteAll = false) =>
    api.delete(`/calendar/reservations/${id}`, { params: { deleteAll } }),
};

export const roomRequestApi = {
  getAll:       (status)    => api.get('/room-requests', { params: status ? { status } : {} }),
  create:       (data)      => api.post('/room-requests', data),
  updateStatus: (id, data)  => api.put(`/room-requests/${id}/status`, data),
  delete:       (id)        => api.delete(`/room-requests/${id}`),
};

export const mediaApi = {
  uploadImage: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/media/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

export const recipientApi = {
  parseCsv: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/recipients/parse-csv', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const licenciasApi = {
  getAll:    (params = {}) => api.get('/licencias', { params }),
  getById:   (id)          => api.get(`/licencias/${id}`),
  dashboard: ()            => api.get('/licencias/dashboard'),
  alertas:   ()            => api.get('/licencias/alertas'),
  create:    (data)        => api.post('/licencias', data),
  update:    (id, data)    => api.put(`/licencias/${id}`, data),
  delete:    (id)          => api.delete(`/licencias/${id}`),
  actualizarEstados: ()    => api.put('/licencias/actualizar-estados', {}),
  exportar: async () => {
    const token = localStorage.getItem('pandora_token');
    const url   = `${BASE_URL}/licencias/exportar`;
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await res.text());
    const blob     = await res.blob();
    const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
                     || `iMET_Control_Licencias_${new Date().toISOString().slice(0,10)}.xlsx`;
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    URL.revokeObjectURL(href);
  },
};

export const ticketApi = {
  // Template
  getTemplate:      ()           => api.get('/tickets/template'),
  updateTemplate:   (data)       => api.put('/tickets/template', data),
  addField:         (data)       => api.post('/tickets/template/fields', data),
  updateField:      (id, data)   => api.put(`/tickets/template/fields/${id}`, data),
  deleteField:      (id)         => api.delete(`/tickets/template/fields/${id}`),
  reorderFields:    (items)      => api.put('/tickets/template/fields/reorder', items),
  // Puestos — catálogo
  getPositions:     ()           => api.get('/tickets/positions'),
  createPosition:   (area)       => api.post('/tickets/area-configs', { area }),
  deletePosition:   (id)         => api.delete(`/tickets/area-configs/${id}`),
  // Area configs (correos de notificación + gestión admin)
  getAreaConfigs:   ()           => api.get('/tickets/area-configs'),
  updateAreaConfigs:(configs)    => api.put('/tickets/area-configs', configs),
  // Tickets
  getAll:           (params)     => api.get('/tickets', { params }),
  getById:          (id)         => api.get(`/tickets/${id}`),
  create:           (formData)   => api.post('/tickets', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus:     (id, data)   => api.put(`/tickets/${id}/status`, data),
  addComment:       (id, data)   => api.post(`/tickets/${id}/comments`, data),
  delete:           (id)         => api.delete(`/tickets/${id}`),
};

export const categoriasApi = {
  getAll:  ()          => api.get('/procedimientos/categorias'),
  create:  (data)      => api.post('/procedimientos/categorias', data),
  update:  (id, data)  => api.put(`/procedimientos/categorias/${id}`, data),
  remove:  (id)        => api.delete(`/procedimientos/categorias/${id}`),
};

export const procedimientosApi = {
  getAll: (params = {}) => api.get('/procedimientos', { params }),
  upload: (file, meta) => {
    const form = new FormData();
    form.append('file', file);
    form.append('title',       meta.title       || '');
    form.append('description', meta.description || '');
    form.append('category',    meta.category    || '');
    return api.post('/procedimientos', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  remove: (id) => api.delete(`/procedimientos/${id}`),
  viewUrl: (id) => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/procedimientos/${id}/view?access_token=${token}`;
  },
  downloadUrl: (id) => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/procedimientos/${id}/download?access_token=${token}`;
  },
};

export const indicadoresApi = {
  getAll: () => api.get('/indicadores'),
  exportar: async () => {
    const token = localStorage.getItem('pandora_token');
    const url   = `${BASE_URL}/indicadores/export`;
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await res.text());
    const blob     = await res.blob();
    const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
                     || `Indicadores_Pandora_${new Date().toISOString().slice(0, 10)}.xlsx`;
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    URL.revokeObjectURL(href);
  },
};

export const comunicadosApi = {
  getAll:  (params = {}) => api.get('/comunicados', { params }),
  getById: (id)          => api.get(`/comunicados/${id}`),
  create:  (data)        => api.post('/comunicados', data),
  update:  (id, data)    => api.put(`/comunicados/${id}`, data),
  remove:  (id)          => api.delete(`/comunicados/${id}`),
};

export const notificacionesApi = {
  getAll:      ()     => api.get('/notifications'),
  unreadCount: ()     => api.get('/notifications/unread-count'),
  markRead:    (id)   => api.patch(`/notifications/${id}/read`),
  markAllRead: ()     => api.patch('/notifications/read-all'),
  create:      (data) => api.post('/notifications', data),
  remove:      (id)   => api.delete(`/notifications/${id}`),
};

export const searchApi = {
  global: (q) => api.get('/search', { params: { q } }),
};

export const adminApi = {
  downloadBackup: async () => {
    const token = localStorage.getItem('pandora_token');
    const url   = `${BASE_URL}/admin/backup/download`;
    const res   = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await res.text());
    const blob     = await res.blob();
    const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
                     || `PandoraDB_${new Date().toISOString().slice(0,10)}.sql`;
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    URL.revokeObjectURL(href);
  },
};

export default api;
