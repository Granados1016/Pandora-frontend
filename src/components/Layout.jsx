import React, { useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Divider, Avatar, Tooltip, Collapse,
} from '@mui/material';

// ── Íconos de navegación ──────────────────────────────────────────────────────
import DashboardIcon            from '@mui/icons-material/Dashboard';
import EmailIcon                from '@mui/icons-material/Email';
import ArticleIcon              from '@mui/icons-material/Article';
import SendIcon                 from '@mui/icons-material/Send';
import MenuIcon                 from '@mui/icons-material/Menu';
import LogoutIcon               from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon   from '@mui/icons-material/AdminPanelSettings';
import AccountCircleIcon        from '@mui/icons-material/AccountCircle';
import InventoryIcon            from '@mui/icons-material/Inventory2';
import CategoryIcon             from '@mui/icons-material/Category';
import BarChartIcon             from '@mui/icons-material/BarChart';
import ApartmentIcon            from '@mui/icons-material/Apartment';
import PeopleIcon               from '@mui/icons-material/People';
import CalendarMonthIcon        from '@mui/icons-material/CalendarMonth';
import MeetingRoomIcon          from '@mui/icons-material/MeetingRoom';
import AddCircleOutlineIcon     from '@mui/icons-material/AddCircleOutline';
import PendingActionsIcon       from '@mui/icons-material/PendingActions';
import AssessmentIcon           from '@mui/icons-material/Assessment';
import BarChartOutlinedIcon     from '@mui/icons-material/BarChartOutlined';
import ChevronLeftIcon          from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon         from '@mui/icons-material/ChevronRight';
import VpnKeyIcon               from '@mui/icons-material/VpnKey';
import ConfirmationNumberIcon   from '@mui/icons-material/ConfirmationNumber';
import AddTaskIcon              from '@mui/icons-material/AddTask';
import TuneIcon                 from '@mui/icons-material/Tune';
import ExpandLessIcon           from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon           from '@mui/icons-material/ExpandMore';

import { useAuth, MODULES } from '../hooks/useAuth.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────
const EXPANDED_W  = 260;
const COLLAPSED_W = 72;
const STORAGE_KEY = 'pandora_sidebar_open';

const TRANSITION = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

// ── Componente principal ──────────────────────────────────────────────────────
export default function Layout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { username, fullName, isAdmin, hasModule, logout } = useAuth();

  // Estado del sidebar (desktop)
  const [open, setOpen] = useState(
    () => localStorage.getItem(STORAGE_KEY) !== 'false'
  );
  // Drawer temporal en móvil
  const [mobileOpen, setMobileOpen] = useState(false);

  // Secciones colapsadas (por label)
  const [collapsedSections, setCollapsedSections] = useState({});

  const toggleSection = useCallback((label) => {
    setCollapsedSections(prev => ({ ...prev, [label]: !prev[label] }));
  }, []);

  // Foto y puesto del usuario
  const [profilePhoto, setProfilePhoto] = useState(
    () => localStorage.getItem('pandora_profile_photo') || null
  );
  const [position, setPosition] = useState(
    () => localStorage.getItem('pandora_user_position') || null
  );

  // Cargar datos del usuario al montar
  React.useEffect(() => {
    import('../api/pandoraApi').then(({ userApi }) => {
      userApi.me().then(r => {
        const photo = r.data?.profilePhotoUrl || null;
        const pos   = r.data?.position        || null;
        setProfilePhoto(photo);
        setPosition(pos);
        if (photo) localStorage.setItem('pandora_profile_photo', photo);
        else        localStorage.removeItem('pandora_profile_photo');
        if (pos)  localStorage.setItem('pandora_user_position', pos);
        else      localStorage.removeItem('pandora_user_position');
      }).catch(() => {});
    });
  }, [username]);

  React.useEffect(() => {
    const onStorage = () => {
      setProfilePhoto(localStorage.getItem('pandora_profile_photo') || null);
      setPosition(localStorage.getItem('pandora_user_position')     || null);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('pandora_profile_photo');
    localStorage.removeItem('pandora_user_position');
    logout();
    navigate('/login');
  };

  const toggleSidebar = useCallback(() => {
    setOpen(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  // ── Secciones de navegación ─────────────────────────────────────────────────
  const navSections = [
    {
      items: [
        { label: 'Dashboard', icon: <DashboardIcon />, path: '/', show: true },
      ],
    },
    {
      label: 'Mail+',
      show: hasModule(MODULES.MAIL_PLUS),
      items: [
        { label: 'Nueva Campaña', icon: <SendIcon />,    path: '/campaigns/new', show: hasModule(MODULES.MAIL_PLUS) },
        { label: 'Campañas',      icon: <EmailIcon />,   path: '/campaigns',     show: hasModule(MODULES.MAIL_PLUS) },
        { label: 'Plantillas',    icon: <ArticleIcon />, path: '/templates',     show: hasModule(MODULES.MAIL_PLUS) },
      ],
    },
    {
      label: 'Inventario',
      show: hasModule(MODULES.INVENTARIO),
      items: [
        { label: 'Dashboard',  icon: <BarChartIcon />,  path: '/inventory',       show: hasModule(MODULES.INVENTARIO) },
        { label: 'Equipos',    icon: <InventoryIcon />, path: '/inventory/items', show: hasModule(MODULES.INVENTARIO) },
        { label: 'Categorías', icon: <CategoryIcon />,  path: '/inventory/types', show: hasModule(MODULES.INVENTARIO) },
      ],
    },
    {
      label: 'Catálogos',
      show: hasModule(MODULES.INVENTARIO),
      items: [
        { label: 'Departamentos', icon: <ApartmentIcon />, path: '/catalogs/departments', show: hasModule(MODULES.INVENTARIO) },
        { label: 'Personal',      icon: <PeopleIcon />,    path: '/catalogs/employees',   show: hasModule(MODULES.INVENTARIO) },
      ],
    },
    {
      label: 'Tickets',
      show: hasModule(MODULES.HELPDESK) || isAdmin,
      items: [
        { label: 'Mis Tickets',    icon: <ConfirmationNumberIcon />, path: '/tickets',          show: hasModule(MODULES.HELPDESK) || isAdmin },
        { label: 'Nuevo Ticket',   icon: <AddTaskIcon />,            path: '/tickets/new',      show: hasModule(MODULES.HELPDESK) || isAdmin },
        { label: 'Configurar',     icon: <TuneIcon />,               path: '/tickets/template', show: isAdmin },
      ],
    },
    {
      label: 'Licencias',
      show: hasModule(MODULES.LICENCIAS) || isAdmin,
      items: [
        { label: 'Control de Licencias', icon: <VpnKeyIcon />, path: '/licencias', show: hasModule(MODULES.LICENCIAS) || isAdmin },
      ],
    },
    {
      label: 'Calendario',
      show: hasModule(MODULES.CALENDARIO) || hasModule(MODULES.CALENDARIO_ADMIN),
      items: [
        { label: 'Pandora Calendar',  icon: <CalendarMonthIcon />,   path: '/calendar',             show: hasModule(MODULES.CALENDARIO) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Salas',             icon: <MeetingRoomIcon />,      path: '/calendar/rooms',       show: hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Nueva Solicitud',   icon: <AddCircleOutlineIcon />, path: '/calendar/solicitud',   show: hasModule(MODULES.CALENDARIO) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Solicitudes',       icon: <PendingActionsIcon />,   path: '/calendar/solicitudes', show: hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Reportes',          icon: <BarChartOutlinedIcon />, path: '/calendar/reports',     show: hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
      ],
    },
    {
      label: 'Reportes',
      show: true,
      items: [
        { label: 'Reportes', icon: <AssessmentIcon />, path: '/reports', show: true },
      ],
    },
    {
      label: 'Mi Cuenta',
      show: true,
      items: [
        { label: 'Mi Perfil', icon: <AccountCircleIcon />, path: '/profile', show: true },
      ],
    },
    {
      label: 'Sistema',
      show: isAdmin,
      items: [
        { label: 'Administración', icon: <AdminPanelSettingsIcon />, path: '/admin', show: isAdmin },
      ],
    },
  ];

  // ── Ítem de navegación ──────────────────────────────────────────────────────
  const NavItem = ({ label, icon, path }) => {
    const active = pathname === path || (path !== '/' && pathname.startsWith(path));

    const btn = (
      <ListItem disablePadding sx={{ px: open ? 1.5 : 1, py: 0.3 }}>
        <ListItemButton
          onClick={() => { navigate(path); setMobileOpen(false); }}
          sx={{
            borderRadius: 2,
            justifyContent: open ? 'flex-start' : 'center',
            px: open ? 1.5 : 1,
            py: 1.1,
            minHeight: 44,
            bgcolor: active ? 'rgba(255,255,255,0.15)' : 'transparent',
            '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' },
          }}
        >
          <ListItemIcon
            sx={{
              color: active ? 'white' : 'rgba(255,255,255,0.55)',
              minWidth: open ? 40 : 'unset',
              justifyContent: 'center',
            }}
          >
            {icon}
          </ListItemIcon>
          {open && (
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontWeight: active ? 700 : 400,
                color: active ? 'white' : 'rgba(255,255,255,0.7)',
                fontSize: 14,
                noWrap: true,
              }}
            />
          )}
        </ListItemButton>
      </ListItem>
    );

    // Cuando está colapsado, envolver con Tooltip
    return open ? btn : (
      <Tooltip title={label} placement="right" arrow>
        {btn}
      </Tooltip>
    );
  };

  // ── Contenido del sidebar ───────────────────────────────────────────────────
  const SidebarContent = ({ isDrawer = false }) => (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Logo ─────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          px: open || isDrawer ? 3 : 0,
          pt: 2.5, pb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open || isDrawer ? 'flex-start' : 'center',
          minHeight: 72,
        }}
      >
        {open || isDrawer ? (
          <Box>
            <Typography variant="h5" fontWeight={800} color="white" letterSpacing={2}>
              PANDORA
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" display="block" mt={0.25}>
              Sistema de Gestión
            </Typography>
          </Box>
        ) : (
          <Tooltip title="PANDORA" placement="right" arrow>
            <Typography
              fontWeight={900} fontSize={20} color="white"
              sx={{ cursor: 'default', letterSpacing: 1 }}
            >
              P
            </Typography>
          </Tooltip>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Navegación ────────────────────────────────────────────────────────── */}
      <List
        sx={{ flex: 1, pt: 1, pb: 1, overflowY: 'auto', overflowX: 'hidden',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(255,255,255,0.15)', borderRadius: 2 },
        }}
      >
        {navSections.map((section, si) => {
          if (section.show === false) return null;
          const isSectionCollapsed = section.label ? !!collapsedSections[section.label] : false;
          const visibleItems = section.items.filter(i => i.show !== false);

          return (
            <React.Fragment key={si}>
              {/* Encabezado de sección — solo cuando expandido, clickeable */}
              {section.label && (open || isDrawer) && (
                <ListItemButton
                  onClick={() => toggleSection(section.label)}
                  sx={{
                    px: 3, pt: si === 0 ? 0.5 : 1.5, pb: 0.5,
                    minHeight: 'unset',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                    borderRadius: 1,
                    mx: 1,
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      color: 'rgba(255,255,255,0.4)',
                      fontWeight: 700, letterSpacing: 1, fontSize: 10,
                      textTransform: 'uppercase',
                      userSelect: 'none',
                    }}
                  >
                    {section.label}
                  </Typography>
                  {isSectionCollapsed
                    ? <ExpandMoreIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }} />
                    : <ExpandLessIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.3)' }} />
                  }
                </ListItemButton>
              )}
              {/* Separador cuando sidebar colapsado */}
              {section.label && !open && !isDrawer && si > 0 && (
                <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', my: 0.5, mx: 1 }} />
              )}
              {/* Items con animación de colapso */}
              <Collapse in={!isSectionCollapsed || !open && !isDrawer} timeout={200} unmountOnExit>
                {visibleItems.map(item => (
                  <NavItem key={item.path} {...item} />
                ))}
              </Collapse>
            </React.Fragment>
          );
        })}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

      {/* Usuario ────────────────────────────────────────────────────────────── */}
      <Box
        sx={{
          p: open || isDrawer ? 2 : 1,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          justifyContent: open || isDrawer ? 'flex-start' : 'center',
          flexWrap: 'nowrap',
        }}
      >
        <Tooltip title={open || isDrawer ? '' : (fullName || username)} placement="right">
          <Avatar
            src={profilePhoto || undefined}
            onClick={() => navigate('/profile')}
            sx={{
              width: 36, height: 36,
              bgcolor: 'secondary.main',
              fontSize: 14, fontWeight: 700,
              cursor: 'pointer', flexShrink: 0,
              '&:hover': { opacity: 0.85 },
            }}
          >
            {!profilePhoto && ((fullName || username)?.[0]?.toUpperCase() ?? 'U')}
          </Avatar>
        </Tooltip>

        {(open || isDrawer) && (
          <Box flex={1} minWidth={0}>
            <Typography
              variant="body2" color="white" fontWeight={600}
              lineHeight={1.2} noWrap
              sx={{ cursor: 'pointer', '&:hover': { opacity: 0.85 } }}
              onClick={() => navigate('/profile')}
            >
              {fullName || username}
            </Typography>
            <Typography variant="caption" color="rgba(255,255,255,0.5)" noWrap display="block">
              {position || (isAdmin ? 'Administrador' : 'Usuario')}
            </Typography>
          </Box>
        )}

        {(open || isDrawer) && (
          <>
            <Tooltip title="Mi perfil">
              <IconButton size="small" onClick={() => navigate('/profile')}
                sx={{ color: 'rgba(255,255,255,0.55)', '&:hover': { color: 'white' } }}>
                <AccountCircleIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cerrar sesión">
              <IconButton size="small" onClick={handleLogout}
                sx={{ color: 'rgba(255,255,255,0.55)', '&:hover': { color: 'white' } }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}

        {!open && !isDrawer && (
          <Tooltip title="Cerrar sesión" placement="right">
            <IconButton size="small" onClick={handleLogout}
              sx={{ color: 'rgba(255,255,255,0.45)', '&:hover': { color: 'white' } }}>
              <LogoutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>

      {/* ── AppBar solo móvil ──────────────────────────────────────────────── */}
      <AppBar
        position="fixed"
        sx={{ display: { md: 'none' }, zIndex: t => t.zIndex.drawer + 1, bgcolor: 'primary.main' }}
      >
        <Toolbar>
          <IconButton color="inherit" onClick={() => setMobileOpen(!mobileOpen)}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" fontWeight={800} ml={1}>PANDORA</Typography>
        </Toolbar>
      </AppBar>

      {/* ── Drawer temporal (móvil) ───────────────────────────────────────── */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{ display: { md: 'none' } }}
        PaperProps={{ sx: { width: EXPANDED_W, border: 'none', bgcolor: 'primary.main' } }}
      >
        <SidebarContent isDrawer />
      </Drawer>

      {/* ── Sidebar permanente (desktop) ──────────────────────────────────── */}
      <Box
        sx={{
          display: { xs: 'none', md: 'flex' },
          flexDirection: 'column',
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: open ? EXPANDED_W : COLLAPSED_W,
          transition: TRANSITION,
          bgcolor: 'primary.main',
          zIndex: t => t.zIndex.drawer,
          boxShadow: '2px 0 12px rgba(0,0,0,0.15)',
          overflow: 'hidden',
        }}
      >
        <SidebarContent />

        {/* ── Botón toggle (chevron) ─────────────────────────────────────── */}
        <Tooltip title={open ? 'Contraer menú' : 'Expandir menú'} placement="right">
          <IconButton
            onClick={toggleSidebar}
            size="small"
            sx={{
              position: 'absolute',
              top: 22,
              right: -12,
              width: 24, height: 24,
              bgcolor: 'primary.main',
              border: '2px solid rgba(255,255,255,0.2)',
              color: 'rgba(255,255,255,0.7)',
              zIndex: 10,
              '&:hover': {
                bgcolor: 'primary.dark',
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)',
              },
              transition: 'all 0.2s',
            }}
          >
            {open
              ? <ChevronLeftIcon  sx={{ fontSize: 16 }} />
              : <ChevronRightIcon sx={{ fontSize: 16 }} />}
          </IconButton>
        </Tooltip>
      </Box>

      {/* ── Área principal ────────────────────────────────────────────────── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          ml: { xs: 0, md: `${open ? EXPANDED_W : COLLAPSED_W}px` },
          transition: { md: `margin-left ${TRANSITION}` },
          pt: { xs: 8, md: 0 },
          bgcolor: 'background.default',
          minHeight: '100vh',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
