import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Grid, Card, CardContent, CircularProgress,
  Alert, Tab, Tabs, Divider,
} from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AssessmentIcon from '@mui/icons-material/Assessment';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { reportsApi } from '../api/pandoraApi';
import { useAuth, MODULES } from '../hooks/useAuth.jsx';

// ─── Paleta ───────────────────────────────────────────────────────────────────
const P = ['#1565c0', '#2e7d32', '#7b1fa2', '#e65100', '#00838f', '#c62828', '#4527a0', '#558b2f', '#01579b'];

const TOOLTIP_STYLE = {
  contentStyle: { background: '#1e293b', border: 'none', borderRadius: 8, fontSize: 12, color: '#f1f5f9' },
  itemStyle:    { color: '#f1f5f9' },
  labelStyle:   { color: '#94a3b8', fontWeight: 600 },
};

// ─── Sub-componentes reutilizables ────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'primary.main' }) {
  return (
    <Card sx={{ height: '100%', borderTop: 3, borderColor: color }}>
      <CardContent sx={{ pb: '16px !important' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={700}
          textTransform="uppercase" letterSpacing={0.8} display="block" mb={0.5}>
          {label}
        </Typography>
        <Typography variant="h4" fontWeight={800} color={color} lineHeight={1}>
          {value}
        </Typography>
        {sub && (
          <Typography variant="caption" color="text.secondary" mt={0.5} display="block">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function ChartCard({ title, height = 260, children }) {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Typography variant="subtitle2" fontWeight={700} color="text.primary" mb={2}>
          {title}
        </Typography>
        <Box sx={{ height, minWidth: 0 }}>
          <ResponsiveContainer width="100%" height="100%">
            {children}
          </ResponsiveContainer>
        </Box>
      </CardContent>
    </Card>
  );
}

// Etiqueta personalizada para donut
function DonutLabel({ cx, cy, value, total }) {
  return (
    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">
      <tspan x={cx} dy="-0.4em" fontSize={22} fontWeight={800} fill="#1e293b">{total}</tspan>
      <tspan x={cx} dy="1.4em" fontSize={11} fill="#94a3b8">{value}</tspan>
    </text>
  );
}

// ─── Tab Mail+ ────────────────────────────────────────────────────────────────

function MailTab({ data }) {
  if (!data) return null;
  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Campañas" value={data.totalCampaigns} color="#1565c0" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Destinatarios" value={data.totalRecipients.toLocaleString()} color="#6a1b9a" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Enviados" value={data.totalSent.toLocaleString()} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Tasa de éxito" value={`${data.successRate}%`}
            sub={`${data.totalFailed} fallidos`}
            color={data.successRate >= 90 ? '#2e7d32' : data.successRate >= 70 ? '#e65100' : '#c62828'} />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Tendencia mensual */}
        <Grid item xs={12} lg={8}>
          <ChartCard title="Envíos mensuales — últimos 12 meses" height={280}>
            <BarChart data={data.monthlyTrend} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="sent"   name="Enviados" fill="#2e7d32" radius={[3, 3, 0, 0]} />
              <Bar dataKey="failed" name="Fallidos"  fill="#c62828" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>

        {/* Por tipo de programa */}
        <Grid item xs={12} lg={4}>
          <ChartCard title="Por tipo de programa" height={280}>
            <PieChart>
              <Pie data={data.byProgramType} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3}>
                {data.byProgramType.map((_, i) => (
                  <Cell key={i} fill={P[i % P.length]} />
                ))}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ChartCard>
        </Grid>

        {/* Top campañas */}
        {data.topCampaigns.length > 0 && (
          <Grid item xs={12}>
            <ChartCard title="Top campañas por destinatarios" height={220}>
              <BarChart
                layout="vertical"
                data={data.topCampaigns.map(c => ({ ...c, name: c.name.length > 35 ? c.name.slice(0, 35) + '…' : c.name }))}
                margin={{ left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="sent"   name="Enviados" fill="#2e7d32" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="failed" name="Fallidos"  fill="#c62828" stackId="a" radius={[0, 3, 3, 0]} />
              </BarChart>
            </ChartCard>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ─── Tab Inventario ───────────────────────────────────────────────────────────

function InventoryTab({ data }) {
  if (!data) return null;
  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Total equipos" value={data.total} color="#1565c0" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Activos" value={data.active}
            sub={`${data.total > 0 ? Math.round(data.active / data.total * 100) : 0}% del total`}
            color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Mantenimiento" value={data.maintenance} color="#e65100" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Dados de baja" value={data.decommissioned}
            sub={`${data.inStorage} en almacén`} color="#c62828" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Por tipo */}
        <Grid item xs={12} md={5}>
          <ChartCard title="Por categoría" height={280}>
            <PieChart>
              <Pie data={data.byType} dataKey="value" nameKey="name"
                cx="50%" cy="50%" innerRadius={65} outerRadius={95} paddingAngle={3}>
                {data.byType.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartCard>
        </Grid>

        {/* Por estado */}
        <Grid item xs={12} md={3}>
          <ChartCard title="Por estado" height={280}>
            <PieChart>
              <Pie data={data.byStatus} dataKey="value" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} paddingAngle={3}>
                {data.byStatus.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
              </Pie>
              <Tooltip {...TOOLTIP_STYLE} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ChartCard>
        </Grid>

        {/* Transferencias por mes */}
        <Grid item xs={12} md={4}>
          <ChartCard title="Transferencias — últimos 6 meses" height={280}>
            <AreaChart data={data.transfersByMonth}>
              <defs>
                <linearGradient id="gradTransfer" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6a1b9a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#6a1b9a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" name="Transferencias"
                stroke="#6a1b9a" fill="url(#gradTransfer)" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          </ChartCard>
        </Grid>

        {/* Por departamento */}
        {data.byDepartment.length > 0 && (
          <Grid item xs={12}>
            <ChartCard title="Equipos por departamento" height={Math.max(200, data.byDepartment.length * 38)}>
              <BarChart layout="vertical" data={data.byDepartment} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" width={200} tick={{ fontSize: 11 }} />
                <Tooltip {...TOOLTIP_STYLE} />
                <Bar dataKey="value" name="Equipos" fill="#1565c0" radius={[0, 4, 4, 0]}>
                  {data.byDepartment.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
                </Bar>
              </BarChart>
            </ChartCard>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}

// ─── Tab Calendario ───────────────────────────────────────────────────────────

function CalendarTab({ data }) {
  if (!data) return null;
  return (
    <Box>
      {/* KPIs */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Total reservaciones" value={data.total} color="#1565c0" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Este mes" value={data.thisMonth} color="#2e7d32" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Próximas" value={data.upcoming} color="#6a1b9a" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard label="Salas activas" value={data.activeRooms} color="#00838f" />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        {/* Por sala */}
        <Grid item xs={12} md={5}>
          <ChartCard title="Reservaciones por sala" height={280}>
            <BarChart data={data.byRoom}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" name="Reservaciones" radius={[4, 4, 0, 0]}>
                {data.byRoom.map((_, i) => <Cell key={i} fill={P[i % P.length]} />)}
              </Bar>
            </BarChart>
          </ChartCard>
        </Grid>

        {/* Por día de la semana */}
        <Grid item xs={12} md={3}>
          <ChartCard title="Por día de la semana" height={280}>
            <BarChart data={data.byDayOfWeek}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Bar dataKey="value" name="Reservaciones" fill="#00838f" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartCard>
        </Grid>

        {/* Tendencia mensual */}
        <Grid item xs={12} md={4}>
          <ChartCard title="Tendencia — últimos 6 meses" height={280}>
            <AreaChart data={data.byMonth}>
              <defs>
                <linearGradient id="gradCalendar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#1565c0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#1565c0" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip {...TOOLTIP_STYLE} />
              <Area type="monotone" dataKey="count" name="Reservaciones"
                stroke="#1565c0" fill="url(#gradCalendar)" strokeWidth={2} dot={{ r: 4 }} />
            </AreaChart>
          </ChartCard>
        </Grid>
      </Grid>
    </Box>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

const ALL_TABS = [
  { label: 'Mail+',       icon: <EmailIcon />,         key: 'mail',      module: MODULES.MAIL_PLUS   },
  { label: 'Inventario',  icon: <Inventory2Icon />,     key: 'inventory', module: MODULES.INVENTARIO  },
  { label: 'Calendario',  icon: <CalendarMonthIcon />,  key: 'calendar',  module: MODULES.CALENDARIO  },
];

export default function Reports() {
  const { hasModule } = useAuth();

  // Solo los tabs a los que el usuario tiene acceso
  const TABS = ALL_TABS.filter(t => hasModule(t.module));

  const [tab,      setTab]      = useState(0);
  const [data,     setData]     = useState({ mail: null, inventory: null, calendar: null });
  const [loading,  setLoading]  = useState({});
  const [errors,   setErrors]   = useState({});

  const loadTab = useCallback(async (key) => {
    if (data[key]) return;                   // ya cargado
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const fetchers = { mail: reportsApi.getMail, inventory: reportsApi.getInventory, calendar: reportsApi.getCalendar };
      const { data: result } = await fetchers[key]();
      setData(d => ({ ...d, [key]: result }));
    } catch {
      setErrors(e => ({ ...e, [key]: 'Error al cargar el reporte.' }));
    } finally {
      setLoading(l => ({ ...l, [key]: false }));
    }
  }, [data]);

  // Cargar el tab activo al montar y al cambiar
  useEffect(() => {
    loadTab(TABS[tab].key);
  }, [tab]); // eslint-disable-line

  const activeKey = TABS[tab].key;
  const isLoading = loading[activeKey];
  const error     = errors[activeKey];

  return (
    <Box sx={{ p: 4 }}>
      {/* Encabezado */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <AssessmentIcon sx={{ fontSize: 32, color: 'primary.main' }} />
        <Box>
          <Typography variant="h4" fontWeight={800} color="primary.main" lineHeight={1}>
            Reportes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Análisis y estadísticas de todos los módulos
          </Typography>
        </Box>
      </Box>

      {/* Sin acceso a ningún módulo */}
      {TABS.length === 0 && (
        <Alert severity="warning">
          No tienes acceso a ningún módulo de reportes. Contacta al administrador para solicitar acceso.
        </Alert>
      )}

      {/* Tabs de módulo */}
      {TABS.length > 0 && (
        <>
          <Tabs
            value={tab}
            onChange={(_, v) => setTab(v)}
            sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
            TabIndicatorProps={{ style: { height: 3, borderRadius: 2 } }}
          >
            {TABS.map(t => (
              <Tab
                key={t.key}
                icon={t.icon}
                iconPosition="start"
                label={t.label}
                sx={{ fontWeight: 600, minHeight: 48, textTransform: 'none', fontSize: 15 }}
              />
            ))}
          </Tabs>

          {/* Contenido */}
          {isLoading && (
            <Box textAlign="center" py={10}>
              <CircularProgress />
              <Typography variant="body2" color="text.secondary" mt={2}>Cargando reporte…</Typography>
            </Box>
          )}

          {error && !isLoading && (
            <Alert severity="error">{error}</Alert>
          )}

          {!isLoading && !error && (
            <>
              {TABS[tab]?.key === 'mail'      && <MailTab      data={data.mail}      />}
              {TABS[tab]?.key === 'inventory' && <InventoryTab data={data.inventory} />}
              {TABS[tab]?.key === 'calendar'  && <CalendarTab  data={data.calendar}  />}
            </>
          )}
        </>
      )}
    </Box>
  );
}
