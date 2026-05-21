import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Card, CardContent, CardActions, Grid, Chip, Stack,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Tooltip, LinearProgress, Alert, Avatar, Badge, Tabs, Tab,
  Table, TableBody, TableCell, TableHead, TableRow, TableContainer, Paper,
  FormControl, InputLabel, Select, Divider,
} from '@mui/material';
import AddIcon            from '@mui/icons-material/Add';
import EditIcon           from '@mui/icons-material/Edit';
import DeleteIcon         from '@mui/icons-material/Delete';
import SchoolIcon         from '@mui/icons-material/School';
import PeopleIcon         from '@mui/icons-material/People';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import SearchIcon         from '@mui/icons-material/Search';
import PersonAddIcon      from '@mui/icons-material/PersonAdd';
import { capacitacionesApi } from '../../api/pandoraApi';
import { useAuth } from '../../hooks/useAuth';

const STATUS_COLORS = {
  Pendiente: 'warning', 'En Curso': 'info', Completada: 'success', Cancelada: 'error',
};
const MODALITIES = ['Presencial', 'Virtual', 'Híbrida'];
const STATUSES   = ['Pendiente', 'En Curso', 'Completada', 'Cancelada'];
const PART_STATUSES = ['Inscrito', 'Completado', 'Cancelado'];

const empty = () => ({
  title: '', description: '', category: '', instructor: '',
  startDate: '', endDate: '', duration: '', status: 'Pendiente',
  modality: 'Presencial', maxParticipants: '',
});

export default function CapacitacionesPage() {
  const { isAdmin } = useAuth();
  const [list, setList]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [form, setForm]         = useState(empty());
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing]   = useState(null);
  const [detail, setDetail]     = useState(null);
  const [openDetail, setOpenDetail] = useState(false);
  const [detailTab, setDetailTab]   = useState(0);
  const [partForm, setPartForm]     = useState({ username: '', fullName: '' });
  const [openPartForm, setOpenPartForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSearch) params.search = filterSearch;
      const res = await capacitacionesApi.getAll(params);
      setList(res.data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filterStatus, filterSearch]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const data = {
        ...form,
        duration:        form.duration        ? parseInt(form.duration)        : null,
        maxParticipants: form.maxParticipants  ? parseInt(form.maxParticipants) : null,
        startDate:       form.startDate || new Date().toISOString(),
        endDate:         form.endDate   || null,
      };
      if (editing) await capacitacionesApi.update(editing, data);
      else         await capacitacionesApi.create(data);
      setOpenForm(false);
      setEditing(null);
      setForm(empty());
      load();
    } catch (e) { setError(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta capacitación?')) return;
    try { await capacitacionesApi.remove(id); load(); }
    catch (e) { setError(e.message); }
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await capacitacionesApi.getById(id);
      setDetail(res.data);
      setDetailTab(0);
      setOpenDetail(true);
    } catch (e) { setError(e.message); }
  };

  const handleAddPart = async () => {
    if (!partForm.username || !detail) return;
    try {
      await capacitacionesApi.addParticipante(detail.capacitacion.id, partForm);
      const res = await capacitacionesApi.getById(detail.capacitacion.id);
      setDetail(res.data);
      setOpenPartForm(false);
      setPartForm({ username: '', fullName: '' });
    } catch (e) { setError(e.message); }
  };

  const handleUpdatePart = async (partId, status) => {
    try {
      await capacitacionesApi.updateParticipante(detail.capacitacion.id, partId, { status });
      const res = await capacitacionesApi.getById(detail.capacitacion.id);
      setDetail(res.data);
    } catch (e) { setError(e.message); }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Stack direction="row" alignItems="center" gap={1}>
          <SchoolIcon color="primary" sx={{ fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700}>Capacitaciones</Typography>
        </Stack>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />}
            onClick={() => { setForm(empty()); setEditing(null); setOpenForm(true); }}>
            Nueva Capacitación
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
        <TextField size="small" placeholder="Buscar..." value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} /> }}
          sx={{ flex: 1 }} />
        <TextField size="small" select label="Estado" value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)} sx={{ minWidth: 150 }}>
          <MenuItem value="">Todos</MenuItem>
          {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
        </TextField>
      </Stack>

      {loading ? <LinearProgress /> : (
        <Grid container spacing={2}>
          {list.length === 0 && (
            <Grid item xs={12}>
              <Typography color="text.secondary" textAlign="center" py={4}>
                No hay capacitaciones registradas.
              </Typography>
            </Grid>
          )}
          {list.map(cap => (
            <Grid item xs={12} sm={6} md={4} key={cap.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column',
                cursor: 'pointer', '&:hover': { boxShadow: 6 } }}
                onClick={() => handleOpenDetail(cap.id)}>
                <CardContent sx={{ flex: 1 }}>
                  <Stack direction="row" justifyContent="space-between" mb={1}>
                    <Chip label={cap.status} size="small"
                      color={STATUS_COLORS[cap.status] || 'default'} />
                    {cap.modality && <Chip label={cap.modality} size="small" variant="outlined" />}
                  </Stack>
                  <Typography variant="subtitle1" fontWeight={600} gutterBottom noWrap>
                    {cap.title}
                  </Typography>
                  {cap.instructor && (
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Instructor: {cap.instructor}
                    </Typography>
                  )}
                  {cap.category && (
                    <Chip label={cap.category} size="small" sx={{ mb: 1 }} />
                  )}
                  <Stack direction="row" gap={2} mt={1}>
                    <Stack direction="row" alignItems="center" gap={0.5}>
                      <PeopleIcon fontSize="small" color="action" />
                      <Typography variant="body2">{cap.enrolledCount} inscritos</Typography>
                    </Stack>
                    {cap.duration && (
                      <Typography variant="body2" color="text.secondary">{cap.duration}h</Typography>
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" display="block" mt={1}>
                    {new Date(cap.startDate).toLocaleDateString('es-MX')}
                    {cap.endDate && ` — ${new Date(cap.endDate).toLocaleDateString('es-MX')}`}
                  </Typography>
                </CardContent>
                {isAdmin && (
                  <CardActions sx={{ justifyContent: 'flex-end', pt: 0 }}>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={e => {
                        e.stopPropagation();
                        setForm({
                          title: cap.title, description: cap.description || '',
                          category: cap.category || '', instructor: cap.instructor || '',
                          startDate: cap.startDate?.slice(0,10) || '',
                          endDate: cap.endDate?.slice(0,10) || '',
                          duration: cap.duration?.toString() || '',
                          status: cap.status, modality: cap.modality || 'Presencial',
                          maxParticipants: cap.maxParticipants?.toString() || '',
                        });
                        setEditing(cap.id);
                        setOpenForm(true);
                      }}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" color="error" onClick={e => { e.stopPropagation(); handleDelete(cap.id); }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Form Dialog */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Capacitación' : 'Nueva Capacitación'}</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Título *" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} fullWidth />
            <TextField label="Descripción" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} fullWidth multiline rows={3} />
            <Stack direction="row" gap={2}>
              <TextField label="Categoría" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} fullWidth />
              <TextField label="Instructor" value={form.instructor} onChange={e => setForm(f => ({ ...f, instructor: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Fecha inicio" type="date" value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
              <TextField label="Fecha fin" type="date" value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField label="Duración (horas)" type="number" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} fullWidth />
              <TextField label="Máx. participantes" type="number" value={form.maxParticipants} onChange={e => setForm(f => ({ ...f, maxParticipants: e.target.value }))} fullWidth />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField select label="Modalidad" value={form.modality} onChange={e => setForm(f => ({ ...f, modality: e.target.value }))} fullWidth>
                {MODALITIES.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
              </TextField>
              <TextField select label="Estado" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} fullWidth>
                {STATUSES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={!form.title}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Detail Dialog */}
      {detail && (
        <Dialog open={openDetail} onClose={() => setOpenDetail(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h6">{detail.capacitacion.title}</Typography>
              <Chip label={detail.capacitacion.status} size="small"
                color={STATUS_COLORS[detail.capacitacion.status] || 'default'} />
            </Stack>
          </DialogTitle>
          <DialogContent dividers>
            <Tabs value={detailTab} onChange={(_, v) => setDetailTab(v)} sx={{ mb: 2 }}>
              <Tab label="Información" />
              <Tab label={`Participantes (${detail.participantes.length})`} />
            </Tabs>
            {detailTab === 0 && (
              <Stack gap={1}>
                {detail.capacitacion.description && (
                  <Typography variant="body2">{detail.capacitacion.description}</Typography>
                )}
                <Divider />
                <Grid container spacing={2}>
                  {[
                    ['Instructor', detail.capacitacion.instructor],
                    ['Categoría',  detail.capacitacion.category],
                    ['Modalidad',  detail.capacitacion.modality],
                    ['Duración',   detail.capacitacion.duration ? `${detail.capacitacion.duration}h` : null],
                    ['Máx. participantes', detail.capacitacion.maxParticipants],
                    ['Inicio', detail.capacitacion.startDate && new Date(detail.capacitacion.startDate).toLocaleDateString('es-MX')],
                    ['Fin', detail.capacitacion.endDate && new Date(detail.capacitacion.endDate).toLocaleDateString('es-MX')],
                  ].filter(([, v]) => v).map(([label, value]) => (
                    <Grid item xs={6} key={label}>
                      <Typography variant="caption" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{value}</Typography>
                    </Grid>
                  ))}
                </Grid>
              </Stack>
            )}
            {detailTab === 1 && (
              <>
                {isAdmin && (
                  <Button size="small" startIcon={<PersonAddIcon />} variant="outlined"
                    onClick={() => setOpenPartForm(true)} sx={{ mb: 2 }}>
                    Agregar participante
                  </Button>
                )}
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Nombre</TableCell>
                        <TableCell>Usuario</TableCell>
                        <TableCell>Estado</TableCell>
                        {isAdmin && <TableCell>Acciones</TableCell>}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {detail.participantes.map(p => (
                        <TableRow key={p.id}>
                          <TableCell>{p.fullName || p.username}</TableCell>
                          <TableCell>{p.username}</TableCell>
                          <TableCell>
                            <Chip label={p.status} size="small"
                              color={p.status === 'Completado' ? 'success' : p.status === 'Cancelado' ? 'error' : 'info'} />
                          </TableCell>
                          {isAdmin && (
                            <TableCell>
                              <Stack direction="row" gap={0.5}>
                                {p.status !== 'Completado' && (
                                  <Tooltip title="Marcar Completado">
                                    <IconButton size="small" color="success"
                                      onClick={() => handleUpdatePart(p.id, 'Completado')}>
                                      <CheckCircleIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                                {p.status !== 'Cancelado' && (
                                  <Tooltip title="Cancelar inscripción">
                                    <IconButton size="small" color="error"
                                      onClick={() => handleUpdatePart(p.id, 'Cancelado')}>
                                      <DeleteIcon fontSize="small" />
                                    </IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                      {detail.participantes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} align="center">Sin participantes inscritos</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDetail(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Add Participant Dialog */}
      <Dialog open={openPartForm} onClose={() => setOpenPartForm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Agregar Participante</DialogTitle>
        <DialogContent>
          <Stack gap={2} mt={1}>
            <TextField label="Usuario (username) *" value={partForm.username}
              onChange={e => setPartForm(f => ({ ...f, username: e.target.value }))} fullWidth />
            <TextField label="Nombre completo" value={partForm.fullName}
              onChange={e => setPartForm(f => ({ ...f, fullName: e.target.value }))} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPartForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAddPart} disabled={!partForm.username}>Agregar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
