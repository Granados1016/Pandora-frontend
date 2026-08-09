import React, { useState } from 'react';
import {
  Box, Stack, TextField, MenuItem, Select, FormControl,
  InputLabel, Button, CircularProgress, Divider, Typography,
} from '@mui/material';

const TIPOS       = ['Preventivo', 'Correctivo', 'Predictivo', 'Limpieza'];
const ESTADOS     = ['Programado', 'En Proceso', 'Completado', 'Cancelado'];
const PRIORIDADES = ['Alta', 'Media', 'Baja'];

const EMPTY = {
  titulo: '', descripcion: '', tipoMantenimiento: 'Preventivo', estado: 'Programado',
  prioridad: 'Media', nombreEquipo: '', ubicacion: '', tecnicoAsignado: '',
  emailTecnico: '', fechaProgramada: '', fechaRealizada: '', duracionMinutos: '',
  notas: '', costoEstimado: '', costoReal: '',
};

export default function MantenimientoForm({ initial, onSave, onClose, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY, ...initial,
    fechaProgramada: initial?.fechaProgramada
      ? new Date(initial.fechaProgramada).toISOString().slice(0, 16) : '',
    fechaRealizada: initial?.fechaRealizada
      ? new Date(initial.fechaRealizada).toISOString().slice(0, 16) : '',
  }));
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

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
          <TextField label="Técnico asignado" value={form.tecnicoAsignado} onChange={e => set('tecnicoAsignado', e.target.value)} fullWidth />
          <TextField label="Email del técnico" type="email" value={form.emailTecnico} onChange={e => set('emailTecnico', e.target.value)} fullWidth />
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
