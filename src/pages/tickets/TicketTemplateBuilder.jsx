import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Paper, Typography, Stack, Button, IconButton, Chip,
  TextField, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions,
  FormControlLabel, Switch, Alert, CircularProgress, Divider, Tooltip,
  Grid, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import AddIcon             from '@mui/icons-material/Add';
import EditIcon            from '@mui/icons-material/Edit';
import DeleteIcon          from '@mui/icons-material/Delete';
import ArrowUpwardIcon     from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon   from '@mui/icons-material/ArrowDownward';
import TextFieldsIcon      from '@mui/icons-material/TextFields';
import SubjectIcon         from '@mui/icons-material/Subject';
import ArrowDropDownCircleIcon from '@mui/icons-material/ArrowDropDownCircle';
import EventIcon           from '@mui/icons-material/Event';
import NumbersIcon         from '@mui/icons-material/Numbers';
import CheckBoxIcon        from '@mui/icons-material/CheckBox';
import LabelIcon           from '@mui/icons-material/Label';
import SaveIcon            from '@mui/icons-material/Save';
import SettingsIcon        from '@mui/icons-material/Settings';
import CloseIcon           from '@mui/icons-material/Close';
import { ticketApi }       from '../../api/pandoraApi';
import { apiError }        from '../../api/apiError';

// ── Tipos de campo ────────────────────────────────────────────────────────────

const FIELD_TYPES = [
  { value: 'Text',     label: 'Texto corto',          icon: <TextFieldsIcon fontSize="small" />,          color: '#1976d2' },
  { value: 'Textarea', label: 'Texto largo',           icon: <SubjectIcon fontSize="small" />,             color: '#7b1fa2' },
  { value: 'Select',   label: 'Lista desplegable',     icon: <ArrowDropDownCircleIcon fontSize="small" />, color: '#0097a7' },
  { value: 'Date',     label: 'Fecha',                 icon: <EventIcon fontSize="small" />,               color: '#388e3c' },
  { value: 'Number',   label: 'Número',                icon: <NumbersIcon fontSize="small" />,             color: '#f57c00' },
  { value: 'Checkbox', label: 'Casilla (Sí / No)',     icon: <CheckBoxIcon fontSize="small" />,            color: '#c62828' },
  { value: 'Label',    label: 'Etiqueta / Separador',  icon: <LabelIcon fontSize="small" />,               color: '#546e7a' },
];

const FIELD_TYPE_MAP = Object.fromEntries(FIELD_TYPES.map(t => [t.value, t]));

const EMPTY_FIELD = {
  label: '', fieldType: 'Text', isRequired: false,
  width: 'full', placeholder: '', helpText: '', options: [],
};

// ── Chip de tipo ──────────────────────────────────────────────────────────────

function TypeChip({ fieldType }) {
  const t = FIELD_TYPE_MAP[fieldType] ?? FIELD_TYPE_MAP['Text'];
  return (
    <Chip
      icon={t.icon}
      label={t.label}
      size="small"
      sx={{ bgcolor: t.color + '18', color: t.color, fontWeight: 600, fontSize: 11, border: `1px solid ${t.color}40` }}
    />
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TicketTemplateBuilder() {
  const [template, setTemplate]       = useState({ name: '', description: '' });
  const [fields,   setFields]         = useState([]);
  const [loading,  setLoading]        = useState(true);
  const [saving,   setSaving]         = useState(false);
  const [alert,    setAlert]          = useState({ type: '', msg: '' });

  // Dialog state
  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [editingField,  setEditingField]  = useState(null);
  const [dialogForm,    setDialogForm]    = useState(EMPTY_FIELD);
  const [newOption,     setNewOption]     = useState('');
  const [dialogSaving,  setDialogSaving]  = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await ticketApi.getTemplate();
      setTemplate({ name: data.template.name, description: data.template.description ?? '' });
      setFields(data.fields ?? []);
    } catch (e) {
      setAlert({ type: 'error', msg: apiError(e, 'Error al cargar la plantilla.') });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Save template metadata ─────────────────────────────────────────────────

  const saveTemplate = async () => {
    if (!template.name.trim()) { setAlert({ type: 'error', msg: 'El nombre de la plantilla es obligatorio.' }); return; }
    setSaving(true);
    try {
      await ticketApi.updateTemplate({ name: template.name, description: template.description });
      setAlert({ type: 'success', msg: 'Plantilla guardada.' });
    } catch (e) {
      setAlert({ type: 'error', msg: apiError(e, 'Error al guardar.') });
    } finally {
      setSaving(false);
    }
  };

  // ── Dialog open/close ──────────────────────────────────────────────────────

  const openAdd = () => {
    setEditingField(null);
    setDialogForm(EMPTY_FIELD);
    setNewOption('');
    setDialogOpen(true);
  };

  const openEdit = (field) => {
    setEditingField(field);
    setDialogForm({
      label:       field.label,
      fieldType:   field.fieldType,
      isRequired:  field.isRequired,
      width:       field.width,
      placeholder: field.placeholder ?? '',
      helpText:    field.helpText    ?? '',
      options:     field.options ? JSON.parse(field.options) : [],
    });
    setNewOption('');
    setDialogOpen(true);
  };

  const closeDialog = () => { setDialogOpen(false); setEditingField(null); };

  // ── Save field ─────────────────────────────────────────────────────────────

  const saveField = async () => {
    if (!dialogForm.label.trim()) { setAlert({ type: 'error', msg: 'La etiqueta del campo es obligatoria.' }); return; }
    setDialogSaving(true);
    try {
      const payload = {
        label:       dialogForm.label.trim(),
        fieldType:   dialogForm.fieldType,
        isRequired:  dialogForm.isRequired,
        width:       dialogForm.width,
        placeholder: dialogForm.placeholder.trim() || null,
        helpText:    dialogForm.helpText.trim()    || null,
        options:     dialogForm.fieldType === 'Select' && dialogForm.options.length > 0
                       ? JSON.stringify(dialogForm.options) : null,
      };

      if (editingField) {
        await ticketApi.updateField(editingField.id, payload);
      } else {
        await ticketApi.addField(payload);
      }

      closeDialog();
      await load();
      setAlert({ type: 'success', msg: editingField ? 'Campo actualizado.' : 'Campo agregado.' });
    } catch (e) {
      setAlert({ type: 'error', msg: apiError(e, 'Error al guardar el campo.') });
    } finally {
      setDialogSaving(false);
    }
  };

  // ── Delete field ───────────────────────────────────────────────────────────

  const deleteField = async (fieldId) => {
    try {
      await ticketApi.deleteField(fieldId);
      setFields(f => f.filter(x => x.id !== fieldId));
      setDeleteConfirm(null);
      setAlert({ type: 'success', msg: 'Campo eliminado.' });
    } catch (e) {
      setAlert({ type: 'error', msg: apiError(e, 'Error al eliminar el campo.') });
    }
  };

  // ── Reorder ────────────────────────────────────────────────────────────────

  const moveField = async (index, dir) => {
    const next = [...fields];
    const swapIdx = index + dir;
    if (swapIdx < 0 || swapIdx >= next.length) return;
    [next[index], next[swapIdx]] = [next[swapIdx], next[index]];
    const reordered = next.map((f, i) => ({ ...f, sortOrder: i }));
    setFields(reordered);
    try {
      await ticketApi.reorderFields(reordered.map(f => ({ id: f.id, sortOrder: f.sortOrder })));
    } catch (e) {
      setAlert({ type: 'error', msg: 'Error al reordenar. Recarga la página.' });
    }
  };

  // ── Options management ─────────────────────────────────────────────────────

  const addOption = () => {
    const v = newOption.trim();
    if (!v || dialogForm.options.includes(v)) return;
    setDialogForm(f => ({ ...f, options: [...f.options, v] }));
    setNewOption('');
  };

  const removeOption = (opt) =>
    setDialogForm(f => ({ ...f, options: f.options.filter(o => o !== opt) }));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
      <CircularProgress />
    </Box>
  );

  const hasOptions = dialogForm.fieldType === 'Select';
  const showPlaceholder = !['Checkbox', 'Label'].includes(dialogForm.fieldType);

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 860, mx: 'auto', pb: 8 }}>

      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '6px solid', borderTopColor: 'primary.main' }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <SettingsIcon color="primary" sx={{ fontSize: 36 }} />
          <Box flex={1}>
            <Typography variant="h5" fontWeight={800}>Configurar formulario de tickets</Typography>
            <Typography variant="body2" color="text.secondary">
              Agrega, edita y reordena los campos del formulario. Los cambios aplican inmediatamente a nuevos tickets.
            </Typography>
          </Box>
        </Stack>
      </Paper>

      {alert.msg && (
        <Alert severity={alert.type || 'info'} onClose={() => setAlert({ type: '', msg: '' })} sx={{ mb: 3, borderRadius: 2 }}>
          {alert.msg}
        </Alert>
      )}

      {/* Template metadata */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" fontWeight={700} mb={2} color="text.secondary" textTransform="uppercase" letterSpacing={0.5}>
          Información de la plantilla
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Nombre de la plantilla *"
              value={template.name}
              onChange={e => setTemplate(t => ({ ...t, name: e.target.value }))}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth size="small" label="Descripción (opcional)"
              value={template.description}
              onChange={e => setTemplate(t => ({ ...t, description: e.target.value }))}
            />
          </Grid>
        </Grid>
        <Box mt={2} display="flex" justifyContent="flex-end">
          <Button
            variant="outlined" size="small" startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
            onClick={saveTemplate} disabled={saving}
          >
            {saving ? 'Guardando...' : 'Guardar nombre'}
          </Button>
        </Box>
      </Paper>

      {/* Fields list */}
      <Stack spacing={2} mb={3}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Typography variant="subtitle1" fontWeight={700}>
            Campos del formulario ({fields.length})
          </Typography>
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={openAdd} sx={{ borderRadius: 2 }}>
            Agregar campo
          </Button>
        </Stack>

        {fields.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, borderRadius: 3, border: '2px dashed', borderColor: 'divider', textAlign: 'center' }}>
            <Typography color="text.secondary">No hay campos. Haz clic en "Agregar campo" para comenzar.</Typography>
          </Paper>
        )}

        {fields.map((field, idx) => (
          <Paper
            key={field.id}
            elevation={0}
            sx={{ p: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider', '&:hover': { borderColor: 'primary.main' }, transition: 'border-color 0.2s' }}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              {/* Reorder buttons */}
              <Stack>
                <Tooltip title="Subir">
                  <span>
                    <IconButton size="small" onClick={() => moveField(idx, -1)} disabled={idx === 0}>
                      <ArrowUpwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Bajar">
                  <span>
                    <IconButton size="small" onClick={() => moveField(idx, 1)} disabled={idx === fields.length - 1}>
                      <ArrowDownwardIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Stack>

              <Divider orientation="vertical" flexItem />

              {/* Field info */}
              <Box flex={1} minWidth={0}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" gap={0.5}>
                  <Typography fontWeight={700} noWrap>{field.label}</Typography>
                  {field.isRequired && <Chip label="Obligatorio" size="small" color="error" variant="outlined" sx={{ fontSize: 10, height: 20 }} />}
                  <Chip label={field.width === 'half' ? 'Ancho: mitad' : 'Ancho: completo'} size="small" variant="outlined" sx={{ fontSize: 10, height: 20 }} />
                </Stack>
                <Stack direction="row" spacing={1} mt={0.5} flexWrap="wrap" alignItems="center">
                  <TypeChip fieldType={field.fieldType} />
                  {field.helpText && (
                    <Typography variant="caption" color="text.secondary" noWrap sx={{ maxWidth: 320 }}>
                      Ayuda: {field.helpText}
                    </Typography>
                  )}
                  {field.fieldType === 'Select' && field.options && (
                    <Typography variant="caption" color="text.secondary">
                      {JSON.parse(field.options).length} opciones
                    </Typography>
                  )}
                </Stack>
              </Box>

              {/* Actions */}
              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Editar">
                  <IconButton size="small" color="primary" onClick={() => openEdit(field)}>
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => setDeleteConfirm(field.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
          </Paper>
        ))}
      </Stack>

      {/* ── Add/Edit dialog ────────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onClose={closeDialog} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
          <Typography fontWeight={800}>{editingField ? 'Editar campo' : 'Nuevo campo'}</Typography>
          <IconButton onClick={closeDialog} size="small"><CloseIcon /></IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>

            {/* Type selector */}
            <Box>
              <Typography variant="caption" fontWeight={700} color="text.secondary" mb={1} display="block">
                TIPO DE CAMPO
              </Typography>
              <Grid container spacing={1}>
                {FIELD_TYPES.map(t => (
                  <Grid item xs={6} key={t.value}>
                    <Paper
                      elevation={0}
                      onClick={() => setDialogForm(f => ({ ...f, fieldType: t.value, options: t.value === 'Select' ? f.options : [] }))}
                      sx={{
                        p: 1.2, borderRadius: 2, cursor: 'pointer',
                        border: '2px solid',
                        borderColor: dialogForm.fieldType === t.value ? t.color : 'divider',
                        bgcolor: dialogForm.fieldType === t.value ? t.color + '10' : 'transparent',
                        transition: 'all 0.15s',
                        '&:hover': { borderColor: t.color, bgcolor: t.color + '08' },
                      }}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Box sx={{ color: t.color }}>{t.icon}</Box>
                        <Typography variant="body2" fontWeight={dialogForm.fieldType === t.value ? 700 : 400} fontSize={12}>
                          {t.label}
                        </Typography>
                      </Stack>
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </Box>

            {/* Label */}
            <TextField
              fullWidth size="small" label="Etiqueta del campo *"
              value={dialogForm.label}
              onChange={e => setDialogForm(f => ({ ...f, label: e.target.value }))}
              placeholder="Ej: Descripción del problema"
              inputProps={{ maxLength: 200 }}
            />

            {/* Width + Required */}
            <Stack direction="row" spacing={2} alignItems="center">
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.5}>ANCHO</Typography>
                <ToggleButtonGroup
                  size="small" exclusive
                  value={dialogForm.width}
                  onChange={(_, v) => v && setDialogForm(f => ({ ...f, width: v }))}
                >
                  <ToggleButton value="full" sx={{ px: 2, fontSize: 12 }}>Completo</ToggleButton>
                  <ToggleButton value="half" sx={{ px: 2, fontSize: 12 }}>Mitad</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={dialogForm.isRequired}
                    onChange={e => setDialogForm(f => ({ ...f, isRequired: e.target.checked }))}
                    disabled={dialogForm.fieldType === 'Label'}
                  />
                }
                label={<Typography variant="body2" fontWeight={600}>Obligatorio</Typography>}
              />
            </Stack>

            {/* Placeholder */}
            {showPlaceholder && (
              <TextField
                fullWidth size="small" label="Texto de sugerencia (placeholder)"
                value={dialogForm.placeholder}
                onChange={e => setDialogForm(f => ({ ...f, placeholder: e.target.value }))}
                inputProps={{ maxLength: 200 }}
              />
            )}

            {/* Help text */}
            <TextField
              fullWidth size="small" label="Texto de ayuda (aparece debajo del campo)"
              value={dialogForm.helpText}
              onChange={e => setDialogForm(f => ({ ...f, helpText: e.target.value }))}
              inputProps={{ maxLength: 500 }}
            />

            {/* Options for Select */}
            {hasOptions && (
              <Box>
                <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>
                  OPCIONES DEL MENÚ
                </Typography>
                <Stack direction="row" spacing={1} mb={1.5}>
                  <TextField
                    size="small" fullWidth placeholder="Nueva opción..."
                    value={newOption}
                    onChange={e => setNewOption(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addOption()}
                    inputProps={{ maxLength: 100 }}
                  />
                  <Button variant="outlined" size="small" onClick={addOption} disabled={!newOption.trim()} sx={{ minWidth: 80 }}>
                    Agregar
                  </Button>
                </Stack>
                {dialogForm.options.length === 0 ? (
                  <Typography variant="caption" color="text.secondary">Sin opciones aún.</Typography>
                ) : (
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    {dialogForm.options.map(opt => (
                      <Chip
                        key={opt} label={opt} size="small"
                        onDelete={() => removeOption(opt)}
                        sx={{ fontWeight: 500 }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            )}

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={closeDialog} disabled={dialogSaving}>Cancelar</Button>
          <Button
            variant="contained" onClick={saveField} disabled={dialogSaving}
            startIcon={dialogSaving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
          >
            {dialogSaving ? 'Guardando...' : editingField ? 'Guardar cambios' : 'Agregar campo'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete confirm dialog ───────────────────────────────────────────── */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>¿Eliminar campo?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Esta acción no se puede deshacer. Los valores de tickets existentes que usaban este campo se perderán.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={() => deleteField(deleteConfirm)}>Eliminar</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
