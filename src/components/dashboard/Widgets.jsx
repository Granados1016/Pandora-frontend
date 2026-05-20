/**
 * Pandora — Dashboard Widgets
 * Cada widget es un componente autocontenido que carga sus propios datos.
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack, CircularProgress,
  Button, List, ListItem, ListItemText, ListItemIcon, Avatar, Divider,
  IconButton, Tooltip,
} from '@mui/material';
import SendIcon          from '@mui/icons-material/Send';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import ErrorIcon         from '@mui/icons-material/Error';
import EmailIcon         from '@mui/icons-material/Email';
import InventoryIcon     from '@mui/icons-material/Inventory2';
import BuildIcon         from '@mui/icons-material/Build';
import BlockIcon         from '@mui/icons-material/Block';
import WarehouseIcon     from '@mui/icons-material/Warehouse';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon  from '@mui/icons-material/ArrowForward';
import ArticleIcon       from '@mui/icons-material/Article';
import PeopleIcon        from '@mui/icons-material/People';
import AddIcon           from '@mui/icons-material/Add';
import StorageIcon       from '@mui/icons-material/Storage';
import MeetingRoomIcon          from '@mui/icons-material/MeetingRoom';
import ScheduleIcon             from '@mui/icons-material/Schedule';
import ConfirmationNumberIcon   from '@mui/icons-material/ConfirmationNumber';
import AssignmentLateIcon       from '@mui/icons-material/AssignmentLate';
import HourglassEmptyIcon       from '@mui/icons-material/HourglassEmpty';
import KeyIcon                  from '@mui/icons-material/Key';
import NotificationsActiveIcon  from '@mui/icons-material/NotificationsActive';

import BeachAccessIcon from '@mui/icons-material/BeachAccess';
import EventBusyIcon   from '@mui/icons-material/EventBusy';
import PendingActionsIcon from '@mui/icons-material/PendingActions';

import { campaignApi, inventoryApi, calendarApi, ticketApi, licenciasApi } from '../../api/pandoraApi';
import api from '../../api/pandoraApi';
import { MODULES }    from '../../hooks/useAuth.jsx';
import { statusColor, statusLabel } from '../../utils/statusHelpers';

// ─── Utilidades ───────────────────────────────────────────────────────────────

function WidgetCard({ title, icon, action, actionLabel, children, loading, minH = 0 }) {
  const navigate = useNavigate();
  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                border: '1px solid', borderColor: 'divider' }} elevation={0}>
      <CardContent sx={{ flex: 1, pb: '12px !important' }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {icon && <Box sx={{ color: 'primary.main' }}>{icon}</Box>}
            <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
          </Stack>
          {action && (
            <Tooltip title={actionLabel}>
              <IconButton size="small" onClick={() => navigate(action)} sx={{ color: 'primary.main' }}>
                <ArrowForwardIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
        {loading
          ? <Box display="flex" justifyContent="center" py={3}><CircularProgress size={28} /></Box>
          : <Box sx={{ minHeight: minH }}>{children}</Box>
        }
      </CardContent>
    </Card>
  );
}

function KpiMini({ label, value, color = 'primary.main', icon }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={0.5}>
        {icon && <Box sx={{ color, fontSize: 18 }}>{icon}</Box>}
        <Typography variant="caption" color="text.secondary" fontWeight={600} noWrap>{label}</Typography>
      </Stack>
      <Typography variant="h5" fontWeight={800} color={color}>{value ?? '—'}</Typography>
    </Box>
  );
}

function formatBytes(b) {
  if (!b) return '0 B';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function formatTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

// ─── 1. Widget de Bienvenida ──────────────────────────────────────────────────

export function WelcomeWidget({ fullName, username, position, isAdmin }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hour = now.getHours();
  const greeting =
    hour < 12 ? 'Buenos días' :
    hour < 19 ? 'Buenas tardes' :
                'Buenas noches';

  const dateStr = now.toLocaleDateString('es-MX', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Card elevation={0} sx={{
      borderRadius: 3,
      background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 60%, #5c6bc0 100%)',
      color: 'white',
      border: 'none',
    }}>
      <CardContent sx={{ p: { xs: 2.5, md: 3 } }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between"
               alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
          <Box>
            <Typography variant="h5" fontWeight={800} color="white">
              {greeting}, {fullName?.split(' ')[0] || username} 👋
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.5, textTransform: 'capitalize' }}>
              {dateStr}
            </Typography>
            {position && (
              <Chip label={position} size="small"
                sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.15)', color: 'white', borderColor: 'rgba(255,255,255,0.3)', border: '1px solid' }} />
            )}
          </Box>
          <Box sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
            <Typography variant="h4" fontWeight={900} color="white" sx={{ fontVariantNumeric: 'tabular-nums', letterSpacing: 1 }}>
              {timeStr}
            </Typography>
            <Chip
              label={isAdmin ? 'Administrador' : 'Usuario'}
              size="small"
              sx={{ mt: 0.5, bgcolor: isAdmin ? 'rgba(244,67,54,0.25)' : 'rgba(255,255,255,0.15)',
                   color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
            />
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ─── 2. Estadísticas de Correo ────────────────────────────────────────────────

export function MailStatsWidget() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    campaignApi.getAll()
      .then(r => {
        const campaigns = r.data;
        const total     = campaigns.length;
        const completed = campaigns.filter(c => c.status === 'Completado').length;
        const failed    = campaigns.filter(c => c.status === 'Completado con errores').length;
        const sent      = campaigns.reduce((s, c) => s + (c.sentCount || 0), 0);
        setData({ total, completed, failed, sent });
      })
      .catch(() => setData({ total: 0, completed: 0, failed: 0, sent: 0 }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <WidgetCard title="Correo Masivo" icon={<EmailIcon fontSize="small" />}
                action="/campaigns" actionLabel="Ver campañas" loading={loading}>
      <Grid container spacing={1.5}>
        <Grid item xs={6}>
          <KpiMini label="Total campañas" value={data?.total}
            icon={<SendIcon sx={{ fontSize: 16 }} />} color="primary.main" />
        </Grid>
        <Grid item xs={6}>
          <KpiMini label="Completadas" value={data?.completed}
            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} color="success.main" />
        </Grid>
        <Grid item xs={6}>
          <KpiMini label="Con errores" value={data?.failed}
            icon={<ErrorIcon sx={{ fontSize: 16 }} />} color="error.main" />
        </Grid>
        <Grid item xs={6}>
          <KpiMini label="Correos enviados" value={data?.sent?.toLocaleString('es-MX')}
            icon={<EmailIcon sx={{ fontSize: 16 }} />} color="secondary.main" />
        </Grid>
      </Grid>
    </WidgetCard>
  );
}

// ─── 3. Accesos Rápidos ───────────────────────────────────────────────────────

export function QuickActionsWidget({ hasModule }) {
  const navigate = useNavigate();

  const actions = [
    { label: 'Nueva Campaña',  icon: <AddIcon />,           path: '/campaigns/new',       module: MODULES.MAIL_PLUS,   color: '#1565c0' },
    { label: 'Plantillas',     icon: <ArticleIcon />,       path: '/templates',           module: MODULES.MAIL_PLUS,   color: '#0288d1' },
    { label: 'Inventario',     icon: <InventoryIcon />,     path: '/inventory/items',     module: MODULES.INVENTARIO,  color: '#2e7d32' },
    { label: 'Personal',       icon: <PeopleIcon />,        path: '/catalogs/employees',  module: MODULES.INVENTARIO,  color: '#558b2f' },
    { label: 'Calendario',     icon: <CalendarMonthIcon />, path: '/calendar',            module: MODULES.CALENDARIO,  color: '#6a1b9a' },
    { label: 'Salas',          icon: <MeetingRoomIcon />,   path: '/calendar/rooms',      module: MODULES.CALENDARIO,  color: '#7b1fa2' },
    { label: 'Reportes',       icon: <StorageIcon />,       path: '/reports',             module: null,                color: '#37474f' },
  ].filter(a => a.module === null || hasModule(a.module));

  return (
    <WidgetCard title="Accesos Rápidos" minH={120}>
      <Grid container spacing={1}>
        {actions.map(a => (
          <Grid item xs={6} key={a.path}>
            <Box
              onClick={() => navigate(a.path)}
              sx={{
                p: 1.2, borderRadius: 2, cursor: 'pointer', textAlign: 'center',
                border: '1px solid', borderColor: 'divider',
                transition: 'all 0.15s',
                '&:hover': { bgcolor: a.color + '12', borderColor: a.color, transform: 'translateY(-1px)' },
              }}
            >
              <Box sx={{ color: a.color, mb: 0.3 }}>{React.cloneElement(a.icon, { fontSize: 'small' })}</Box>
              <Typography variant="caption" fontWeight={600} color="text.primary" display="block" noWrap>
                {a.label}
              </Typography>
            </Box>
          </Grid>
        ))}
        {actions.length === 0 && (
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>
              No hay módulos disponibles.
            </Typography>
          </Grid>
        )}
      </Grid>
    </WidgetCard>
  );
}

// ─── 4. Campañas Recientes ────────────────────────────────────────────────────

export function RecentCampaignsWidget({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    campaignApi.getAll()
      .then(r => setItems(r.data.slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <WidgetCard title="Campañas Recientes" icon={<SendIcon fontSize="small" />}
                action="/campaigns" actionLabel="Ver todas" loading={loading} minH={120}>
      {items.length === 0 ? (
        <Box textAlign="center" py={2}>
          <Typography variant="body2" color="text.secondary" mb={1}>Sin campañas aún.</Typography>
          <Button size="small" variant="outlined" onClick={() => navigate('/campaigns/new')} startIcon={<AddIcon />}>
            Crear campaña
          </Button>
        </Box>
      ) : (
        <List dense disablePadding>
          {items.map((c, i) => (
            <React.Fragment key={c.id}>
              {i > 0 && <Divider />}
              <ListItem disablePadding sx={{ py: 0.8, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, borderRadius: 1 }}
                        onClick={() => navigate(`/campaigns/${c.id}`)}>
                <ListItemText
                  primary={
                    <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                      <Typography variant="body2" fontWeight={600} noWrap sx={{ maxWidth: '60%' }}>{c.name}</Typography>
                      <Chip label={statusLabel(c.status)} color={statusColor(c.status)} size="small" sx={{ fontSize: 10 }} />
                    </Stack>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {c.sentCount ?? 0} enviados · {c.totalRecipients ?? 0} destinatarios
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </WidgetCard>
  );
}

// ─── 5. Inventario ────────────────────────────────────────────────────────────

export function InventoryWidget({ refreshKey = 0 }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    inventoryApi.getDashboard()
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const stats = data ? [
    { label: 'Total equipos',  value: data.total           ?? data.totalCount,          color: '#1565c0', icon: <InventoryIcon fontSize="small" /> },
    { label: 'Activos',        value: data.activos         ?? data.activeCount,         color: '#2e7d32', icon: <CheckCircleIcon fontSize="small" /> },
    { label: 'Mantenimiento',  value: data.enMantenimiento ?? data.maintenanceCount,    color: '#e65100', icon: <BuildIcon fontSize="small" /> },
    { label: 'Dados de baja',  value: data.dadosDeBaja     ?? data.decommissionedCount, color: '#b71c1c', icon: <BlockIcon fontSize="small" /> },
  ] : [];

  return (
    <WidgetCard title="Inventario" icon={<InventoryIcon fontSize="small" />}
                action="/inventory" actionLabel="Ver inventario" loading={loading} minH={120}>
      {data ? (
        <Grid container spacing={1.5}>
          {stats.map(s => (
            <Grid item xs={6} key={s.label}>
              <KpiMini label={s.label} value={s.value} color={s.color} icon={s.icon} />
            </Grid>
          ))}
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Sin datos.</Typography>
      )}
    </WidgetCard>
  );
}

// ─── 6. Reservas de Hoy ───────────────────────────────────────────────────────

export function CalendarTodayWidget({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0).toISOString();
    const end   = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
    calendarApi.getReservations(start, end)
      .then(r => {
        const sorted = (r.data || []).sort((a, b) =>
          new Date(a.startTime) - new Date(b.startTime)
        );
        setItems(sorted.slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  const todayLabel = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' });

  return (
    <WidgetCard title={`Reservas — ${todayLabel}`} icon={<CalendarMonthIcon fontSize="small" />}
                action="/calendar" actionLabel="Abrir calendario" loading={loading} minH={120}>
      {items.length === 0 ? (
        <Box textAlign="center" py={2}>
          <CalendarMonthIcon sx={{ fontSize: 36, color: 'text.disabled', mb: 1 }} />
          <Typography variant="body2" color="text.secondary">Sin reservas para hoy.</Typography>
        </Box>
      ) : (
        <List dense disablePadding>
          {items.map((r, i) => (
            <React.Fragment key={r.id ?? i}>
              {i > 0 && <Divider />}
              <ListItem disablePadding sx={{ py: 0.6 }}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <ScheduleIcon fontSize="small" color="action" />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight={600} noWrap>{r.title}</Typography>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {formatTime(r.startTime)} – {formatTime(r.endTime)}
                      {r.organizerName ? ` · ${r.organizerName}` : ''}
                    </Typography>
                  }
                />
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      )}
    </WidgetCard>
  );
}

// ─── 7. Tickets en tiempo real ────────────────────────────────────────────────

export function TicketsWidget({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    ticketApi.getAll()
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : (r.data?.items ?? []);
        const abierto    = list.filter(t => t.status === 'Abierto').length;
        const enProceso  = list.filter(t => t.status === 'En Proceso').length;
        const enEspera   = list.filter(t => t.status === 'En Espera').length;
        const criticos   = list.filter(t => t.priority === 'Crítica').length;
        setData({ total: list.length, abierto, enProceso, enEspera, criticos });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <WidgetCard title="HelpDesk Tickets" icon={<ConfirmationNumberIcon fontSize="small" />}
                action="/tickets" actionLabel="Ver tickets" loading={loading} minH={120}>
      {data ? (
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <KpiMini label="Abiertos" value={data.abierto}
              icon={<ConfirmationNumberIcon sx={{ fontSize: 16 }} />} color="#1565c0" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="En Proceso" value={data.enProceso}
              icon={<HourglassEmptyIcon sx={{ fontSize: 16 }} />} color="#e65100" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="En Espera" value={data.enEspera}
              icon={<AssignmentLateIcon sx={{ fontSize: 16 }} />} color="#6a1b9a" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="Críticos" value={data.criticos}
              icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />} color="#b71c1c" />
          </Grid>
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Sin datos.</Typography>
      )}
    </WidgetCard>
  );
}

// ─── 8. Licencias por vencer ──────────────────────────────────────────────────

export function LicenciasWidget({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    licenciasApi.alertas()
      .then(r => {
        const alertas = Array.isArray(r.data) ? r.data : [];
        const vencen7  = alertas.filter(a => (a.diasRestantes ?? a.daysUntilExpiry) <= 7).length;
        const vencen30 = alertas.filter(a => (a.diasRestantes ?? a.daysUntilExpiry) <= 30).length;
        const vencidas = alertas.filter(a => (a.diasRestantes ?? a.daysUntilExpiry) <  0).length;
        setData({ total: alertas.length, vencen7, vencen30, vencidas });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <WidgetCard title="Control de Licencias" icon={<KeyIcon fontSize="small" />}
                action="/licencias" actionLabel="Ver licencias" loading={loading} minH={100}>
      {data ? (
        <Grid container spacing={1.5}>
          <Grid item xs={6}>
            <KpiMini label="Alertas activas" value={data.total}
              icon={<NotificationsActiveIcon sx={{ fontSize: 16 }} />} color="#e65100" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="Vencen en 7 días" value={data.vencen7}
              icon={<KeyIcon sx={{ fontSize: 16 }} />} color="#b71c1c" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="Vencen en 30 días" value={data.vencen30}
              icon={<KeyIcon sx={{ fontSize: 16 }} />} color="#f57c00" />
          </Grid>
          <Grid item xs={6}>
            <KpiMini label="Ya vencidas" value={data.vencidas}
              icon={<AssignmentLateIcon sx={{ fontSize: 16 }} />} color="#b71c1c" />
          </Grid>
        </Grid>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Sin alertas.</Typography>
      )}
    </WidgetCard>
  );
}

// ─── 9. Vacaciones ────────────────────────────────────────────────────────────

export function VacacionesWidget({ refreshKey = 0 }) {
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get('/vacaciones/mis-dias').catch(() => null),
      api.get('/vacaciones/mis-solicitudes').catch(() => null),
    ]).then(([diasRes, solRes]) => {
      const dias   = diasRes?.data  ?? {};
      const solic  = Array.isArray(solRes?.data) ? solRes.data : [];
      const pendientes = solic.filter(s => s.status === 'Pendiente' || s.status === 'pending').length;
      const aprobadas  = solic.filter(s => s.status === 'Aprobada'  || s.status === 'approved').length;
      // Próxima vacación aprobada futura
      const futura = solic
        .filter(s => (s.status === 'Aprobada' || s.status === 'approved') && new Date(s.startDate) >= new Date())
        .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0] ?? null;

      setData({
        disponibles: dias.diasDisponibles ?? dias.availableDays ?? dias.available ?? 0,
        usados:      dias.diasUsados      ?? dias.usedDays      ?? dias.used      ?? 0,
        pendientes,
        aprobadas,
        proxima: futura ? new Date(futura.startDate).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : null,
      });
    }).finally(() => setLoading(false));
  }, [refreshKey]);

  return (
    <WidgetCard title="Mis Vacaciones" icon={<BeachAccessIcon fontSize="small" />}
                action="/vacaciones" actionLabel="Ver mis vacaciones" loading={loading} minH={100}>
      {data ? (
        <Box>
          <Grid container spacing={1.5} mb={data.proxima ? 1.5 : 0}>
            <Grid item xs={6}>
              <KpiMini label="Días disponibles" value={data.disponibles}
                icon={<BeachAccessIcon sx={{ fontSize: 16 }} />} color="#2e7d32" />
            </Grid>
            <Grid item xs={6}>
              <KpiMini label="Días usados" value={data.usados}
                icon={<EventBusyIcon sx={{ fontSize: 16 }} />} color="#e65100" />
            </Grid>
            <Grid item xs={6}>
              <KpiMini label="Solicitudes pendientes" value={data.pendientes}
                icon={<PendingActionsIcon sx={{ fontSize: 16 }} />} color="#f57c00" />
            </Grid>
            <Grid item xs={6}>
              <KpiMini label="Aprobadas" value={data.aprobadas}
                icon={<CheckCircleIcon sx={{ fontSize: 16 }} />} color="#1565c0" />
            </Grid>
          </Grid>
          {data.proxima && (
            <Box sx={{ p: 1.2, borderRadius: 2, bgcolor: 'success.50', border: '1px solid', borderColor: 'success.200', mt: 0.5 }}>
              <Typography variant="caption" color="success.dark" fontWeight={700}>
                🏖 Próximas vacaciones: {data.proxima}
              </Typography>
            </Box>
          )}
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" textAlign="center" py={2}>Sin datos.</Typography>
      )}
    </WidgetCard>
  );
}

// ─── Registro de widgets ──────────────────────────────────────────────────────

export const WIDGET_META = {
  welcome:         { label: 'Bienvenida',              module: null,               gridProps: { xs: 12 } },
  mailStats:       { label: 'Estadísticas de Correo',  module: MODULES.MAIL_PLUS,  gridProps: { xs: 12, md: 8 } },
  quickActions:    { label: 'Accesos Rápidos',          module: null,               gridProps: { xs: 12, md: 4 } },
  recentCampaigns: { label: 'Campañas Recientes',       module: MODULES.MAIL_PLUS,  gridProps: { xs: 12, md: 6 } },
  inventory:       { label: 'Inventario',               module: MODULES.INVENTARIO, gridProps: { xs: 12, md: 6 } },
  calendar:        { label: 'Reservas de Hoy',          module: MODULES.CALENDARIO, gridProps: { xs: 12, md: 6 } },
  tickets:         { label: 'HelpDesk Tickets',         module: MODULES.HELPDESK,   gridProps: { xs: 12, md: 6 } },
  licencias:       { label: 'Control de Licencias',     module: MODULES.LICENCIAS,  gridProps: { xs: 12, md: 6 } },
  vacaciones:      { label: 'Mis Vacaciones',            module: MODULES.VACACIONES, gridProps: { xs: 12, md: 6 } },
};
