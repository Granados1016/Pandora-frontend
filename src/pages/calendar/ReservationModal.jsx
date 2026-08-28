import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Grid, Stack, Typography,
  Chip, IconButton, Switch, FormControlLabel, Divider,
  CircularProgress, Alert, Tooltip, Box,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import RepeatIcon from '@mui/icons-material/Repeat';
import { calendarApi } from '../../api/pandoraApi';

const FREQ_OPTIONS = [
  { value: 'FREQ=DAILY',   label: 'Diario' },
  { value: 'FREQ=WEEKLY',  label: 'Semanal' },
  { value: 'FREQ=MONTHLY', label: 'Mensual' },
];

const DAYS = [
  { code: 'MO', label: 'L' }, { code: 'TU', label: 'M' }, { code: 'WE', label: 'X' },
  { code: 'TH', label: 'J' }, { code: 'FR', label: 'V' }, { code: 'SA', label: 'S' },
  { code: 'SU', label: 'D' },
];

const toLocal = (dt) => {
  if (!dt) return '';
  const d = new Date(dt);
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const COBERTURA_OPTIONS = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Foto',    label: '📷 Foto' },
  { value: 'Video',   label: '🎥 Video' },
  { value: 'Ambas',   label: '📷🎥 Foto y Video' },
];

const EMPTY_FORM = {
  title: '', description: '', roomId: '',
  start: '', end: '',
  organizerName: '', organizerEmail: '',
  meetLink: '',
  coberturaSolicitada: 'Ninguna',
  isRecurring: false, freq: 'FREQ=WEEKLY', byDay: [],
  recurrenceUntil: '', recurrenceCount: 12,
  attendees: [],
  newAttendeeName: '', newAttendeeEmail: '', newAttendeeExternal: false,
};

export default function ReservationModal({ open, onClose, onSaved, rooms, employees, initial }) {
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        title:            initial.title || '',
        description:      initial.description || '',
        roomId:           initial.roomId || initial.extendedProps?.roomId || '',
        start:            toLocal(initial.start || initial.startTime),
        end:              toLocal(initial.end   || initial.endTime),
        organizerName:    initial.organizerName  || initial.extendedProps?.organizerName  || '',
        organizerEmail:   initial.organizerEmail || initial.extendedProps?.organizerEmail || '',
        meetLink:         initial.meetLink       || initial.extendedProps?.meetLink       || '',
        coberturaSolicitada: initial.coberturaSolicitada || initial.extendedProps?.coberturaSolicitada || 'Ninguna',
        isRecurring:      initial.isRecurring    || initial.extendedProps?.isRecurring    || false,
        freq:             'FREQ=WEEKLY',
        byDay:            [],
        recurrenceUntil:  '',
        recurrenceCount:  12,
        attendees:        initial.attendees      || initial.extendedProps?.attendees      || [],
        newAttendeeName:  '', newAttendeeEmail:  '', newAttendeeExternal: false,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setError('');
  }, [open, initial]);

  const f = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.value }));
  const fSwitch = (field) => (e) => setForm(p => ({ ...p, [field]: e.target.checked }));

  const toggleDay = (code) => setForm(p => ({
    ...p,
    byDay: p.byDay.includes(code) ? p.byDay.filter(d => d !== code) : [...p.byDay, code],
  }));

  const addAttendee = () => {
    const { newAttendeeName, newAttendeeEmail, newAttendeeExternal } = form;
    if (!newAttendeeName || !newAttendeeEmail) return;
    setForm(p => ({
      ...p,
      attendees: [...p.attendees, { name: newAttendeeName, email: newAttendeeEmail, isExternal: newAttendeeExternal }],
      newAttendeeName: '', newAttendeeEmail: '', newAttendeeExternal: false,
    }));
  };

  const removeAttendee = (idx) => setForm(p => ({
    ...p, attendees: p.attendees.filter((_, i) => i !== idx),
  }));

  const buildRRule = () => {
    let rule = form.freq;
    if (form.freq === 'FREQ=WEEKLY' && form.byDay.length > 0)
      rule += `;BYDAY=${form.byDay.join(',')}`;
    return rule;
  };

  const handleSave = async () => {
    if (!form.title || !form.roomId || !form.start || !form.end || !form.organizerName) {
      setError('Completa los campos obligatorios (*).');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        title:           form.title,
        description:     form.description || null,
        roomId:          form.roomId,
        startTime:       new Date(form.start).toISOString(),
        endTime:         new Date(form.end).toISOString(),
        organizerName:   form.organizerName,
        organizerEmail:  form.organizerEmail || null,
        meetLink:        form.meetLink || null,
        coberturaSolicitada: form.coberturaSolicitada || 'Ninguna',
        isRecurring:     form.isRecurring,
        recurrenceRule:  form.isRecurring ? buildRRule() : null,
        recurrenceUntil: form.isRecurring && form.recurrenceUntil
          ? new Date(form.recurrenceUntil).toISOString() : null,
        recurrenceCount: form.isRecurring ? parseInt(form.recurrenceCount) : null,
        attendees:       form.attendees,
      };
      if (isEdit) {
        await calendarApi.updateReservation(initial.id || initial.extendedProps?.id, {
          ...payload, updateAllInSeries: false,
        });
      } else {
        await calendarApi.createReservation(payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      const status = e.response?.status;
      const msg    = typeof e.response?.data === 'string'
        ? e.response.data
        : e.response?.data?.message || 'Error al guardar la reserva.';
      setError(status === 409 ? `⚠️ Conflicto de horario: ${msg}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (deleteAll) => {
    try {
      const id = initial.id || initial.extendedProps?.id;
      await calendarApi.deleteReservation(id, deleteAll);
      setDeleteOpen(false);
      onSaved();
      onClose();
    } catch (e) {
      setError(e.response?.data || 'Error al eliminar.');
    }
  };

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700} sx={{ pb: 1 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <span>{isEdit ? 'Editar reserva' : 'Nueva reserva'}</span>
            {isEdit && (
              <Tooltip title="Eliminar reserva">
                <IconButton color="error" size="small" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

          <Grid container spacing={2}>
            {/* Título */}
            <Grid item xs={12}>
              <TextField label="Título *" value={form.title} onChange={f('title')} fullWidth size="small" />
            </Grid>

            {/* Sala */}
            <Grid item xs={12} sm={6}>
              <TextField select label="Sala *" value={form.roomId} onChange={f('roomId')} fullWidth size="small">
                {rooms.map(r => (
                  <MenuItem key={r.id} value={r.id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: r.color, flexShrink: 0 }} />
                      <span>{r.name}</span>
                      <Typography variant="caption" color="text.secondary">
                        — cap. {r.capacity}
                      </Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Organizador */}
            <Grid item xs={12} sm={6}>
              <TextField label="Organizador *" value={form.organizerName} onChange={f('organizerName')} fullWidth size="small" />
            </Grid>

            {/* Fechas */}
            <Grid item xs={12} sm={6}>
              <TextField
                label="Inicio *" type="datetime-local" value={form.start}
                onChange={f('start')} fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Fin *" type="datetime-local" value={form.end}
                onChange={f('end')} fullWidth size="small" InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Descripción */}
            <Grid item xs={12}>
              <TextField label="Descripción" value={form.description} onChange={f('description')} fullWidth size="small" multiline rows={2} />
            </Grid>

            {/* Meet */}
            <Grid item xs={12}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  label="Link de Google Meet" value={form.meetLink} onChange={f('meetLink')}
                  fullWidth size="small" placeholder="https://meet.google.com/xxx-xxxx-xxx"
                />
                <Tooltip title="Crear nueva reunión en Google Meet">
                  <Button
                    variant="outlined" size="small" startIcon={<VideoCallIcon />}
                    onClick={() => window.open('https://meet.google.com/new', '_blank')}
                    sx={{ whiteSpace: 'nowrap', minWidth: 140 }}
                  >
                    Crear Meet
                  </Button>
                </Tooltip>
              </Stack>
            </Grid>

            {/* Email organizador */}
            <Grid item xs={12} sm={6}>
              <TextField label="Email organizador" value={form.organizerEmail} onChange={f('organizerEmail')} fullWidth size="small" type="email" />
            </Grid>

            {/* Cobertura de foto/video */}
            <Grid item xs={12} sm={6}>
              <TextField
                select label="Cobertura solicitada" value={form.coberturaSolicitada}
                onChange={f('coberturaSolicitada')} fullWidth size="small"
              >
                {COBERTURA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </TextField>
            </Grid>
            {form.coberturaSolicitada !== 'Ninguna' && (
              <Grid item xs={12} sm={6}>
                <Alert severity="info" sx={{ py: 0 }}>
                  Se notificará por correo al líder de Marketing para su aprobación.
                </Alert>
              </Grid>
            )}

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Recurrencia</Typography></Divider></Grid>

            {/* Toggle recurrencia */}
            <Grid item xs={12}>
              <FormControlLabel
                control={<Switch checked={form.isRecurring} onChange={fSwitch('isRecurring')} />}
                label={<Stack direction="row" spacing={0.5} alignItems="center"><RepeatIcon fontSize="small" /><span>Evento recurrente</span></Stack>}
              />
            </Grid>

            {form.isRecurring && (<>
              <Grid item xs={12} sm={4}>
                <TextField select label="Frecuencia" value={form.freq} onChange={f('freq')} fullWidth size="small">
                  {FREQ_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
                </TextField>
              </Grid>

              {form.freq === 'FREQ=WEEKLY' && (
                <Grid item xs={12} sm={8}>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Días de la semana</Typography>
                  <Stack direction="row" spacing={0.5}>
                    {DAYS.map(d => (
                      <Chip
                        key={d.code} label={d.label} size="small" clickable
                        color={form.byDay.includes(d.code) ? 'primary' : 'default'}
                        onClick={() => toggleDay(d.code)}
                        sx={{ fontWeight: 700, minWidth: 32 }}
                      />
                    ))}
                  </Stack>
                </Grid>
              )}

              <Grid item xs={12} sm={6}>
                <TextField
                  label="Hasta (fecha límite)" type="date" value={form.recurrenceUntil}
                  onChange={f('recurrenceUntil')} fullWidth size="small" InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  label="O número de ocurrencias" type="number" value={form.recurrenceCount}
                  onChange={f('recurrenceCount')} fullWidth size="small"
                  inputProps={{ min: 1, max: 365 }}
                />
              </Grid>
            </>)}

            <Grid item xs={12}><Divider><Typography variant="caption" color="text.secondary">Asistentes</Typography></Divider></Grid>

            {/* Lista asistentes */}
            {form.attendees.map((a, i) => (
              <Grid item xs={12} key={i}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip
                    label={`${a.name} — ${a.email}`}
                    color={a.isExternal ? 'warning' : 'primary'}
                    size="small" variant="outlined"
                    onDelete={() => removeAttendee(i)}
                  />
                  {a.isExternal && <Typography variant="caption" color="warning.main">Externo</Typography>}
                </Stack>
              </Grid>
            ))}

            {/* Agregar asistente */}
            <Grid item xs={12} sm={4}>
              <TextField label="Nombre asistente" value={form.newAttendeeName} onChange={f('newAttendeeName')} fullWidth size="small" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField label="Email asistente" value={form.newAttendeeEmail} onChange={f('newAttendeeEmail')} fullWidth size="small" type="email" />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ pt: 0.5 }}>
                <FormControlLabel
                  control={<Switch size="small" checked={form.newAttendeeExternal} onChange={fSwitch('newAttendeeExternal')} />}
                  label={<Typography variant="caption">Externo</Typography>}
                />
                <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addAttendee}>
                  Agregar
                </Button>
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? <CircularProgress size={20} /> : (isEdit ? 'Actualizar' : 'Reservar')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog confirmar eliminación serie */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={700}>Eliminar reserva</DialogTitle>
        <DialogContent>
          {initial?.isRecurring || initial?.extendedProps?.isRecurring || initial?.extendedProps?.parentReservationId ? (
            <Typography>¿Eliminar solo <b>este evento</b> o <b>todos los de la serie</b>?</Typography>
          ) : (
            <Typography>¿Confirmas eliminar esta reserva?</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)}>Cancelar</Button>
          <Button color="error" onClick={() => handleDelete(false)}>Solo este</Button>
          {(initial?.isRecurring || initial?.extendedProps?.isRecurring || initial?.extendedProps?.parentReservationId) && (
            <Button color="error" variant="contained" onClick={() => handleDelete(true)}>Toda la serie</Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
}
