import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, TextField, MenuItem,
  Grid, CircularProgress, Alert, Checkbox, FormControlLabel,
  Divider, Chip, IconButton, LinearProgress, Tooltip,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon        from '@mui/icons-material/CheckCircle';
import AttachFileIcon         from '@mui/icons-material/AttachFile';
import CloseIcon              from '@mui/icons-material/Close';
import ImageIcon              from '@mui/icons-material/Image';
import SendIcon               from '@mui/icons-material/Send';
import { ticketApi }          from '../../api/pandoraApi';
import { apiError }           from '../../api/apiError';
import { useAuth }            from '../../hooks/useAuth.jsx';

// ── Constantes ────────────────────────────────────────────────────────────────

const PRIORITIES = ['Baja', 'Media', 'Alta', 'Crítica'];

const PRIORITY_COLOR = {
  Baja:    '#616161',
  Media:   '#1565c0',
  Alta:    '#e65100',
  Crítica: '#b71c1c',
};

const MAX_FILES    = 5;
const MAX_SIZE_MB  = 10;
const MAX_SIZE_B   = MAX_SIZE_MB * 1024 * 1024;

// ── Renderizado de campo dinámico ─────────────────────────────────────────────

function DynamicField({ field, value, onChange }) {
  const opts = field.fieldType === 'Select' && field.options
    ? JSON.parse(field.options)
    : [];

  const common = {
    fullWidth: true,
    size: 'small',
    label: field.isRequired ? `${field.label} *` : field.label,
    helperText: field.helpText,
    value: value ?? '',
  };

  switch (field.fieldType) {
    case 'Label':
      return (
        <Box>
          <Divider sx={{ mb: 0.5 }} />
          <Typography variant="subtitle2" fontWeight={700} color="primary.main" mt={1}>
            {field.label}
          </Typography>
          {field.helpText && (
            <Typography variant="caption" color="text.secondary">{field.helpText}</Typography>
          )}
        </Box>
      );

    case 'Textarea':
      return (
        <TextField
          {...common}
          multiline rows={3}
          placeholder={field.placeholder ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'Select':
      return (
        <TextField {...common} select onChange={e => onChange(e.target.value)}>
          <MenuItem value=""><em>— Selecciona —</em></MenuItem>
          {opts.map(o => <MenuItem key={o} value={o}>{o}</MenuItem>)}
        </TextField>
      );

    case 'Date':
      return (
        <TextField
          {...common}
          type="date"
          InputLabelProps={{ shrink: true }}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'Number':
      return (
        <TextField
          {...common}
          type="number"
          placeholder={field.placeholder ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );

    case 'Checkbox':
      return (
        <FormControlLabel
          control={
            <Checkbox
              checked={value === 'true'}
              onChange={e => onChange(e.target.checked ? 'true' : 'false')}
            />
          }
          label={
            <Box>
              <Typography variant="body2" fontWeight={field.isRequired ? 600 : 400}>
                {field.label}{field.isRequired ? ' *' : ''}
              </Typography>
              {field.helpText && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {field.helpText}
                </Typography>
              )}
            </Box>
          }
        />
      );

    default: // Text
      return (
        <TextField
          {...common}
          placeholder={field.placeholder ?? ''}
          onChange={e => onChange(e.target.value)}
        />
      );
  }
}

// ── Upload zone ────────────────────────────────────────────────────────────────

function UploadZone({ files, onAdd, onRemove }) {
  const inputRef = useRef(null);

  const handleFiles = (rawFiles) => {
    const valid = [];
    const errors = [];
    for (const f of rawFiles) {
      if (!f.type.startsWith('image/')) { errors.push(`"${f.name}" no es una imagen.`); continue; }
      if (f.size > MAX_SIZE_B) { errors.push(`"${f.name}" supera los ${MAX_SIZE_MB} MB.`); continue; }
      if (files.length + valid.length >= MAX_FILES) { errors.push('Máximo 5 imágenes.'); break; }
      valid.push(f);
    }
    if (valid.length) onAdd(valid);
    if (errors.length) alert(errors.join('\n'));
  };

  const onDrop = (e) => {
    e.preventDefault();
    handleFiles([...e.dataTransfer.files]);
  };

  const formatSize = (b) => b > 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          Imágenes adjuntas ({files.length}/{MAX_FILES})
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Máx. {MAX_FILES} imágenes · {MAX_SIZE_MB} MB c/u
        </Typography>
      </Stack>

      {/* Drop zone */}
      {files.length < MAX_FILES && (
        <Box
          onDrop={onDrop}
          onDragOver={e => e.preventDefault()}
          onClick={() => inputRef.current?.click()}
          sx={{
            border: '2px dashed',
            borderColor: 'primary.light',
            borderRadius: 3,
            p: 3, mb: 2,
            textAlign: 'center',
            cursor: 'pointer',
            bgcolor: 'primary.50',
            transition: 'all 0.2s',
            '&:hover': { borderColor: 'primary.main', bgcolor: 'primary.100' },
          }}
        >
          <AttachFileIcon color="primary" sx={{ fontSize: 32, mb: 0.5 }} />
          <Typography variant="body2" color="primary.main" fontWeight={600}>
            Haz clic o arrastra imágenes aquí
          </Typography>
          <Typography variant="caption" color="text.secondary">
            PNG, JPG, WEBP — máx. {MAX_SIZE_MB} MB por imagen
          </Typography>
          <input
            ref={inputRef} type="file" hidden multiple accept="image/*"
            onChange={e => { handleFiles([...e.target.files]); e.target.value = ''; }}
          />
        </Box>
      )}

      {/* Previews */}
      {files.length > 0 && (
        <Grid container spacing={1.5}>
          {files.map((f, i) => {
            const url = URL.createObjectURL(f);
            return (
              <Grid item xs={6} sm={4} key={i}>
                <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative' }}>
                  <Box
                    component="img"
                    src={url}
                    alt={f.name}
                    sx={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }}
                    onLoad={() => URL.revokeObjectURL(url)}
                  />
                  <Box sx={{ p: 0.75 }}>
                    <Typography variant="caption" noWrap display="block" fontWeight={600}>{f.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{(f.size / 1024 / 1024).toFixed(1)} MB</Typography>
                  </Box>
                  <Tooltip title="Quitar">
                    <IconButton
                      size="small"
                      onClick={() => onRemove(i)}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
                    >
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TicketFormPage() {
  const navigate       = useNavigate();
  const { username }   = useAuth();

  const [template,     setTemplate]     = useState(null);
  const [fields,       setFields]       = useState([]);
  const [areas,        setAreas]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [success,      setSuccess]      = useState(null); // { id, ticketNumber }
  const [error,        setError]        = useState('');

  // Static fields
  const [title,        setTitle]        = useState('');
  const [priority,     setPriority]     = useState('Media');
  const [department,   setDepartment]   = useState('');
  const [email,        setEmail]        = useState('');

  // Dynamic field values: { [fieldId]: string }
  const [fieldValues,  setFieldValues]  = useState({});

  // Attachments
  const [files,        setFiles]        = useState([]);

  // Load template + puestos
  const load = useCallback(async () => {
    try {
      const [{ data }, { data: positions }] = await Promise.all([
        ticketApi.getTemplate(),
        ticketApi.getPositions(),
      ]);
      setTemplate(data.template);
      setFields(data.fields ?? []);
      setAreas(positions ?? []);
    } catch (e) {
      setError(apiError(e, 'No se pudo cargar el formulario. Intenta de nuevo.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Validation ─────────────────────────────────────────────────────────────

  const validate = () => {
    if (!title.trim()) return 'El título del ticket es obligatorio.';
    for (const field of fields) {
      if (field.fieldType === 'Label') continue;
      if (!field.isRequired) continue;
      const v = fieldValues[field.id];
      if (!v || !v.trim()) return `El campo "${field.label}" es obligatorio.`;
    }
    return null;
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('title',            title.trim());
      formData.append('priority',         priority);
      formData.append('area',             department.trim());
      formData.append('department',       department.trim());
      formData.append('submittedByEmail', email.trim());
      formData.append('fieldValuesJson',  JSON.stringify(fieldValues));
      files.forEach(f => formData.append('files', f));

      const { data } = await ticketApi.create(formData);
      setSuccess(data);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      setError(apiError(e, 'No se pudo enviar el ticket. Intenta de nuevo.'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setPriority('Media'); setDepartment(''); setEmail('');
    setFieldValues({}); setFiles([]); setSuccess(null); setError('');
  };

  // ── Success screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 600, mx: 'auto', mt: 4 }}>
        <Paper elevation={0} sx={{ p: 5, borderRadius: 3, border: '1px solid', borderColor: 'divider', textAlign: 'center' }}>
          <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" fontWeight={800} gutterBottom>¡Ticket enviado!</Typography>
          <Typography color="text.secondary" sx={{ mb: 1 }}>
            Tu ticket fue registrado exitosamente.
          </Typography>
          <Chip
            label={success.ticketNumber}
            color="primary" variant="outlined"
            sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 16, px: 1, py: 2, mb: 3 }}
          />
          <Stack direction="row" spacing={2} justifyContent="center">
            <Button variant="outlined" onClick={resetForm}>Nuevo ticket</Button>
            <Button variant="contained" onClick={() => navigate(`/tickets/${success.id}`)}>
              Ver mi ticket
            </Button>
          </Stack>
        </Paper>
      </Box>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto', pb: 8 }}>

      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '6px solid', borderTopColor: 'primary.main' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <ConfirmationNumberIcon color="primary" sx={{ fontSize: 36 }} />
          <Box>
            <Typography variant="h5" fontWeight={800}>
              {template?.name ?? 'Nuevo Ticket'}
            </Typography>
            {template?.description && (
              <Typography variant="body2" color="text.secondary">{template.description}</Typography>
            )}
          </Box>
        </Stack>
      </Paper>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>
      )}

      <Stack spacing={3}>

        {/* ── Campos fijos ──────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '4px solid', borderTopColor: 'primary.main' }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
            Información general
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth size="small" label="Título del ticket *"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Describe brevemente el problema o solicitud"
              inputProps={{ maxLength: 500 }}
            />
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <TextField
                  select fullWidth size="small" label="Prioridad *"
                  value={priority}
                  onChange={e => setPriority(e.target.value)}
                >
                  {PRIORITIES.map(p => (
                    <MenuItem key={p} value={p}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PRIORITY_COLOR[p] }} />
                        <span>{p}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  select fullWidth size="small" label="Puesto *"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                >
                  <MenuItem value=""><em>— Selecciona tu puesto —</em></MenuItem>
                  {areas.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={4}>
                <TextField
                  fullWidth size="small" label="Tu correo (para notificaciones)"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@imet.edu.mx"
                  helperText="Recibirás actualizaciones aquí"
                />
              </Grid>
            </Grid>
          </Stack>
        </Paper>

        {/* ── Campos dinámicos ──────────────────────────────────────────────── */}
        {fields.length > 0 && (
          <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '4px solid', borderTopColor: 'secondary.main' }}>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
              Detalles del ticket
            </Typography>
            <Grid container spacing={2}>
              {fields.map(field => (
                <Grid item xs={12} sm={field.width === 'half' ? 6 : 12} key={field.id}>
                  <DynamicField
                    field={field}
                    value={fieldValues[field.id] ?? ''}
                    onChange={v => setFieldValues(prev => ({ ...prev, [field.id]: v }))}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* ── Adjuntos ──────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
          <UploadZone
            files={files}
            onAdd={newFiles => setFiles(prev => [...prev, ...newFiles].slice(0, MAX_FILES))}
            onRemove={idx => setFiles(prev => prev.filter((_, i) => i !== idx))}
          />
        </Paper>

        {/* ── Submit ────────────────────────────────────────────────────────── */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider', bgcolor: 'grey.50' }}>
          {saving && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box>
              <Typography variant="body2" fontWeight={600}>¿Listo para enviar?</Typography>
              <Typography variant="caption" color="text.secondary">
                Recibirás una confirmación y actualizaciones por correo.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1.5}>
              <Button variant="outlined" onClick={() => navigate('/tickets')} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="contained" size="large" onClick={handleSubmit} disabled={saving}
                startIcon={saving ? <CircularProgress size={18} color="inherit" /> : <SendIcon />}
                sx={{ borderRadius: 2, minWidth: 160 }}
              >
                {saving ? 'Enviando...' : 'Enviar ticket'}
              </Button>
            </Stack>
          </Stack>
        </Paper>

      </Stack>
    </Box>
  );
}
