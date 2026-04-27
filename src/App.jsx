import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import pandoraTheme from './theme';
import { AuthProvider, useAuth, MODULES, ROLES } from './hooks/useAuth.jsx';
import Layout from './components/Layout';

// ── Páginas generales ─────────────────────────────────────────────────────────
import Dashboard    from './pages/Dashboard';
import Profile      from './pages/Profile';
import Reports      from './pages/Reports';
import Login        from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import Admin        from './pages/Admin';

// ── Mail+ ─────────────────────────────────────────────────────────────────────
import NewCampaign    from './pages/NewCampaign';
import Campaigns      from './pages/Campaigns';
import CampaignDetail from './pages/CampaignDetail';
import Templates      from './pages/Templates';

// ── Inventario ────────────────────────────────────────────────────────────────
import InventoryDashboard from './pages/inventory/InventoryDashboard';
import InventoryItems     from './pages/inventory/InventoryItems';
import InventoryTypes     from './pages/inventory/InventoryTypes';
import Departments        from './pages/catalogs/Departments';
import Employees          from './pages/catalogs/Employees';

// ── Licencias ─────────────────────────────────────────────────────────────────
import Licencias from './pages/Licencias';

// ── Tickets ───────────────────────────────────────────────────────────────────
import TicketTemplateBuilder from './pages/tickets/TicketTemplateBuilder';
import TicketsListPage       from './pages/tickets/TicketsListPage';
import TicketFormPage        from './pages/tickets/TicketFormPage';
import TicketDetailPage      from './pages/tickets/TicketDetailPage';

// ── Calendario ────────────────────────────────────────────────────────────────
import CalendarPage        from './pages/calendar/CalendarPage';
import RoomsManager        from './pages/calendar/RoomsManager';
import RoomRequestForm     from './pages/calendar/RoomRequestForm';
import RoomRequestsManager from './pages/calendar/RoomRequestsManager';
import CalendarReports     from './pages/calendar/CalendarReports';

// ── ProtectedRoute ────────────────────────────────────────────────────────────
// Props:
//   adminOnly      — solo Admin (compat. hacia atrás)
//   allowedRoles   — array de ROLES permitidos (Admin siempre pasa)
//   requiredModule — constante de MODULES que el usuario debe tener habilitada
function ProtectedRoute({
  children,
  adminOnly    = false,
  allowedRoles = null,
  requiredModule = null,
}) {
  const { isAuthenticated, isAdmin, hasModule, hasRole } = useAuth();
  const location = useLocation();

  // 1. Sin sesión → login
  if (!isAuthenticated)
    return <Navigate to="/login" state={{ from: location }} replace />;

  // 2. Solo Admin
  if (adminOnly && !isAdmin)
    return <Navigate to="/unauthorized" replace />;

  // 3. Roles específicos
  if (allowedRoles && !hasRole(allowedRoles))
    return <Navigate to="/unauthorized" replace />;

  // 4. Módulo requerido (Admin siempre pasa)
  if (requiredModule !== null && !isAdmin && !hasModule(requiredModule))
    return <Navigate to="/unauthorized" replace />;

  return children;
}

// ── Rutas de la aplicación ────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login"        element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Protegidas */}
      <Route path="/*" element={
        <ProtectedRoute>
          <Layout>
            <Routes>

              {/* ── Sin módulo requerido ─────────────────────────────────── */}
              <Route path="/"        element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/reports" element={<Reports />} />

              {/* ── Mail+ ───────────────────────────────────────────────── */}
              <Route path="/campaigns" element={
                <ProtectedRoute requiredModule={MODULES.MAIL_PLUS}>
                  <Campaigns />
                </ProtectedRoute>
              } />
              <Route path="/campaigns/new" element={
                <ProtectedRoute requiredModule={MODULES.MAIL_PLUS}>
                  <NewCampaign />
                </ProtectedRoute>
              } />
              <Route path="/campaigns/:id" element={
                <ProtectedRoute requiredModule={MODULES.MAIL_PLUS}>
                  <CampaignDetail />
                </ProtectedRoute>
              } />
              <Route path="/templates" element={
                <ProtectedRoute requiredModule={MODULES.MAIL_PLUS}>
                  <Templates />
                </ProtectedRoute>
              } />

              {/* ── Inventario ──────────────────────────────────────────── */}
              <Route path="/inventory" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <InventoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/inventory/items" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <InventoryItems />
                </ProtectedRoute>
              } />
              <Route path="/inventory/types" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <InventoryTypes />
                </ProtectedRoute>
              } />
              <Route path="/catalogs/departments" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <Departments />
                </ProtectedRoute>
              } />
              <Route path="/catalogs/employees" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <Employees />
                </ProtectedRoute>
              } />

              {/* ── Tickets ─────────────────────────────────────────────── */}
              <Route path="/tickets/template" element={
                <ProtectedRoute adminOnly>
                  <TicketTemplateBuilder />
                </ProtectedRoute>
              } />
              <Route path="/tickets/new" element={
                <ProtectedRoute requiredModule={MODULES.HELPDESK}>
                  <TicketFormPage />
                </ProtectedRoute>
              } />
              <Route path="/tickets/:id" element={
                <ProtectedRoute requiredModule={MODULES.HELPDESK}>
                  <TicketDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/tickets" element={
                <ProtectedRoute requiredModule={MODULES.HELPDESK}>
                  <TicketsListPage />
                </ProtectedRoute>
              } />

              {/* ── Licencias ───────────────────────────────────────────── */}
              <Route path="/licencias" element={
                <ProtectedRoute requiredModule={MODULES.LICENCIAS}>
                  <Licencias />
                </ProtectedRoute>
              } />

              {/* ── Calendario ──────────────────────────────────────────── */}
              <Route path="/calendar" element={
                <ProtectedRoute requiredModule={MODULES.CALENDARIO}>
                  <CalendarPage />
                </ProtectedRoute>
              } />
              <Route path="/calendar/rooms" element={
                <ProtectedRoute requiredModule={MODULES.CALENDARIO_ADMIN}>
                  <RoomsManager />
                </ProtectedRoute>
              } />
              <Route path="/calendar/solicitud" element={
                <ProtectedRoute requiredModule={MODULES.CALENDARIO}>
                  <RoomRequestForm />
                </ProtectedRoute>
              } />
              <Route path="/calendar/solicitudes" element={
                <ProtectedRoute requiredModule={MODULES.CALENDARIO_ADMIN}>
                  <RoomRequestsManager />
                </ProtectedRoute>
              } />
              <Route path="/calendar/reports" element={
                <ProtectedRoute requiredModule={MODULES.CALENDARIO_ADMIN}>
                  <CalendarReports />
                </ProtectedRoute>
              } />

              {/* ── Administración del sistema — solo Admin ─────────────── */}
              <Route path="/admin" element={
                <ProtectedRoute adminOnly>
                  <Admin />
                </ProtectedRoute>
              } />

            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={pandoraTheme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}
