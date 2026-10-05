import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api, { registerTokenUpdater, tenantsApi } from '../api/pandoraApi';

export const MODULES = {
  // ── Módulos principales ──────────────────────────────────────────────────
  MAIL_PLUS:        1,
  INVENTARIO:       2,
  LICENCIAS:        4,
  HELPDESK:         8,
  ADMIN:            16,
  CALENDARIO:       32,   // Vista del calendario (solo lectura)
  CAL_ROOMS:        64,   // Gestión de Salas
  CALENDARIO_ADMIN: 128,  // Agendar y gestionar reservas directamente

  // ── Sub-módulos de Inventario ────────────────────────────────────────────
  INV_DASHBOARD:    256,   // Ver dashboard/resumen de inventario
  INV_TYPES:        512,   // Ver y gestionar categorías de equipo
  INV_CATALOGS:     1024,  // Ver departamentos y personal

  // ── Sub-módulos de HelpDesk ──────────────────────────────────────────────
  HD_GLOBAL:        2048,  // Ver TODOS los tickets (sin esto = solo los propios)
  HD_REQUEST:       8192,  // Puede solicitar/crear nuevos tickets

  // ── Sub-módulos de Licencias ─────────────────────────────────────────────
  LIC_STATS:        4096,  // Ver dashboard de gastos y estadísticas

  // ── Módulos de Calendario (granular) ────────────────────────────────────
  CAL_REQUEST:      16384,  // Solicitar sala (botón + click en día del calendario)

  // ── Módulos nuevos ────────────────────────────────────────────────────────
  PROCEDIMIENTOS:   32768,  // Módulo de gestión de procedimientos/documentos
  INDICADORES:      65536,  // Módulo de indicadores y KPIs
  COMUNICADOS:      131072, // Módulo de comunicados institucionales
  REPORTS:          262144, // Módulo de Reportes

  // ── Calendario — permisos granulares adicionales ─────────────────────────
  CAL_SOLICITUDES:  524288,  // Gestionar solicitudes de salas
  CAL_REPORTS_CAL:  1048576, // Reportes del calendario

  // ── Vacaciones ────────────────────────────────────────────────────────────
  VACACIONES:       2097152, // Ver calendario y solicitar vacaciones
  VAC_ADMIN:        4194304, // Gestionar solicitudes, festivos y políticas

  // ── Nuevos módulos ─────────────────────────────────────────────────────────
  CAPACITACIONES:   8388608,  // Módulo de capacitaciones y entrenamientos
  ACTIVOS_FIJOS:    16777216, // Módulo de activos fijos y depreciación
  BITACORA:         33554432, // Módulo de bitácora de incidencias
  MANTENIMIENTO:    67108864,  // Módulo de mantenimiento de equipos
  CHECADOR:         134217728, // Módulo de checador de asistencia
};

export const MODULE_LABELS = {
  1:       'Mail+ (Correo Masivo)',
  2:       'Inventario',
  4:       'Control de Licencias',
  8:       'HelpDesk / Tickets',
  16:      'Administración',
  32:      'Pandora Calendar — Vista del Calendario',
  64:      'Pandora Calendar — Gestión de Salas',
  128:     'Pandora Calendar — Agendar y Gestionar Reservas',
  16384:   'Pandora Calendar — Solicitar Sala',
  32768:   'Procedimientos / Documentos',
  65536:   'Indicadores y KPIs',
  131072:  'Comunicados Institucionales',
  262144:  'Reportes',
  524288:  'Pandora Calendar — Gestionar Solicitudes de Salas',
  1048576: 'Pandora Calendar — Reportes del Calendario',
  2097152: 'Vacaciones — Solicitar y ver calendario',
  4194304: 'Vacaciones — Gestión (aprobar, festivos, políticas)',
  8388608:  'Capacitaciones — Cursos y entrenamientos',
  16777216: 'Activos Fijos — Registro y depreciación',
  33554432: 'Bitácora — Registro de incidencias',
  67108864:  'Mantenimiento — Gestión de equipos',
  134217728: 'Checador — Registro de asistencia con GPS',
};

// Sub-módulos agrupados por módulo padre — se usan en Admin.jsx
export const SUB_MODULES = [
  // ── Inventario ──────────────────────────────────────────────────────────
  { bit: MODULES.INV_DASHBOARD, parent: MODULES.INVENTARIO, label: 'Dashboard de Inventario (resumen y gráficas)' },
  { bit: MODULES.INV_TYPES,     parent: MODULES.INVENTARIO, label: 'Gestión de Categorías de equipo' },
  { bit: MODULES.INV_CATALOGS,  parent: MODULES.INVENTARIO, label: 'Catálogos: Departamentos y Personal' },
  // ── HelpDesk / Tickets ──────────────────────────────────────────────────
  { bit: MODULES.HD_REQUEST,    parent: MODULES.HELPDESK,   label: 'Puede enviar / crear nuevos tickets' },
  { bit: MODULES.HD_GLOBAL,     parent: MODULES.HELPDESK,   label: 'Ver TODOS los tickets (sin marcar = solo los propios)' },
  // ── Licencias ────────────────────────────────────────────────────────────
  { bit: MODULES.LIC_STATS,     parent: MODULES.LICENCIAS,  label: 'Dashboard de gastos y estadísticas de licencias' },
  // ── Calendario: CAL_REQUEST ya es módulo independiente, sin sub-módulos ─
];

// ── Roles del sistema ────────────────────────────────────────────────────────
// Para agregar nuevos roles actualizar también:
//   backend: AppUser.cs (Role enum), AuthController.cs (claim generation)
export const ROLES = {
  SUPERADMIN:    'SuperAdmin',       // Proveedor: gestiona todos los clientes
  ADMIN:         'Admin',
  INVENTARISTA:  'Inventarista',    // Gestión de inventario sin acceso total
  USER:          'User',
};

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    // atob() solo maneja Latin-1. Los JWT payload están en UTF-8, por lo que
    // hay que convertir los bytes a percent-encoding antes de decodificar.
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return {};
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pandora_token'));
  const [modulesViewOnly, setModulesViewOnly] = useState(
    () => parseInt(localStorage.getItem('pandora_mvo') || '0', 10)
  );
  // Branding del tenant: se carga tras el login desde /api/tenants/me
  const [tenantBranding, setTenantBranding] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pandora_tenant') || 'null'); } catch { return null; }
  });

  const loadTenantBranding = useCallback(async (bearerToken) => {
    try {
      // Pasar el token directamente para evitar race condition con localStorage
      const { data } = await tenantsApi.getMyTenant(bearerToken);
      localStorage.setItem('pandora_tenant', JSON.stringify(data));
      setTenantBranding(data);
    } catch {
      // No crítico — si no hay tenant configurado se usa el branding por defecto
    }
  }, []);

  // Registrar el updater para que el interceptor de Axios pueda actualizar
  // el token en el estado React cuando hace un refresco silencioso.
  useEffect(() => {
    registerTokenUpdater((newToken) => {
      if (newToken) {
        localStorage.setItem('pandora_token', newToken);
      } else {
        localStorage.removeItem('pandora_token');
        localStorage.removeItem('pandora_mvo');
        setModulesViewOnly(0);
      }
      setToken(newToken);
    });
    return () => registerTokenUpdater(null);
  }, []);

  const claims = useMemo(() => token ? parseJwt(token) : {}, [token]);
  const username  = claims['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || claims.name || '';
  const fullName  = claims.fullName || username;
  const role      = claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] || claims.role || '';
  const modules   = parseInt(claims.modules || '0', 10);
  const isAdmin   = role === 'Admin';
  const tenantId  = claims.tenantId || null;
  // SuperAdmin del proveedor: gestiona todos los clientes. Cuando "entra como"
  // un cliente, el token de impersonación trae role='Admin' + impersonatedBy,
  // así que isAdmin=true y actúa como admin de ese tenant.
  const isSuperAdmin  = role === 'SuperAdmin';
  const impersonatedBy = claims.impersonatedBy || null;
  const isImpersonating = !!impersonatedBy;
  // Un SuperAdmin que NO está impersonando usa solo la consola de proveedor:
  // no debe ver módulos operativos (aunque su usuario tenga todos los bits).
  const consoleOnly = isSuperAdmin && !isImpersonating;

  // Devuelve true si el usuario tiene acceso al módulo/sub-módulo (vista o escritura)
  const hasModule = useCallback((mod) => {
    if (consoleOnly) return false;
    return isAdmin || (modules & mod) !== 0;
  }, [consoleOnly, isAdmin, modules]);

  // Alias semántico para sub-módulos (misma lógica, nombre más claro)
  const hasSubModule = useCallback((bit) => {
    if (consoleOnly) return false;
    return isAdmin || (modules & bit) !== 0;
  }, [consoleOnly, isAdmin, modules]);

  // Devuelve true si el usuario tiene acceso de ESCRITURA al módulo.
  // Admin siempre tiene escritura. Si el bit está en modulesViewOnly → solo vista.
  const hasModuleWrite = useCallback((mod) => {
    if (consoleOnly) return false;
    if (isAdmin) return true;
    if ((modules & mod) === 0) return false;          // sin acceso
    return (modulesViewOnly & mod) === 0;             // false = solo vista
  }, [consoleOnly, isAdmin, modules, modulesViewOnly]);

  // Devuelve true si el usuario tiene al menos uno de los roles permitidos.
  // Admin siempre tiene acceso a todo.
  const hasRole = useCallback((allowedRoles) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (isAdmin) return true;
    return allowedRoles.includes(role);
  }, [isAdmin, role]);

  const login = useCallback(async (user, password) => {
    const { data } = await api.post('/auth/login', { username: user, password });
    localStorage.setItem('pandora_token', data.token);
    if (data.refreshToken) {
      localStorage.setItem('pandora_refresh_token', data.refreshToken);
    }
    setToken(data.token);
    // Obtener modulesViewOnly y branding del tenant en paralelo
    await Promise.allSettled([
      (async () => {
        try {
          const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${data.token}` } });
          const mvo = me.data?.modulesViewOnly ?? 0;
          localStorage.setItem('pandora_mvo', String(mvo));
          setModulesViewOnly(mvo);
        } catch {
          localStorage.setItem('pandora_mvo', '0');
          setModulesViewOnly(0);
        }
      })(),
      loadTenantBranding(data.token),
    ]);
  }, [loadTenantBranding]);

  // loginWithToken — usado por el flujo 2FA cuando el OTP ya fue verificado
  const loginWithToken = useCallback(async (jwtToken, refreshToken) => {
    localStorage.setItem('pandora_token', jwtToken);
    if (refreshToken) localStorage.setItem('pandora_refresh_token', refreshToken);
    setToken(jwtToken);
    // Cargar modulesViewOnly y branding del tenant en paralelo (igual que login normal)
    await Promise.allSettled([
      (async () => {
        try {
          const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${jwtToken}` } });
          const mvo = me.data?.modulesViewOnly ?? 0;
          localStorage.setItem('pandora_mvo', String(mvo));
          setModulesViewOnly(mvo);
        } catch {
          localStorage.setItem('pandora_mvo', '0');
          setModulesViewOnly(0);
        }
      })(),
      loadTenantBranding(jwtToken),
    ]);
  }, [loadTenantBranding]);

  // ── Impersonación (SuperAdmin "entra como" un cliente) ────────────────────
  const impersonate = useCallback(async (tid) => {
    const { data } = await api.post(`/auth/impersonate/${tid}`);
    // Guardar el token real del SuperAdmin para poder volver sin re-login
    const current = localStorage.getItem('pandora_token');
    if (current) localStorage.setItem('pandora_superadmin_token', current);
    localStorage.setItem('pandora_token', data.token);
    setToken(data.token);
    try {
      const me = await api.get('/users/me', { headers: { Authorization: `Bearer ${data.token}` } });
      const mvo = me.data?.modulesViewOnly ?? 0;
      localStorage.setItem('pandora_mvo', String(mvo));
      setModulesViewOnly(mvo);
    } catch { localStorage.setItem('pandora_mvo', '0'); setModulesViewOnly(0); }
    await loadTenantBranding(data.token);
    return data; // { token, tenantId, tenantName }
  }, [loadTenantBranding]);

  const exitImpersonation = useCallback(() => {
    const su = localStorage.getItem('pandora_superadmin_token');
    if (!su) return false;
    localStorage.setItem('pandora_token', su);
    localStorage.removeItem('pandora_superadmin_token');
    localStorage.removeItem('pandora_tenant');
    localStorage.setItem('pandora_mvo', '0');
    setModulesViewOnly(0);
    setTenantBranding(null);
    setToken(su);
    return true;
  }, []);

  const logout = useCallback(() => {
    const refreshToken = localStorage.getItem('pandora_refresh_token');
    if (refreshToken) {
      api.post('/auth/revoke', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('pandora_token');
    localStorage.removeItem('pandora_refresh_token');
    localStorage.removeItem('pandora_mvo');
    localStorage.removeItem('pandora_tenant');
    setToken(null);
    setModulesViewOnly(0);
    setTenantBranding(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, username, fullName, role, modules, modulesViewOnly, isAdmin, isSuperAdmin,
      isImpersonating, impersonatedBy, consoleOnly,
      tenantId, tenantBranding,
      hasModule, hasSubModule, hasModuleWrite, hasRole,
      login, loginWithToken, logout, loadTenantBranding, impersonate, exitImpersonation,
      isAuthenticated: !!token,
      tokenExp: claims.exp ?? null,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
