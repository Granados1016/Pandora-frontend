import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box, Paper, Typography, Stack, Button, Chip, TextField, MenuItem,
  Grid, CircularProgress, Alert, Divider, Avatar, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
} from '@mui/material';
import ArrowBackIcon          from '@mui/icons-material/ArrowBack';
import SendIcon               from '@mui/icons-material/Send';
import EditIcon               from '@mui/icons-material/Edit';
import DeleteIcon             from '@mui/icons-material/Delete';
import PersonIcon             from '@mui/icons-material/Person';
import BusinessIcon           from '@mui/icons-material/Business';
import AccessTimeIcon         from '@mui/icons-material/AccessTime';
import AssignmentIndIcon      from '@mui/icons-material/AssignmentInd';
import ImageIcon              from '@mui/icons-material/Image';
import DownloadIcon           from '@mui/icons-material/Download';
import PictureAsPdfIcon       from '@mui/icons-material/PictureAsPdf';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { printPdf }           from '../../utils/printPdf';
import { ticketApi, userApi } from '../../api/pandoraApi';
import { apiError }           from '../../api/apiError';
import { useAuth }            from '../../hooks/useAuth.jsx';
import { format }             from 'date-fns';
import { es }                 from 'date-fns/locale';
import api                    from '../../api/pandoraApi';

// ── Color helpers ─────────────────────────────────────────────────────────────

const STATUS_CFG = {
  'Abierto':     { bg: '#e3f2fd', color: '#1565c0' },
  'En Progreso': { bg: '#fff3e0', color: '#e65100' },
  'En Espera':   { bg: '#fff8e1', color: '#f57f17' },
  'Resuelto':    { bg: '#e8f5e9', color: '#1b5e20' },
  'Cerrado':     { bg: '#f5f5f5', color: '#616161' },
};

const PRIORITY_CFG = {
  'Baja':    { bg: '#f5f5f5', color: '#616161' },
  'Media':   { bg: '#e3f2fd', color: '#1565c0' },
  'Alta':    { bg: '#fff3e0', color: '#e65100' },
  'Crítica': { bg: '#ffebee', color: '#b71c1c' },
};

function StatusChip({ status, size = 'medium' }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG['Abierto'];
  return (
    <Chip
      label={status} size={size}
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 700, border: `1px solid ${c.color}40` }}
    />
  );
}

function PriorityChip({ priority, size = 'small' }) {
  const c = PRIORITY_CFG[priority] ?? PRIORITY_CFG['Media'];
  return (
    <Chip
      label={priority} size={size}
      sx={{ bgcolor: c.bg, color: c.color, fontWeight: 600, border: `1px solid ${c.color}40` }}
    />
  );
}

const STATUSES   = ['Abierto', 'En Progreso', 'En Espera', 'Resuelto', 'Cerrado'];
const fmtDate = d => format(new Date(d), "dd 'de' MMMM yyyy, HH:mm", { locale: es });
const fmtShort = d => format(new Date(d), "dd/MM/yyyy HH:mm", { locale: es });
const fmtSize = b => b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${(b / 1024).toFixed(0)} KB`;

// ── Info row ──────────────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }) {
  if (!value) return null;
  return (
    <Stack direction="row" spacing={1.5} alignItems="flex-start" py={1}>
      <Box sx={{ color: 'text.secondary', mt: 0.2 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">{label}</Typography>
        <Typography variant="body2">{value}</Typography>
      </Box>
    </Stack>
  );
}

// ── Comment bubble ────────────────────────────────────────────────────────────

function CommentBubble({ comment }) {
  const isAdmin = comment.isAdmin;
  return (
    <Box sx={{ display: 'flex', gap: 1.5, flexDirection: isAdmin ? 'row-reverse' : 'row', mb: 2 }}>
      <Avatar
        sx={{ width: 32, height: 32, bgcolor: isAdmin ? 'primary.main' : 'grey.400', fontSize: 13, flexShrink: 0 }}
      >
        {isAdmin ? <AdminPanelSettingsIcon fontSize="small" /> : comment.authorName[0]?.toUpperCase()}
      </Avatar>
      <Box sx={{ maxWidth: '80%' }}>
        <Stack direction="row" spacing={1} alignItems="center" mb={0.3} justifyContent={isAdmin ? 'flex-end' : 'flex-start'}>
          <Typography variant="caption" fontWeight={700} color={isAdmin ? 'primary.main' : 'text.secondary'}>
            {comment.authorName}
          </Typography>
          {isAdmin && <Chip label="Soporte" size="small" color="primary" variant="outlined" sx={{ fontSize: 9, height: 16 }} />}
          <Typography variant="caption" color="text.disabled">{fmtShort(comment.createdAt)}</Typography>
        </Stack>
        <Paper
          elevation={0}
          sx={{
            p: 1.5, borderRadius: 2,
            bgcolor: isAdmin ? 'primary.50' : 'grey.100',
            border: '1px solid',
            borderColor: isAdmin ? 'primary.200' : 'grey.200',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {comment.body}
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function TicketDetailPage() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { isAdmin, username } = useAuth();

  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');

  // Status form
  const [statusForm,   setStatusForm]   = useState({ status: '', assignedTo: '', department: '', notes: '', delayNote: '', closeNote: '' });
  const [savingStatus, setSavingStatus] = useState(false);
  const [statusAlert,  setStatusAlert]  = useState('');

  // Comment
  const [comment,      setComment]      = useState('');
  const [savingComment,setSavingComment]= useState(false);

  // Attachments
  const [imageUrls,    setImageUrls]    = useState({});

  // Delete confirm
  const [deleteOpen,   setDeleteOpen]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);

  // Lista de usuarios para asignación
  const [users, setUsers] = useState([]);
  useEffect(() => {
    if (isAdmin) userApi.getAll().then(r => setUsers(r.data ?? [])).catch(() => {});
  }, [isAdmin]);

  // ── Load ──────────────────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data: d } = await ticketApi.getById(id);
      setData(d);
      setStatusForm({
        status:     d.ticket.status,
        assignedTo: d.ticket.assignedTo ?? '',
        department: d.ticket.department ?? '',
        notes:      '',
        delayNote:  d.ticket.delayNote  ?? '',
        closeNote:  d.ticket.closeNote  ?? '',
      });

      // Fetch attachment blobs for display
      if (d.attachments?.length) {
        const urls = {};
        for (const att of d.attachments) {
          try {
            const res = await api.get(`/tickets/${id}/attachments/${att.id}`, { responseType: 'blob' });
            urls[att.id] = URL.createObjectURL(res.data);
          } catch { /* skip failed attachment */ }
        }
        setImageUrls(urls);
      }
    } catch (e) {
      setError(apiError(e, 'Error al cargar el ticket.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Cleanup blob URLs
  useEffect(() => () => Object.values(imageUrls).forEach(URL.revokeObjectURL), [imageUrls]);

  // ── Save status ────────────────────────────────────────────────────────────

  const saveStatus = async () => {
    if (statusForm.status === 'En Espera' && !statusForm.delayNote.trim()) {
      setStatusAlert('Indica el motivo de la espera para notificar al solicitante.');
      return;
    }
    setSavingStatus(true);
    setStatusAlert('');
    try {
      await ticketApi.updateStatus(id, {
        status:     statusForm.status,
        assignedTo: statusForm.assignedTo || null,
        department: statusForm.department || null,
        notes:      statusForm.notes      || null,
        delayNote:  statusForm.delayNote  || null,
        closeNote:  statusForm.closeNote  || null,
      });
      await load();
      setStatusForm(f => ({ ...f, notes: '' }));
    } catch (e) {
      setStatusAlert(apiError(e, 'Error al actualizar el estatus.'));
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Add comment ────────────────────────────────────────────────────────────

  const addComment = async () => {
    if (!comment.trim()) return;
    setSavingComment(true);
    try {
      await ticketApi.addComment(id, { body: comment });
      setComment('');
      await load();
    } catch (e) {
      setError(apiError(e, 'Error al enviar el comentario.'));
    } finally {
      setSavingComment(false);
    }
  };

  // ── Delete ticket ──────────────────────────────────────────────────────────

  const deleteTicket = async () => {
    setDeleting(true);
    try {
      await ticketApi.delete(id);
      navigate('/tickets');
    } catch (e) {
      setError(apiError(e, 'Error al eliminar el ticket.'));
      setDeleteOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  // ── Export PDF ────────────────────────────────────────────────────────────

  const exportPdf = () => {
    const { ticket, fieldValues, comments } = data;
    const statusColor = { 'Abierto': 'chip-default', 'En Proceso': 'chip-warning',
      'Resuelto': 'chip-success', 'Cerrado': 'chip-success', 'En Espera': 'chip-warning' };
    const priorityColor = { 'Baja': 'chip-default', 'Media': 'chip-default',
      'Alta': 'chip-warning', 'Crítica': 'chip-error' };

    const fields = fieldValues?.length ? `
      <div class="section-title">Campos del formulario</div>
      <div class="detail-grid">
        ${fieldValues.map(f => `
          <div class="detail-item">
            <label>${f.label}</label>
            <p>${f.value || '—'}</p>
          </div>`).join('')}
      </div>` : '';

    const commentsHtml = comments?.length ? `
      <div class="section-title">Comentarios (${comments.length})</div>
      <table>
        <thead><tr><th>Usuario</th><th>Comentario</th><th>Fecha</th></tr></thead>
        <tbody>
          ${comments.map(c => `<tr>
            <td>${c.author ?? '—'}</td>
            <td>${c.content ?? ''}</td>
            <td>${c.createdAt ? new Date(c.createdAt).toLocaleString('es-MX') : '—'}</td>
          </tr>`).join('')}
        </tbody>
      </table>` : '';

    const html = `
      <div class="section-title">Información general</div>
      <div class="detail-grid">
        <div class="detail-item"><label>Número</label><p>${ticket.ticketNumber}</p></div>
        <div class="detail-item"><label>Estatus</label>
          <p><span class="chip ${statusColor[ticket.status] ?? 'chip-default'}">${ticket.status}</span></p></div>
        <div class="detail-item"><label>Prioridad</label>
          <p><span class="chip ${priorityColor[ticket.priority] ?? 'chip-default'}">${ticket.priority}</span></p></div>
        <div class="detail-item"><label>Área</label><p>${ticket.area ?? '—'}</p></div>
        <div class="detail-item"><label>Solicitante</label><p>${ticket.requesterName ?? '—'}</p></div>
        <div class="detail-item"><label>Asignado a</label><p>${ticket.assignedTo ?? 'Sin asignar'}</p></div>
        <div class="detail-item"><label>Creado</label><p>${ticket.createdAt ? new Date(ticket.createdAt).toLocaleString('es-MX') : '—'}</p></div>
        <div class="detail-item"><label>Actualizado</label><p>${ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleString('es-MX') : '—'}</p></div>
      </div>
      ${fields}
      ${commentsHtml}
    `;

    printPdf(`Ticket ${ticket.ticketNumber}`, html, { subtitle: ticket.title });
  };

  // ── Download attachment ────────────────────────────────────────────────────

  const downloadAttachment = (att) => {
    const url = imageUrls[att.id];
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = att.originalName;
    a.click();
  };

  // ── Loading / error ────────────────────────────────────────────────────────

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>
  );

  if (error && !data) return (
    <Box sx={{ p: 4 }}>
      <Alert severity="error" action={<Button onClick={load}>Reintentar</Button>}>{error}</Alert>
    </Box>
  );

  const { ticket, fieldValues, attachments, comments } = data;
  const showDelay = statusForm.status === 'En Espera';
  const showClose = statusForm.status === 'Resuelto' || statusForm.status === 'Cerrado';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, pb: 8 }}>

      {/* Breadcrumb */}
      <Stack direction="row" spacing={1} alignItems="center" mb={2}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/tickets')} size="small" sx={{ color: 'text.secondary' }}>
          Tickets
        </Button>
        <Typography color="text.disabled">/</Typography>
        <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main">
          {ticket.ticketNumber}
        </Typography>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>
      )}

      {/* Header */}
      <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider', borderTop: '6px solid', borderTopColor: 'primary.main' }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-start' }} justifyContent="space-between">
          <Box flex={1}>
            <Stack direction="row" spacing={1} alignItems="center" mb={1} flexWrap="wrap">
              <ConfirmationNumberIcon color="primary" />
              <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main">
                {ticket.ticketNumber}
              </Typography>
              <StatusChip status={ticket.status} />
              <PriorityChip priority={ticket.priority} />
            </Stack>
            <Typography variant="h5" fontWeight={800}>{ticket.title}</Typography>
            <Typography variant="caption" color="text.secondary">
              Creado {fmtDate(ticket.createdAt)}
              {ticket.updatedAt && ` · Actualizado ${fmtShort(ticket.updatedAt)}`}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar PDF">
              <IconButton onClick={exportPdf} size="small">
                <PictureAsPdfIcon />
              </IconButton>
            </Tooltip>
            {isAdmin && (
              <Tooltip title="Eliminar ticket">
                <IconButton color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>
      </Paper>

      <Grid container spacing={3}>

        {/* ── LEFT COLUMN ────────────────────────────────────────────────── */}
        <Grid item xs={12} md={8}>
          <Stack spacing={3}>

            {/* Dynamic field values */}
            {fieldValues.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
                  Detalles del ticket
                </Typography>
                <Stack spacing={2}>
                  {fieldValues.map(fv => {
                    if (fv.fieldType === 'Label') {
                      return (
                        <Box key={fv.fieldId}>
                          <Divider sx={{ mb: 0.5 }} />
                          <Typography variant="subtitle2" fontWeight={700} color="primary.main">{fv.label}</Typography>
                        </Box>
                      );
                    }
                    return (
                      <Box key={fv.fieldId}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.3}>
                          {fv.label.toUpperCase()}
                        </Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                          {fv.fieldType === 'Checkbox'
                            ? (fv.value === 'true' ? '✅ Sí' : '❌ No')
                            : fv.value || <em style={{ color: '#9e9e9e' }}>Sin respuesta</em>}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              </Paper>
            )}

            {/* Delay / close notes if present */}
            {ticket.delayNote && (
              <Alert severity="warning" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} mb={0.5}>Motivo de espera:</Typography>
                <Typography variant="body2">{ticket.delayNote}</Typography>
              </Alert>
            )}
            {ticket.closeNote && (
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                <Typography variant="body2" fontWeight={700} mb={0.5}>Resolución:</Typography>
                <Typography variant="body2">{ticket.closeNote}</Typography>
              </Alert>
            )}

            {/* Attachments */}
            {attachments.length > 0 && (
              <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
                  Imágenes adjuntas ({attachments.length})
                </Typography>
                <Grid container spacing={1.5}>
                  {attachments.map(att => (
                    <Grid item xs={6} sm={4} key={att.id}>
                      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden', border: '1px solid', borderColor: 'divider', position: 'relative', cursor: 'pointer' }}>
                        {imageUrls[att.id] ? (
                          <Box
                            component="img"
                            src={imageUrls[att.id]}
                            alt={att.originalName}
                            sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box sx={{ width: '100%', height: 120, bgcolor: 'grey.100', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ImageIcon color="disabled" sx={{ fontSize: 40 }} />
                          </Box>
                        )}
                        <Box sx={{ p: 0.75 }}>
                          <Typography variant="caption" noWrap display="block" fontWeight={600}>{att.originalName}</Typography>
                          <Typography variant="caption" color="text.secondary">{fmtSize(att.fileSize)}</Typography>
                        </Box>
                        <Tooltip title="Descargar">
                          <IconButton
                            size="small"
                            onClick={() => downloadAttachment(att)}
                            sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: 'white', '&:hover': { bgcolor: 'rgba(0,0,0,0.75)' } }}
                          >
                            <DownloadIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            )}

            {/* Comments */}
            <Paper elevation={0} sx={{ p: 3, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={2}>
                Comentarios ({comments.length})
              </Typography>

              {comments.length === 0 && (
                <Typography variant="body2" color="text.disabled" mb={2}>Aún no hay comentarios.</Typography>
              )}

              <Box mb={2}>
                {comments.map(c => <CommentBubble key={c.id} comment={c} />)}
              </Box>

              <Divider sx={{ mb: 2 }} />

              <Stack direction="row" spacing={1.5} alignItems="flex-start">
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.300', fontSize: 13 }}>
                  {username?.[0]?.toUpperCase()}
                </Avatar>
                <Box flex={1}>
                  <TextField
                    fullWidth multiline rows={2} size="small"
                    placeholder="Escribe un comentario..."
                    value={comment}
                    onChange={e => setComment(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && e.ctrlKey) addComment();
                    }}
                  />
                  <Stack direction="row" justifyContent="flex-end" mt={1}>
                    <Button
                      variant="contained" size="small" endIcon={<SendIcon />}
                      onClick={addComment} disabled={!comment.trim() || savingComment}
                    >
                      {savingComment ? 'Enviando...' : 'Comentar'}
                    </Button>
                  </Stack>
                </Box>
              </Stack>
            </Paper>

          </Stack>
        </Grid>

        {/* ── RIGHT COLUMN ───────────────────────────────────────────────── */}
        <Grid item xs={12} md={4}>
          <Stack spacing={2}>

            {/* Ticket info */}
            <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" textTransform="uppercase" letterSpacing={0.5} mb={1.5}>
                Información
              </Typography>
              <InfoRow icon={<PersonIcon fontSize="small" />}       label="Solicitante"   value={ticket.submittedBy} />
              <InfoRow icon={<BusinessIcon fontSize="small" />}     label="Departamento"  value={ticket.department} />
              <InfoRow icon={<AssignmentIndIcon fontSize="small" />} label="Asignado a"   value={ticket.assignedTo} />
              <InfoRow icon={<AccessTimeIcon fontSize="small" />}   label="Creado"        value={fmtDate(ticket.createdAt)} />
              {ticket.updatedAt && (
                <InfoRow icon={<AccessTimeIcon fontSize="small" />} label="Actualizado"   value={fmtShort(ticket.updatedAt)} />
              )}
            </Paper>

            {/* Admin: Status management */}
            {isAdmin && (
              <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '2px solid', borderColor: 'primary.200', bgcolor: 'primary.50' }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                  <AdminPanelSettingsIcon color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700} color="primary.main" textTransform="uppercase" letterSpacing={0.5}>
                    Gestión del ticket
                  </Typography>
                </Stack>

                {statusAlert && (
                  <Alert severity="warning" onClose={() => setStatusAlert('')} sx={{ mb: 2, borderRadius: 2, fontSize: 12 }}>
                    {statusAlert}
                  </Alert>
                )}

                <Stack spacing={2}>
                  <TextField
                    select fullWidth size="small" label="Estatus"
                    value={statusForm.status}
                    onChange={e => setStatusForm(f => ({ ...f, status: e.target.value }))}
                  >
                    {STATUSES.map(s => (
                      <MenuItem key={s} value={s}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: STATUS_CFG[s]?.color }} />
                          <span>{s}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    select
                    fullWidth size="small" label="Asignado a"
                    value={statusForm.assignedTo}
                    onChange={e => setStatusForm(f => ({ ...f, assignedTo: e.target.value }))}
                  >
                    <MenuItem value=""><em>Sin asignar</em></MenuItem>
                    {users.map(u => (
                      <MenuItem key={u.id} value={u.fullName}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Avatar sx={{ width: 20, height: 20, fontSize: 10, bgcolor: 'primary.main' }}>
                            {u.fullName?.[0]}
                          </Avatar>
                          <span>{u.fullName}</span>
                        </Stack>
                      </MenuItem>
                    ))}
                  </TextField>

                  <TextField
                    fullWidth size="small" label="Departamento"
                    value={statusForm.department}
                    onChange={e => setStatusForm(f => ({ ...f, department: e.target.value }))}
                  />

                  {/* Delay note — solo si En Espera */}
                  {showDelay && (
                    <TextField
                      fullWidth multiline rows={2} size="small"
                      label="Motivo de la espera *"
                      helperText="Se enviará notificación al solicitante"
                      value={statusForm.delayNote}
                      onChange={e => setStatusForm(f => ({ ...f, delayNote: e.target.value }))}
                      placeholder="Explica por qué tardará más de lo esperado..."
                    />
                  )}

                  {/* Close note — si Resuelto o Cerrado */}
                  {showClose && (
                    <TextField
                      fullWidth multiline rows={2} size="small"
                      label="Resumen de resolución"
                      helperText="Se enviará notificación al solicitante"
                      value={statusForm.closeNote}
                      onChange={e => setStatusForm(f => ({ ...f, closeNote: e.target.value }))}
                      placeholder="¿Cómo se resolvió el problema?"
                    />
                  )}

                  <TextField
                    fullWidth multiline rows={2} size="small"
                    label="Nota interna (opcional)"
                    helperText="Aparecerá como comentario en el historial"
                    value={statusForm.notes}
                    onChange={e => setStatusForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notas adicionales..."
                  />

                  <Button
                    variant="contained" fullWidth onClick={saveStatus} disabled={savingStatus}
                    startIcon={savingStatus ? <CircularProgress size={16} color="inherit" /> : <EditIcon />}
                  >
                    {savingStatus ? 'Guardando...' : 'Guardar cambios'}
                  </Button>
                </Stack>
              </Paper>
            )}

          </Stack>
        </Grid>

      </Grid>

      {/* Delete confirm dialog */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle fontWeight={800}>¿Eliminar ticket?</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            Se eliminará permanentemente el ticket <strong>{ticket?.ticketNumber}</strong> junto con todos sus adjuntos y comentarios.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteOpen(false)} disabled={deleting}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={deleteTicket} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}
