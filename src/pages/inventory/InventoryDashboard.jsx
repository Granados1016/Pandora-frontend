import React, { useEffect, useState } from 'react';
import {
  Box, Grid, Paper, Typography, CircularProgress, Alert,
  Chip, Divider, Avatar, List, ListItem, ListItemText, ListItemAvatar,
} from '@mui/material';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import BuildIcon from '@mui/icons-material/Build';
import BlockIcon from '@mui/icons-material/Block';
import WarehouseIcon from '@mui/icons-material/Warehouse';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { inventoryApi } from '../../api/pandoraApi';

const STATUS_COLORS = {
  Activos:        '#4caf50',
  Mantenimiento:  '#ff9800',
  'Dados de baja':'#f44336',
  Almacén:        '#9e9e9e',
};

const fmt = (n) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n);

function KpiCard({ icon, label, value, color, subtitle }) {
  return (
    <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Avatar sx={{ bgcolor: `${color}18`, width: 48, height: 48 }}>
          {React.cloneElement(icon, { sx: { color } })}
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight={700} color={color}>{value}</Typography>
          <Typography variant="body2" color="text.secondary">{label}</Typography>
          {subtitle && <Typography variant="caption" color="text.disabled">{subtitle}</Typography>}
        </Box>
      </Box>
    </Paper>
  );
}

export default function InventoryDashboard() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    inventoryApi.getDashboard()
      .then(r => setData(r.data))
      .catch(() => setError('Error al cargar el dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', pt: 10 }}><CircularProgress /></Box>;
  if (error)   return <Alert severity="error" sx={{ m: 3 }}>{error}</Alert>;
  if (!data)   return null;

  const pieData = [
    { name: 'Activos',         value: data.activeCount },
    { name: 'Mantenimiento',   value: data.maintenanceCount },
    { name: 'Dados de baja',   value: data.decommissionedCount },
    { name: 'Almacén',         value: data.inStorageCount },
  ].filter(d => d.value > 0);

  const barData = (data.byType || []).map(t => ({
    name:    t.typeName.length > 14 ? t.typeName.slice(0, 14) + '…' : t.typeName,
    total:   t.totalCount,
    activos: t.activeCount,
  }));

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Encabezado */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" fontWeight={700}>Dashboard de Inventario</Typography>
        <Typography variant="body2" color="text.secondary">
          Resumen general de equipos registrados
        </Typography>
      </Box>

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard icon={<CheckCircleOutlineIcon />} label="Activos"        value={data.activeCount}        color="#4caf50" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard icon={<BuildIcon />}              label="Mantenimiento"  value={data.maintenanceCount}   color="#ff9800" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard icon={<BlockIcon />}              label="Dados de baja"  value={data.decommissionedCount} color="#f44336" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard icon={<WarehouseIcon />}          label="En almacén"     value={data.inStorageCount}     color="#9e9e9e" />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            icon={<AttachMoneyIcon />} label="Valor activos" color="#1976d2"
            value={fmt(data.activeValue)}
          />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard
            icon={<AttachMoneyIcon />} label="Valor total" color="#7b1fa2"
            value={fmt(data.totalValue)}
            subtitle={`${data.totalCount} equipos`}
          />
        </Grid>
      </Grid>

      {/* Gráficas + Transferencias */}
      <Grid container spacing={2}>
        {/* Pie */}
        {pieData.length > 0 && (
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Estado del inventario</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={85} label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? '#607d8b'} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Bar */}
        {barData.length > 0 && (
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle1" fontWeight={600} mb={1}>Equipos por categoría</Typography>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={barData} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total"   name="Total"   fill="#90caf9" radius={[4,4,0,0]} />
                  <Bar dataKey="activos" name="Activos" fill="#4caf50" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Paper>
          </Grid>
        )}

        {/* Últimas transferencias */}
        <Grid item xs={12} md={3}>
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={600} mb={1}>
              <SwapHorizIcon sx={{ verticalAlign: 'middle', mr: 0.5, fontSize: 18 }} />
              Últimas transferencias
            </Typography>
            {data.recentTransfers?.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin transferencias.</Typography>
            ) : (
              <List dense disablePadding>
                {(data.recentTransfers || []).map((t, i) => (
                  <React.Fragment key={t.id}>
                    {i > 0 && <Divider />}
                    <ListItem disablePadding sx={{ py: 0.8 }}>
                      <ListItemAvatar sx={{ minWidth: 36 }}>
                        <Avatar sx={{ width: 28, height: 28, bgcolor: 'primary.light', fontSize: 12 }}>
                          {t.itemName?.[0] ?? '?'}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Typography variant="caption" fontWeight={600} noWrap>
                            {t.itemName}
                          </Typography>
                        }
                        secondary={
                          <Typography variant="caption" color="text.secondary" noWrap>
                            {t.fromPerson || '—'} → {t.toPerson || '—'}
                          </Typography>
                        }
                      />
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
