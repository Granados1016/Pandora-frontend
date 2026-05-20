import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  AppBar, Toolbar, Typography, IconButton, Divider, Avatar, Tooltip, Collapse,
  Badge, InputBase, Paper, Chip, Stack, ClickAwayListener, Popper, Dialog,
  DialogTitle, DialogContent, DialogContentText, DialogActions, Button,
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
import DescriptionIcon          from '@mui/icons-material/Description';
import ShowChartIcon            from '@mui/icons-material/ShowChart';
import CampaignIcon             from '@mui/icons-material/Campaign';
import NotificationsNoneIcon    from '@mui/icons-material/NotificationsNone';
import NotificationsIcon        from '@mui/icons-material/Notifications';
import SearchIcon               from '@mui/icons-material/Search';
import HistoryIcon              from '@mui/icons-material/History';
import BeachAccessIcon          from '@mui/icons-material/BeachAccess';
import HowToRegIcon             from '@mui/icons-material/HowToReg';
import EventBusyIcon            from '@mui/icons-material/EventBusy';
import OpenInNewIcon            from '@mui/icons-material/OpenInNew';
import DarkModeIcon             from '@mui/icons-material/DarkMode';
import LightModeIcon            from '@mui/icons-material/LightMode';

import { useAuth, MODULES } from '../hooks/useAuth.jsx';
import { useNotifications } from '../hooks/useNotifications';
import { searchApi } from '../api/pandoraApi';
import { useThemeMode } from '../hooks/useThemeMode';

// ── Constantes ────────────────────────────────────────────────────────────────
const EXPANDED_W  = 260;
const COLLAPSED_W = 72;
const STORAGE_KEY = 'pandora_sidebar_open';

const TRANSITION = 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)';

// ── Componente principal ──────────────────────────────────────────────────────
export default function Layout({ children }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { username, fullName, isAdmin, hasModule, hasSubModule, hasModuleWrite, logout } = useAuth();
  const { mode, toggleMode } = useThemeMode();

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

  // ── Confirmación de cierre de sesión (#1) ──────────────────────────────────
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const confirmLogout = () => {
    localStorage.removeItem('pandora_profile_photo');
    localStorage.removeItem('pandora_user_position');
    logout();
    navigate('/login');
  };

  const handleLogout = () => setLogoutDialogOpen(true);

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
        { label: 'Nueva Campaña', icon: <SendIcon />,    path: '/campaigns/new', show: hasModuleWrite(MODULES.MAIL_PLUS) },
        { label: 'Campañas',      icon: <EmailIcon />,   path: '/campaigns',     show: hasModule(MODULES.MAIL_PLUS) },
        { label: 'Plantillas',    icon: <ArticleIcon />, path: '/templates',     show: hasModule(MODULES.MAIL_PLUS) },
      ],
    },
    {
      label: 'Inventario',
      show: hasModule(MODULES.INVENTARIO),
      items: [
        { label: 'Dashboard',  icon: <BarChartIcon />,  path: '/inventory',       show: hasSubModule(MODULES.INV_DASHBOARD) || isAdmin },
        { label: 'Equipos',    icon: <InventoryIcon />, path: '/inventory/items', show: hasModule(MODULES.INVENTARIO) },
        { label: 'Categorías', icon: <CategoryIcon />,  path: '/inventory/types', show: hasSubModule(MODULES.INV_TYPES) || isAdmin },
      ],
    },
    {
      label: 'Catálogos',
      show: hasSubModule(MODULES.INV_CATALOGS) || isAdmin,
      items: [
        { label: 'Departamentos', icon: <ApartmentIcon />, path: '/catalogs/departments', show: hasSubModule(MODULES.INV_CATALOGS) || isAdmin },
        { label: 'Personal',      icon: <PeopleIcon />,    path: '/catalogs/employees',   show: hasSubModule(MODULES.INV_CATALOGS) || isAdmin },
      ],
    },
    {
      label: 'Tickets',
      show: hasModule(MODULES.HELPDESK) || isAdmin,
      items: [
        { label: hasSubModule(MODULES.HD_GLOBAL) || isAdmin ? 'Todos los Tickets' : 'Mis Tickets', icon: <ConfirmationNumberIcon />, path: '/tickets', show: hasModule(MODULES.HELPDESK) || isAdmin },
        { label: 'Nuevo Ticket', icon: <AddTaskIcon />,            path: '/tickets/new',      show: hasModuleWrite(MODULES.HELPDESK) || hasSubModule(MODULES.HD_REQUEST) || isAdmin },
        { label: 'Configurar',   icon: <TuneIcon />,               path: '/tickets/template', show: isAdmin },
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
      show: hasModule(MODULES.CALENDARIO) || hasModule(MODULES.CALENDARIO_ADMIN)
         || hasModule(MODULES.CAL_REQUEST) || hasModule(MODULES.CAL_ROOMS)
         || hasModule(MODULES.CAL_SOLICITUDES) || hasModule(MODULES.CAL_REPORTS_CAL) || isAdmin,
      items: [
        { label: 'Pandora Calendar',  icon: <CalendarMonthIcon />,   path: '/calendar',
          show: hasModule(MODULES.CALENDARIO) || hasModule(MODULES.CALENDARIO_ADMIN)
             || hasModule(MODULES.CAL_REQUEST) || hasModule(MODULES.CAL_ROOMS)
             || hasModule(MODULES.CAL_SOLICITUDES) || hasModule(MODULES.CAL_REPORTS_CAL) || isAdmin },
        { label: 'Salas',             icon: <MeetingRoomIcon />,      path: '/calendar/rooms',
          show: hasModule(MODULES.CAL_ROOMS) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Solicitar Sala',    icon: <AddCircleOutlineIcon />, path: '/calendar/solicitud',
          show: hasModule(MODULES.CAL_REQUEST) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Solicitudes',       icon: <PendingActionsIcon />,   path: '/calendar/solicitudes',
          show: hasModule(MODULES.CAL_SOLICITUDES) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
        { label: 'Reportes',          icon: <BarChartOutlinedIcon />, path: '/calendar/reports',
          show: hasModule(MODULES.CAL_REPORTS_CAL) || hasModule(MODULES.CALENDARIO_ADMIN) || isAdmin },
      ],
    },
    {
      label: 'Comunicados',
      show: hasModule(MODULES.COMUNICADOS) || isAdmin,
      items: [
        { label: 'Comunicados', icon: <CampaignIcon />, path: '/comunicados', show: hasModule(MODULES.COMUNICADOS) || isAdmin },
      ],
    },
    {
      label: 'Procedimientos',
      show: hasModule(MODULES.PROCEDIMIENTOS) || isAdmin,
      items: [
        { label: 'Procedimientos', icon: <DescriptionIcon />, path: '/procedimientos', show: hasModule(MODULES.PROCEDIMIENTOS) || isAdmin },
      ],
    },
    {
      label: 'Indicadores',
      show: hasModule(MODULES.INDICADORES) || isAdmin,
      items: [
        { label: 'Indicadores', icon: <ShowChartIcon />, path: '/indicadores', show: hasModule(MODULES.INDICADORES) || isAdmin },
      ],
    },
    {
      label: 'Vacaciones',
      show: hasModule(MODULES.VACACIONES) || hasModule(MODULES.VAC_ADMIN) || isAdmin,
      items: [
        { label: 'Mi Calendario',  icon: <BeachAccessIcon />,  path: '/vacaciones',
          show: hasModule(MODULES.VACACIONES) || isAdmin },
        { label: 'Gestión Admin',  icon: <HowToRegIcon />,     path: '/vacaciones/admin',
          show: hasModule(MODULES.VAC_ADMIN) || isAdmin },
      ],
    },
    {
      label: 'Reportes',
      show: hasModule(MODULES.REPORTS) || isAdmin,
      items: [
        { label: 'Reportes', icon: <AssessmentIcon />, path: '/reports', show: hasModule(MODULES.REPORTS) || isAdmin },
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
        { label: 'Administración', icon: <AdminPanelSettingsIcon />, path: '/admin',       show: isAdmin },
        { label: 'Log de Auditoría', icon: <HistoryIcon />,          path: '/admin/audit', show: isAdmin },
      ],
    },
  ];

  // ── Notificaciones ──────────────────────────────────────────────────────────
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications();
  const [notifAnchor, setNotifAnchor] = useState(null);
  const notifOpen = Boolean(notifAnchor);

  // #8 — Título del navegador con contador de no leídas
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) Pandora` : 'Pandora';
  }, [unreadCount]);

  // ── Búsqueda global ──────────────────────────────────────────────────────────
  const [searchOpen,    setSearchOpen]    = useState(false);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchFilter,  setSearchFilter]  = useState('all'); // filtro por tipo
  const [dateFilter,    setDateFilter]    = useState('all'); // 'all' | '7d' | '30d' | '90d'
  const searchRef = useRef(null);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
    setSearchFilter('all');
    setDateFilter('all');
  };

  // Filtra resultados por período
  const applyDateFilter = (results, period) => {
    if (period === 'all') return results;
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const cutoff = new Date(now - days * 86400_000);
    return results.filter(r => {
      if (!r.date) return true; // sin fecha → siempre mostrar
      return new Date(r.date) >= cutoff;
    });
  };

  // Atajo Ctrl+K / Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(s => !s);
        setSearchQuery('');
        setSearchResults([]);
        setSearchFilter('all');
        setDateFilter('all');
      }
      if (e.key === 'Escape') setSearchOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const { data } = await searchApi.global(searchQuery);
        setSearchResults(data.results ?? []);
      } catch { setSearchResults([]); }
      finally { setSearchLoading(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const TYPE_LABELS = {
    procedimiento: { label: 'Procedimiento', color: 'primary' },
    comunicado:    { label: 'Comunicado',    color: 'warning' },
    inventario:    { label: 'Inventario',    color: 'success' },
    licencia:      { label: 'Licencia',      color: 'secondary' },
    usuario:       { label: 'Usuario',       color: 'default' },
  };

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
          <Typography variant="h6" fontWeight={800} ml={1} flex={1}>PANDORA</Typography>
          <IconButton color="inherit" onClick={() => setSearchOpen(s => !s)}>
            <SearchIcon />
          </IconButton>
          <IconButton color="inherit" onClick={e => setNotifAnchor(notifAnchor ? null : e.currentTarget)}>
            <Badge badgeContent={unreadCount} color="error" max={99}>
              {unreadCount > 0 ? <NotificationsIcon /> : <NotificationsNoneIcon />}
            </Badge>
          </IconButton>
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
        {/* ── Barra superior desktop ──────────────────────────────────────── */}
        <Box
          sx={{
            display: { xs: 'none', md: 'flex' },
            alignItems: 'center',
            px: 3, py: 1,
            borderBottom: 1, borderColor: 'divider',
            bgcolor: 'background.paper',
            position: 'sticky', top: 0, zIndex: 100,
            gap: 1,
          }}
        >
          {/* Search bar */}
          <Box
            onClick={() => setSearchOpen(true)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 1,
              px: 2, py: 0.75, borderRadius: 2,
              border: 1, borderColor: 'divider',
              cursor: 'pointer', minWidth: 220,
              '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
            }}
          >
            <SearchIcon sx={{ fontSize: 18, color: 'text.disabled' }} />
            <Typography variant="body2" color="text.disabled" flex={1}>Buscar…</Typography>
            <Typography variant="caption" color="text.disabled" sx={{
              border: 1, borderColor: 'divider', borderRadius: 0.5, px: 0.5, lineHeight: 1.6
            }}>Ctrl+K</Typography>
          </Box>

          <Box flex={1} />

          {/* Toggle modo oscuro */}
          <Tooltip title={mode === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
            <IconButton onClick={toggleMode} size="small">
              {mode === 'dark' ? <LightModeIcon sx={{ color: 'warning.main' }} /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Bell */}
          <Tooltip title="Notificaciones">
            <IconButton onClick={e => setNotifAnchor(notifAnchor ? null : e.currentTarget)}>
              <Badge badgeContent={unreadCount} color="error" max={99}>
                {unreadCount > 0 ? <NotificationsIcon color="primary" /> : <NotificationsNoneIcon />}
              </Badge>
            </IconButton>
          </Tooltip>
        </Box>

        {children}
      </Box>

      {/* ── Panel de notificaciones (Popper) ──────────────────────────────── */}
      <Popper open={notifOpen} anchorEl={notifAnchor} placement="bottom-end" style={{ zIndex: 1400 }}>
        <ClickAwayListener onClickAway={() => setNotifAnchor(null)}>
          <Paper elevation={8} sx={{ width: 360, maxHeight: 480, display: 'flex', flexDirection: 'column', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
              <Typography fontWeight={700} flex={1}>Notificaciones</Typography>
              {unreadCount > 0 && (
                <Typography
                  variant="caption" color="primary" sx={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}
                  onClick={markAllRead}
                >
                  Marcar todas como leídas
                </Typography>
              )}
            </Box>
            <Box sx={{ overflowY: 'auto', flex: 1 }}>
              {notifications.length === 0 && (
                <Box sx={{ p: 4, textAlign: 'center' }}>
                  <NotificationsNoneIcon sx={{ fontSize: 40, color: 'text.disabled', mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">Sin notificaciones</Typography>
                </Box>
              )}
              {notifications.map(n => {
                // Mapa tipo → color del chip
                const chipColor = {
                  error:       'error',
                  warning:     'warning',
                  success:     'success',
                  comunicado:  'secondary',
                }[n.type] ?? 'info';

                // Etiqueta legible del chip
                const chipLabel = {
                  error:       'Error',
                  warning:     'Aviso',
                  success:     'OK',
                  comunicado:  '📢 Comunicado',
                  info:        'Info',
                }[n.type] ?? n.type;

                // Ruta de navegación al hacer clic (si aplica)
                const navPath = n.path ?? (n.type === 'comunicado' ? '/comunicados' : null);
                const isClickable = !n.isRead || navPath;

                return (
                  <Box
                    key={n.id}
                    onClick={() => {
                      markRead(n.id);
                      if (navPath) {
                        navigate(navPath);
                        setNotifAnchor(null);
                      }
                    }}
                    sx={{
                      px: 2, py: 1.5,
                      borderBottom: 1, borderColor: 'divider',
                      bgcolor: n.isRead ? 'transparent' : 'action.hover',
                      cursor: isClickable ? 'pointer' : 'default',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="flex-start">
                      <Chip
                        label={chipLabel}
                        size="small"
                        color={chipColor}
                        sx={{ mt: 0.25, flexShrink: 0 }}
                      />
                      <Box flex={1} minWidth={0}>
                        <Typography variant="body2" fontWeight={n.isRead ? 400 : 700} noWrap>
                          {n.title}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{
                          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                        }}>
                          {n.message}
                        </Typography>
                        {n.createdAt && (
                          <Typography variant="caption" color="text.disabled" display="block" mt={0.25}>
                            {new Date(n.createdAt).toLocaleString('es-MX')}
                          </Typography>
                        )}
                      </Box>
                    </Stack>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </ClickAwayListener>
      </Popper>

      {/* ── Confirmación de cierre de sesión ─────────────────────────────── */}
      <Dialog open={logoutDialogOpen} onClose={() => setLogoutDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>¿Cerrar sesión?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Tu sesión activa se cerrará. Deberás iniciar sesión nuevamente para acceder al sistema.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setLogoutDialogOpen(false)} color="inherit">Cancelar</Button>
          <Button onClick={confirmLogout} variant="contained" color="error" startIcon={<LogoutIcon fontSize="small" />}>
            Cerrar sesión
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Buscador global (modal Ctrl+K) ────────────────────────────────── */}
      <Dialog
        open={searchOpen}
        onClose={closeSearch}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          elevation: 16,
          sx: { borderRadius: 3, overflow: 'hidden', mt: { xs: 8, md: '10vh' }, verticalAlign: 'top' },
        }}
        sx={{ '& .MuiDialog-container': { alignItems: 'flex-start' } }}
        TransitionProps={{ onEntered: () => searchRef.current?.focus() }}
      >
        {/* Input */}
        <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <SearchIcon sx={{ color: 'text.secondary', mr: 1.5 }} />
          <InputBase
            autoFocus
            placeholder="Buscar en Pandora…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            sx={{ flex: 1, fontSize: 16 }}
            inputRef={searchRef}
          />
          {searchLoading && <Box sx={{ width: 16, height: 16, border: 2, borderColor: 'primary.main', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', '@keyframes spin': { to: { transform: 'rotate(360deg)' } } }} />}
          <Typography variant="caption" color="text.disabled" sx={{ ml: 1, border: 1, borderColor: 'divider', borderRadius: 0.5, px: 0.5, lineHeight: 1.7 }}>Esc</Typography>
        </Box>

        {/* Filtros por módulo + período — solo cuando hay resultados */}
        {searchResults.length > 0 && (() => {
          const types = [...new Set(searchResults.map(r => r.type))];
          const DATE_OPTS = [
            { value: 'all', label: 'Cualquier fecha' },
            { value: '7d',  label: 'Últimos 7 días' },
            { value: '30d', label: 'Último mes' },
            { value: '90d', label: 'Últimos 3 meses' },
          ];
          return (
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              {/* Fila módulos */}
              <Box sx={{ px: 2, pt: 1, pb: 0.5, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>Módulo:</Typography>
                <Chip
                  label="Todos"
                  size="small"
                  variant={searchFilter === 'all' ? 'filled' : 'outlined'}
                  color={searchFilter === 'all' ? 'primary' : 'default'}
                  onClick={() => setSearchFilter('all')}
                  sx={{ cursor: 'pointer' }}
                />
                {types.map(t => {
                  const ti = TYPE_LABELS[t] || { label: t, color: 'default' };
                  return (
                    <Chip
                      key={t}
                      label={`${ti.label} (${searchResults.filter(r => r.type === t).length})`}
                      size="small"
                      variant={searchFilter === t ? 'filled' : 'outlined'}
                      color={searchFilter === t ? ti.color : 'default'}
                      onClick={() => setSearchFilter(prev => prev === t ? 'all' : t)}
                      sx={{ cursor: 'pointer' }}
                    />
                  );
                })}
              </Box>
              {/* Fila período */}
              <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 0.75, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, fontWeight: 600 }}>Período:</Typography>
                {DATE_OPTS.map(opt => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    size="small"
                    variant={dateFilter === opt.value ? 'filled' : 'outlined'}
                    color={dateFilter === opt.value ? 'secondary' : 'default'}
                    onClick={() => setDateFilter(opt.value)}
                    sx={{ cursor: 'pointer' }}
                  />
                ))}
              </Box>
            </Box>
          );
        })()}

        {/* Resultados */}
        {searchResults.length > 0 && (() => {
          const byModule = searchFilter === 'all'
            ? searchResults
            : searchResults.filter(r => r.type === searchFilter);
          const filtered = applyDateFilter(byModule, dateFilter);

          const fmtDate = (d) => {
            if (!d) return null;
            const dt = new Date(d);
            const now = new Date();
            const diffDays = Math.floor((now - dt) / 86400_000);
            if (diffDays === 0) return 'Hoy';
            if (diffDays === 1) return 'Ayer';
            if (diffDays < 7)  return `Hace ${diffDays} días`;
            return dt.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: diffDays > 300 ? 'numeric' : undefined });
          };

          return (
            <Box sx={{ maxHeight: 360, overflowY: 'auto' }}>
              {filtered.length === 0 && (
                <Box sx={{ p: 3, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin resultados con los filtros actuales
                  </Typography>
                </Box>
              )}
              {filtered.map((r, i) => {
                const typeInfo = TYPE_LABELS[r.type] || { label: r.type, color: 'default' };
                return (
                  <Box
                    key={i}
                    onClick={() => { navigate(r.path); closeSearch(); }}
                    sx={{
                      px: 2, py: 1.25, cursor: 'pointer',
                      borderBottom: 1, borderColor: 'divider',
                      display: 'flex', alignItems: 'center', gap: 1.5,
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <Chip label={typeInfo.label} size="small" color={typeInfo.color} sx={{ flexShrink: 0 }} />
                    <Box flex={1} minWidth={0}>
                      <Typography variant="body2" fontWeight={600} noWrap>{r.label}</Typography>
                      <Stack direction="row" spacing={1} alignItems="center">
                        {r.subtitle && (
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {r.subtitle}
                          </Typography>
                        )}
                        {r.date && (
                          <Typography variant="caption" color="text.disabled" sx={{ flexShrink: 0 }}>
                            · {fmtDate(r.date)}
                          </Typography>
                        )}
                      </Stack>
                    </Box>
                    <OpenInNewIcon sx={{ fontSize: 14, color: 'text.disabled', flexShrink: 0 }} />
                  </Box>
                );
              })}
            </Box>
          );
        })()}

        {searchQuery.length >= 2 && !searchLoading && searchResults.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary" variant="body2">Sin resultados para "<b>{searchQuery}</b>"</Typography>
          </Box>
        )}

        {!searchQuery && (
          <Box sx={{ p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Busca en procedimientos, comunicados, inventario, licencias, tickets y usuarios.
              Filtra por <strong>módulo</strong> y <strong>período</strong> para acotar resultados.
            </Typography>
          </Box>
        )}
      </Dialog>
    </Box>
  );
}
