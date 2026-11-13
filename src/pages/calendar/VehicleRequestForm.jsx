import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Grid, TextField, MenuItem,
  Button, Alert, CircularProgress,
} from '@mui/material';
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar';
import CheckCircleIcon   from '@mui/icons-material/CheckCircle';
import { vehicleRequestApi, flotillaApi } from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

// Mismas áreas que la solicitud de sala
const AREAS = [
  'Dirección General',
  'Dirección Administrativa',
  'Dirección Comercial',
  'Dirección de Programas Académicos',
  'Coordinación de Tecnologías',
  'Coordinación de Mercadotecnia',
];

const EMPTY = {
  area:            '',
  responsibleName: '',
  solicitanteEmail:'',
  motivo:          '',
  vehiculoId:      '',
  destino:         '',
  conductor:       '',
  pasajeros:       '',
  requestedDate:   '',
  startTime:       '',
  endTime:         '',
};

function Section({ number, title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, borderRadius: 3,
        border: '1px solid', borderColor: 'divider',
        borderTop: '4px solid', borderTopColor: 'primary.main',
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5}>
        <Box
          sx={{
            width: 28, height: 28, borderRadius: '50%',
            bgcolor: 'primary.main', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 800, flexShrink: 0,
          }}
        >
          {number}
        </Box>
        <Typography variant="subtitle1" fontWeight={700}>{title}</Typography>
      </Stack>
      {children}
    </Paper>
  );
}

export default function VehicleRequestForm() {
  const { state: navState } = useLocation();

  const getInitialForm = () => {
    if (!navState?.start) return EMPTY;
    const requestedDate = navState.start.substring(0, 10);
    const startTime     = navState.start.substring(11, 16);
    const endTime       = navState.end ? navState.end.substring(11, 16) : '';
    return { ...EMPTY, requestedDate, startTime, endTime };
  };

  const [form, setForm]         = useState(getInitialForm);
  const [vehiculos, setVehiculos] = useState([]);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');
  const [success, setSuccess]   = useState(false);

  useEffect(() => {
    flotillaApi.getVehiculos()
      .then((res) => setVehiculos(res.data))
      .catch(() => setVehiculos([]));
  }, []);

  const f = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const validate = () => {
    if (!form.area)                    return 'Selecciona el área que solicita el vehículo.';
    if (!form.responsibleName.trim())  return 'El nombre de la persona encargada es obligatorio.';
    if (!form.motivo.trim())           return 'El motivo del viaje es obligatorio.';
    if (!form.requestedDate)           return 'La fecha es obligatoria.';
    if (!form.startTime)               return 'La hora de salida es obligatoria.';
    if (!form.endTime)                 return 'La hora de regreso es obligatoria.';
    if (form.startTime >= form.endTime) return 'La hora de regreso debe ser posterior a la de salida.';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true);
    setError('');
    try {
      await vehicleRequestApi.create({
        area:                form.area,
        responsibleName:     form.responsibleName.trim(),
        solicitanteEmail:    form.solicitanteEmail.trim() || null,
        motivo:              form.motivo.trim(),
        destino:             form.destino.trim() || null,
        conductor:           form.conductor.trim() || null,
        pasajeros:           form.pasajeros.trim() || null,
        vehiculoIdPreferido: form.vehiculoId || null,
        requestedDate:       form.requestedDate,
        startTime:           form.startTime + ':00',
        endTime:             form.endTime   + ':00',
      });
      setSuccess(true);
      setForm(EMPTY);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(apiError(e, 'No se pudo enviar la solicitud. Intenta de nuevo.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  if (success) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 5, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}
      >
        <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
        <Typography variant="h5" fontWeight={800} gutterBottom>
          ¡Solicitud enviada!
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 1 }}>
          Tu solicitud de vehículo fue registrada exitosamente.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          La persona encargada revisará la disponibilidad y te confirmará el vehículo asignado.
        </Typography>
        <Button variant="contained" size="large" onClick={() => setSuccess(false)} sx={{ borderRadius: 2 }}>
          Nueva solicitud
        </Button>
      </Paper>
    );
  }

  return (
    <>
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>
        {/* 1. Área */}
        <Section number={1} title="Área que solicita el vehículo *">
          <TextField select fullWidth size="small" label="Selecciona el área" value={form.area} onChange={f('area')}>
            {AREAS.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
        </Section>

        {/* 2. Responsable */}
        <Section number={2} title="Nombre de la persona encargada *">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Nombre completo"
                value={form.responsibleName} onChange={f('responsibleName')}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth size="small" label="Correo (para notificación)" type="email"
                value={form.solicitanteEmail} onChange={f('solicitanteEmail')}
                inputProps={{ maxLength: 200 }}
              />
            </Grid>
          </Grid>
        </Section>

        {/* 3. Motivo */}
        <Section number={3} title="Motivo del viaje *">
          <TextField
            fullWidth size="small" label="Motivo / actividad"
            value={form.motivo} onChange={f('motivo')}
            helperText='Ejemplo: "Visita a proveedor", "Traslado de alumnos a evento"'
            inputProps={{ maxLength: 500 }}
          />
        </Section>

        {/* 4. Vehículo de preferencia */}
        <Section number={4} title="Vehículo de preferencia (opcional)">
          <TextField
            select fullWidth size="small" label="Vehículo"
            value={form.vehiculoId} onChange={f('vehiculoId')}
            helperText="Si no eliges, la persona encargada asignará el vehículo disponible."
          >
            <MenuItem value="">Sin preferencia</MenuItem>
            {vehiculos.map((v) => (
              <MenuItem key={v.id} value={v.id}>
                {v.nombre}{v.placa ? ` — ${v.placa}` : ''}{v.capacidad ? ` (${v.capacidad} pas.)` : ''}
              </MenuItem>
            ))}
          </TextField>
        </Section>

        {/* 5. Destino / Conductor / Pasajeros */}
        <Section number={5} title="Detalles del viaje">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Destino" value={form.destino} onChange={f('destino')} inputProps={{ maxLength: 300 }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Conductor" value={form.conductor} onChange={f('conductor')} inputProps={{ maxLength: 200 }} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth size="small" label="Pasajeros (opcional)"
                value={form.pasajeros} onChange={f('pasajeros')}
                placeholder="Nombres separados por coma"
                multiline rows={2}
              />
            </Grid>
          </Grid>
        </Section>

        {/* 6. Fecha y horario */}
        <Section number={6} title="Fecha y horario *">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="date" label="Fecha *"
                value={form.requestedDate} onChange={f('requestedDate')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="time" label="Hora de salida *"
                value={form.startTime} onChange={f('startTime')}
                InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="time" label="Hora de regreso *"
                value={form.endTime} onChange={f('endTime')}
                InputLabelProps={{ shrink: true }} inputProps={{ step: 300 }}
              />
            </Grid>
          </Grid>
        </Section>

        {/* Botón */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="body2" fontWeight={600}>¿Qué pasa después?</Typography>
              <Typography variant="caption" color="text.secondary">
                Tu solicitud será revisada. Al aprobarse se reserva el vehículo y, si dejaste correo, recibirás la confirmación.
              </Typography>
            </Box>
            <Button
              variant="contained" size="large" onClick={handleSubmit} disabled={saving}
              sx={{ borderRadius: 2, minWidth: 180, flexShrink: 0 }}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <DirectionsCarIcon />}
            >
              {saving ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </Stack>
        </Paper>
      </Stack>
    </>
  );
}
