import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, Chip, Divider, CircularProgress,
  Alert, Avatar, TextField, MenuItem, Select, FormControl, InputLabel,
  IconButton, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions,
  ImageList, ImageListItem, ImageListItemBar,
} from '@mui/material';
import ArrowBackIcon   from '@mui/icons-material/ArrowBack';
import EditIcon        from '@mui/icons-material/Edit';
import DeleteIcon      from '@mui/icons-material/Delete';
import SendIcon        from '@mui/icons-material/Send';
import AttachFileIcon  from '@mui/icons-material/AttachFile';
import BuildIcon       from '@mui/icons-material/Build';
import DownloadIcon    from '@mui/icons-material/Download';
import PlayArrowIcon   from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon      from '@mui/icons-material/Cancel';
import { mantenimientoApi } from '../../api/pandoraApi';
import { useAuth, MODULES } from '../../hooks/useAuth.jsx';
import MantenimientoForm from './MantenimientoForm';

const TIPOS_SEG   = ['Seguimiento', 'Diagnóstico', 'Corrección', 'Cierre'];
const ESTADO_COLOR= { Programado:'info', 'En Proceso':'warning', Completado:'success', Cancelado:'default' };
const PRIORIDAD_COLOR = { Alta:'error', Media:'warning', Baja:'success' };

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
}
function fmtMin(min) {
  if (!min) return null;
  return min < 60 ? `${min} min` : `${Math.floor(min/60)}h ${min%60 > 0 ? `${min%60}m` : ''}`.trim();
}
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}
function avatarColor(name) {
  const colors = ['#1565c0','#6a1b9a','#00695c','#e65100','#558b2f','#37474f'];
  let hash = 0;
  for (const c of (name || '')) hash = c.charCodeAt(0) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

export default function MantenimientoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, hasModuleWrite } = useAuth();
  const canWrite = isAdmin || hasModuleWrite(MODULES.MANTENIMIENTO);
  const fileRef  = useRef(null);

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  const [nota,    setNota]    = useState('');
  const [tipoSeg, setTipoSeg] = useState('Seguimiento');
  const [sending, setSending] = useState(false);

  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imgPreview, setImgPreview] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const r = await mantenimientoApi.getById(id);
      setData(r.data);
    } catch { setError('No se pudo cargar el mantenimiento.'); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleSend = async () => {
    if (!nota.trim()) return;
    setSending(true);
    try {
      await mantenimientoApi.addSeguimiento(id, { nota: nota.trim(), tipo: tipoSeg });
      setNota(''); await load();
    } catch {} finally { setSending(false); }
  };

  const handleSave = async (form) => {
    setSaving(true);
    try {
      await mantenimientoApi.update(id, form);
      setEditing(false); await load();
    } catch {} finally { setSaving(false); }
  };

  const handleQuickStatus = async (nuevoEstado) => {
    const entry = data.entry;
    setSaving(true);
    try {
      await mantenimientoApi.update(id, {
        titulo:            entry.titulo,
        descripcion:       entry.descripcion,
        tipoMantenimiento: entry.tipoMantenimiento,
        estado:            nuevoEstado,
        prioridad:         entry.prioridad,
        nombreEquipo:      entry.nombreEquipo,
        ubicacion:         entry.ubicacion,
        tecnicoAsignado:   entry.tecnicoAsignado,
        emailTecnico:      entry.emailTecnico,
        responsableEquipo: entry.responsableEquipo,
        emailResponsable:  entry.emailResponsable,
        fechaProgramada:   entry.fechaProgramada,
        fechaRealizada:    nuevoEstado === 'Completado' ? (entry.fechaRealizada || new Date().toISOString()) : entry.fechaRealizada,
        duracionMinutos:   entry.duracionMinutos,
        notas:             entry.notas,
        costoEstimado:     entry.costoEstimado,
        costoReal:         entry.costoReal,
      });
      await load();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async () => {
    try { await mantenimientoApi.remove(id); navigate('/mantenimiento'); }
    catch { setConfirmDelete(false); }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await mantenimientoApi.uploadEvidencia(id, file);
      await load();
    } catch {} finally { setUploading(false); e.target.value = ''; }
  };

  const handleDeleteEvidencia = async (evId) => {
    if (!window.confirm('¿Eliminar esta evidencia?')) return;
    try { await mantenimientoApi.deleteEvidencia(id, evId); await load(); } catch {}
  };

  if (loading) return (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
      <CircularProgress />
    </Box>
  );
  if (error || !data) return (
    <Box sx={{ p: 3 }}>
      <Alert severity="error">{error || 'Mantenimiento no encontrado.'}</Alert>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/mantenimiento')} sx={{ mt: 2 }}>Volver</Button>
    </Box>
  );

  const e   = data.entry;
  const seg = data.seguimientos ?? [];
  const ev  = data.evidencias   ?? [];

  return (
    <Box sx={{ p: { xs: 1, md: 2 }, maxWidth: 1200, mx: 'auto' }}>

      {/* Cabecera */}
      <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
        <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={1}>
          <Stack direction="row" alignItems="center" spacing={1.5} flexWrap="wrap">
            <Button size="small" startIcon={<ArrowBackIcon />} onClick={() => navigate('/mantenimiento')} sx={{ borderRadius: 2 }}>
              Mantenimiento
            </Button>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>{e.folio}</Typography>
            <Chip size="small" label={e.tipoMantenimiento} variant="outlined" />
            <Chip size="small" label={e.prioridad} color={PRIORIDAD_COLOR[e.prioridad] || 'default'} />
            <Chip size="small" label={e.estado}    color={ESTADO_COLOR[e.estado]    || 'default'} />
          </Stack>
          {canWrite && (
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="outlined" startIcon={<EditIcon />}
                onClick={() => setEditing(true)} sx={{ borderRadius: 2 }}>
                Editar
              </Button>
              {isAdmin && (
                <Tooltip title="Eliminar">
                  <IconButton size="small" color="error" onClick={() => setConfirmDelete(true)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>
          )}
        </Stack>
        <Typography variant="h5" fontWeight={800} mt={1.5} mb={0.5}>{e.titulo}</Typography>
        <Typography variant="caption" color="text.secondary">Creado {fmtDate(e.creadoEn)} por {e.creadoPor}</Typography>
      </Paper>

      <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems="flex-start">

        {/* Columna izquierda */}
        <Box flex={1} minWidth={0}>

          {/* Descripción */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Descripción
            </Typography>
            <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
              {e.descripcion || <em style={{ color: '#999' }}>Sin descripción</em>}
            </Typography>
            {e.notas && (
              <>
                <Divider sx={{ my: 2 }} />
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>Notas</Typography>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{e.notas}</Typography>
              </>
            )}
          </Paper>

          {/* Evidencias */}
          <Paper elevation={0} sx={{ p: 2.5, mb: 2, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Typography variant="overline" color="text.secondary" fontWeight={700}>
                Evidencias ({ev.length})
              </Typography>
              {canWrite && (
                <>
                  <Button size="small" variant="outlined" startIcon={uploading ? <CircularProgress size={14} /> : <AttachFileIcon />}
                    onClick={() => fileRef.current?.click()} disabled={uploading} sx={{ borderRadius: 2 }}>
                    {uploading ? 'Subiendo…' : 'Subir archivo'}
                  </Button>
                  <input ref={fileRef} type="file" accept="image/*,application/pdf" style={{ display:'none' }} onChange={handleFileChange} />
                </>
              )}
            </Stack>
            {ev.length === 0 ? (
              <Typography variant="body2" color="text.secondary">Sin evidencias aún.</Typography>
            ) : (
              <ImageList cols={3} gap={8}>
                {ev.map(ev => {
                  const isImg = ev.mime?.startsWith('image/');
                  const url   = mantenimientoApi.getEvidenciaUrl(id, ev.id);
                  return (
                    <ImageListItem key={ev.id} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', cursor: 'pointer' }}
                      onClick={() => isImg ? setImgPreview(url) : window.open(url, '_blank')}>
                      {isImg
                        ? <img src={url} alt={ev.nombreArchivo} style={{ height: 120, objectFit: 'cover', width: '100%' }}
                            onError={e => { e.target.style.display='none'; }} />
                        : <Box sx={{ height: 120, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:'action.hover' }}>
                            <AttachFileIcon color="action" />
                          </Box>
                      }
                      <ImageListItemBar
                        title={<Typography variant="caption" noWrap>{ev.nombreArchivo}</Typography>}
                        actionIcon={
                          <Stack direction="row">
                            <Tooltip title="Descargar">
                              <IconButton size="small" sx={{ color:'white' }} onClick={e2 => { e2.stopPropagation(); window.open(url,'_blank'); }}>
                                <DownloadIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                            {canWrite && (
                              <Tooltip title="Eliminar">
                                <IconButton size="small" sx={{ color:'white' }} onClick={e2 => { e2.stopPropagation(); handleDeleteEvidencia(ev.id); }}>
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        }
                      />
                    </ImageListItem>
                  );
                })}
              </ImageList>
            )}
          </Paper>

          {/* Seguimientos */}
          <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={2}>
              Actualizaciones ({seg.length})
            </Typography>
            {seg.length === 0 && (
              <Typography variant="body2" color="text.secondary" mb={2}>Sin actualizaciones aún.</Typography>
            )}
            <Stack spacing={2} mb={seg.length > 0 ? 3 : 0}>
              {seg.map(s => (
                <Stack key={s.id} direction="row" spacing={1.5} alignItems="flex-start">
                  <Avatar sx={{ width:32, height:32, fontSize:12, bgcolor: avatarColor(s.creadoPor), flexShrink:0 }}>
                    {initials(s.creadoPor)}
                  </Avatar>
                  <Box flex={1} minWidth={0}>
                    <Stack direction="row" alignItems="center" spacing={1} mb={0.5} flexWrap="wrap">
                      <Typography variant="body2" fontWeight={700}>{s.creadoPor}</Typography>
                      <Chip size="small" label={s.tipo} variant="outlined" sx={{ height:18, fontSize:10 }} />
                      <Typography variant="caption" color="text.secondary">{fmtDate(s.creadoEn)}</Typography>
                    </Stack>
                    <Paper variant="outlined" sx={{ p:1.5, borderRadius:2, bgcolor:'action.hover' }}>
                      <Typography variant="body2" sx={{ whiteSpace:'pre-wrap' }}>{s.nota}</Typography>
                    </Paper>
                  </Box>
                </Stack>
              ))}
            </Stack>

            {canWrite && (
              <>
                {seg.length > 0 && <Divider sx={{ mb:2 }} />}
                <Stack direction="row" spacing={1} alignItems="flex-start">
                  <Avatar sx={{ width:32, height:32, fontSize:12, bgcolor:'primary.main', flexShrink:0, mt:0.5 }}>
                    <BuildIcon sx={{ fontSize:16 }} />
                  </Avatar>
                  <Box flex={1}>
                    <Stack direction="row" spacing={1} mb={1}>
                      <FormControl size="small" sx={{ minWidth:150 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select value={tipoSeg} label="Tipo" onChange={e => setTipoSeg(e.target.value)}>
                          {TIPOS_SEG.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
                        </Select>
                      </FormControl>
                    </Stack>
                    <TextField fullWidth multiline minRows={2} maxRows={6}
                      placeholder="Escribe una actualización… (Ctrl+Enter para enviar)"
                      value={nota} onChange={e => setNota(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) { e.preventDefault(); handleSend(); } }}
                      sx={{ mb:1 }} />
                    <Stack direction="row" justifyContent="flex-end">
                      <Button variant="contained" endIcon={sending ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                        disabled={sending || !nota.trim()} onClick={handleSend} sx={{ borderRadius:2 }}>
                        {sending ? 'Enviando…' : 'Agregar'}
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </>
            )}
          </Paper>
        </Box>

        {/* Sidebar */}
        <Box sx={{ width:{ xs:'100%', md:280 }, flexShrink:0 }}>
          {canWrite && e.estado !== 'Completado' && e.estado !== 'Cancelado' && (
            <Paper elevation={0} sx={{ p:2, mb:2, borderRadius:3, border:'1px solid', borderColor:'divider' }}>
              <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
                Cambiar estado
              </Typography>
              <Stack spacing={1}>
                {e.estado === 'Programado' && (
                  <Button fullWidth variant="outlined" color="warning" startIcon={<PlayArrowIcon />}
                    disabled={saving} onClick={() => handleQuickStatus('En Proceso')} sx={{ borderRadius:2 }}>
                    Marcar en proceso
                  </Button>
                )}
                <Button fullWidth variant="contained" color="success" startIcon={<CheckCircleIcon />}
                  disabled={saving} onClick={() => handleQuickStatus('Completado')} sx={{ borderRadius:2 }}>
                  Marcar como completado
                </Button>
                <Button fullWidth variant="text" color="inherit" startIcon={<CancelIcon />}
                  disabled={saving} onClick={() => handleQuickStatus('Cancelado')} sx={{ borderRadius:2 }}>
                  Cancelar mantenimiento
                </Button>
              </Stack>
            </Paper>
          )}
          <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid', borderColor:'divider' }}>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1.5}>
              Información
            </Typography>
            <Stack spacing={1.5}>
              {[
                ['Tipo',            e.tipoMantenimiento],
                ['Estado',          e.estado],
                ['Prioridad',       e.prioridad],
                ['Equipo',          e.nombreEquipo  || '—'],
                ['Ubicación',       e.ubicacion     || '—'],
                ['Técnico',         e.tecnicoAsignado || '—'],
                ['Email técnico',   e.emailTecnico  || '—'],
                ['Responsable del equipo', e.responsableEquipo || '—'],
                ['Email responsable', e.emailResponsable || '—'],
              ].map(([label, val]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{val}</Typography>
                </Box>
              ))}
              <Divider />
              {[
                ['Fecha programada', fmtDate(e.fechaProgramada)],
                ['Fecha realizada',  fmtDate(e.fechaRealizada)],
                ['Duración',         fmtMin(e.duracionMinutos) || '—'],
              ].map(([label, val]) => (
                <Box key={label}>
                  <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                  <Typography variant="body2" fontWeight={600}>{val}</Typography>
                </Box>
              ))}
              {(e.costoEstimado || e.costoReal) && (
                <>
                  <Divider />
                  {e.costoEstimado != null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Costo estimado</Typography>
                      <Typography variant="body2" fontWeight={600}>${Number(e.costoEstimado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  )}
                  {e.costoReal != null && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block">Costo real</Typography>
                      <Typography variant="body2" fontWeight={600}>${Number(e.costoReal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</Typography>
                    </Box>
                  )}
                </>
              )}
            </Stack>
          </Paper>
        </Box>
      </Stack>

      {/* Modal edición */}
      {editing && (
        <Dialog open fullWidth maxWidth="md" onClose={() => setEditing(false)}>
          <DialogTitle>Editar — {e.folio}</DialogTitle>
          <DialogContent>
            <MantenimientoForm initial={e} onSave={handleSave} onClose={() => setEditing(false)} saving={saving} />
          </DialogContent>
        </Dialog>
      )}

      {/* Confirm delete */}
      <Dialog open={confirmDelete} onClose={() => setConfirmDelete(false)} maxWidth="xs">
        <DialogTitle>¿Eliminar este mantenimiento?</DialogTitle>
        <DialogContent>
          <Typography>Se eliminará <strong>{e.folio}</strong> con todos sus seguimientos y evidencias. Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      {/* Preview imagen */}
      <Dialog open={!!imgPreview} onClose={() => setImgPreview(null)} maxWidth="md">
        <DialogContent sx={{ p:1 }}>
          <img src={imgPreview} alt="evidencia" style={{ maxWidth:'100%', maxHeight:'80vh', display:'block' }} />
        </DialogContent>
      </Dialog>
    </Box>
  );
}
