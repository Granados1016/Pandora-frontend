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
      window.location.href = '/login?expired=1';
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
      window.location.href = '/login?expired=1';
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
  getMail:        () => api.get('/reports/mail'),
  getInventory:   () => api.get('/reports/inventory'),
  getCalendar:    () => api.get('/reports/calendar'),
  // Vacaciones: usa el endpoint admin + agrega stats en el cliente
  getVacaciones: async (year) => {
    const y = year || new Date().getFullYear();
    const [solRes, polRes] = await Promise.all([
      api.get('/vacaciones/admin/solicitudes', { params: { year: y } }),
      api.get('/vacaciones/admin/politicas',   { params: { year: y } }),
    ]);
    const sols = solRes.data;
    const pols = polRes.data;

    // Por estado
    const byStatus = {};
    sols.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });

    // Por mes (usando startDate)
    const byMonth = Array.from({ length: 12 }, (_, i) => ({
      label: ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][i],
      total: 0, aprobadas: 0, dias: 0,
    }));
    sols.forEach(s => {
      if (!s.startDate) return;
      const m = parseInt(s.startDate.slice(5, 7)) - 1;
      byMonth[m].total++;
      if (s.status === 'Aprobado') { byMonth[m].aprobadas++; byMonth[m].dias += s.totalDays || 0; }
    });

    // Top usuarios por días aprobados
    const byUser = {};
    sols.filter(s => s.status === 'Aprobado').forEach(s => {
      if (!byUser[s.fullName]) byUser[s.fullName] = 0;
      byUser[s.fullName] += s.totalDays || 0;
    });
    const topUsuarios = Object.entries(byUser)
      .map(([name, days]) => ({ name, days }))
      .sort((a, b) => b.days - a.days)
      .slice(0, 10);

    const aprobadas  = sols.filter(s => s.status === 'Aprobado').length;
    const pendientes = sols.filter(s => s.status === 'Pendiente').length;
    const totalDias  = sols.filter(s => s.status === 'Aprobado').reduce((acc, s) => acc + (s.totalDays || 0), 0);

    return {
      data: {
        year: y,
        total: sols.length,
        aprobadas,
        pendientes,
        rechazadas: sols.filter(s => s.status === 'Rechazado').length,
        totalDias,
        byStatus: Object.entries(byStatus).map(([name, value]) => ({ name, value })),
        byMonth,
        topUsuarios,
        totalUsuariosConPolitica: pols.length,
      },
    };
  },
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
  changePassword: (data) => api.put('/users/me/change-password', data),
  uploadPhoto: (file) => uploadForm('/users/me/photo', file),
  deletePhoto: () => api.delete('/users/me/photo'),
  uploadBanner: (file) => uploadForm('/users/me/banner', file),
  deleteBanner: () => api.delete('/users/me/banner'),
  importCsv:    (users) => api.post('/users/import-csv', users),
};

export const authApi = {
  sendOtp:    (username)      => api.post('/auth/send-otp',    { username }),
  verifyOtp:  (data)          => api.post('/auth/verify-otp',  data),
  toggle2FA:  (username, enable) => api.post(`/auth/toggle-2fa/${username}`, { enable }),
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
  getChangelog:  (id)   => api.get(`/inventory/items/${id}/changelog`),
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
  exportICal: async () => {
    const token = localStorage.getItem('pandora_token');
    const res   = await fetch(`${BASE_URL}/calendar/export-ical`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(await res.text());
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = href; a.download = 'pandora-calendar.ics'; a.click();
    URL.revokeObjectURL(href);
  },

  // Correos de notificación de reservas de sala (Admin)
  getNotifEmails:    ()     => api.get('/calendar/notification-emails'),
  addNotifEmail:     (data) => api.post('/calendar/notification-emails', data),
  toggleNotifEmail:  (id)   => api.patch(`/calendar/notification-emails/${id}/toggle`),
  deleteNotifEmail:  (id)   => api.delete(`/calendar/notification-emails/${id}`),
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
  registrarPago:   (id, data) => api.post(`/licencias/${id}/pago`, data),
  pagoMasivo:      (data)     => api.post('/licencias/pagos/masivo', data),
  historialPagos:  (id)       => api.get(`/licencias/${id}/historial-pagos`),
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
  // Estadísticas
  getStats:         (year)       => api.get('/tickets/stats', { params: year ? { year } : undefined }),
};

export const vacacionesApi = {
  // Empleado
  getMiCalendario: (year) => api.get(`/vacaciones/mi-calendario/${year}`),
  getMisDias:      ()     => api.get('/vacaciones/mis-dias'),
  getMisSolicitudes:()    => api.get('/vacaciones/mis-solicitudes'),
  solicitar:       (data) => api.post('/vacaciones/solicitar', data),
  cancelar:        (id)   => api.delete(`/vacaciones/${id}/cancelar`),
  // Admin
  getAdminSolicitudes: (year) => api.get('/vacaciones/admin/solicitudes', { params: year ? { year } : undefined }),
  revisar:         (id, data) => api.put(`/vacaciones/admin/${id}/revisar`, data),
  getFestivos:     (year) => api.get(`/vacaciones/admin/festivos/${year}`),
  crearFestivo:    (data) => api.post('/vacaciones/admin/festivos', data),
  eliminarFestivo: (id)   => api.delete(`/vacaciones/admin/festivos/${id}`),
  getPoliticas:    (year) => api.get('/vacaciones/admin/politicas', { params: year ? { year } : undefined }),
  setPolitica:     (data) => api.put('/vacaciones/admin/politicas', data),
  getEquipo:       (year, month) => api.get(`/vacaciones/admin/equipo/${year}/${month}`),
  getCalendarioArea: (year, month) => api.get(`/vacaciones/admin/calendario-area/${year}/${month}`),
  revisarJefe:     (id, data)    => api.put(`/vacaciones/jefe/${id}/revisar`, data),
  exportExcel:     async (year, status) => {
    const token  = localStorage.getItem('pandora_token');
    const params = new URLSearchParams({ ...(year ? { year } : {}), ...(status ? { status } : {}) });
    const url    = `${BASE_URL}/vacaciones/admin/export-excel?${params}`;
    const res    = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(await res.text());
    const blob     = await res.blob();
    const filename = res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1]
                     || `Vacaciones_${year || new Date().getFullYear()}.xlsx`;
    const href = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = href; a.download = filename; a.click();
    URL.revokeObjectURL(href);
  },
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
    // null elimina el header en axios v1.x → browser XHR pone el Content-Type
    // con el boundary correcto: "multipart/form-data; boundary=----WebKitFormBoundaryXXXX"
    // Sin boundary el servidor no puede parsear el multipart body.
    return api.post('/procedimientos', form, { headers: { 'Content-Type': null } });
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
  // ── Versiones ──
  getVersions: (id) => api.get(`/procedimientos/${id}/versions`),
  uploadVersion: (id, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/procedimientos/${id}/versions`, form, { headers: { 'Content-Type': null } });
  },
  versionDownloadUrl: (id, vId) => {
    const token = localStorage.getItem('pandora_token');
    return `${BASE_URL}/procedimientos/${id}/versions/${vId}/download?access_token=${token}`;
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

export const capacitacionesApi = {
  getAll:          (params)     => api.get('/capacitaciones', { params }),
  getById:         (id)         => api.get(`/capacitaciones/${id}`),
  create:          (data)       => api.post('/capacitaciones', data),
  update:          (id, data)   => api.put(`/capacitaciones/${id}`, data),
  remove:          (id)         => api.delete(`/capacitaciones/${id}`),
  getCategorias:   ()           => api.get('/capacitaciones/categorias'),
  addParticipante: (id, data)   => api.post(`/capacitaciones/${id}/participantes`, data),
  updateParticipante: (id, partId, data) => api.put(`/capacitaciones/${id}/participantes/${partId}`, data),
};

export const activosFijosApi = {
  getAll:       (params)     => api.get('/activos-fijos', { params }),
  getById:      (id)         => api.get(`/activos-fijos/${id}`),
  create:       (data)       => api.post('/activos-fijos', data),
  update:       (id, data)   => api.put(`/activos-fijos/${id}`, data),
  remove:       (id)         => api.delete(`/activos-fijos/${id}`),
  getStats:     ()           => api.get('/activos-fijos/stats'),
  addMovimiento:(id, data)   => api.post(`/activos-fijos/${id}/movimientos`, data),
  exportExcel:  (params = {}) => api.get('/activos-fijos/export-excel', { params, responseType: 'blob' }),
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
  getSmtpSettings:  ()      => api.get('/admin/settings/smtp'),
  saveSmtpSettings: (data)  => api.post('/admin/settings/smtp', data),
  testSmtp:         (data)  => api.post('/admin/settings/smtp/test', data),
};

export const ejecutivoApi = {
  getStats: () => api.get('/ejecutivo/stats'),
};

export const bitacoraApi = {
  getAll:          (params = {}) => api.get('/bitacora', { params }),
  getById:         (id)          => api.get(`/bitacora/${id}`),
  create:          (data)        => api.post('/bitacora', data),
  update:          (id, data)    => api.put(`/bitacora/${id}`, data),
  remove:          (id)          => api.delete(`/bitacora/${id}`),
  addSeguimiento:  (id, data)    => api.post(`/bitacora/${id}/seguimiento`, data),
  getStats:        ()            => api.get('/bitacora/stats'),
};

export const mantenimientoApi = {
  getAll:          (params = {}) => api.get('/mantenimiento', { params }),
  getById:         (id)          => api.get(`/mantenimiento/${id}`),
  create:          (data)        => api.post('/mantenimiento', data),
  update:          (id, data)    => api.put(`/mantenimiento/${id}`, data),
  remove:          (id)          => api.delete(`/mantenimiento/${id}`),
  addSeguimiento:  (id, data)    => api.post(`/mantenimiento/${id}/seguimiento`, data),
  getStats:        ()            => api.get('/mantenimiento/stats'),
  uploadEvidencia: (id, file)    => {
    const form = new FormData(); form.append('file', file);
    return api.post(`/mantenimiento/${id}/evidencia`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  deleteEvidencia: (id, evId)    => api.delete(`/mantenimiento/${id}/evidencia/${evId}`),
  getEvidenciaUrl: (id, evId)    => `${BASE_URL}/mantenimiento/${id}/evidencia/${evId}`,
  exportCsv:       ()            => api.get('/mantenimiento/export', { responseType: 'blob' }),
};

export const checadorApi = {
  marcar:       (data)         => api.post('/checador/marcar', data),
  marcarFoto:   (formData)     => api.post('/checador/marcar-foto', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getHoy:       ()             => api.get('/checador/hoy'),
  getRegistros: (params = {})  => api.get('/checador/registros', { params }),
  getStats:     ()             => api.get('/checador/stats'),
  exportCsv:    (params = {})  => api.get('/checador/export', { params, responseType: 'blob' }),
  getFotoUrl:   (id)           => `${BASE_URL}/checador/foto/${id}`,
  getSitios:    ()             => api.get('/checador/sitios'),
  createSitio:  (data)         => api.post('/checador/sitios', data),
  updateSitio:  (id, data)     => api.put(`/checador/sitios/${id}`, data),
  deleteSitio:  (id)           => api.delete(`/checador/sitios/${id}`),
};

// ── Tenants (multi-tenant — panel maestro) ────────────────────────────────────
export const tenantsApi = {
  getAll:       ()           => api.get('/tenants'),
  getById:      (id)         => api.get(`/tenants/${id}`),
  create:       (data)       => api.post('/tenants', data),
  update:       (id, data)   => api.put(`/tenants/${id}`, data),
  toggle:       (id)         => api.patch(`/tenants/${id}/toggle`),
  uploadLogo:   (id, file)   => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/tenants/${id}/logo`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  getMyTenant:  (token)      => api.get('/tenants/me',
    token ? { headers: { Authorization: `Bearer ${token}` } } : undefined),
  getStats:     (id)         => api.get(`/tenants/${id}/stats`),
};

export default api;
