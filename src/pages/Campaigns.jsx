import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, Card, CardContent, Grid, Chip,
  Stack, Button, CircularProgress, Alert, Divider, IconButton, Tooltip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Accordion, AccordionSummary, AccordionDetails,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer, Paper,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import RestoreIcon from '@mui/icons-material/Restore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HistoryIcon from '@mui/icons-material/History';
import PeopleIcon from '@mui/icons-material/People';
import MarkEmailReadIcon from '@mui/icons-material/MarkEmailRead';
import { campaignApi } from '../api/pandoraApi';
import { statusColor, statusLabel, programLabel } from '../utils/statusHelpers';
import { useAuth, MODULES } from '../hooks/useAuth.jsx';

export default function Campaigns() {
  const navigate = useNavigate();
  const { hasModuleWrite } = useAuth();
  const canWrite = hasModuleWrite(MODULES.MAIL_PLUS);
  const [campaigns, setCampaigns]       = useState([]);
  const [deleted, setDeleted]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [duplicating, setDuplicating]   = useState(null);
  const [deleting, setDeleting]         = useState(null);
  const [restoring, setRestoring]       = useState(null);
  const [confirmId, setConfirmId]       = useState(null);
  // Destinatarios / tracking
  const [recipientsDialog, setRecipientsDialog] = useState(null); // { id, name }
  const [recipients, setRecipients]             = useState([]);
  const [recipientsLoading, setRecipientsLoading] = useState(false);

  const loadAll = () => {
    setLoading(true);
    Promise.all([campaignApi.getAll(), campaignApi.getDeleted()])
      .then(([active, hist]) => {
        setCampaigns(active.data);
        setDeleted(hist.data);
      })
      .catch(() => setError('Error al cargar campañas.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, []);

  const handleDuplicate = async (e, id) => {
    e.stopPropagation();
    setDuplicating(id);
    try {
      const { data } = await campaignApi.duplicate(id);
      navigate(`/campaigns/${data.id}`);
    } catch {
      setError('Error al duplicar la campaña.');
      setDuplicating(null);
    }
  };

  const openRecipients = async (e, campaign) => {
    e.stopPropagation();
    setRecipientsDialog({ id: campaign.id, name: campaign.name });
    setRecipients([]);
    setRecipientsLoading(true);
    try {
      const { data } = await campaignApi.getRecipients(campaign.id);
      setRecipients(data);
    } catch {
      setRecipients([]);
    } finally {
      setRecipientsLoading(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!confirmId) return;
    setDeleting(confirmId);
    setConfirmId(null);
    try {
      await campaignApi.remove(confirmId);
      loadAll();
    } catch {
      setError('Error al eliminar la campaña.');
    } finally {
      setDeleting(null);
    }
  };

  const handleRestore = async (e, id) => {
    e.stopPropagation();
    setRestoring(id);
    try {
      await campaignApi.restore(id);
      loadAll();
    } catch {
      setError('Error al restaurar la campaña.');
    } finally {
      setRestoring(null);
    }
  };

  const CampaignCard = ({ c, isDeleted = false }) => (
    <Card
      sx={{
        height: '100%',
        cursor: isDeleted ? 'default' : 'pointer',
        opacity: isDeleted ? 0.75 : 1,
        '&:hover': isDeleted ? {} : { boxShadow: 4 },
        transition: 'box-shadow 0.2s',
      }}
      onClick={() => !isDeleted && navigate(`/campaigns/${c.id}`)}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
          <Typography variant="subtitle1" fontWeight={700} noWrap sx={{ maxWidth: '55%' }}>{c.name}</Typography>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Stack spacing={0.5} alignItems="flex-end">
              <Chip label={statusLabel(c.status)} color={statusColor(c.status)} size="small" />
              <Chip label={programLabel(c.programType)} variant="outlined" size="small" color="primary" />
            </Stack>

            {isDeleted ? (
              <Tooltip title="Restaurar campaña">
                <IconButton
                  size="small"
                  color="success"
                  onClick={(e) => handleRestore(e, c.id)}
                  disabled={restoring === c.id}
                  sx={{ ml: 0.5 }}
                >
                  {restoring === c.id
                    ? <CircularProgress size={16} />
                    : <RestoreIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Ver destinatarios y seguimiento">
                  <IconButton size="small" onClick={(e) => openRecipients(e, c)} sx={{ ml: 0.5 }}>
                    <PeopleIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                {canWrite && (
                  <Tooltip title="Duplicar campaña">
                    <IconButton
                      size="small"
                      onClick={(e) => handleDuplicate(e, c.id)}
                      disabled={duplicating === c.id}
                      sx={{ ml: 0.5 }}
                    >
                      {duplicating === c.id
                        ? <CircularProgress size={16} />
                        : <ContentCopyIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
                {canWrite && (
                  <Tooltip title="Eliminar campaña">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); setConfirmId(c.id); }}
                      disabled={deleting === c.id}
                      sx={{ ml: 0 }}
                    >
                      {deleting === c.id
                        ? <CircularProgress size={16} />
                        : <DeleteIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                )}
              </>
            )}
          </Stack>
        </Stack>

        <Typography variant="body2" color="text.secondary" noWrap mb={2}>{c.subject}</Typography>
        <Divider sx={{ mb: 2 }} />
        <Grid container spacing={1}>
          {[
            { label: 'Total',    value: c.totalRecipients, color: 'text.primary' },
            { label: 'Enviados', value: c.sentCount,       color: 'success.main' },
            { label: 'Fallidos', value: c.failedCount,     color: c.failedCount > 0 ? 'error.main' : 'text.secondary' },
          ].map(stat => (
            <Grid item xs={4} key={stat.label}>
              <Typography variant="caption" color="text.secondary" display="block">{stat.label}</Typography>
              <Typography variant="body1" fontWeight={700} color={stat.color}>{stat.value}</Typography>
            </Grid>
          ))}
        </Grid>

        {!isDeleted && c.sentAt && (
          <Typography variant="caption" color="text.secondary" mt={1.5} display="block">
            Enviado: {new Date(c.sentAt).toLocaleString('es-MX')}
          </Typography>
        )}
        {isDeleted && c.deletedAt && (
          <Typography variant="caption" color="error.light" mt={1.5} display="block">
            Eliminado: {new Date(c.deletedAt).toLocaleString('es-MX')}
            {c.deletedBy && ` · por ${c.deletedBy}`}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Box sx={{ p: 4 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" fontWeight={800} color="primary.main">Campañas</Typography>
        {canWrite && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/campaigns/new')}>
            Nueva Campaña
          </Button>
        )}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <Box textAlign="center" py={8}><CircularProgress /></Box>
      ) : (
        <>
          {/* ── Campañas activas ───────────────────────────────────────────── */}
          {campaigns.length === 0 ? (
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 8 }}>
                <Typography color="text.secondary" mb={2}>No hay campañas registradas.</Typography>
                {canWrite && (
                  <Button variant="contained" onClick={() => navigate('/campaigns/new')} startIcon={<AddIcon />}>
                    Crear Primera Campaña
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <Grid container spacing={2}>
              {campaigns.map(c => (
                <Grid item xs={12} md={6} xl={4} key={c.id}>
                  <CampaignCard c={c} />
                </Grid>
              ))}
            </Grid>
          )}

          {/* ── Historial / Papelera ───────────────────────────────────────── */}
          {deleted.length > 0 && (
            <Accordion
              sx={{ mt: 4, border: '1px solid', borderColor: 'divider', borderRadius: 2, '&:before': { display: 'none' } }}
              disableGutters
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <HistoryIcon color="action" fontSize="small" />
                  <Typography fontWeight={600} color="text.secondary">
                    Historial de eliminadas
                  </Typography>
                  <Chip label={deleted.length} size="small" color="default" />
                </Stack>
              </AccordionSummary>
              <AccordionDetails sx={{ pt: 0 }}>
                <Alert severity="info" sx={{ mb: 2 }} icon={false}>
                  Las campañas eliminadas conservan todos sus datos. Puedes restaurarlas en cualquier momento.
                </Alert>
                <Grid container spacing={2}>
                  {deleted.map(c => (
                    <Grid item xs={12} md={6} xl={4} key={c.id}>
                      <CampaignCard c={c} isDeleted />
                    </Grid>
                  ))}
                </Grid>
              </AccordionDetails>
            </Accordion>
          )}
        </>
      )}

      {/* ── Diálogo de destinatarios y tracking ──────────────────────────── */}
      <Dialog
        open={!!recipientsDialog}
        onClose={() => setRecipientsDialog(null)}
        maxWidth="md" fullWidth
      >
        <DialogTitle fontWeight={700}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <PeopleIcon color="primary" />
            <Box>
              <Typography fontWeight={700}>Destinatarios</Typography>
              {recipientsDialog && (
                <Typography variant="caption" color="text.secondary">{recipientsDialog.name}</Typography>
              )}
            </Box>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {recipientsLoading ? (
            <Box textAlign="center" py={4}><CircularProgress /></Box>
          ) : recipients.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography color="text.secondary">Sin destinatarios registrados.</Typography>
            </Box>
          ) : (
            <TableContainer>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Nombre</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Correo</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Estado</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>
                      <Stack direction="row" alignItems="center" spacing={0.5}>
                        <MarkEmailReadIcon fontSize="small" />
                        <span>Leído</span>
                      </Stack>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Enviado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recipients.map(r => (
                    <TableRow key={r.id} hover>
                      <TableCell>{r.fullName}</TableCell>
                      <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>{r.email}</TableCell>
                      <TableCell>
                        <Chip
                          label={r.status === 'Sent' ? 'Enviado' : r.status === 'Failed' ? 'Fallido' : 'Pendiente'}
                          color={r.status === 'Sent' ? 'success' : r.status === 'Failed' ? 'error' : 'default'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {r.readAt ? (
                          <Tooltip title={new Date(r.readAt + 'Z').toLocaleString('es-MX')}>
                            <Chip
                              icon={<MarkEmailReadIcon />}
                              label="Leído"
                              color="info"
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        ) : (
                          <Typography variant="caption" color="text.disabled">—</Typography>
                        )}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                        {r.sentAt ? new Date(r.sentAt + 'Z').toLocaleString('es-MX') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions>
          <Typography variant="caption" color="text.secondary" sx={{ flex: 1, pl: 1 }}>
            {recipients.filter(r => r.readAt).length} de {recipients.length} leídos
          </Typography>
          <Button onClick={() => setRecipientsDialog(null)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo de confirmación ────────────────────────────────────────── */}
      <Dialog open={!!confirmId} onClose={() => setConfirmId(null)} maxWidth="xs" fullWidth>
        <DialogTitle fontWeight={700}>¿Eliminar campaña?</DialogTitle>
        <DialogContent>
          <Typography>
            La campaña se moverá al historial. Podrás restaurarla desde ahí en cualquier momento.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmId(null)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDeleteConfirm} startIcon={<DeleteIcon />}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
