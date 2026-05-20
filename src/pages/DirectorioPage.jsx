import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Stack, Grid, Card, CardContent, CardMedia,
  Avatar, TextField, Button, Chip, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, Alert, CircularProgress, Tooltip,
  FormControl, InputLabel, Select, MenuItem, InputAdornment, Divider,
  Switch, FormControlLabel,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import BadgeIcon from '@mui/icons-material/Badge';
import BusinessIcon from '@mui/icons-material/Business';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import CakeIcon from '@mui/icons-material/Cake';
import WorkHistoryIcon from '@mui/icons-material/WorkHistory';
import { directorioApi, catalogApi } from '../api/pandoraApi';
import { useAuth, MODULES } from '../hooks/useAuth.jsx';

const EMPTY_FORM = {
  fullName: '', position: '', email: '', phone: '', extension: '',
  photoUrl: '', birthday: '', startDate: '', departmentId: '', notes: '', isActive: true,
};

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function calcAniversario(startDate) {
  if (!startDate) return null;
  const start = new Date(startDate);
  const now   = new Date();
  const years = now.getFullYear() - start.getFullYear();
  if (years <= 0) return null;
  return years;
}

export default function DirectorioPage() {
  const { isAdmin } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [error, setError]         = useState('');

  // Dialog
  const [open, setOpen]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Photo upload
  const photoRef = useRef();
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      directorioApi.getAll({ search: search || undefined, department: filterDept || undefined }),
      catalogApi.getDepartments(),
    ])
      .then(([empRes, deptRes]) => {
        setEmployees(empRes.data);
        setDepartments(deptRes.data);
      })
      .catch(() => setError('Error al cargar el directorio.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load();
  };

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveError('');
    setOpen(true);
  };

  const openEdit = (emp) => {
    setEditing(emp);
    setForm({
      fullName:     emp.fullName    || '',
      position:     emp.position    || '',
      email:        emp.email       || '',
      phone:        emp.phone       || '',
      extension:    emp.extension   || '',
      photoUrl:     emp.photoUrl    || '',
      birthday:     emp.birthday    || '',
      startDate:    emp.startDate   || '',
      departmentId: emp.departmentId ?? '',
      notes:        emp.notes       || '',
      isActive:     emp.isActive    ?? true,
    });
    setPhotoFile(null);
    setPhotoPreview('');
    setSaveError('');
    setOpen(true);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!form.fullName.trim()) { setSaveError('El nombre es requerido.'); return; }
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        birthday:     form.birthday   || null,
        startDate:    form.startDate  || null,
        departmentId: form.departmentId ? parseInt(form.departmentId) : null,
      };

      let id = editing?.id;
      if (editing) {
        await directorioApi.update(id, payload);
      } else {
        const { data } = await directorioApi.create(payload);
        id = data.id;
      }

      // Subir foto si se seleccionó
      if (photoFile && id) {
        setPhotoUploading(true);
        try { await directorioApi.uploadPhoto(id, photoFile); } catch {}
        setPhotoUploading(false);
      }

      setOpen(false);
      load();
    } catch (e) {
      setSaveError(e.response?.data || e.message || 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!confirm(`¿Eliminar a "${emp.fullName}" del directorio?`)) return;
    try {
      await directorioApi.remove(emp.id);
      load();
    } catch { setError('Error al eliminar.'); }
  };

  const filteredEmployees = employees.filter(e =>
    (!search || e.fullName.toLowerCase().includes(search.toLowerCase()) ||
     (e.position || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.email || '').toLowerCase().includes(search.toLowerCase()) ||
     (e.extension || '').toLowerCase().includes(search.toLowerCase())) &&
    (!filterDept || String(e.departmentId) === String(filterDept))
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3} flexWrap="wrap" gap={2}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <PeopleAltIcon color="primary" sx={{ fontSize: 32 }} />
          <Box>
            <Typography variant="h4" fontWeight={800} color="primary.main">Directorio</Typography>
            <Typography variant="body2" color="text.secondary">{employees.length} colaboradores registrados</Typography>
          </Box>
        </Stack>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
            Agregar colaborador
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {/* Filtros */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={3} component="form" onSubmit={handleSearch}>
        <TextField
          size="small" placeholder="Buscar por nombre, puesto, correo, extensión…"
          value={search} onChange={e => setSearch(e.target.value)}
          sx={{ flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Departamento</InputLabel>
          <Select value={filterDept} label="Departamento" onChange={e => setFilterDept(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
          </Select>
        </FormControl>
        <Button type="submit" variant="outlined" onClick={load}>Buscar</Button>
      </Stack>

      {/* Cards */}
      {loading ? (
        <Box textAlign="center" py={8}><CircularProgress /></Box>
      ) : filteredEmployees.length === 0 ? (
        <Box textAlign="center" py={8}>
          <PeopleAltIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 1 }} />
          <Typography color="text.secondary">No hay colaboradores que coincidan con la búsqueda.</Typography>
        </Box>
      ) : (
        <Grid container spacing={2.5}>
          {filteredEmployees.map(emp => {
            const anios = calcAniversario(emp.startDate);
            return (
              <Grid item xs={12} sm={6} md={4} lg={3} key={emp.id}>
                <Card
                  elevation={0}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid',
                    borderColor: emp.isActive ? 'divider' : 'warning.light',
                    opacity: emp.isActive ? 1 : 0.7,
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 3 },
                  }}
                >
                  {/* Banner + Avatar */}
                  <Box sx={{ position: 'relative', pb: 4, background: 'linear-gradient(135deg, #1a237e 0%, #3949ab 100%)', height: 70, borderRadius: '12px 12px 0 0' }}>
                    <Avatar
                      src={emp.photoUrl ? emp.photoUrl : undefined}
                      sx={{
                        width: 72, height: 72,
                        position: 'absolute', bottom: -36, left: '50%', transform: 'translateX(-50%)',
                        border: '3px solid white',
                        fontSize: 26, fontWeight: 700,
                        bgcolor: 'secondary.main',
                        boxShadow: 2,
                      }}
                    >
                      {!emp.photoUrl && getInitials(emp.fullName)}
                    </Avatar>
                  </Box>

                  <CardContent sx={{ pt: 5, pb: 2, textAlign: 'center' }}>
                    <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
                      {emp.fullName}
                    </Typography>
                    {emp.position && (
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                        {emp.position}
                      </Typography>
                    )}
                    {emp.department && (
                      <Chip label={emp.department} size="small" variant="outlined" color="primary" sx={{ mb: 1, fontSize: 11 }} />
                    )}

                    <Divider sx={{ my: 1 }} />

                    {/* Contact info */}
                    <Stack spacing={0.5} alignItems="flex-start" sx={{ px: 0.5 }}>
                      {emp.email && (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <EmailIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: 'break-all' }}>
                            {emp.email}
                          </Typography>
                        </Stack>
                      )}
                      {emp.phone && (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <PhoneIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">{emp.phone}</Typography>
                        </Stack>
                      )}
                      {emp.extension && (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <PhoneInTalkIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">Ext. {emp.extension}</Typography>
                        </Stack>
                      )}
                      {anios && (
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <WorkHistoryIcon sx={{ fontSize: 14, color: 'success.main' }} />
                          <Typography variant="caption" color="success.main" fontWeight={600}>{anios} año{anios !== 1 ? 's' : ''} en iMET</Typography>
                        </Stack>
                      )}
                    </Stack>

                    {!emp.isActive && (
                      <Chip label="Inactivo" size="small" color="warning" sx={{ mt: 1 }} />
                    )}

                    {/* Actions */}
                    {isAdmin && (
                      <Stack direction="row" justifyContent="center" spacing={0.5} mt={1.5}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(emp)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => handleDelete(emp)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Dialog crear/editar */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle fontWeight={700}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <BadgeIcon color="primary" />
            <span>{editing ? `Editar: ${editing.fullName}` : 'Nuevo colaborador'}</span>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2} mt={0.5}>
            {/* Photo picker */}
            <Box textAlign="center">
              <Avatar
                src={photoPreview || form.photoUrl || undefined}
                sx={{ width: 80, height: 80, mx: 'auto', mb: 1, bgcolor: 'primary.main', fontSize: 28, cursor: 'pointer' }}
                onClick={() => photoRef.current?.click()}
              >
                {!photoPreview && !form.photoUrl && <CameraAltIcon />}
                {!photoPreview && !form.photoUrl && null}
                {(!photoPreview && !form.photoUrl) ? <CameraAltIcon /> : getInitials(form.fullName)}
              </Avatar>
              <Button size="small" variant="outlined" onClick={() => photoRef.current?.click()} startIcon={<CameraAltIcon />}>
                {photoFile ? photoFile.name : 'Seleccionar foto'}
              </Button>
              <input ref={photoRef} type="file" accept="image/*" hidden onChange={handlePhotoSelect} />
            </Box>

            <TextField label="Nombre completo *" fullWidth value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />

            <Stack direction="row" spacing={2}>
              <TextField label="Puesto / Cargo" fullWidth value={form.position}
                onChange={e => setForm(f => ({ ...f, position: e.target.value }))} />
              <FormControl fullWidth>
                <InputLabel>Departamento</InputLabel>
                <Select value={form.departmentId} label="Departamento"
                  onChange={e => setForm(f => ({ ...f, departmentId: e.target.value }))}>
                  <MenuItem value="">Sin departamento</MenuItem>
                  {departments.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Correo electrónico" fullWidth type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <TextField label="Teléfono" sx={{ minWidth: 140 }} value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
            </Stack>

            <Stack direction="row" spacing={2}>
              <TextField label="Extensión" sx={{ minWidth: 120 }} value={form.extension}
                onChange={e => setForm(f => ({ ...f, extension: e.target.value }))} />
              <TextField label="Fecha de ingreso" type="date" fullWidth
                value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
              <TextField label="Cumpleaños" type="date" fullWidth
                value={form.birthday} onChange={e => setForm(f => ({ ...f, birthday: e.target.value }))}
                InputLabelProps={{ shrink: true }} />
            </Stack>

            <TextField label="Notas" fullWidth multiline rows={2} value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />

            {editing && (
              <FormControlLabel
                control={<Switch checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />}
                label="Activo"
              />
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}
            disabled={saving || photoUploading || !form.fullName.trim()}>
            {(saving || photoUploading) ? <CircularProgress size={18} /> : (editing ? 'Guardar cambios' : 'Agregar')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
