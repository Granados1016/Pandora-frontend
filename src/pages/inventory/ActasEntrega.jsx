import { useEffect, useRef, useState } from 'react';
import {
  Box, Typography, Card, CardContent, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Paper, Chip, CircularProgress, Snackbar, Alert, Stack, Button, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Checkbox, IconButton,
  List, ListItem, ListItemButton, ListItemIcon, ListItemText, Divider, Avatar,
} from '@mui/material';
import AssignmentIcon     from '@mui/icons-material/Assignment';
import DescriptionIcon    from '@mui/icons-material/Description';
import UploadFileIcon     from '@mui/icons-material/UploadFile';
import DownloadIcon       from '@mui/icons-material/Download';
import DeleteIcon         from '@mui/icons-material/Delete';
import AddIcon            from '@mui/icons-material/Add';
import CheckCircleIcon    from '@mui/icons-material/CheckCircle';
import { resguardosApi, inventoryApi } from '../../api/pandoraApi';

function saveBlob(resp, fallbackName) {
  const cd = resp.headers?.['content-disposition'] || '';
  const m = /filename\*?=(?:UTF-8''|")?([^";]+)/i.exec(cd);
  const name = m ? decodeURIComponent(m[1].replace(/"/g, '')) : fallbackName;
  const url = URL.createObjectURL(resp.data);
  const a = document.createElement('a');
  a.href = url; a.download = name; document.body.appendChild(a); a.click();
  a.remove(); URL.revokeObjectURL(url);
}

const EMPTY = {
  fecha: new Date().toISOString().slice(0, 10),
  area: '', quienEntrega: '', quienRecibe: '', jefeInmediato: '', observaciones: '',
  itemIds: [],
};

export default function ActasEntrega() {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [snack,   setSnack]   = useState(null);
  const [busy,    setBusy]    = useState(null);
  const [open,    setOpen]    = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [items,   setItems]   = useState([]);     // equipos disponibles
  const [saving,  setSaving]  = useState(false);
  const [formErr, setFormErr] = useState('');
  const uploadFor = useRef(null);
  const fileInput = useRef(null);

  const load = () => {
    setLoading(true);
    resguardosApi.list()
      .then(r => setRows(r.data))
      .catch(() => setSnack({ sev: 'error', msg: 'No se pudieron cargar las actas.' }))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setForm(EMPTY); setFormErr('');
    inventoryApi.getItems().then(r => setItems(r.data)).catch(() => setItems([]));
    setOpen(true);
  };

  const toggleItem = (id) => setForm(f => ({
    ...f,
    itemIds: f.itemIds.includes(id) ? f.itemIds.filter(x => x !== id) : [...f.itemIds, id],
  }));

  const create = async () => {
    if (!form.quienRecibe.trim()) { setFormErr('Indica quién recibe el equipo.'); return; }
    if (form.itemIds.length === 0) { setFormErr('Selecciona al menos un equipo.'); return; }
    // Área sugerida: del primer equipo seleccionado si no se capturó
    const firstItem = items.find(i => i.id === form.itemIds[0]);
    const area = form.area.trim() || firstItem?.department || '';
    setSaving(true); setFormErr('');
    try {
      await resguardosApi.create({
        fecha: form.fecha,
        area,
        quienEntrega: form.quienEntrega.trim() || null,
        quienRecibe: form.quienRecibe.trim(),
        jefeInmediato: form.jefeInmediato.trim() || null,
        observaciones: form.observaciones.trim() || null,
        itemIds: form.itemIds,
      });
      setOpen(false);
      setSnack({ sev: 'success', msg: 'Acta creada. Descarga el documento, imprímelo y súbelo firmado.' });
      load();
    } catch (e) {
      setFormErr(e?.response?.data || 'No se pudo crear el acta.');
    } finally { setSaving(false); }
  };

  const downloadActa = async (row) => {
    setBusy(row.id);
    try { saveBlob(await resguardosApi.downloadActa(row.id), `Acta_${row.folio}.doc`); }
    catch { setSnack({ sev: 'error', msg: 'No se pudo descargar el acta.' }); }
    finally { setBusy(null); }
  };

  const downloadFirmado = async (row) => {
    setBusy(row.id);
    try { saveBlob(await resguardosApi.downloadDocument(row.id), `Acta_firmada_${row.folio}`); }
    catch { setSnack({ sev: 'error', msg: 'No se pudo descargar el documento firmado.' }); }
    finally { setBusy(null); }
  };

  const pickUpload = (row) => { uploadFor.current = row; fileInput.current?.click(); };
  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    const row = uploadFor.current;
    if (!file || !row) return;
    setBusy(row.id);
    try {
      await resguardosApi.uploadDocument(row.id, file);
      setSnack({ sev: 'success', msg: `Documento firmado subido al acta ${row.folio}.` });
      load();
    } catch { setSnack({ sev: 'error', msg: 'No se pudo subir el documento.' }); }
    finally { setBusy(null); }
  };

  const remove = async (row) => {
    if (!window.confirm(`¿Eliminar el acta ${row.folio}? Esta acción no se puede deshacer.`)) return;
    setBusy(row.id);
    try { await resguardosApi.remove(row.id); setRows(prev => prev.filter(x => x.id !== row.id)); }
    catch { setSnack({ sev: 'error', msg: 'No se pudo eliminar.' }); }
    finally { setBusy(null); }
  };

  const fmt = (s) => { try { return new Date(s).toLocaleDateString('es-MX'); } catch { return s; } };

  return (
    <Box>
      <input type="file" ref={fileInput} hidden onChange={onFile}
        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />

      <Stack direction="row" spacing={1.5} alignItems="center" mb={0.5}>
        <Avatar sx={{ bgcolor: 'primary.main' }}><AssignmentIcon /></Avatar>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h5" fontWeight={800} color="primary.main">Actas de entrega</Typography>
          <Typography variant="body2" color="text.secondary">
            Genera el acta de entrega de equipos, descárgala para firmar y sube el documento firmado.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ borderRadius: 2 }}>
          Nueva acta
        </Button>
      </Stack>

      <Card sx={{ mt: 2, borderRadius: 3 }}>
        <CardContent>
          {loading ? (
            <Box textAlign="center" py={6}><CircularProgress /></Box>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'primary.main' }}>
                    {['Folio', 'Fecha', 'Área', 'Recibe', 'Equipos', 'Estado', 'Acciones'].map(h => (
                      <TableCell key={h} sx={{ color: 'white', fontWeight: 700 }}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((r, i) => (
                    <TableRow key={r.id} hover sx={{ bgcolor: i % 2 ? 'grey.50' : 'white' }}>
                      <TableCell><Typography fontWeight={600} fontSize="0.85rem">{r.folio}</Typography></TableCell>
                      <TableCell>{fmt(r.fecha)}</TableCell>
                      <TableCell>{r.area || '—'}</TableCell>
                      <TableCell>{r.quienRecibe}</TableCell>
                      <TableCell align="center">{r.numEquipos}</TableCell>
                      <TableCell>
                        <Chip size="small" label={r.estado}
                          color={r.estado === 'Firmado' ? 'success' : 'warning'}
                          icon={r.estado === 'Firmado' ? <CheckCircleIcon /> : undefined} />
                      </TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5}>
                          <Tooltip title="Descargar acta (Word) para firmar">
                            <span><IconButton size="small" color="primary" disabled={busy === r.id}
                              onClick={() => downloadActa(r)}><DescriptionIcon fontSize="small" /></IconButton></span>
                          </Tooltip>
                          <Tooltip title="Subir documento firmado">
                            <span><IconButton size="small" color="secondary" disabled={busy === r.id}
                              onClick={() => pickUpload(r)}><UploadFileIcon fontSize="small" /></IconButton></span>
                          </Tooltip>
                          {r.tieneDoc && (
                            <Tooltip title="Descargar documento firmado">
                              <span><IconButton size="small" color="success" disabled={busy === r.id}
                                onClick={() => downloadFirmado(r)}><DownloadIcon fontSize="small" /></IconButton></span>
                            </Tooltip>
                          )}
                          <Tooltip title="Eliminar">
                            <span><IconButton size="small" color="error" disabled={busy === r.id}
                              onClick={() => remove(r)}><DeleteIcon fontSize="small" /></IconButton></span>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))}
                  {rows.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                      Aún no hay actas. Crea la primera con "Nueva acta".
                    </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Diálogo nueva acta */}
      <Dialog open={open} onClose={() => !saving && setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>Nueva acta de entrega</DialogTitle>
        <DialogContent dividers>
          {formErr && <Alert severity="error" sx={{ mb: 2 }}>{formErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Fecha de entrega" type="date" size="small" fullWidth
                InputLabelProps={{ shrink: true }}
                value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
              <TextField label="Área / Departamento (opcional)" size="small" fullWidth
                helperText="Si lo dejas vacío, se toma del primer equipo."
                value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Quién entrega" size="small" fullWidth
                value={form.quienEntrega} onChange={e => setForm(f => ({ ...f, quienEntrega: e.target.value }))} />
              <TextField label="Quién recibe" required size="small" fullWidth
                value={form.quienRecibe} onChange={e => setForm(f => ({ ...f, quienRecibe: e.target.value }))} />
            </Stack>
            <TextField label="Jefe inmediato (opcional)" size="small" fullWidth
              value={form.jefeInmediato} onChange={e => setForm(f => ({ ...f, jefeInmediato: e.target.value }))} />
            <TextField label="Observaciones (opcional)" size="small" fullWidth multiline minRows={2}
              value={form.observaciones} onChange={e => setForm(f => ({ ...f, observaciones: e.target.value }))} />

            <Divider textAlign="left">
              <Typography variant="caption" color="text.secondary">
                Equipos a entregar ({form.itemIds.length} seleccionados)
              </Typography>
            </Divider>
            <Paper variant="outlined" sx={{ maxHeight: 260, overflow: 'auto', borderRadius: 2 }}>
              <List dense disablePadding>
                {items.map(it => (
                  <ListItem key={it.id} disablePadding>
                    <ListItemButton onClick={() => toggleItem(it.id)}>
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox edge="start" size="small" checked={form.itemIds.includes(it.id)} tabIndex={-1} />
                      </ListItemIcon>
                      <ListItemText
                        primary={`${it.inventoryNumber} · ${it.name}`}
                        secondary={[it.brand, it.model].filter(Boolean).join(' ') +
                          (it.department ? ` · ${it.department}` : '')}
                        primaryTypographyProps={{ fontSize: '0.85rem', fontWeight: 600 }}
                        secondaryTypographyProps={{ fontSize: '0.75rem' }}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
                {items.length === 0 && (
                  <Box sx={{ p: 2, color: 'text.secondary', fontSize: '0.85rem' }}>
                    No hay equipos disponibles para tu área.
                  </Box>
                )}
              </List>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="contained" onClick={create} disabled={saving}
            startIcon={saving ? <CircularProgress size={16} color="inherit" /> : <AssignmentIcon />}>
            {saving ? 'Creando…' : 'Crear acta'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!snack} autoHideDuration={4500} onClose={() => setSnack(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        {snack ? <Alert severity={snack.sev} variant="filled" onClose={() => setSnack(null)}>{snack.msg}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}
