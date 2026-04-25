import api from './pandoraApi';

const BASE = '/biblioteca';

// ─── Categorías ───────────────────────────────────────────────────────────────

export const categoriasApi = {
  getAll:    ()        => api.get(`${BASE}/categorias`),
  getById:   (id)      => api.get(`${BASE}/categorias/${id}`),
  create:    (data)    => api.post(`${BASE}/categorias`, data),
  update:    (id, data)=> api.put(`${BASE}/categorias/${id}`, data),
  remove:    (id)      => api.delete(`${BASE}/categorias/${id}`),

  createSubcategoria: (categoriaId, data) =>
    api.post(`${BASE}/categorias/${categoriaId}/subcategorias`, data),
  updateSubcategoria: (id, data) =>
    api.put(`${BASE}/categorias/subcategorias/${id}`, data),
  removeSubcategoria: (id) =>
    api.delete(`${BASE}/categorias/subcategorias/${id}`),

  // Sincronizar desde carpetas del servidor (solo Admin)
  sincronizar: () => api.post(`${BASE}/categorias/sincronizar`),
};

// ─── Libros ───────────────────────────────────────────────────────────────────

export const librosApi = {
  dashboard: ()        => api.get(`${BASE}/libros/dashboard`),
  buscar: (params) => api.get(`${BASE}/libros`, { params }),
  getByCategoria: (categoriaId) =>
    api.get(`${BASE}/libros/categoria/${categoriaId}`),
  getById: (id) => api.get(`${BASE}/libros/${id}`),

  create: (formData) =>
    api.post(`${BASE}/libros`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  update:    (id, data)    => api.put(`${BASE}/libros/${id}`, data),
  remove:    (id)          => api.delete(`${BASE}/libros/${id}`),

  actualizarPortada: (id, formData) =>
    api.put(`${BASE}/libros/${id}/portada`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getVisualizarUrl: (id) => {
    const token = localStorage.getItem('pandora_token');
    return `/api${BASE}/libros/${id}/visualizar?access_token=${token}`;
  },
};

// ─── Favoritos ────────────────────────────────────────────────────────────────

export const favoritosApi = {
  getMios:  ()       => api.get(`${BASE}/favoritos`),
  agregar:  (libroId)=> api.post(`${BASE}/favoritos/${libroId}`),
  eliminar: (libroId)=> api.delete(`${BASE}/favoritos/${libroId}`),
};

// ─── Historial ────────────────────────────────────────────────────────────────

export const historialApi = {
  getMio:     ()     => api.get(`${BASE}/historial`),
  actualizar: (data) => api.put(`${BASE}/historial`, data),
  eliminar:   (libroId) => api.delete(`${BASE}/historial/${libroId}`),
};
