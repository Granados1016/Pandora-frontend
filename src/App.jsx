import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, CssBaseline, LinearProgress } from '@mui/material';
import { ThemeModeProvider, useThemeMode } from './hooks/useThemeMode';
import { AuthProvider, useAuth, MODULES, ROLES } from './hooks/useAuth.jsx';
import Layout from './components/Layout';

// Páginas críticas (siempre necesarias en el primer render)
import Login        from './pages/Login';
import Unauthorized from './pages/Unauthorized';

// ── Lazy chunks — se cargan solo cuando se navega a esa ruta ──────────────────
const Dashboard    = lazy(() => import('./pages/Dashboard'));
const Profile      = lazy(() => import('./pages/Profile'));
const Reports      = lazy(() => import('./pages/Reports'));
const Admin        = lazy(() => import('./pages/Admin'));

// Mail+
const NewCampaign    = lazy(() => import('./pages/NewCampaign'));
const Campaigns      = lazy(() => import('./pages/Campaigns'));
const CampaignDetail = lazy(() => import('./pages/CampaignDetail'));
const Templates      = lazy(() => import('./pages/Templates'));

// Inventario
const InventoryDashboard = lazy(() => import('./pages/inventory/InventoryDashboard'));
const InventoryItems     = lazy(() => import('./pages/inventory/InventoryItems'));
const InventoryTypes     = lazy(() => import('./pages/inventory/InventoryTypes'));
const Departments        = lazy(() => import('./pages/catalogs/Departments'));
const Employees          = lazy(() => import('./pages/catalogs/Employees'));

// Licencias
const Licencias = lazy(() => import('./pages/Licencias'));

// Tickets
const TicketTemplateBuilder = lazy(() => import('./pages/tickets/TicketTemplateBuilder'));
const TicketsListPage       = lazy(() => import('./pages/tickets/TicketsListPage'));
const TicketFormPage        = lazy(() => import('./pages/tickets/TicketFormPage'));
const TicketDetailPage      = lazy(() => import('./pages/tickets/TicketDetailPage'));

// Procedimientos e Indicadores
const ProcedimientosPage = lazy(() => import('./pages/procedimientos/ProcedimientosPage'));
const IndicadoresPage    = lazy(() => import('./pages/indicadores/IndicadoresPage'));

// Comunicados y Auditoría
const ComunicadosPage = lazy(() => import('./pages/comunicados/ComunicadosPage'));
const AuditPage       = lazy(() => import('./pages/admin/AuditPage'));

// Calendario
const CalendarPage        = lazy(() => import('./pages/calendar/CalendarPage'));
const RoomsManager        = lazy(() => import('./pages/calendar/RoomsManager'));
const RoomRequestForm     = lazy(() => import('./pages/calendar/RoomRequestForm'));
const RoomRequestsManager = lazy(() => import('./pages/calendar/RoomRequestsManager'));
const CalendarReports     = lazy(() => import('./pages/calendar/CalendarReports'));

// ── Fallback global para Suspense ─────────────────────────────────────────────
function PageLoader() {
  return <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />;
}

// ── ProtectedRoute ────────────────────────────────────────────────────────────
// Props:
//   adminOnly      — solo Admin (compat. hacia atrás)
//   allowedRoles   — array de ROLES permitidos (Admin siempre pasa)
//   requiredModule — constante de MODULES que el usuario debe tener habilitada
function ProtectedRoute({
  children,
  adminOnly       = false,
  allowedRoles    = null,
  requiredModule  = null,
  requiredAnyModules = null,
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

  // 5. Al menos uno de varios módulos (Admin siempre pasa)
  if (requiredAnyModules !== null && !isAdmin && !requiredAnyModules.some(m => hasModule(m)))
    return <Navigate to="/unauthorized" replace />;

  return children;
}

// ── Rutas de la aplicación ────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
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
              <Route path="/reports" element={
                <ProtectedRoute requiredModule={MODULES.REPORTS}>
                  <Reports />
                </ProtectedRoute>
              } />

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
                <ProtectedRoute requiredModule={MODULES.INV_DASHBOARD}>
                  <InventoryDashboard />
                </ProtectedRoute>
              } />
              <Route path="/inventory/items" element={
                <ProtectedRoute requiredModule={MODULES.INVENTARIO}>
                  <InventoryItems />
                </ProtectedRoute>
              } />
              <Route path="/inventory/types" element={
                <ProtectedRoute requiredModule={MODULES.INV_TYPES}>
                  <InventoryTypes />
                </ProtectedRoute>
              } />
              <Route path="/catalogs/departments" element={
                <ProtectedRoute requiredModule={MODULES.INV_CATALOGS}>
                  <Departments />
                </ProtectedRoute>
              } />
              <Route path="/catalogs/employees" element={
                <ProtectedRoute requiredModule={MODULES.INV_CATALOGS}>
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
                <ProtectedRoute requiredAnyModules={[MODULES.HELPDESK]}>
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
                <ProtectedRoute requiredAnyModules={[MODULES.CAL_REQUEST, MODULES.CALENDARIO_ADMIN]}>
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

              {/* ── Procedimientos ──────────────────────────────────────── */}
              <Route path="/procedimientos" element={
                <ProtectedRoute requiredModule={MODULES.PROCEDIMIENTOS}>
                  <ProcedimientosPage />
                </ProtectedRoute>
              } />

              {/* ── Indicadores ─────────────────────────────────────────── */}
              <Route path="/indicadores" element={
                <ProtectedRoute requiredModule={MODULES.INDICADORES}>
                  <IndicadoresPage />
                </ProtectedRoute>
              } />

              {/* ── Comunicados ─────────────────────────────────────────── */}
              <Route path="/comunicados" element={
                <ProtectedRoute requiredModule={MODULES.COMUNICADOS}>
                  <ComunicadosPage />
                </ProtectedRoute>
              } />

              {/* ── Auditoría — solo Admin ───────────────────────────────── */}
              <Route path="/admin/audit" element={
                <ProtectedRoute adminOnly>
                  <AuditPage />
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
    </Suspense>
  );
}

function ThemedApp() {
  const { theme } = useThemeMode();
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default function App() {
  return (
    <ThemeModeProvider>
      <ThemedApp />
    </ThemeModeProvider>
  );
}
