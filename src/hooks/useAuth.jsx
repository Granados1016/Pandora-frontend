import { createContext, useContext, useState, useCallback, useMemo, useEffect } from 'react';
import api, { registerTokenUpdater } from '../api/pandoraApi';

export const MODULES = {
  MAIL_PLUS:        1,
  INVENTARIO:       2,
  LICENCIAS:        4,
  HELPDESK:         8,
  ADMIN:            16,
  CALENDARIO:       32,
  CALENDARIO_ADMIN: 128,   // Puede reservar salas y gestionar solicitudes
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

  // Registrar el updater para que el interceptor de Axios pueda actualizar
  // el token en el estado React cuando hace un refresco silencioso.
  useEffect(() => {
    registerTokenUpdater((newToken) => {
      if (newToken) {
        localStorage.setItem('pandora_token', newToken);
      } else {
        localStorage.removeItem('pandora_token');
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

  const hasModule = useCallback((mod) => isAdmin || (modules & mod) !== 0, [isAdmin, modules]);

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
    // Guardar refresh token si el backend lo devuelve
    if (data.refreshToken) {
      localStorage.setItem('pandora_refresh_token', data.refreshToken);
    }
    setToken(data.token);
  }, []);

  const logout = useCallback(() => {
    // Invalidar refresh token en el servidor (best-effort, no bloquea el logout)
    const refreshToken = localStorage.getItem('pandora_refresh_token');
    if (refreshToken) {
      api.post('/auth/revoke', { refreshToken }).catch(() => {});
    }
    localStorage.removeItem('pandora_token');
    localStorage.removeItem('pandora_refresh_token');
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, username, fullName, role, modules, isAdmin,
      hasModule, hasRole, login, logout, isAuthenticated: !!token,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
