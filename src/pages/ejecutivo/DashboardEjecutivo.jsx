import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Chip, CircularProgress,
  Grid, Divider, IconButton, Tooltip, Alert,
} from '@mui/material';
import RefreshIcon          from '@mui/icons-material/Refresh';
import DashboardIcon        from '@mui/icons-material/Dashboard';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import InventoryIcon        from '@mui/icons-material/Inventory2';
import MenuBookIcon         from '@mui/icons-material/MenuBook';
import EngineeringIcon      from '@mui/icons-material/Engineering';
import BadgeIcon            from '@mui/icons-material/Badge';
import PeopleIcon           from '@mui/icons-material/People';
import VpnKeyIcon           from '@mui/icons-material/VpnKey';
import BeachAccessIcon      from '@mui/icons-material/BeachAccess';
import WarningAmberIcon     from '@mui/icons-material/WarningAmber';
import TrendingUpIcon       from '@mui/icons-material/TrendingUp';
import { ejecutivoApi }     from '../../api/pandoraApi';

// ── KPI Card ─────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color = 'primary.main', icon, alert, onClick }) {
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2, borderRadius: 3, border: '1px solid', borderColor: alert ? 'error.light' : 'divider',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        '&:hover': onClick ? { boxShadow: 3, transform: 'translateY(-2px)' } : {},
        bgcolor: alert ? 'error.50' : 'background.paper',
      }}
    >
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
        <Box>
          <Typography variant="h3" fontWeight={900} color={alert ? 'error.main' : color} lineHeight={1}>
            {value ?? '—'}
          </Typography>
          <Typography variant="body2" fontWeight={600} mt={0.5}>{label}</Typography>
          {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
        </Box>
        <Box sx={{ color: alert ? 'error.main' : color, opacity: 0.7 }}>{icon}</Box>
      </Stack>
      {alert && (
        <Chip size="small" label={alert} color="error" sx={{ mt: 1, fontSize: 10 }} icon={<WarningAmberIcon />} />
      )}
    </Paper>
  );
}

// ── Sección con título ────────────────────────────────────────────────────────
function Section({ title, icon, color, children, path, navigate }) {
  return (
    <Paper
      elevation={0}
      sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}
    >
      <Stack direction="row" alignItems="center" spacing={1} mb={2}
        onClick={() => path && navigate(path)}
        sx={{ cursor: path ? 'pointer' : 'default' }}>
        <Box sx={{ color }}>{icon}</Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
        {path && <TrendingUpIcon fontSize="small" sx={{ color: 'text.disabled', ml: 'auto' }} />}
      </Stack>
      <Grid container spacing={1.5}>{children}</Grid>
    </Paper>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function DashboardEjecutivo() {
  const navigate = useNavigate();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [lastUpd, setLastUpd] = useState(null);

  const load = async () => {
    setLoading(true); setError('');
    try {
      const r = await ejecutivoApi.getStats();
      setData(r.data);
      setLastUpd(new Date());
    } catch { setError('No se pudo cargar el dashboard ejecutivo.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Auto-refresh cada 5 minutos
  useEffect(() => {
    const t = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const d = data;

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>

      {/* Header */}
      <Paper elevation={0} sx={{ p: 1.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider',
        background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)' }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" spacing={1.5} alignItems="center">
            <DashboardIcon sx={{ color: 'white', fontSize: 28 }} />
            <Box>
              <Typography variant="h6" fontWeight={800} color="white">Dashboard Ejecutivo</Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                Vista consolidada de todos los módulos · {lastUpd ? `Actualizado ${lastUpd.toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}` : ''}
              </Typography>
            </Box>
          </Stack>
          <Tooltip title="Actualizar">
            <IconButton onClick={load} disabled={loading} sx={{ color: 'white' }}>
              {loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {!d && loading && (
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      )}

      {d && (
        <Grid container spacing={2}>

          {/* ── Tickets ───────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Section title="Tickets / Helpdesk" icon={<ConfirmationNumberIcon />}
              color="#1565c0" path="/tickets" navigate={navigate}>
              <Grid item xs={6}><KpiCard label="Total" value={d.tickets.total} color="#1a237e" icon={<ConfirmationNumberIcon />} /></Grid>
              <Grid item xs={6}><KpiCard label="Abiertos" value={d.tickets.abiertos} color="#1565c0"
                alert={d.tickets.abiertos > 10 ? `${d.tickets.abiertos} sin atender` : null} /></Grid>
              <Grid item xs={6}><KpiCard label="En Progreso" value={d.tickets.enProgreso} color="#e65100" /></Grid>
              <Grid item xs={6}><KpiCard label="Críticos" value={d.tickets.criticos} color="#b71c1c"
                alert={d.tickets.criticos > 0 ? `${d.tickets.criticos} críticos` : null} /></Grid>
              <Grid item xs={12}><KpiCard label="Creados este mes" value={d.tickets.esteMes} color="text.secondary"
                sub={`${d.tickets.resueltos} resueltos en total`} /></Grid>
            </Section>
          </Grid>

          {/* ── Inventario ────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Section title="Inventario" icon={<InventoryIcon />}
              color="#2e7d32" path="/inventory/items" navigate={navigate}>
              <Grid item xs={6}><KpiCard label="Total equipos" value={d.inventario.total} color="#1b5e20" icon={<InventoryIcon />} /></Grid>
              <Grid item xs={6}><KpiCard label="Activos" value={d.inventario.activos} color="#2e7d32" /></Grid>
              <Grid item xs={6}><KpiCard label="En reparación" value={d.inventario.reparacion} color="#e65100"
                alert={d.inventario.reparacion > 0 ? 'requieren atención' : null} /></Grid>
              <Grid item xs={6}><KpiCard label="Dados de baja" value={d.inventario.baja} color="#757575" /></Grid>
            </Section>
          </Grid>

          {/* ── Bitácora ──────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Section title="Bitácora" icon={<MenuBookIcon />}
              color="#6a1b9a" path="/bitacora" navigate={navigate}>
              <Grid item xs={6}><KpiCard label="Total" value={d.bitacora.total} color="#4a148c" icon={<MenuBookIcon />} /></Grid>
              <Grid item xs={6}><KpiCard label="Abiertas" value={d.bitacora.abiertas} color="#6a1b9a"
                alert={d.bitacora.abiertas > 5 ? `${d.bitacora.abiertas} sin resolver` : null} /></Grid>
              <Grid item xs={6}><KpiCard label="En proceso" value={d.bitacora.enProceso} color="#e65100" /></Grid>
              <Grid item xs={6}><KpiCard label="Prio. Alta" value={d.bitacora.prioAlta} color="#b71c1c"
                alert={d.bitacora.prioAlta > 0 ? 'alta prioridad' : null} /></Grid>
            </Section>
          </Grid>

          {/* ── Mantenimiento ─────────────────────────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Section title="Mantenimiento" icon={<EngineeringIcon />}
              color="#00695c" path="/mantenimiento" navigate={navigate}>
              <Grid item xs={6}><KpiCard label="Total" value={d.mantenimiento.total} color="#004d40" icon={<EngineeringIcon />} /></Grid>
              <Grid item xs={6}><KpiCard label="Programados" value={d.mantenimiento.programados} color="#00695c" /></Grid>
              <Grid item xs={6}><KpiCard label="En proceso" value={d.mantenimiento.enProceso} color="#e65100" /></Grid>
              <Grid item xs={6}><KpiCard label="Vencidos" value={d.mantenimiento.vencidos} color="#b71c1c"
                alert={d.mantenimiento.vencidos > 0 ? `${d.mantenimiento.vencidos} vencidos` : null} /></Grid>
            </Section>
          </Grid>

          {/* ── Checador ──────────────────────────────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Section title="Checador de Asistencia" icon={<BadgeIcon />}
              color="#1565c0" path="/checador/admin" navigate={navigate}>
              <Grid item xs={6}><KpiCard label="Entradas hoy" value={d.checador.entradasHoy} color="#1565c0" icon={<BadgeIcon />} /></Grid>
              <Grid item xs={6}><KpiCard label="Salidas hoy" value={d.checador.salidasHoy} color="#e65100" /></Grid>
              <Grid item xs={12}><KpiCard label="Usuarios registrados" value={d.checador.usuarios} color="text.secondary"
                sub="con al menos 1 registro histórico" /></Grid>
            </Section>
          </Grid>

          {/* ── Usuarios + Licencias + Vacaciones ─────────────────────────── */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>General</Typography>
              <Stack spacing={1.5}>

                {/* Usuarios */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <PeopleIcon color="primary" />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>Usuarios del sistema</Typography>
                    <Typography variant="caption" color="text.secondary">{d.usuarios.activos} activos de {d.usuarios.total} totales</Typography>
                  </Box>
                  <Chip label={d.usuarios.activos} color="primary" size="small" />
                </Stack>

                <Divider />

                {/* Licencias */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <VpnKeyIcon color={d.licencias.vencidas > 0 ? 'error' : d.licencias.porVencer > 0 ? 'warning' : 'success'} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>Licencias de software</Typography>
                    <Typography variant="caption" color="text.secondary">{d.licencias.total} total</Typography>
                  </Box>
                  <Stack spacing={0.5} alignItems="flex-end">
                    {d.licencias.vencidas > 0 && <Chip label={`${d.licencias.vencidas} vencidas`} color="error" size="small" />}
                    {d.licencias.porVencer > 0 && <Chip label={`${d.licencias.porVencer} por vencer`} color="warning" size="small" />}
                    {d.licencias.vencidas === 0 && d.licencias.porVencer === 0 && <Chip label="Al día" color="success" size="small" />}
                  </Stack>
                </Stack>

                <Divider />

                {/* Vacaciones */}
                <Stack direction="row" alignItems="center" spacing={1}>
                  <BeachAccessIcon color={d.vacaciones.pendientes > 0 ? 'warning' : 'success'} />
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={600}>Vacaciones</Typography>
                    <Typography variant="caption" color="text.secondary">{d.vacaciones.aprobadas} aprobadas</Typography>
                  </Box>
                  {d.vacaciones.pendientes > 0
                    ? <Chip label={`${d.vacaciones.pendientes} pendientes`} color="warning" size="small" />
                    : <Chip label="Sin pendientes" color="success" size="small" />}
                </Stack>

              </Stack>
            </Paper>
          </Grid>

        </Grid>
      )}
    </Box>
  );
}
