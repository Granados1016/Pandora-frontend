import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Grid, TextField, MenuItem,
  Button, Alert, CircularProgress, Divider, Checkbox, FormControlLabel,
  FormGroup, RadioGroup, Radio, FormLabel, FormControl, Chip,
  InputAdornment, Tooltip,
} from '@mui/material';
import EventAvailableIcon  from '@mui/icons-material/EventAvailable';
import CheckCircleIcon     from '@mui/icons-material/CheckCircle';
import InfoOutlinedIcon    from '@mui/icons-material/InfoOutlined';
import WarningAmberIcon    from '@mui/icons-material/WarningAmber';
import { roomRequestApi }  from '../../api/pandoraApi';
import { apiError } from '../../api/apiError';

// ── Datos estáticos ───────────────────────────────────────────────────────────

const AREAS = [
  'Dirección General',
  'Dirección Administrativa',
  'Dirección Comercial',
  'Dirección de Programas Académicos',
  'Coordinación de Tecnologías',
  'Coordinación de Mercadotecnia',
];

const AULAS = [
  'Aula 1',
  'Aula 2',
  'Aula 3',
  'Aula 4',
  'Aula 5',
  'Centro de Cómputo',
  'Cabina de Podcast',
];

const DISPOSICIONES = ['Auditorio', 'Herradura', 'Conferencia'];
const SIN_DISPOSICION = ['Centro de Cómputo', 'Cabina de Podcast'];

/** Capacidades máximas por aula y disposición */
const CAPACIDAD = {
  'Aula 1':  { Auditorio: 24, Herradura: 20, Conferencia: 50 },
  'Aula 2':  { Auditorio: 24, Herradura: 20, Conferencia: 50 },
  'Aula 5':  { Auditorio: 24, Herradura: 20, Conferencia: 50 },
  'Aula 3':  { Auditorio: 16, Herradura: 14, Conferencia: 30 },
  'Aula 4':  { Auditorio: 16, Herradura: 14, Conferencia: 30 },
  'Centro de Cómputo': { 'N/A': 18 },
  'Cabina de Podcast': { 'N/A': 3 },
};

const RECURSOS = [
  'Proyector',
  'Barra de sonido',
  'Cable HDMI',
  'VideoWall',
  'Equipos de cómputo',
];

const COFFEE_ITEMS = [
  'Café',
  'Galletas',
  'Desechables',
  'Insumos para café',
  'Refrescos',
  'Agua',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const getMaxCapacidad = (aula, disposicion) => {
  if (!aula) return null;
  const cap = CAPACIDAD[aula];
  if (!cap) return null;
  if (SIN_DISPOSICION.includes(aula)) return Object.values(cap)[0];
  if (disposicion && cap[disposicion] !== undefined) return cap[disposicion];
  return null;
};

const getCapacidadInfo = (aula) => {
  if (!aula) return null;
  const cap = CAPACIDAD[aula];
  if (!cap) return null;
  if (SIN_DISPOSICION.includes(aula)) {
    return `Capacidad máxima: ${Object.values(cap)[0]} personas`;
  }
  return Object.entries(cap)
    .map(([d, n]) => `${d}: ${n} personas`)
    .join('  •  ');
};

// ── Estado inicial ────────────────────────────────────────────────────────────

const EMPTY = {
  area:             '',
  responsibleName:  '',
  activityName:     '',
  preferredRoom:    '',
  disposition:      '',
  requestedDate:    '',
  startTime:        '',
  endTime:          '',
  attendeeCount:    '',
  resources:        [],
  otherResources:   '',
  coffeeBreak:      '',
  coffeeBreakItems: [],
  otherCoffeeBreak: '',
};

// ── Componente de sección ─────────────────────────────────────────────────────

function Section({ number, title, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3, borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        borderTop: '4px solid',
        borderTopColor: 'primary.main',
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

// ── Formulario principal ──────────────────────────────────────────────────────

export default function RoomRequestForm() {
  const { state: navState } = useLocation();

  // Si viene navegando desde el calendario con una fecha/hora pre-seleccionada,
  // pre-llenar los campos de fecha y hora. navState.start y navState.end son
  // strings ISO como "2026-05-12T10:00:00".
  const getInitialForm = () => {
    if (!navState?.start) return EMPTY;
    const requestedDate = navState.start.substring(0, 10);
    const startTime     = navState.start.substring(11, 16);   // "HH:MM"
    const endTime       = navState.end   ? navState.end.substring(11, 16) : '';
    return { ...EMPTY, requestedDate, startTime, endTime };
  };

  const [form, setForm]       = useState(getInitialForm);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState(false);

  // Helpers de estado
  const f = (field) => (e) => {
    const val = e.target.value;
    setForm((p) => {
      const next = { ...p, [field]: val };
      // Al cambiar aula, resetear disposición y asistentes si aplica
      if (field === 'preferredRoom') {
        next.disposition   = SIN_DISPOSICION.includes(val) ? 'N/A' : '';
        next.attendeeCount = '';
      }
      return next;
    });
  };

  const toggleCheck = (field, value) => {
    setForm((p) => {
      const arr = p[field];
      return {
        ...p,
        [field]: arr.includes(value) ? arr.filter((x) => x !== value) : [...arr, value],
      };
    });
  };

  // ── Validación ──────────────────────────────────────────────────────────────
  const validate = () => {
    if (!form.area)                   return 'Selecciona el área que solicita el espacio.';
    if (!form.responsibleName.trim()) return 'El nombre de la persona encargada es obligatorio.';
    if (!form.activityName.trim())    return 'El nombre de la actividad es obligatorio.';
    if (!form.preferredRoom)          return 'Selecciona el aula de preferencia.';
    if (!SIN_DISPOSICION.includes(form.preferredRoom) && !form.disposition)
                                      return 'Selecciona la disposición del espacio.';
    if (!form.requestedDate)          return 'La fecha de reserva es obligatoria.';
    if (!form.startTime)              return 'La hora de inicio es obligatoria.';
    if (!form.endTime)                return 'La hora de finalización es obligatoria.';
    if (form.startTime >= form.endTime)
                                      return 'La hora de finalización debe ser posterior a la de inicio.';
    if (!form.attendeeCount || parseInt(form.attendeeCount) < 1)
                                      return 'Indica el número de personas.';

    const max = getMaxCapacidad(form.preferredRoom, form.disposition);
    if (max && parseInt(form.attendeeCount) > max)
      return `El número de personas (${form.attendeeCount}) supera la capacidad máxima del aula seleccionada (${max}).`;

    if (!form.coffeeBreak)            return 'Indica si requieres Coffee Break.';
    return null;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true);
    setError('');
    try {
      await roomRequestApi.create({
        area:             form.area,
        responsibleName:  form.responsibleName.trim(),
        activityName:     form.activityName.trim(),
        preferredRoom:    form.preferredRoom,
        disposition:      form.disposition || 'N/A',
        requestedDate:    form.requestedDate,
        startTime:        form.startTime + ':00',
        endTime:          form.endTime   + ':00',
        attendeeCount:    parseInt(form.attendeeCount),
        resources:        [
          ...form.resources,
          ...(form.otherResources.trim() ? [`Otros: ${form.otherResources.trim()}`] : []),
        ].join(', ') || null,
        coffeeBreak:      form.coffeeBreak === 'Si',
        coffeeBreakItems: form.coffeeBreak === 'Si'
          ? [
              ...form.coffeeBreakItems,
              ...(form.otherCoffeeBreak.trim() ? [`Otros: ${form.otherCoffeeBreak.trim()}`] : []),
            ].join(', ') || null
          : null,
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

  // ── Pantalla de éxito ───────────────────────────────────────────────────────
  if (success) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 640, mx: 'auto', mt: 4 }}>
        <Paper
          elevation={0}
          sx={{
            p: 5, borderRadius: 3,
            border: '1px solid', borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} gutterBottom>
            ¡Solicitud enviada!
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Tu solicitud de espacio fue registrada exitosamente.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            En caso de que el aula solicitada no esté disponible, la persona encargada se comunicará contigo.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => setSuccess(false)}
            sx={{ borderRadius: 2 }}
          >
            Nueva solicitud
          </Button>
        </Paper>
      </Box>
    );
  }

  const capInfo  = getCapacidadInfo(form.preferredRoom);
  const maxCap   = getMaxCapacidad(form.preferredRoom, form.disposition);
  const overCap  = maxCap && form.attendeeCount && parseInt(form.attendeeCount) > maxCap;
  const noDisp   = SIN_DISPOSICION.includes(form.preferredRoom);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 780, mx: 'auto', pb: 6 }}>

      {/* Encabezado */}
      <Paper
        elevation={0}
        sx={{
          p: 3, mb: 3, borderRadius: 3,
          border: '1px solid', borderColor: 'divider',
          borderTop: '6px solid', borderTopColor: 'primary.main',
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center">
          <EventAvailableIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              Solicitud de espacio
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Completa todos los campos marcados con <strong>*</strong> para registrar tu solicitud.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={3}>

        {/* ── 1. Área ─────────────────────────────────────────────────────── */}
        <Section number={1} title="Área que solicita el espacio *">
          <TextField
            select fullWidth size="small"
            label="Selecciona el área"
            value={form.area}
            onChange={f('area')}
          >
            {AREAS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        </Section>

        {/* ── 2. Responsable ──────────────────────────────────────────────── */}
        <Section number={2} title="Nombre de la persona encargada del evento o actividad *">
          <TextField
            fullWidth size="small"
            label="Nombre completo"
            value={form.responsibleName}
            onChange={f('responsibleName')}
            inputProps={{ maxLength: 200 }}
          />
        </Section>

        {/* ── 3. Actividad ─────────────────────────────────────────────────── */}
        <Section number={3} title="Nombre de la actividad *">
          <TextField
            fullWidth size="small"
            label="Nombre de la actividad"
            value={form.activityName}
            onChange={f('activityName')}
            helperText='Ejemplo: "Reunión de Consejo Directivo", "Junta con Equipo de Mercadotecnia", "Curso de Habilidades Directivas"'
            inputProps={{ maxLength: 500 }}
          />
        </Section>

        {/* ── 4. Aula ──────────────────────────────────────────────────────── */}
        <Section number={4} title="Indica el aula de tu preferencia *">
          <TextField
            select fullWidth size="small"
            label="Aula"
            value={form.preferredRoom}
            onChange={f('preferredRoom')}
            helperText="En caso de que el aula solicitada no esté disponible, la persona encargada se comunicará contigo."
          >
            {AULAS.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        </Section>

        {/* ── 5. Disposición ───────────────────────────────────────────────── */}
        <Section number={5} title="Indica la disposición en la que requieras el espacio *">
          {noDisp ? (
            <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ borderRadius: 2 }}>
              La disposición no aplica para <strong>{form.preferredRoom || 'este espacio'}</strong>.
            </Alert>
          ) : (
            <>
              <TextField
                select fullWidth size="small"
                label="Disposición"
                value={form.disposition}
                onChange={f('disposition')}
                disabled={!form.preferredRoom || noDisp}
                helperText="No aplica para Centro de Cómputo y Cabina de Podcast"
              >
                {DISPOSICIONES.map((d) => (
                  <MenuItem key={d} value={d}>{d}</MenuItem>
                ))}
              </TextField>
            </>
          )}
        </Section>

        {/* ── 6. Fecha y hora ───────────────────────────────────────────────── */}
        <Section number={6} title="Fecha y horario *">
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="date"
                label="Fecha para reserva *"
                value={form.requestedDate}
                onChange={f('requestedDate')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: new Date().toISOString().split('T')[0] }}
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="time"
                label="Hora de inicio *"
                value={form.startTime}
                onChange={f('startTime')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Considerar montaje"
              />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="time"
                label="Hora de finalización *"
                value={form.endTime}
                onChange={f('endTime')}
                InputLabelProps={{ shrink: true }}
                inputProps={{ step: 300 }}
                helperText="Considerar desmontaje"
              />
            </Grid>
          </Grid>
        </Section>

        {/* ── 7. Número de personas ─────────────────────────────────────────── */}
        <Section number={7} title="Indica el número de personas que utilizarán el aula *">
          <Grid container spacing={2} alignItems="flex-start">
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth size="small" type="number"
                label="Número de personas *"
                value={form.attendeeCount}
                onChange={f('attendeeCount')}
                inputProps={{ min: 1, max: 500 }}
                error={overCap}
                helperText={overCap ? `Excede la capacidad máxima (${maxCap} personas)` : ' '}
                InputProps={overCap ? {
                  endAdornment: (
                    <InputAdornment position="end">
                      <WarningAmberIcon color="error" fontSize="small" />
                    </InputAdornment>
                  ),
                } : undefined}
              />
            </Grid>

            {/* Tabla de capacidades */}
            {form.preferredRoom && (
              <Grid item xs={12} sm={8}>
                <Paper
                  elevation={0}
                  sx={{ p: 2, borderRadius: 2, bgcolor: 'grey.50', border: '1px solid', borderColor: 'divider' }}
                >
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                    CAPACIDAD MÁXIMA — {form.preferredRoom.toUpperCase()}
                  </Typography>
                  {noDisp ? (
                    <Typography variant="body2">
                      {CAPACIDAD[form.preferredRoom]?.['N/A'] ?? '—'} personas
                    </Typography>
                  ) : (
                    <Stack spacing={0.5}>
                      {DISPOSICIONES.map((d) => {
                        const cap = CAPACIDAD[form.preferredRoom]?.[d];
                        const isSelected = form.disposition === d;
                        return cap !== undefined ? (
                          <Stack key={d} direction="row" spacing={1} alignItems="center">
                            <Chip
                              label={d}
                              size="small"
                              color={isSelected ? 'primary' : 'default'}
                              variant={isSelected ? 'filled' : 'outlined'}
                              sx={{ fontWeight: 600, fontSize: 11, minWidth: 90 }}
                            />
                            <Typography variant="body2" fontWeight={isSelected ? 700 : 400}>
                              {cap} personas
                            </Typography>
                          </Stack>
                        ) : null;
                      })}
                    </Stack>
                  )}
                </Paper>
              </Grid>
            )}
          </Grid>
        </Section>

        {/* ── 8. Recursos ───────────────────────────────────────────────────── */}
        <Section number={8} title="Selecciona los recursos que vas a necesitar para tu actividad *">
          <FormGroup>
            <Grid container>
              {RECURSOS.map((r) => (
                <Grid item xs={12} sm={6} key={r}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        size="small"
                        checked={form.resources.includes(r)}
                        onChange={() => toggleCheck('resources', r)}
                      />
                    }
                    label={<Typography variant="body2">{r}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </FormGroup>
          <Box mt={1.5}>
            <TextField
              fullWidth size="small"
              label="Otros recursos (especifica)"
              value={form.otherResources}
              onChange={f('otherResources')}
              inputProps={{ maxLength: 200 }}
            />
          </Box>
        </Section>

        {/* ── 9. Coffee Break ───────────────────────────────────────────────── */}
        <Section number={9} title="¿Requieres Coffee Break? *">
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={form.coffeeBreak}
              onChange={f('coffeeBreak')}
            >
              <FormControlLabel
                value="Si"
                control={<Radio size="small" />}
                label={<Typography variant="body2">Sí</Typography>}
              />
              <FormControlLabel
                value="No"
                control={<Radio size="small" />}
                label={<Typography variant="body2">No</Typography>}
              />
            </RadioGroup>
          </FormControl>

          {form.coffeeBreak === 'Si' && (
            <Box mt={2}>
              <Alert
                severity="warning"
                icon={<InfoOutlinedIcon />}
                sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}
              >
                Las solicitudes de coffee break que se encuentren fuera del esquema convencional estarán sujetas a autorización previa por parte de la <strong>Dirección General</strong> o de la <strong>Dirección de Administración</strong>.
              </Alert>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Si tu respuesta fue "Sí", selecciona lo que requieres:
              </Typography>
              <FormGroup>
                <Grid container>
                  {COFFEE_ITEMS.map((item) => (
                    <Grid item xs={12} sm={6} key={item}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            size="small"
                            checked={form.coffeeBreakItems.includes(item)}
                            onChange={() => toggleCheck('coffeeBreakItems', item)}
                          />
                        }
                        label={<Typography variant="body2">{item}</Typography>}
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
              <Box mt={1.5}>
                <TextField
                  fullWidth size="small"
                  label="Otros (especifica)"
                  value={form.otherCoffeeBreak}
                  onChange={f('otherCoffeeBreak')}
                  inputProps={{ maxLength: 200 }}
                />
              </Box>
            </Box>
          )}
        </Section>

        {/* ── Botón de envío ────────────────────────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            p: 2.5, borderRadius: 3,
            border: '1px solid', borderColor: 'divider',
            bgcolor: 'grey.50',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="body2" fontWeight={600}>¿Qué pasa después?</Typography>
              <Typography variant="caption" color="text.secondary">
                Tu solicitud será revisada. En caso de que el aula no esté disponible, te contactarán.
              </Typography>
            </Box>
            <Button
              variant="contained"
              size="large"
              onClick={handleSubmit}
              disabled={saving}
              sx={{ borderRadius: 2, minWidth: 180, flexShrink: 0 }}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <EventAvailableIcon />}
            >
              {saving ? 'Enviando...' : 'Enviar solicitud'}
            </Button>
          </Stack>
        </Paper>

      </Stack>
    </Box>
  );
}
