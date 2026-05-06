import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api, { registerTokenUpdater } from '../api/pandoraApi';

export const MODULES = {
  // ── Módulos principales ──────────────────────────────────────────────────
  MAIL_PLUS:        1,
  INVENTARIO:       2,
  LICENCIAS:        4,
  HELPDESK:         8,
  ADMIN:            16,
  CALENDARIO:       32,
  // bit 64 libre
  CALENDARIO_ADMIN: 128,

  // ── Sub-módulos de Inventario ────────────────────────────────────────────
  INV_DASHBOARD:    256,   // Ver dashboard/resumen de inventario
  INV_TYPES:        512,   // Ver y gestionar categorías de equipo
  INV_CATALOGS:     1024,  // Ver departamentos y personal

  // ── Sub-módulos de HelpDesk ──────────────────────────────────────────────
  HD_GLOBAL:        2048,  // Ver TODOS los tickets (sin esto = solo los propios)
  HD_REQUEST:       8192,  // Puede solicitar/crear nuevos tickets

  // ── Sub-módulos de Licencias ─────────────────────────────────────────────
  LIC_STATS:        4096,  // Ver dashboard de gastos y estadísticas

  // ── Sub-módulos de Calendario ────────────────────────────────────────────
  CAL_REQUEST:      16384, // Puede solicitar salas (sub-módulo de CALENDARIO)
};

export const MODULE_LABELS = {
  1:   'Mail+ (Correo Masivo)',
  2:   'Inventario',
  4:   'Control de Licencias',
  8:   'HelpDesk Tickets',
  16:  'Administración',
  32:  'Pandora Calendar (solo vista)',
  128: 'Pandora Calendar — Reservas y Gestión',
};

// Sub-módulos agrupados por módulo padre — se usan en Admin.jsx
export const SUB_MODULES = [
  { bit: MODULES.INV_DASHBOARD, parent: MODULES.INVENTARIO, label: 'Dashboard (resumen general)' },
  { bit: MODULES.INV_TYPES,     parent: MODULES.INVENTARIO, label: 'Categorías de equipo' },
  { bit: MODULES.INV_CATALOGS,  parent: MODULES.INVENTARIO, label: 'Departamentos y Personal' },
  { bit: MODULES.HD_GLOBAL,     parent: MODULES.HELPDESK,   label: 'Ver todos los tickets (sin marcar = solo los propios)' },
  { bit: MODULES.HD_REQUEST,    parent: MODULES.HELPDESK,   label: 'Solicitar tickets' },
  { bit: MODULES.LIC_STATS,     parent: MODULES.LICENCIAS,  label: 'Dashboard de gastos y estadísticas' },
  { bit: MODULES.CAL_REQUEST,   parent: MODULES.CALENDARIO, label: 'Solicitar salas' },
];

// ── Roles del sistema ────────────────────────────────────────────────────────
// Para agregar nuevos roles actualizar también:
//   backend: AppUser.cs (Role enum), AuthController.cs (claim generation)
export const ROLES = {
  ADMIN:         'Admin',
  INVENTARISTA:  'Inventarista',    // Gestión de inventario sin acceso total
  USER:          'User',
};

function parseJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return {};
  }
}

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('pandora_token'));
  // modulesViewOnly: bitmask de módulos con permiso de solo lectura.
  // Se obtiene de /api/users/me tras cada login (no viaja en el JWT).
  const [modulesViewOnly, setModulesViewOnly] = useState(
    () => parseInt(localStorage.getItem('pandora_mvo') || '0', 10)
  );

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

  // Devuelve true si el usuario tiene acceso al módulo/sub-módulo (vista o escritura)
  const hasModule = useCallback((mod) => isAdmin || (modules & mod) !== 0, [isAdmin, modules]);

  // Alias semántico para sub-módulos (misma lógica, nombre más claro)
  const hasSubModule = useCallback((bit) => isAdmin || (modules & bit) !== 0, [isAdmin, modules]);

  // Devuelve true si el usuario tiene acceso de ESCRITURA al módulo.
  // Admin siempre tiene escritura. Si el bit está en modulesViewOnly → solo vista.
  const hasModuleWrite = useCallback((mod) => {
    if (isAdmin) return true;
    if ((modules & mod) === 0) return false;          // sin acceso
    return (modulesViewOnly & mod) === 0;             // false = solo vista
  }, [isAdmin, modules, modulesViewOnly]);

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
    // Obtener modulesViewOnly del perfil (no viaja en el JWT)
    try {
      const me = await api.get('/users/me', {
        headers: { Authorization: `Bearer ${data.token}` },
      });
      const mvo = me.data?.modulesViewOnly ?? 0;
      localStorage.setItem('pandora_mvo', String(mvo));
      setModulesViewOnly(mvo);
    } catch {
      // No crítico: si falla, el usuario queda sin restricciones de solo vista
      localStorage.setItem('pandora_mvo', '0');
      setModulesViewOnly(0);
    }
  }, []);

  const logout = useCallback(() => {
    // Invalidar refresh token en el servidor (best-effort, no bloquea el logout)
    const refreshToken = localStorage.getItem('pandora_refresh_token');
    if (refreshToken) {
      api.post('/auth/revoke', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('pandora_token');
    localStorage.removeItem('pandora_refresh_token');
    localStorage.removeItem('pandora_mvo');
    setToken(null);
    setModulesViewOnly(0);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, username, fullName, role, modules, modulesViewOnly, isAdmin,
      hasModule, hasSubModule, hasModuleWrite, hasRole, login, logout, isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
