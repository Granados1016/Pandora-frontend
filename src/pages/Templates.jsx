import React, { useEffect, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Stack, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  ToggleButton, ToggleButtonGroup, CircularProgress, Alert, IconButton,
  TextField, Tooltip, Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import CodeIcon from '@mui/icons-material/Code';
import TuneIcon from '@mui/icons-material/Tune';
import EmailEditor from '../components/EmailEditor';
import { templateApi } from '../api/pandoraApi';
import { programLabel } from '../utils/statusHelpers';

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [open, setOpen]           = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState({ name: '', subject: '', body: '', programType: 1, isActive: true });
  const [editorMode, setEditorMode] = useState('plain');
  const [variables, setVariables] = useState([]);   // string[] — variables dinámicas
  const [newVar, setNewVar]       = useState('');   // input para nueva variable
  const [saving, setSaving]       = useState(false);
  const [saveError, setSaveError] = useState('');

  const load = () => {
    templateApi.getAll()
      .then(r => setTemplates(r.data))
      .catch(() => setError('Error al cargar plantillas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setSaveError('');
    setEditorMode('plain');
    setVariables([]);
    setNewVar('');
    setForm({ name: '', subject: '', body: '', programType: 1, isActive: true });
    setOpen(true);
  };

  const openEdit = (t) => {
    setEditing(t);
    setSaveError('');
    setEditorMode(t.isPlainText ? 'plain' : 'html');
    setVariables(t.variables ?? []);
    setNewVar('');
    setForm({ name: t.name, subject: t.subject, body: t.body, programType: t.programType, isActive: t.isActive });
    setOpen(true);
  };

  // ─── Gestión de variables dinámicas ────────────────────────────────────────
  const sanitizeVarName = (v) =>
    v.trim().toLowerCase()
     .replace(/\s+/g, '_')
     .replace(/[^a-z0-9_áéíóúñ]/g, '');

  const addVariable = () => {
    const name = sanitizeVarName(newVar);
    if (!name) return;
    if (variables.includes(name)) { setNewVar(''); return; }
    setVariables(prev => [...prev, name]);
    setNewVar('');
  };

  const removeVariable = (name) =>
    setVariables(prev => prev.filter(v => v !== name));

  // ─── Guardar ────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const payload = {
        ...form,
        isPlainText: true,
        variables,
      };
      if (editing) {
        await templateApi.update(editing.id, payload);
      } else {
        await templateApi.create(payload);
      }
      setOpen(false);
      load();
    } catch (err) {
      setSaveError('Error al guardar: ' + (err.response?.data || err.message));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    await templateApi.remove(id);
    load();
  };

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary.main">Plantillas</Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>Nueva Plantilla</Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={6}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {templates.map(t => (
            <Grid item xs={12} md={6} key={t.id}>
              <Card>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Box flexGrow={1}>
                      <Stack direction="row" spacing={1} alignItems="center" mb={0.5} flexWrap="wrap">
                        <Typography variant="subtitle1" fontWeight={700}>{t.name}</Typography>
                        <Chip
                          label={programLabel(t.programType)}
                          size="small" color="primary" variant="outlined"
                        />
                        <Chip
                          icon={t.isPlainText ? <TextFieldsIcon /> : <CodeIcon />}
                          label={t.isPlainText ? 'Texto plano' : 'HTML'}
                          size="small"
                          color={t.isPlainText ? 'default' : 'warning'}
                          variant="outlined"
                        />
                        {t.variables?.length > 0 && (
                          <Chip
                            icon={<TuneIcon />}
                            label={`${t.variables.length} var${t.variables.length !== 1 ? 's' : ''}`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                          />
                        )}
                      </Stack>
                      <Typography variant="body2" color="text.secondary" noWrap>{t.subject}</Typography>
                    </Box>
                    <Stack direction="row">
                      <IconButton onClick={() => openEdit(t)} size="small"><EditIcon fontSize="small" /></IconButton>
                      <IconButton onClick={() => handleDelete(t.id)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {templates.length === 0 && (
            <Grid item xs={12}>
              <Alert severity="info">No hay plantillas. Crea una para reutilizarla en tus campañas.</Alert>
            </Grid>
          )}
        </Grid>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle fontWeight={700}>{editing ? 'Editar Plantilla' : 'Nueva Plantilla'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack spacing={2.5} mt={0.5}>
            <TextField
              label="Nombre de la plantilla" fullWidth value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Ej: Bienvenida Licenciatura 2025"
            />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1}>Tipo de Programa</Typography>
              <ToggleButtonGroup
                value={form.programType} exclusive
                onChange={(_, v) => v && setForm(f => ({ ...f, programType: v }))}
                fullWidth
              >
                <ToggleButton value={1}>Licenciatura</ToggleButton>
                <ToggleButton value={2}>Posgrado</ToggleButton>
                <ToggleButton value={3}>Preparatoria</ToggleButton>
                <ToggleButton value={4}>Notificaciones</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            {/* ─── Variables dinámicas ──────────────────────────────────────── */}
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                <TuneIcon fontSize="small" color="secondary" />
                <Typography variant="subtitle2" fontWeight={600}>Variables personalizadas</Typography>
                <Tooltip title="Define variables propias para esta plantilla. Úsalas en el cuerpo como {{nombre_variable}}. Los valores se tomarán del CSV de destinatarios.">
                  <Typography variant="caption" color="text.secondary" sx={{ cursor: 'help' }}>
                    ¿Qué es esto?
                  </Typography>
                </Tooltip>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                <TextField
                  size="small"
                  label="Nueva variable"
                  value={newVar}
                  onChange={e => setNewVar(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addVariable()}
                  placeholder="Ej: fecha_inicio, salon, coordinador"
                  sx={{ flex: 1 }}
                  inputProps={{ style: { fontFamily: 'monospace' } }}
                />
                <Button variant="outlined" size="small" onClick={addVariable} disabled={!newVar.trim()}>
                  Agregar
                </Button>
              </Stack>

              {variables.length > 0 ? (
                <Stack direction="row" flexWrap="wrap" gap={1}>
                  {variables.map(name => (
                    <Chip
                      key={name}
                      label={`{{${name}}}`}
                      size="small"
                      color="secondary"
                      onDelete={() => removeVariable(name)}
                      sx={{ fontFamily: 'monospace' }}
                    />
                  ))}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.disabled">
                  Sin variables personalizadas — solo se usarán las fijas (nombre, usuario, contraseña, programa).
                </Typography>
              )}
            </Box>

            <Divider />

            <EmailEditor
              subject={form.subject}
              body={form.body}
              onSubjectChange={v => setForm(f => ({ ...f, subject: v }))}
              onBodyChange={v => setForm(f => ({ ...f, body: v }))}
              inputMode={editorMode}
              onInputModeChange={setEditorMode}
              variables={variables}
            />

            {saveError && <Alert severity="error">{saveError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button
            variant="contained" onClick={handleSave}
            disabled={saving || !form.name.trim() || !form.subject.trim() || !form.body.trim()}
          >
            {saving ? <CircularProgress size={18} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
