import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  CircularProgress, Alert, IconButton, Tooltip, InputAdornment,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import AddIcon           from '@mui/icons-material/Add';
import SettingsIcon      from '@mui/icons-material/Settings';
import SearchIcon        from '@mui/icons-material/Search';
import RefreshIcon       from '@mui/icons-material/Refresh';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { ticketApi }     from '../../api/pandoraApi';
import { apiError }      from '../../api/apiError';
import { useAuth }       from '../../hooks/useAuth.jsx';
import { format }        from 'date-fns';
import { es }            from 'date-fns/locale';

// ── Helpers de color ──────────────────────────────────────────────────────────

const STATUS_COLOR = {
  'Abierto':      { bg: '#e3f2fd', color: '#1565c0', label: 'Abierto' },
  'En Progreso':  { bg: '#fff3e0', color: '#e65100', label: 'En Progreso' },
  'En Espera':    { bg: '#fff8e1', color: '#f57f17', label: 'En Espera' },
  'Resuelto':     { bg: '#e8f5e9', color: '#1b5e20', label: 'Resuelto' },
  'Cerrado':      { bg: '#f5f5f5', color: '#616161', label: 'Cerrado' },
};

const PRIORITY_COLOR = {
  'Baja':    { bg: '#f5f5f5', color: '#616161' },
  'Media':   { bg: '#e3f2fd', color: '#1565c0' },
  'Alta':    { bg: '#fff3e0', color: '#e65100' },
  'Crítica': { bg: '#ffebee', color: '#b71c1c' },
};

function StatusChip({ status }) {
  const c = STATUS_COLOR[status] ?? STATUS_COLOR['Abierto'];
  return (
    <Chip
      label={c.label} size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 11, border: `1px solid ${c.color}40` }}
    />
  );
}

function PriorityChip({ priority }) {
  const c = PRIORITY_COLOR[priority] ?? PRIORITY_COLOR['Media'];
  return (
    <Chip
      label={priority} size="small"
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, fontSize: 11, border: `1px solid ${c.color}40` }}
    />
  );
}

const STATUSES   = ['Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado'];
const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'];

// ── Columnas del DataGrid ─────────────────────────────────────────────────────

function buildColumns(navigate) {
  return [
    {
      field: 'ticketNumber', headerName: '#', width: 110,
      renderCell: ({ value }) => (
        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main">
          {value}
        </Typography>
      ),
    },
    {
      field: 'title', headerName: 'Título', flex: 1, minWidth: 200,
      renderCell: ({ value, row }) => (
        <Box>
          <Typography variant="body2" fontWeight={600} noWrap>{value}</Typography>
          {row.department && (
            <Typography variant="caption" color="text.secondary" noWrap>{row.department}</Typography>
          )}
        </Box>
      ),
    },
    {
      field: 'status', headerName: 'Estatus', width: 130,
      renderCell: ({ value }) => <StatusChip status={value} />,
    },
    {
      field: 'priority', headerName: 'Prioridad', width: 110,
      renderCell: ({ value }) => <PriorityChip priority={value} />,
    },
    {
      field: 'area', headerName: 'Área', width: 160,
      renderCell: ({ value }) => (
        <Typography variant="body2" color={value ? 'text.primary' : 'text.disabled'} noWrap>
          {value ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'assignedTo', headerName: 'Asignado a', width: 150,
      renderCell: ({ value }) => (
        <Typography variant="body2" color={value ? 'text.primary' : 'text.disabled'}>
          {value ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'submittedBy', headerName: 'Solicitante', width: 150,
      renderCell: ({ value }) => <Typography variant="body2">{value}</Typography>,
    },
    {
      field: 'createdAt', headerName: 'Fecha', width: 140,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary">
          {format(new Date(value), 'dd/MM/yyyy HH:mm', { locale: es })}
        </Typography>
      ),
    },
  ];
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TicketsListPage() {
  const navigate             = useNavigate();
  const { isAdmin }          = useAuth();
  const [tickets,   setTickets]   = useState([]);
  const [areas,     setAreas]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');
  const [search,    setSearch]    = useState('');
  const [statusF,   setStatusF]   = useState('');
  const [priorityF, setPriorityF] = useState('');
  const [areaF,     setAreaF]     = useState('');

  // Cargar puestos del catálogo una sola vez al montar
  useEffect(() => {
    ticketApi.getPositions()
      .then(r => setAreas(r.data ?? []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusF)   params.status   = statusF;
      if (priorityF) params.priority = priorityF;
      if (areaF)     params.area     = areaF;
      if (search)    params.search   = search;
      const { data } = await ticketApi.getAll(params);
      setTickets(data);
    } catch (e) {
      setError(apiError(e, 'Error al cargar tickets.'));
    } finally {
      setLoading(false);
    }
  }, [statusF, priorityF, areaF, search]);

  useEffect(() => { load(); }, [load]);

  // Stats
  const stats = {
    total:    tickets.length,
    abiertos: tickets.filter(t => t.status === 'Abierto').length,
    progreso: tickets.filter(t => t.status === 'En Progreso').length,
    espera:   tickets.filter(t => t.status === 'En Espera').length,
    resueltos:tickets.filter(t => t.status === 'Resuelto').length,
  };

  const columns = buildColumns(navigate);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pb: 6 }}>

      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '6px solid', borderTopColor: 'primary.main' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <Stack direction="row" spacing={2} alignItems="center">
            <ConfirmationNumberIcon color="primary" sx={{ fontSize: 36 }} />
            <Box>
              <Typography variant="h5" fontWeight={800}>Tickets de Soporte</Typography>
              <Typography variant="body2" color="text.secondary">
                {isAdmin ? 'Gestión completa de incidencias' : 'Mis solicitudes de soporte'}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            {isAdmin && (
              <Button variant="outlined" size="small" startIcon={<SettingsIcon />} onClick={() => navigate('/tickets/template')}>
                Configurar formulario
              </Button>
            )}
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tickets/new')} sx={{ borderRadius: 2 }}>
              Nuevo ticket
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap" useFlexGap>
        {[
          { label: 'Total',       value: stats.total,     color: '#1a237e' },
          { label: 'Abiertos',    value: stats.abiertos,  color: '#1565c0' },
          { label: 'En Progreso', value: stats.progreso,  color: '#e65100' },
          { label: 'En Espera',   value: stats.espera,    color: '#f57f17' },
          { label: 'Resueltos',   value: stats.resueltos, color: '#1b5e20' },
        ].map(s => (
          <Paper key={s.label} elevation={0} sx={{ px: 2.5, py: 1.5, borderRadius: 2.5, border: '1px solid', borderColor: 'divider', minWidth: 100 }}>
            <Typography variant="h5" fontWeight={800} color={s.color}>{s.value}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={500}>{s.label}</Typography>
          </Paper>
        ))}
      </Stack>

      {/* Filters */}
      <Paper elevation={0} sx={{ p: 2, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
          <TextField
            size="small" placeholder="Buscar por título, número, departamento..."
            value={search} onChange={e => setSearch(e.target.value)}
            sx={{ flex: 1 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <TextField
            select size="small" label="Estatus" value={statusF}
            onChange={e => setStatusF(e.target.value)} sx={{ minWidth: 150 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Prioridad" value={priorityF}
            onChange={e => setPriorityF(e.target.value)} sx={{ minWidth: 130 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {PRIORITIES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField
            select size="small" label="Puesto" value={areaF}
            onChange={e => setAreaF(e.target.value)} sx={{ minWidth: 200 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {areas.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <Tooltip title="Recargar">
            <IconButton onClick={load} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* DataGrid */}
      <Paper elevation={0} sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
        <DataGrid
          rows={tickets}
          columns={columns}
          loading={loading}
          autoHeight
          getRowId={r => r.id}
          onRowClick={({ row }) => navigate(`/tickets/${row.id}`)}
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10 } } }}
          disableColumnFilter
          disableColumnMenu
          rowHeight={64}
          sx={{
            border: 'none',
            '& .MuiDataGrid-row': { cursor: 'pointer', '&:hover': { bgcolor: 'primary.50' } },
            '& .MuiDataGrid-columnHeaders': { bgcolor: 'grey.50', fontWeight: 700 },
            '& .MuiDataGrid-cell': { borderColor: 'divider', display: 'flex', alignItems: 'center' },
            '& .MuiDataGrid-columnSeparator': { display: 'none' },
          }}
        />
      </Paper>

    </Box>
  );
}
