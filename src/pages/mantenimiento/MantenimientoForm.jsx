import React, { useState, useEffect } from 'react';
import {
  Box, Stack, TextField, MenuItem, Select, FormControl,
  InputLabel, Button, CircularProgress, Divider, Typography, Autocomplete,
} from '@mui/material';
import { userApi } from '../../api/pandoraApi';

const TIPOS       = ['Preventivo', 'Correctivo', 'Predictivo', 'Limpieza'];
const ESTADOS     = ['Programado', 'En Proceso', 'Completado', 'Cancelado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const EMPTY = {
  titulo: '', descripcion: '', tipoMantenimiento: 'Preventivo', estado: 'Programado',
  prioridad: 'Media', nombreEquipo: '', ubicacion: '', tecnicoAsignado: '',
  emailTecnico: '', responsableEquipo: '', emailResponsable: '',
  fechaProgramada: '', fechaRealizada: '', duracionMinutos: '',
  notas: '', costoEstimado: '', costoReal: '',
};

// Autocomplete de usuarios de Pandora: al elegir uno, autollena nombre + correo
function UserAutocomplete({ users, label, nameValue, onPick, onNameType }) {
  return (
    <Autocomplete
      freeSolo
      options={users}
      getOptionLabel={(o) => (typeof o === 'string' ? o : (o.fullName || o.username || ''))}
      value={nameValue}
      onChange={(_, val) => {
        if (val && typeof val === 'object') onPick(val.fullName || val.username, val.email || '');
        else onNameType(val || '');
      }}
      onInputChange={(_, val, reason) => { if (reason === 'input') onNameType(val); }}
      renderOption={(props, o) => (
        <li {...props} key={o.username}>
          <Box>
            <Typography variant="body2">{o.fullName || o.username}</Typography>
            {o.email && <Typography variant="caption" color="text.secondary">{o.email}</Typography>}
          </Box>
        </li>
      )}
      renderInput={(params) => <TextField {...params} label={label} fullWidth />}
      fullWidth
    />
  );
}

export default function MantenimientoForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY, ...initial,
    fechaProgramada: initial?.fechaProgramada
      ? new Date(initial.fechaProgramada).toISOString().slice(0, 16) : '',
    fechaRealizada: initial?.fechaRealizada
      ? new Date(initial.fechaRealizada).toISOString().slice(0, 16) : '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const [users, setUsers] = useState([]);
  useEffect(() => {
    userApi.lookup().then(r => setUsers(r.data || [])).catch(() => {});
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      titulo:           form.titulo,
      descripcion:      form.descripcion      || null,
      tipoMantenimiento:form.tipoMantenimiento,
      estado:           form.estado,
      prioridad:        form.prioridad,
      nombreEquipo:     form.nombreEquipo     || null,
      ubicacion:        form.ubicacion        || null,
      tecnicoAsignado:  form.tecnicoAsignado  || null,
      emailTecnico:     form.emailTecnico     || null,
      responsableEquipo:form.responsableEquipo|| null,
      emailResponsable: form.emailResponsable || null,
      fechaProgramada:  new Date(form.fechaProgramada).toISOString(),
      fechaRealizada:   form.fechaRealizada   ? new Date(form.fechaRealizada).toISOString() : null,
      duracionMinutos:  form.duracionMinutos  ? parseInt(form.duracionMinutos) : null,
      notas:            form.notas            || null,
      costoEstimado:    form.costoEstimado    ? parseFloat(form.costoEstimado) : null,
      costoReal:        form.costoReal        ? parseFloat(form.costoReal) : null,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit}>
      <Stack spacing={2} sx={{ pt: 1 }}>

        <TextField label="Título *" value={form.titulo} onChange={e => set('titulo', e.target.value)}
          fullWidth required />
        <TextField label="Descripción" value={form.descripcion} onChange={e => set('descripcion', e.target.value)}
          fullWidth multiline minRows={2} />

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <FormControl fullWidth>
            <InputLabel>Tipo de mantenimiento</InputLabel>
            <Select value={form.tipoMantenimiento} label="Tipo de mantenimiento" onChange={e => set('tipoMantenimiento', e.target.value)}>
              {TIPOS.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Estado</InputLabel>
            <Select value={form.estado} label="Estado" onChange={e => {
              const v = e.target.value;
              set('estado', v);
              if (v === 'Completado' && !form.fechaRealizada) {
                set('fechaRealizada', new Date().toISOString().slice(0, 16));
              }
            }}>
              {ESTADOS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>Prioridad</InputLabel>
            <Select value={form.prioridad} label="Prioridad" onChange={e => set('prioridad', e.target.value)}>
              {PRIORIDADES.map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
        </Stack>

        <Divider><Typography variant="caption" color="text.secondary">Equipo</Typography></Divider>

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Nombre del equipo" value={form.nombreEquipo} onChange={e => set('nombreEquipo', e.target.value)} fullWidth />
          <TextField label="Ubicación" value={form.ubicacion} onChange={e => set('ubicacion', e.target.value)} fullWidth />
        </Stack>

        <Divider><Typography variant="caption" color="text.secondary">Técnico</Typography></Divider>

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <UserAutocomplete
            users={users}
            label="Técnico asignado"
            nameValue={form.tecnicoAsignado}
            onPick={(name, email) => setForm(f => ({ ...f, tecnicoAsignado: name, emailTecnico: email }))}
            onNameType={(name) => set('tecnicoAsignado', name)}
          />
          <TextField label="Email del técnico" type="email" value={form.emailTecnico} onChange={e => set('emailTecnico', e.target.value)} fullWidth />
        </Stack>

        <Divider><Typography variant="caption" color="text.secondary">Responsable del equipo</Typography></Divider>

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <UserAutocomplete
            users={users}
            label="Responsable del equipo"
            nameValue={form.responsableEquipo}
            onPick={(name, email) => setForm(f => ({ ...f, responsableEquipo: name, emailResponsable: email }))}
            onNameType={(name) => set('responsableEquipo', name)}
          />
          <TextField label="Email del responsable" type="email" value={form.emailResponsable} onChange={e => set('emailResponsable', e.target.value)} fullWidth />
        </Stack>

        <Divider><Typography variant="caption" color="text.secondary">Fechas y tiempos</Typography></Divider>

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Fecha programada *" type="datetime-local" value={form.fechaProgramada}
            onChange={e => set('fechaProgramada', e.target.value)} fullWidth required InputLabelProps={{ shrink: true }} />
          <TextField label="Fecha realizada" type="datetime-local" value={form.fechaRealizada}
            onChange={e => set('fechaRealizada', e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
          <TextField label="Duración (minutos)" type="number" value={form.duracionMinutos}
            onChange={e => set('duracionMinutos', e.target.value)} fullWidth inputProps={{ min: 1 }} />
        </Stack>

        <Divider><Typography variant="caption" color="text.secondary">Costos</Typography></Divider>

        <Stack direction={{ xs:'column', sm:'row' }} spacing={2}>
          <TextField label="Costo estimado ($)" type="number" value={form.costoEstimado}
            onChange={e => set('costoEstimado', e.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} />
          <TextField label="Costo real ($)" type="number" value={form.costoReal}
            onChange={e => set('costoReal', e.target.value)} fullWidth inputProps={{ min: 0, step: 0.01 }} />
        </Stack>

        <TextField label="Notas adicionales" value={form.notas} onChange={e => set('notas', e.target.value)}
          fullWidth multiline minRows={2} />

        <Stack direction="row" justifyContent="flex-end" spacing={1} pt={1}>
          <Button onClick={onClose} disabled={saving}>Cancelar</Button>
          <Button type="submit" variant="contained" disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
