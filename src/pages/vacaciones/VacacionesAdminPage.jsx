import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Tabs, Tab, Paper, Typography, Stack, Chip, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, CircularProgress, Alert, IconButton,
  Tooltip, Grid, Divider, Switch, FormControlLabel,
} from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon     from '@mui/icons-material/CancelOutlined';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutline';
import AddIcon                from '@mui/icons-material/Add';
import EditIcon               from '@mui/icons-material/Edit';
import HowToRegIcon           from '@mui/icons-material/HowToReg';
import { DatePicker }         from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs }       from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import dayjs from 'dayjs';
import 'dayjs/locale/es';
import api from '../../api/pandoraApi';

dayjs.locale('es');

const STATUS_COLOR = {
  Aprobado:  'success',
  Pendiente: 'warning',
  Rechazado: 'error',
  Cancelado: 'default',
};

// ── Tab panel ─────────────────────────────────────────────────────────────────
function TabPanel({ value, index, children }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null;
}

// ════════════════════════════════════════════════════════════════════════════════
// Pestaña 1: Solicitudes pendientes
// ════════════════════════════════════════════════════════════════════════════════
function TabSolicitudes({ filterStatus, setFilterStatus }) {
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error,   setError]           = useState('');
  const [reviewDlg, setReviewDlg]     = useState(null); // { id, username, action }
  const [reviewNote, setReviewNote]   = useState('');
  const [saving, setSaving]           = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/vacaciones/admin/solicitudes', {
        params: { status: filterStatus || undefined },
      });
      setSolicitudes(res.data);
    } catch { setError('Error al cargar solicitudes.'); }
    finally  { setLoading(false); }
  }, [filterStatus]);

  useEffect(() => { load(); }, [load]);

  const handleReview = async () => {
    setSaving(true);
    try {
      await api.put(`/vacaciones/admin/${reviewDlg.id}/revisar`, {
        status: reviewDlg.action,
        notes:  reviewNote || null,
      });
      setReviewDlg(null);
      setReviewNote('');
      load();
    } catch { alert('Error al procesar la solicitud.'); }
    finally  { setSaving(false); }
  };

  return (
    <>
      {/* Filtro */}
      <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
        {['', 'Pendiente', 'Aprobado', 'Rechazado', 'Cancelado'].map(s => (
          <Chip
            key={s || 'todas'}
            label={s || 'Todas'}
            onClick={() => setFilterStatus(s)}
            color={filterStatus === s ? 'primary' : 'default'}
            variant={filterStatus === s ? 'filled' : 'outlined'}
            size="small"
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : solicitudes.length === 0 ? (
        <Typography color="text.secondary" align="center" py={4}>No hay solicitudes con ese filtro.</Typography>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Usuario</strong></TableCell>
                <TableCell><strong>Tipo</strong></TableCell>
                <TableCell><strong>Fechas</strong></TableCell>
                <TableCell align="center"><strong>Días</strong></TableCell>
                <TableCell><strong>Estado</strong></TableCell>
                <TableCell><strong>Nota</strong></TableCell>
                <TableCell align="center"><strong>Acciones</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {solicitudes.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{s.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{s.username}</Typography>
                  </TableCell>
                  <TableCell>{s.type}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{s.startDate}</Typography>
                    <Typography variant="body2" color="text.secondary">→ {s.endDate}</Typography>
                  </TableCell>
                  <TableCell align="center">{s.totalDays}</TableCell>
                  <TableCell>
                    <Chip label={s.status} color={STATUS_COLOR[s.status] || 'default'} size="small" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 180 }}>
                    <Typography variant="caption" sx={{ wordBreak: 'break-word' }}>{s.notes || '—'}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    {s.status === 'Pendiente' && (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Tooltip title="Aprobar">
                          <IconButton
                            size="small" color="success"
                            onClick={() => { setReviewDlg({ id: s.id, username: s.fullName, action: 'Aprobado' }); setReviewNote(''); }}
                          >
                            <CheckCircleOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Rechazar">
                          <IconButton
                            size="small" color="error"
                            onClick={() => { setReviewDlg({ id: s.id, username: s.fullName, action: 'Rechazado' }); setReviewNote(''); }}
                          >
                            <CancelOutlinedIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo revisión */}
      <Dialog open={!!reviewDlg} onClose={() => setReviewDlg(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {reviewDlg?.action === 'Aprobado' ? '✅ Aprobar solicitud' : '❌ Rechazar solicitud'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            Solicitud de <strong>{reviewDlg?.username}</strong>
          </Typography>
          <TextField
            fullWidth multiline rows={3} size="small"
            label="Nota de respuesta (opcional)"
            value={reviewNote}
            onChange={e => setReviewNote(e.target.value)}
            sx={{ mt: 1.5 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDlg(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={reviewDlg?.action === 'Aprobado' ? 'success' : 'error'}
            onClick={handleReview}
            disabled={saving}
          >
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Confirmar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Pestaña 2: Festivos
// ════════════════════════════════════════════════════════════════════════════════
function TabFestivos() {
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [festivos, setFestivos] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [addOpen,  setAddOpen]  = useState(false);
  const [newDate,  setNewDate]  = useState(null);
  const [newName,  setNewName]  = useState('');
  const [recurring, setRecurring] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/vacaciones/admin/festivos/${year}`);
      setFestivos(res.data);
    } catch { setError('Error al cargar festivos.'); }
    finally  { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    if (!newDate || !newName.trim()) return;
    setSaving(true);
    try {
      await api.post('/vacaciones/admin/festivos', {
        holidayDate: newDate.format('YYYY-MM-DD'),
        name:        newName.trim(),
        isRecurring: recurring,
      });
      setAddOpen(false);
      setNewDate(null);
      setNewName('');
      load();
    } catch { alert('Error al agregar festivo.'); }
    finally  { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este festivo?')) return;
    await api.delete(`/vacaciones/admin/festivos/${id}`);
    load();
  };

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" fontWeight={600}>Año:</Typography>
          <TextField
            select size="small" value={year} onChange={e => setYear(+e.target.value)} sx={{ width: 100 }}
          >
            {[-1, 0, 1, 2].map(d => {
              const y = new Date().getFullYear() + d;
              return <MenuItem key={y} value={y}>{y}</MenuItem>;
            })}
          </TextField>
        </Stack>
        <Button startIcon={<AddIcon />} variant="contained" size="small" onClick={() => setAddOpen(true)}>
          Agregar festivo
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Fecha</strong></TableCell>
                <TableCell><strong>Nombre</strong></TableCell>
                <TableCell align="center"><strong>Recurrente</strong></TableCell>
                <TableCell align="center"><strong>Eliminar</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {festivos.map(f => (
                <TableRow key={f.id} hover>
                  <TableCell>{f.holidayDate}</TableCell>
                  <TableCell>{f.name}</TableCell>
                  <TableCell align="center">
                    <Chip label={f.isRecurring ? 'Sí' : 'No'} size="small"
                      color={f.isRecurring ? 'primary' : 'default'} variant="outlined" />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => handleDelete(f.id)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {festivos.length === 0 && (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin festivos registrados.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo agregar */}
      <Dialog open={addOpen} onClose={() => setAddOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar festivo</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            <DatePicker
              label="Fecha"
              value={newDate}
              onChange={setNewDate}
              slotProps={{ textField: { size: 'small', fullWidth: true } }}
            />
            <TextField
              size="small" fullWidth label="Nombre del festivo"
              value={newName} onChange={e => setNewName(e.target.value)}
              inputProps={{ maxLength: 100 }}
            />
            <FormControlLabel
              control={<Switch checked={recurring} onChange={e => setRecurring(e.target.checked)} />}
              label="Recurrente cada año (misma fecha)"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAdd} disabled={saving || !newDate || !newName.trim()}>
            {saving ? <CircularProgress size={18} color="inherit" /> : 'Agregar'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Pestaña 3: Políticas de días (personal + AppUsers)
// ════════════════════════════════════════════════════════════════════════════════
function TabPoliticas() {
  const [year,      setYear]      = useState(new Date().getFullYear());
  const [politicas, setPoliticas] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editId,    setEditId]    = useState(null);
  const [editVal,   setEditVal]   = useState(15);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/vacaciones/admin/politicas', { params: { year } });
      setPoliticas(res.data);
    } catch { /* silencioso */ }
    finally  { setLoading(false); }
  }, [year]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (username) => {
    setSaving(true);
    try {
      await api.put('/vacaciones/admin/politicas', { username, year, totalDays: editVal });
      setPoliticas(p => p.map(x => x.username === username
        ? { ...x, totalDays: editVal, available: editVal - x.usedDays }
        : x));
      setEditId(null);
    } catch { alert('Error al guardar.'); }
    finally  { setSaving(false); }
  };

  const filtered = politicas.filter(p =>
    !search || p.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    p.username?.toLowerCase().includes(search.toLowerCase()) ||
    p.department?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} mb={2} flexWrap="wrap">
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body1" fontWeight={600}>Año:</Typography>
          <TextField
            select size="small" value={year} onChange={e => setYear(+e.target.value)} sx={{ width: 100 }}
          >
            {[-1, 0, 1, 2].map(d => {
              const y = new Date().getFullYear() + d;
              return <MenuItem key={y} value={y}>{y}</MenuItem>;
            })}
          </TextField>
        </Stack>
        <TextField
          size="small" placeholder="Buscar empleado, usuario o departamento…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
        <Typography variant="caption" color="text.secondary">
          {filtered.length} usuario(s) · haz clic en ✏️ para editar sus días
        </Typography>
      </Stack>

      {loading ? (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'action.hover' }}>
                <TableCell><strong>Empleado</strong></TableCell>
                <TableCell><strong>Puesto / Departamento</strong></TableCell>
                <TableCell align="center"><strong>Asignados</strong></TableCell>
                <TableCell align="center"><strong>Usados</strong></TableCell>
                <TableCell align="center"><strong>Disponibles</strong></TableCell>
                <TableCell align="center"><strong>Editar</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                    No se encontraron usuarios.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(p => (
                <TableRow key={p.username} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{p.fullName}</Typography>
                    <Typography variant="caption" color="text.secondary">{p.username}</Typography>
                    {p.email && <Typography variant="caption" color="text.disabled" display="block">{p.email}</Typography>}
                  </TableCell>
                  <TableCell>
                    {p.position   && <Typography variant="body2">{p.position}</Typography>}
                    {p.department && <Chip label={p.department} size="small" variant="outlined" sx={{ mt: 0.3 }} />}
                    {!p.position && !p.department && <Typography variant="caption" color="text.disabled">—</Typography>}
                  </TableCell>
                  <TableCell align="center">
                    {editId === p.username ? (
                      <TextField
                        type="number" size="small" value={editVal}
                        onChange={e => setEditVal(+e.target.value)}
                        inputProps={{ min: 0, max: 365 }}
                        sx={{ width: 75 }}
                      />
                    ) : (
                      <Typography fontWeight={700} color="primary.main">{p.totalDays}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">
                    <Typography fontWeight={600} color="warning.main">{p.usedDays ?? 0}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography
                      fontWeight={700}
                      color={(p.available ?? p.totalDays) <= 0 ? 'error.main' : 'success.main'}
                    >
                      {p.available ?? p.totalDays}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    {editId === p.username ? (
                      <Stack direction="row" spacing={0.5} justifyContent="center">
                        <Button size="small" variant="contained" onClick={() => handleSave(p.username)} disabled={saving}>
                          {saving ? <CircularProgress size={14} color="inherit" /> : 'Guardar'}
                        </Button>
                        <Button size="small" onClick={() => setEditId(null)}>Cancelar</Button>
                      </Stack>
                    ) : (
                      <IconButton size="small" onClick={() => { setEditId(p.username); setEditVal(p.totalDays); }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Página principal Admin
// ════════════════════════════════════════════════════════════════════════════════
export default function VacacionesAdminPage() {
  const [tab, setTab]               = useState(0);
  const [filterStatus, setFilter]   = useState('Pendiente');

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="es">
      <Box sx={{ p: { xs: 2, md: 3 } }}>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <HowToRegIcon color="primary" />
          <Typography variant="h5" fontWeight={700}>Gestión de Vacaciones</Typography>
        </Stack>

        <Paper sx={{ borderRadius: 2 }}>
          <Tabs
            value={tab} onChange={(_, v) => setTab(v)}
            variant="scrollable" scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          >
            <Tab label="Solicitudes" />
            <Tab label="Festivos" />
            <Tab label="Días por Usuario" />
          </Tabs>

          <Box sx={{ p: 2 }}>
            <TabPanel value={tab} index={0}>
              <TabSolicitudes filterStatus={filterStatus} setFilterStatus={setFilter} />
            </TabPanel>
            <TabPanel value={tab} index={1}>
              <TabFestivos />
            </TabPanel>
            <TabPanel value={tab} index={2}>
              <TabPoliticas />
            </TabPanel>
          </Box>
        </Paper>
      </Box>
    </LocalizationProvider>
  );
}
